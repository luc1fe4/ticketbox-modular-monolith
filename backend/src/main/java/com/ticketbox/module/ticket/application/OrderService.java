package com.ticketbox.module.ticket.application;

import com.ticketbox.infrastructure.redis.IdempotencyService;

import com.ticketbox.module.concert.ConcertOrderPort;
import com.ticketbox.module.concert.ConcertView;
import com.ticketbox.module.concert.TicketTypeView;
import com.ticketbox.module.ticket.application.mapper.OrderMapper;
import com.ticketbox.module.ticket.domain.Order;
import com.ticketbox.module.ticket.domain.OrderItem;
import com.ticketbox.module.ticket.domain.OrderItemRepository;
import com.ticketbox.module.ticket.domain.OrderRepository;
import com.ticketbox.module.ticket.domain.Ticket;
import com.ticketbox.module.ticket.domain.TicketRepository;
import com.ticketbox.module.ticket.application.util.TicketQrGenerator;
import com.ticketbox.module.ticket.web.dto.CreateOrderRequest;
import com.ticketbox.module.ticket.web.dto.OrderItemRequest;
import com.ticketbox.module.ticket.web.dto.OrderItemResponse;
import com.ticketbox.module.ticket.web.dto.OrderResponse;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.DuplicateIdempotencyKeyException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrderService {

    private final ConcertOrderPort concertOrderPort;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderMapper orderMapper;
    private final StringRedisTemplate redisTemplate;
    private final TicketRepository ticketRepository;
    private final IdempotencyService idempotencyService;

    private static final RedisScript<Long> RELEASE_LOCK_SCRIPT = RedisScript.of(
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
            "  return redis.call('del', KEYS[1]) " +
            "else " +
            "  return 0 " +
            "end",
            Long.class);

    private static final List<Order.Status> ACTIVE_STATUSES = List.of(Order.Status.AWAITING_PAYMENT, Order.Status.PAID);
    private static final int EXPIRED_ORDER_BATCH_SIZE = 100;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, UUID userId, String idempotencyKey) {
        IdempotencyService.IdempotencyClaim claim =
                idempotencyService.claimOrder(userId, idempotencyKey);

        try {
            orderRepository.findByUserIdAndIdempotencyKey(
                            userId,
                            claim.clientKey()
                    )
                    .ifPresent(existing -> {
                        throw new DuplicateIdempotencyKeyException(claim.clientKey());
                    });

            return createOrderInsideClaim(request, userId, claim);
        } catch (RuntimeException ex) {
            idempotencyService.release(claim);
            throw ex;
        }
    }

    private OrderResponse createOrderInsideClaim(
            CreateOrderRequest request,
            UUID userId,
            IdempotencyService.IdempotencyClaim claim
    ) {
        String lockKey = "lock:user:" + userId;
        String lockToken = UUID.randomUUID().toString();
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, lockToken, Duration.ofSeconds(5));
        if (Boolean.FALSE.equals(acquired)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Another request is being processed. Please try again.");
        }

        try {
            ConcertView concert = concertOrderPort.findConcertById(request.concertId())
                    .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Concert not found"));

            if (!"ON_SALE".equals(concert.status())) {
                throw new AppException(ErrorCode.CONCERT_NOT_ON_SALE, "Concert is not currently on sale");
            }

            List<UUID> ticketTypeIds = request.items().stream()
                    .map(OrderItemRequest::ticketTypeId)
                    .toList();

            List<TicketTypeView> ticketTypes = concertOrderPort.findTicketTypesByIds(ticketTypeIds);
            Map<UUID, TicketTypeView> typeMap = ticketTypes.stream()
                    .collect(Collectors.toMap(TicketTypeView::id, t -> t));

            BigDecimal totalAmount = BigDecimal.ZERO;
            List<OrderItem> orderItems = new ArrayList<>();
            OffsetDateTime now = OffsetDateTime.now();

            for (OrderItemRequest itemRequest : request.items()) {
                TicketTypeView type = typeMap.get(itemRequest.ticketTypeId());
                
                if (type == null) {
                    throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, 
                            "Ticket type not found: " + itemRequest.ticketTypeId());
                }

                if (!request.concertId().equals(type.concertId())) {
                    throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, 
                            "Ticket type does not belong to this concert");
                }

                if (!type.isActive()) {
                    throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, 
                            "Ticket type is not active");
                }

                if (type.saleStartAt().isAfter(now) || (type.saleEndAt() != null && type.saleEndAt().isBefore(now))) {
                    throw new AppException(ErrorCode.SALE_NOT_OPEN, 
                            "Ticket sale has not started or has ended for: " + type.name());
                }

                int alreadyOrdered = orderItemRepository.sumQuantityByUserIdAndTicketTypeId(userId, type.id(), ACTIVE_STATUSES);
                if (alreadyOrdered + itemRequest.quantity() > type.maxPerAccount()) {
                    throw new AppException(ErrorCode.TICKET_LIMIT_EXCEEDED, 
                            "Purchase limit exceeded for zone: " + type.name() + " (Max: " + type.maxPerAccount() + ")");
                }

                boolean reserved = concertOrderPort.reserveInventory(type.id(), itemRequest.quantity());
                if (!reserved) {
                    throw new AppException(ErrorCode.TICKET_SOLD_OUT, 
                            "Tickets are sold out for zone: " + type.name());
                }

                BigDecimal unitPrice = type.price();
                BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemRequest.quantity()));
                totalAmount = totalAmount.add(subtotal);

                OrderItem orderItem = new OrderItem();
                orderItem.setTicketTypeId(type.id());
                orderItem.setQuantity(itemRequest.quantity());
                orderItem.setUnitPrice(unitPrice);
                orderItem.setSubtotal(subtotal);
                orderItems.add(orderItem);
            }

            Order order = new Order();
            order.setUserId(userId);
            order.setConcertId(request.concertId());
            order.setStatus(Order.Status.AWAITING_PAYMENT);
            order.setTotalAmount(totalAmount);
            order.setIdempotencyKey(claim.clientKey());
            order.setExpiresAt(now.plusMinutes(15));
            
            Order savedOrder = orderRepository.save(order);

            for (OrderItem orderItem : orderItems) {
                orderItem.setOrderId(savedOrder.getId());
            }
            orderItemRepository.saveAll(orderItems);

            List<OrderItemResponse> itemResponses = orderItems.stream()
                    .map(item -> {
                        String typeName = typeMap.get(item.getTicketTypeId()).name();
                        return orderMapper.toItemResponse(item, typeName);
                    })
                    .toList();

            OrderResponse response = orderMapper.toResponse(savedOrder, itemResponses, concert.title());

            idempotencyService.completeAfterCommit(claim, savedOrder.getId());
            return response;

        } finally {
            redisTemplate.execute(RELEASE_LOCK_SCRIPT, List.of(lockKey), lockToken);
        }
    }

    public List<OrderResponse> listUserOrders(UUID userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (orders.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> orderIds = orders.stream().map(Order::getId).toList();
        List<OrderItem> allItems = orderItemRepository.findByOrderIdIn(orderIds);
        Map<UUID, List<OrderItem>> itemsByOrderId = allItems.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));

        Set<UUID> concertIds = orders.stream().map(Order::getConcertId).collect(Collectors.toSet());
        List<ConcertView> concerts = concertOrderPort.findConcertsByIds(concertIds);
        Map<UUID, String> concertTitles = concerts.stream()
                .collect(Collectors.toMap(ConcertView::id, ConcertView::title));

        Set<UUID> ticketTypeIds = allItems.stream().map(OrderItem::getTicketTypeId).collect(Collectors.toSet());
        List<TicketTypeView> ticketTypes = concertOrderPort.findTicketTypesByIds(ticketTypeIds);
        Map<UUID, String> ticketTypeNames = ticketTypes.stream()
                .collect(Collectors.toMap(TicketTypeView::id, TicketTypeView::name));

        return orders.stream().map(order -> {
            List<OrderItem> orderItems = itemsByOrderId.getOrDefault(order.getId(), Collections.emptyList());
            List<OrderItemResponse> itemResponses = orderItems.stream()
                    .map(item -> {
                        String typeName = ticketTypeNames.getOrDefault(item.getTicketTypeId(), "Unknown Type");
                        return orderMapper.toItemResponse(item, typeName);
                    })
                    .toList();

            String concertTitle = concertTitles.getOrDefault(order.getConcertId(), "Unknown Concert");
            return orderMapper.toResponse(order, itemResponses, concertTitle);
        }).toList();
    }

    public OrderResponse getOrderDetail(UUID id, UUID userId) {
        Order order = orderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        ConcertView concert = concertOrderPort.findConcertById(order.getConcertId())
                .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Concert not found"));

        List<UUID> ticketTypeIds = items.stream().map(OrderItem::getTicketTypeId).toList();
        List<TicketTypeView> ticketTypes = concertOrderPort.findTicketTypesByIds(ticketTypeIds);
        Map<UUID, String> ticketTypeNames = ticketTypes.stream()
                .collect(Collectors.toMap(TicketTypeView::id, TicketTypeView::name));

        List<OrderItemResponse> itemResponses = items.stream()
                .map(item -> {
                    String typeName = ticketTypeNames.getOrDefault(item.getTicketTypeId(), "Unknown Type");
                    return orderMapper.toItemResponse(item, typeName);
                })
                .toList();

        return orderMapper.toResponse(order, itemResponses, concert.title());
    }

    @Scheduled(fixedDelayString = "${ticketbox.orders.expiration.fixed-delay-ms:60000}")
    @Transactional
    public void expireAwaitingPaymentOrders() {
        List<Order> expiredOrders = orderRepository.findExpiredAwaitingPaymentOrders(
                Order.Status.AWAITING_PAYMENT,
                OffsetDateTime.now(),
                PageRequest.of(0, EXPIRED_ORDER_BATCH_SIZE)
        );

        int releasedTickets = 0;
        for (Order order : expiredOrders) {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

            for (OrderItem item : items) {
                concertOrderPort.releaseInventory(item.getTicketTypeId(), item.getQuantity());
                releasedTickets += item.getQuantity();
            }

            order.setStatus(Order.Status.EXPIRED);
            orderRepository.save(order);
        }

        if (!expiredOrders.isEmpty()) {
            log.info(
                    "Expired {} awaiting-payment orders and released {} tickets back to inventory",
                    expiredOrders.size(),
                    releasedTickets
            );
        }
    }

    @Transactional
    public void handlePaymentSuccess(UUID orderId, String provider, String providerRef) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));

        if (order.getStatus() == Order.Status.PAID) {
            return;
        }

        if (order.getStatus() != Order.Status.AWAITING_PAYMENT) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Cannot mark order as PAID from status: " + order.getStatus());
        }

        order.setStatus(Order.Status.PAID);
        order.setPaidAt(OffsetDateTime.now());
        order.setPaymentProvider(Order.PaymentProvider.valueOf(provider));
        order.setPaymentRef(providerRef);
        orderRepository.save(order);

        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        List<Ticket> ticketsToSave = new ArrayList<>();

        for (OrderItem item : items) {
            for (int i = 0; i < item.getQuantity(); i++) {
                Ticket ticket = new Ticket();
                ticket.setOrderItemId(item.getId());
                ticket.setTicketTypeId(item.getTicketTypeId());
                ticket.setConcertId(order.getConcertId());
                ticket.setUserId(order.getUserId());
                ticket.setStatus(Ticket.Status.VALID);
                
                String qrSecret = UUID.randomUUID().toString();
                ticket.setQrSecret(qrSecret);

                String qrCode = TicketQrGenerator.generateQrToken(
                        ticket.getConcertId(),
                        ticket.getTicketTypeId(),
                        ticket.getUserId(),
                        qrSecret
                );
                ticket.setQrCode(qrCode);
                
                ticketsToSave.add(ticket);
            }
        }
        ticketRepository.saveAll(ticketsToSave);
    }
}
