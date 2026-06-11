package com.ticketbox.module.concert.application;

import com.ticketbox.module.concert.web.dto.ConcertDetailResponse;
import com.ticketbox.module.concert.web.dto.ConcertSeatMapResponse;
import com.ticketbox.module.concert.web.dto.ConcertSummaryResponse;
import com.ticketbox.module.concert.web.dto.CreateConcertRequest;
import com.ticketbox.module.concert.web.dto.SeatMapZoneResponse;
import com.ticketbox.module.concert.web.dto.UpdateConcertRequest;
import com.ticketbox.module.concert.application.mapper.ConcertMapper;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.module.concert.domain.ConcertRepository;
import com.ticketbox.module.concert.domain.TicketTypeRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.util.RedisKeyConstants;
import org.springframework.data.redis.core.RedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.TimeUnit;
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
    private final ConcertMapper concertMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final Map<Concert.Status, Set<Concert.Status>> VALID_TRANSITIONS = Map.of(
            Concert.Status.DRAFT, Set.of(Concert.Status.ON_SALE, Concert.Status.CANCELLED),
            Concert.Status.ON_SALE, Set.of(Concert.Status.SOLD_OUT, Concert.Status.CANCELLED, Concert.Status.COMPLETED),
            Concert.Status.SOLD_OUT, Set.of(Concert.Status.ON_SALE, Concert.Status.CANCELLED, Concert.Status.COMPLETED)
    );

    public ConcertService(ConcertRepository concertRepository, TicketTypeRepository ticketTypeRepository, ConcertMapper concertMapper, RedisTemplate<String, Object> redisTemplate, ObjectMapper objectMapper) {
        this.concertRepository = concertRepository;
        this.ticketTypeRepository = ticketTypeRepository;
        this.concertMapper = concertMapper;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @SuppressWarnings("unchecked")
    public Page<ConcertSummaryResponse> getPublicConcerts(Pageable pageable) {
        String cacheKey = RedisKeyConstants.CACHE_CONCERT_LIST + ":page:" + pageable.getPageNumber() + ":size:" + pageable.getPageSize();
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                if (cached instanceof Page) {
                    return (Page<ConcertSummaryResponse>) cached;
                }
                return objectMapper.convertValue(cached, new com.fasterxml.jackson.core.type.TypeReference<Page<ConcertSummaryResponse>>() {});
            }
        } catch (Exception e) {
            try { redisTemplate.delete(cacheKey); } catch (Exception ignored) {}
        }

        List<Concert.Status> publicStatuses = List.of(
                Concert.Status.ON_SALE,
                Concert.Status.SOLD_OUT
        );

        Page<ConcertSummaryResponse> result = concertRepository.findByStatusIn(publicStatuses, pageable)
                .map(concertMapper::toSummaryResponse);

        try {
            redisTemplate.opsForValue().set(cacheKey, result, RedisKeyConstants.TTL_CONCERT_LIST.getSeconds(), TimeUnit.SECONDS);
        } catch (Exception e) {
        }

        return result;
    }

    public ConcertDetailResponse getConcertDetail(UUID concertId) {
        String cacheKey = RedisKeyConstants.CACHE_CONCERT_DETAIL + concertId;
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.convertValue(cached, ConcertDetailResponse.class);
            }
        } catch (Exception e) {
            try { redisTemplate.delete(cacheKey); } catch (Exception ignored) {}
        }

        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + concertId));

        ConcertDetailResponse result = concertMapper.toDetailResponse(concert);
        try {
            redisTemplate.opsForValue().set(cacheKey, result, RedisKeyConstants.TTL_CONCERT_DETAIL.getSeconds(), TimeUnit.SECONDS);
        } catch (Exception e) {}
        return result;
    }

    public ConcertSeatMapResponse getConcertSeatMap(UUID concertId) {
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + concertId));

        List<SeatMapZoneResponse> zones = ticketTypeRepository
                .findActiveByConcertIdOrderByPrice(concertId)
                .stream()
                .map(ticketType -> new SeatMapZoneResponse(
                        ticketType.getId(),
                        ticketType.getName(),
                        ticketType.getZoneColor(),
                        ticketType.getPrice(),
                        ticketType.getTotalQuantity(),
                        ticketType.getAvailableQty()
                ))
                .toList();

        return new ConcertSeatMapResponse(concert.getId(), concert.getSeatMapSvg(), zones);
    }

    public Page<ConcertDetailResponse> getAllConcerts(Concert.Status status, Pageable pageable) {
        Page<Concert> concerts;
        if (status != null) {
            concerts = concertRepository.findByStatus(status, pageable);
        } else {
            concerts = concertRepository.findAll(pageable);
        }
        return concerts.map(concertMapper::toDetailResponse);
    }

    @Transactional
    public ConcertDetailResponse createConcert(CreateConcertRequest request, UUID organizerId) {
        validateDates(request.eventDate(), request.doorsOpenAt());

        Concert concert = concertMapper.toEntity(request);
        concert.setCreatedBy(organizerId);
        concert.setStatus(Concert.Status.DRAFT);

        Concert saved = concertRepository.save(concert);
        return concertMapper.toDetailResponse(saved);
    }

    @Transactional
    public ConcertDetailResponse updateConcert(UUID id, UpdateConcertRequest request) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + id));

        if (concert.getStatus() == Concert.Status.COMPLETED || concert.getStatus() == Concert.Status.CANCELLED) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Cannot update concert information in " + concert.getStatus() + " status");
        }

        validateDates(request.eventDate(), request.doorsOpenAt());

        concertMapper.updateConcertFromRequest(request, concert);

        Concert saved = concertRepository.save(concert);
        return concertMapper.toDetailResponse(saved);
    }

    @Transactional
    public ConcertDetailResponse changeStatus(UUID id, Concert.Status newStatus) {
        Concert concert = concertRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + id));

        validateStatusTransition(concert.getStatus(), newStatus);

        concert.setStatus(newStatus);
        Concert saved = concertRepository.save(concert);
        return concertMapper.toDetailResponse(saved);
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
