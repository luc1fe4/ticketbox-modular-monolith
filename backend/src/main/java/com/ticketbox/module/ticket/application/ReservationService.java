package com.ticketbox.module.ticket.application;

import com.ticketbox.module.concert.ConcertOrderPort;
import com.ticketbox.module.concert.TicketTypeView;
import com.ticketbox.module.queue.QueueAccessPort;
import com.ticketbox.module.ticket.domain.Order;
import com.ticketbox.module.ticket.domain.OrderItemRepository;
import com.ticketbox.module.ticket.domain.TicketHold;
import com.ticketbox.module.ticket.domain.TicketHoldRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import com.ticketbox.shared.util.RedisKeyConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReservationService {

    private final TicketHoldRepository ticketHoldRepository;
    private final OrderItemRepository orderItemRepository;
    private final ConcertOrderPort concertOrderPort;
    private final QueueAccessPort queueAccessPort;
    private final StringRedisTemplate redisTemplate;

    private static final Collection<Order.Status> ACTIVE_STATUSES = List.of(Order.Status.AWAITING_PAYMENT, Order.Status.PAID);

    @Transactional
    public TicketHold reserve(UUID concertId, UUID ticketTypeId, int quantityRequest, UUID userId, String queueAccessToken) {
        queueAccessPort.validateAccess(concertId, userId, queueAccessToken);

        String sessionKey = RedisKeyConstants.QUEUE_SESSION + concertId + ":" + userId;
        Long expireSeconds = redisTemplate.getExpire(sessionKey, TimeUnit.SECONDS);
        if (expireSeconds == null || expireSeconds <= 0) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Your shopping session has expired.");
        }
        OffsetDateTime expiresAt = OffsetDateTime.now().plusSeconds(expireSeconds);

        List<TicketTypeView> ticketTypes = concertOrderPort.findTicketTypesByIds(List.of(ticketTypeId));
        if (ticketTypes.isEmpty()) {
            throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, "Ticket type not found: " + ticketTypeId);
        }
        TicketTypeView type = ticketTypes.get(0);
        if (!concertId.equals(type.concertId())) {
            throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, "Ticket type does not belong to this concert");
        }
        if (!type.isActive()) {
            throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, "Ticket type is not active");
        }

        int alreadyOrdered = orderItemRepository.sumQuantityByUserIdAndTicketTypeId(userId, ticketTypeId, ACTIVE_STATUSES);
        Optional<TicketHold> existingHoldOpt = ticketHoldRepository.findByUserIdAndConcertIdAndTicketTypeId(userId, concertId, ticketTypeId);
        int alreadyHeld = existingHoldOpt.map(TicketHold::getQuantity).orElse(0);

        if (alreadyOrdered + alreadyHeld + quantityRequest > type.maxPerAccount()) {
            throw new AppException(ErrorCode.TICKET_LIMIT_EXCEEDED,
                    "Hold limit exceeded for zone: " + type.name() + " (Max: " + type.maxPerAccount() + ")");
        }

        boolean reserved = concertOrderPort.reserveInventory(ticketTypeId, quantityRequest);
        if (!reserved) {
            throw new AppException(ErrorCode.TICKET_SOLD_OUT, "Tickets are sold out for zone: " + type.name());
        }

        TicketHold hold;
        if (existingHoldOpt.isPresent()) {
            hold = existingHoldOpt.get();
            hold.setQuantity(hold.getQuantity() + quantityRequest);
            hold.setExpiresAt(expiresAt);
        } else {
            hold = new TicketHold();
            hold.setConcertId(concertId);
            hold.setUserId(userId);
            hold.setTicketTypeId(ticketTypeId);
            hold.setQuantity(quantityRequest);
            hold.setExpiresAt(expiresAt);
        }

        return ticketHoldRepository.save(hold);
    }

    @Transactional
    public TicketHold release(UUID concertId, UUID ticketTypeId, int quantityRequest, UUID userId, String queueAccessToken) {
        queueAccessPort.validateAccess(concertId, userId, queueAccessToken);

        TicketHold hold = ticketHoldRepository.findByUserIdAndConcertIdAndTicketTypeId(userId, concertId, ticketTypeId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST, "No active hold found for this ticket type"));

        if (hold.getQuantity() < quantityRequest) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Cannot release more tickets than currently held");
        }

        concertOrderPort.releaseInventory(ticketTypeId, quantityRequest);

        int newQty = hold.getQuantity() - quantityRequest;
        if (newQty <= 0) {
            ticketHoldRepository.delete(hold);
            hold.setQuantity(0);
            return hold;
        } else {
            hold.setQuantity(newQty);
            return ticketHoldRepository.save(hold);
        }
    }

    public List<TicketHold> getCurrentHolds(UUID concertId, UUID userId, String queueAccessToken) {
        queueAccessPort.validateAccess(concertId, userId, queueAccessToken);
        return ticketHoldRepository.findByUserIdAndConcertId(userId, concertId);
    }

    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void cleanupExpiredHolds() {
        List<TicketHold> expiredHolds = ticketHoldRepository.findByExpiresAtBefore(OffsetDateTime.now());
        if (!expiredHolds.isEmpty()) {
            log.info("Found {} expired ticket holds to clean up", expiredHolds.size());
            for (TicketHold hold : expiredHolds) {
                try {
                    concertOrderPort.releaseInventory(hold.getTicketTypeId(), hold.getQuantity());
                    ticketHoldRepository.delete(hold);
                    log.info("Released {} tickets for expired hold of user {} for ticket type {}",
                            hold.getQuantity(), hold.getUserId(), hold.getTicketTypeId());
                } catch (Exception e) {
                    log.error("Failed to release inventory for expired hold {}", hold.getId(), e);
                }
            }
        }
    }

    @Transactional
    public void releaseAllHoldsForUserAndConcert(UUID userId, UUID concertId) {
        List<TicketHold> holds = ticketHoldRepository.findByUserIdAndConcertId(userId, concertId);
        if (!holds.isEmpty()) {
            for (TicketHold hold : holds) {
                concertOrderPort.releaseInventory(hold.getTicketTypeId(), hold.getQuantity());
            }
            ticketHoldRepository.deleteByUserIdAndConcertId(userId, concertId);
            log.info("Released all holds for user {} and concert {}", userId, concertId);
        }
    }
}
