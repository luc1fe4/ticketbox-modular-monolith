package com.ticketbox.module.concert.application;

import com.ticketbox.module.concert.application.dto.TicketTypeDto;
import com.ticketbox.module.concert.application.dto.CreateTicketTypeRequest;
import com.ticketbox.module.concert.application.dto.UpdateTicketTypeRequest;
import com.ticketbox.module.concert.application.dto.TicketTypeAvailabilityDto;
import com.ticketbox.module.concert.application.mapper.TicketTypeMapper;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.module.concert.domain.TicketType;
import com.ticketbox.module.concert.infrastructure.ConcertRepository;
import com.ticketbox.module.concert.infrastructure.TicketTypeRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketTypeService {

    private final TicketTypeRepository ticketTypeRepository;
    private final ConcertRepository concertRepository;

    public List<TicketTypeDto> getTicketTypes(UUID concertId) {
        verifyConcertExists(concertId);
        return ticketTypeRepository.findByConcertId(concertId).stream()
                .map(TicketTypeMapper::toDto)
                .toList();
    }

    public List<TicketTypeDto> getActiveTicketTypes(UUID concertId) {
        verifyConcertExists(concertId);
        return ticketTypeRepository.findByConcertIdAndIsActiveTrue(concertId).stream()
                .map(TicketTypeMapper::toDto)
                .toList();
    }

    public TicketTypeAvailabilityDto getAvailability(UUID concertId) {
        verifyConcertExists(concertId);
        List<TicketType> ticketTypes = ticketTypeRepository.findByConcertIdAndIsActiveTrue(concertId);
        
        List<TicketTypeAvailabilityDto.AvailabilityItem> items = ticketTypes.stream()
                .map(tt -> new TicketTypeAvailabilityDto.AvailabilityItem(
                        tt.getId(),
                        tt.getName(),
                        tt.getAvailableQty(),
                        tt.getTotalQuantity()
                )).toList();

        return new TicketTypeAvailabilityDto(concertId, items, OffsetDateTime.now());
    }

    @Transactional
    public TicketTypeDto createTicketType(UUID concertId, CreateTicketTypeRequest request) {
        Concert concert = getConcertOrThrow(concertId);
        validateDates(request.saleStartAt(), request.saleEndAt(), concert.getEventDate());

        TicketType ticketType = TicketTypeMapper.toEntity(concertId, request);
        TicketType saved = ticketTypeRepository.save(ticketType);
        return TicketTypeMapper.toDto(saved);
    }

    @Transactional
    public TicketTypeDto updateTicketType(UUID id, UpdateTicketTypeRequest request) {
        TicketType ticketType = getTicketTypeOrThrow(id);
        Concert concert = getConcertOrThrow(ticketType.getConcertId());
        
        validateDates(request.saleStartAt(), request.saleEndAt(), concert.getEventDate());

        if (ticketType.getAvailableQty() < ticketType.getTotalQuantity()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Cannot update ticket type after sales have begun");
        }

        TicketTypeMapper.updateEntity(ticketType, request);
        TicketType saved = ticketTypeRepository.save(ticketType);
        return TicketTypeMapper.toDto(saved);
    }

    @Transactional
    public TicketTypeDto changeStatus(UUID id, boolean isActive) {
        TicketType ticketType = getTicketTypeOrThrow(id);
        ticketType.setActive(isActive);
        TicketType saved = ticketTypeRepository.save(ticketType);
        return TicketTypeMapper.toDto(saved);
    }

    @Transactional
    public void deleteTicketType(UUID id) {
        TicketType ticketType = getTicketTypeOrThrow(id);
        
        if (ticketType.getAvailableQty() < ticketType.getTotalQuantity()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Cannot delete ticket type that has active sales");
        }

        ticketTypeRepository.delete(ticketType);
    }

    private Concert getConcertOrThrow(UUID concertId) {
        return concertRepository.findById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Concert not found"));
    }

    private TicketType getTicketTypeOrThrow(UUID id) {
        return ticketTypeRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Ticket type not found"));
    }

    private void verifyConcertExists(UUID concertId) {
        if (!concertRepository.existsById(concertId)) {
            throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Concert not found");
        }
    }

    private void validateDates(OffsetDateTime start, OffsetDateTime end, OffsetDateTime concertDate) {
        if (start.isAfter(concertDate)) {
            throw new AppException(ErrorCode.INVALID_DATE, "Sale start date must be before or equal to concert date");
        }
        if (end != null) {
            if (end.isBefore(start)) {
                throw new AppException(ErrorCode.INVALID_DATE, "Sale end date must be after start date");
            }
            if (end.isAfter(concertDate)) {
                throw new AppException(ErrorCode.INVALID_DATE, "Sale end date must be before or equal to concert date");
            }
        }
    }
}
