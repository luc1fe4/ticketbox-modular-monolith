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
import com.ticketbox.module.ticket.web.dto.CreateOrderRequest;
import com.ticketbox.module.ticket.web.dto.OrderItemRequest;
import com.ticketbox.module.ticket.web.dto.OrderItemResponse;
import com.ticketbox.module.ticket.web.dto.OrderResponse;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final ConcertOrderPort concertOrderPort;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderMapper orderMapper;
    private final IdempotencyService idempotencyService;

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, UUID userId, String idempotencyKey) {
        // 1. Check idempotency
        if (idempotencyKey != null) {
            idempotencyService.checkAndStore(idempotencyKey);
        }

        // 2. Validate concert exists and is ON_SALE
        ConcertView concert = concertOrderPort.findConcertById(request.concertId())
                .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Concert not found"));

        if (!"ON_SALE".equals(concert.status())) {
            throw new AppException(ErrorCode.CONCERT_NOT_ON_SALE, "Concert is not currently on sale");
        }

        // 3. Load requested TicketTypes
        List<UUID> ticketTypeIds = request.items().stream()
                .map(OrderItemRequest::ticketTypeId)
                .toList();

        List<TicketTypeView> ticketTypes = concertOrderPort.findTicketTypesByIds(ticketTypeIds);
        Map<UUID, TicketTypeView> typeMap = ticketTypes.stream()
                .collect(Collectors.toMap(TicketTypeView::id, t -> t));

        // 4. Validate TicketTypes and calculate pricing
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        OffsetDateTime now = OffsetDateTime.now();

        for (OrderItemRequest itemRequest : request.items()) {
            TicketTypeView type = typeMap.get(itemRequest.ticketTypeId());
            
            // Check if ticket type exists
            if (type == null) {
                throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, 
                        "Ticket type not found: " + itemRequest.ticketTypeId());
            }

            // Check if belongs to correct concert
            if (!request.concertId().equals(type.concertId())) {
                throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, 
                        "Ticket type does not belong to this concert");
            }

            // Check if ticket type is active
            if (!type.isActive()) {
                throw new AppException(ErrorCode.TICKET_TYPE_NOT_IN_CONCERT, 
                        "Ticket type is not active");
            }

            // Check sale window (saleStartAt <= now <= saleEndAt)
            if (type.saleStartAt().isAfter(now) || (type.saleEndAt() != null && type.saleEndAt().isBefore(now))) {
                throw new AppException(ErrorCode.SALE_NOT_OPEN, 
                        "Ticket sale has not started or has ended for: " + type.name());
            }

            // Calculate subtotal
            BigDecimal unitPrice = type.price();
            BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemRequest.quantity()));
            totalAmount = totalAmount.add(subtotal);

            // Populate OrderItem entity
            OrderItem orderItem = new OrderItem();
            orderItem.setTicketTypeId(type.id());
            orderItem.setQuantity(itemRequest.quantity());
            orderItem.setUnitPrice(unitPrice);
            orderItem.setSubtotal(subtotal);
            orderItems.add(orderItem);
        }

        // 5. Create and save the Order
        Order order = new Order();
        order.setUserId(userId);
        order.setConcertId(request.concertId());
        order.setStatus(Order.Status.AWAITING_PAYMENT);
        order.setTotalAmount(totalAmount);
        order.setIdempotencyKey(idempotencyKey);
        order.setExpiresAt(now.plusMinutes(15));
        
        Order savedOrder = orderRepository.save(order);

        // 6. Link and save OrderItems
        for (OrderItem orderItem : orderItems) {
            orderItem.setOrderId(savedOrder.getId());
        }
        orderItemRepository.saveAll(orderItems);

        // 7. Construct and return response
        List<OrderItemResponse> itemResponses = orderItems.stream()
                .map(item -> {
                    String typeName = typeMap.get(item.getTicketTypeId()).name();
                    return orderMapper.toItemResponse(item, typeName);
                })
                .toList();

        return orderMapper.toResponse(savedOrder, itemResponses, concert.title());
    }

    public List<OrderResponse> listUserOrders(UUID userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (orders.isEmpty()) {
            return Collections.emptyList();
        }

        // Batch load all items
        List<UUID> orderIds = orders.stream().map(Order::getId).toList();
        List<OrderItem> allItems = orderItemRepository.findByOrderIdIn(orderIds);
        Map<UUID, List<OrderItem>> itemsByOrderId = allItems.stream()
                .collect(Collectors.groupingBy(OrderItem::getOrderId));

        // Batch load all concert views
        Set<UUID> concertIds = orders.stream().map(Order::getConcertId).collect(Collectors.toSet());
        List<ConcertView> concerts = concertOrderPort.findConcertsByIds(concertIds);
        Map<UUID, String> concertTitles = concerts.stream()
                .collect(Collectors.toMap(ConcertView::id, ConcertView::title));

        // Batch load all ticket type views
        Set<UUID> ticketTypeIds = allItems.stream().map(OrderItem::getTicketTypeId).collect(Collectors.toSet());
        List<TicketTypeView> ticketTypes = concertOrderPort.findTicketTypesByIds(ticketTypeIds);
        Map<UUID, String> ticketTypeNames = ticketTypes.stream()
                .collect(Collectors.toMap(TicketTypeView::id, TicketTypeView::name));

        // Map everything together
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
}
