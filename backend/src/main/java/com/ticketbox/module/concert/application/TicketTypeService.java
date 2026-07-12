package com.ticketbox.module.concert.application;

import com.ticketbox.module.concert.web.dto.CreateTicketTypeRequest;
import com.ticketbox.module.concert.web.dto.TicketTypeAvailabilityResponse;
import com.ticketbox.module.concert.web.dto.TicketTypeResponse;
import com.ticketbox.module.concert.web.dto.UpdateTicketTypeRequest;
import com.ticketbox.module.concert.application.mapper.TicketTypeMapper;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.module.concert.domain.TicketType;
import com.ticketbox.module.concert.domain.ConcertRepository;
import com.ticketbox.module.concert.domain.TicketTypeRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import com.ticketbox.shared.util.RedisKeyConstants;
import org.springframework.data.redis.core.RedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import java.util.concurrent.TimeUnit;
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
    private final TicketTypeMapper ticketTypeMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public List<TicketTypeResponse> getTicketTypes(UUID concertId) {
        verifyConcertExists(concertId);
        return ticketTypeRepository.findByConcertId(concertId).stream()
                .map(ticketTypeMapper::toResponse)
                .toList();
    }

    public List<TicketTypeResponse> getTicketTypesForAdmin(UUID concertId, UUID requesterId, boolean isAdmin) {
        Concert concert = getConcertOrThrow(concertId);
        verifyConcertOwnership(concert, requesterId, isAdmin);
        return getTicketTypes(concertId);
    }

    public List<TicketTypeResponse> getActiveTicketTypes(UUID concertId) {
        verifyConcertExists(concertId);
        return ticketTypeRepository.findByConcertIdAndIsActiveTrue(concertId).stream()
                .map(ticketTypeMapper::toResponse)
                .toList();
    }

    public List<TicketTypeResponse> getPublicTicketTypes(UUID concertId) {
        List<Concert.Status> publicStatuses = List.of(
                Concert.Status.ON_SALE,
                Concert.Status.SOLD_OUT
        );
        concertRepository.findByIdAndStatusInAndPublicVisibleTrue(concertId, publicStatuses)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Concert not found"));

        return ticketTypeRepository.findByConcertIdAndIsActiveTrue(concertId).stream()
                .map(ticketTypeMapper::toResponse)
                .toList();
    }

    public TicketTypeAvailabilityResponse getAvailability(UUID concertId) {
        String cacheKey = RedisKeyConstants.CACHE_AVAILABILITY + concertId;
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return objectMapper.convertValue(cached, TicketTypeAvailabilityResponse.class);
            }
        } catch (Exception e) {
            try { redisTemplate.delete(cacheKey); } catch (Exception ignored) {}
        }

        verifyConcertExists(concertId);
        List<TicketType> ticketTypes = ticketTypeRepository.findByConcertIdAndIsActiveTrue(concertId);
        
        List<TicketTypeAvailabilityResponse.AvailabilityItem> items = ticketTypes.stream()
                .map(tt -> new TicketTypeAvailabilityResponse.AvailabilityItem(
                        tt.getId(),
                        tt.getName(),
                        tt.getAvailableQty(),
                        tt.getTotalQuantity()
                )).toList();

        TicketTypeAvailabilityResponse result = new TicketTypeAvailabilityResponse(concertId, items, OffsetDateTime.now());
        
        try {
            redisTemplate.opsForValue().set(cacheKey, result, RedisKeyConstants.TTL_AVAILABILITY.getSeconds(), TimeUnit.SECONDS);
        } catch (Exception e) {}

        return result;
    }

    @Transactional
    public TicketTypeResponse createTicketType(UUID concertId, CreateTicketTypeRequest request, UUID requesterId, boolean isAdmin) {
        Concert concert = getConcertOrThrow(concertId);
        verifyConcertOwnership(concert, requesterId, isAdmin);
        TicketType ticketType = ticketTypeMapper.toEntity(request);
        ticketType.setConcertId(concertId);
        ticketType.setAvailableQty(request.totalQuantity());
        ticketType.setActive(true);

        TicketType saved = ticketTypeRepository.save(ticketType);
        evictTicketTypeCaches(concertId);
        return ticketTypeMapper.toResponse(saved);
    }

    @Transactional
    public TicketTypeResponse updateTicketType(UUID id, UpdateTicketTypeRequest request, UUID requesterId, boolean isAdmin) {
        TicketType ticketType = getTicketTypeOrThrow(id);
        Concert concert = getConcertOrThrow(ticketType.getConcertId());
        verifyConcertOwnership(concert, requesterId, isAdmin);
        
        if (ticketType.getAvailableQty() < ticketType.getTotalQuantity()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Cannot update ticket type after sales have begun");
        }

        int difference = request.totalQuantity() - ticketType.getTotalQuantity();
        ticketTypeMapper.updateTicketTypeFromRequest(request, ticketType);
        ticketType.setAvailableQty(ticketType.getAvailableQty() + difference);

        TicketType saved = ticketTypeRepository.save(ticketType);
        evictTicketTypeCaches(ticketType.getConcertId());
        return ticketTypeMapper.toResponse(saved);
    }

    @Transactional
    public TicketTypeResponse changeStatus(UUID id, boolean isActive, UUID requesterId, boolean isAdmin) {
        TicketType ticketType = getTicketTypeOrThrow(id);
        Concert concert = getConcertOrThrow(ticketType.getConcertId());
        verifyConcertOwnership(concert, requesterId, isAdmin);
        ticketType.setActive(isActive);
        TicketType saved = ticketTypeRepository.save(ticketType);
        evictTicketTypeCaches(ticketType.getConcertId());
        return ticketTypeMapper.toResponse(saved);
    }

    @Transactional
    public void deleteTicketType(UUID id, UUID requesterId, boolean isAdmin) {
        TicketType ticketType = getTicketTypeOrThrow(id);
        Concert concert = getConcertOrThrow(ticketType.getConcertId());
        verifyConcertOwnership(concert, requesterId, isAdmin);
        
        if (ticketType.getAvailableQty() < ticketType.getTotalQuantity()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Cannot delete ticket type that has active sales");
        }

        UUID concertId = ticketType.getConcertId();
        ticketTypeRepository.delete(ticketType);
        evictTicketTypeCaches(concertId);
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

    private void verifyConcertOwnership(Concert concert, UUID requesterId, boolean isAdmin) {
        if (!isAdmin && !concert.getCreatedBy().equals(requesterId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "You do not have permission to modify ticket types for this concert");
        }
    }

    private void evictTicketTypeCaches(UUID concertId) {
        try {
            redisTemplate.delete(RedisKeyConstants.CACHE_CONCERT_DETAIL + concertId);
            redisTemplate.delete(RedisKeyConstants.CACHE_AVAILABILITY + concertId);
            var listKeys = redisTemplate.keys(RedisKeyConstants.CACHE_CONCERT_LIST + ":page:*");
            if (listKeys != null && !listKeys.isEmpty()) {
                redisTemplate.delete(listKeys);
            }
        } catch (Exception ignored) {
            // Ticket changes must remain durable even if Redis is temporarily unavailable.
        }
    }
}
