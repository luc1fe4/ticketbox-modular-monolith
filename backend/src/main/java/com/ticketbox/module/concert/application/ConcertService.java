package com.ticketbox.module.concert.application;

import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.ConcertSummaryDto;
import com.ticketbox.module.concert.application.dto.CreateConcertRequest;
import com.ticketbox.module.concert.application.dto.UpdateConcertRequest;
import com.ticketbox.module.concert.application.mapper.ConcertMapper;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.module.concert.infrastructure.ConcertRepository;
import com.ticketbox.module.concert.infrastructure.TicketTypeRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ConcertService {

    private final ConcertRepository concertRepository;
    private final TicketTypeRepository ticketTypeRepository;

    private static final Map<Concert.Status, Set<Concert.Status>> VALID_TRANSITIONS = Map.of(
            Concert.Status.DRAFT, Set.of(Concert.Status.ON_SALE, Concert.Status.CANCELLED),
            Concert.Status.ON_SALE, Set.of(Concert.Status.SOLD_OUT, Concert.Status.CANCELLED, Concert.Status.COMPLETED),
            Concert.Status.SOLD_OUT, Set.of(Concert.Status.ON_SALE, Concert.Status.CANCELLED, Concert.Status.COMPLETED)
    );

    public ConcertService(ConcertRepository concertRepository, TicketTypeRepository ticketTypeRepository) {
        this.concertRepository = concertRepository;
        this.ticketTypeRepository = ticketTypeRepository;
    }

    public Page<ConcertSummaryDto> getPublicConcerts(Pageable pageable) {
        List<Concert.Status> publicStatuses = List.of(
                Concert.Status.ON_SALE,
                Concert.Status.SOLD_OUT
        );

        return concertRepository.findByStatusIn(publicStatuses, pageable)
                .map(ConcertMapper::toSummaryDto);
    }

    public ConcertDetailDto getConcertDetail(UUID concertId) {
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + concertId));

        return ConcertMapper.toDetailDto(concert);
    }

    public Page<ConcertDetailDto> getAllConcerts(Concert.Status status, Pageable pageable) {
        Page<Concert> concerts;
        if (status != null) {
            concerts = concertRepository.findByStatus(status, pageable);
        } else {
            concerts = concertRepository.findAll(pageable);
        }
        return concerts.map(ConcertMapper::toDetailDto);
    }

    @Transactional
    public ConcertDetailDto createConcert(CreateConcertRequest request) {
        validateDates(request.eventDate(), request.doorsOpenAt());

        Concert concert = ConcertMapper.toEntity(request);
        concert.setStatus(Concert.Status.DRAFT);
        
        Concert saved = concertRepository.save(concert);
        return ConcertMapper.toDetailDto(saved);
    }

    @Transactional
    public ConcertDetailDto updateConcert(UUID id, UpdateConcertRequest request) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + id));

        // Reject updates if concert is in COMPLETED or CANCELLED status
        if (concert.getStatus() == Concert.Status.COMPLETED || concert.getStatus() == Concert.Status.CANCELLED) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Cannot update concert information in " + concert.getStatus() + " status");
        }

        validateDates(request.eventDate(), request.doorsOpenAt());

        ConcertMapper.updateEntity(concert, request);
        Concert saved = concertRepository.save(concert);
        return ConcertMapper.toDetailDto(saved);
    }

    @Transactional
    public ConcertDetailDto changeStatus(UUID id, Concert.Status newStatus) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + id));

        validateStatusTransition(concert.getStatus(), newStatus);

        concert.setStatus(newStatus);
        Concert saved = concertRepository.save(concert);
        return ConcertMapper.toDetailDto(saved);
    }

    @Transactional
    public void deleteConcert(UUID id) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + id));

        if (concert.getStatus() != Concert.Status.DRAFT) {
            throw new AppException(ErrorCode.CONCERT_NOT_DELETABLE,
                    "Cannot delete a concert with status: " + concert.getStatus());
        }

        // Cascade delete associated ticket types first due to ON DELETE RESTRICT DB constraint.
        // DRAFT status guarantees there are no active sales or check-ins.
        ticketTypeRepository.deleteByConcertId(id);

        concertRepository.delete(concert);
    }

    private void validateDates(OffsetDateTime eventDate, OffsetDateTime doorsOpenAt) {
        if (eventDate.isBefore(OffsetDateTime.now())) {
            throw new AppException(ErrorCode.INVALID_DATE, "Event date must be in the future");
        }
        if (doorsOpenAt != null && doorsOpenAt.isAfter(eventDate)) {
            throw new AppException(ErrorCode.INVALID_DATE, "Doors open time must be before event date");
        }
    }

    private void validateStatusTransition(Concert.Status currentStatus, Concert.Status newStatus) {
        if (currentStatus == newStatus) {
            return;
        }
        Set<Concert.Status> allowed = VALID_TRANSITIONS.get(currentStatus);
        if (allowed == null || !allowed.contains(newStatus)) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Cannot transition concert status from " + currentStatus + " to " + newStatus);
        }
    }
}
