package com.ticketbox.module.ticket.infrastructure;

import com.ticketbox.module.concert.ConcertOrderPort;
import com.ticketbox.module.concert.ConcertView;
import com.ticketbox.module.concert.TicketTypeView;
import com.ticketbox.module.ticket.OrderNotificationItemView;
import com.ticketbox.module.ticket.OrderNotificationView;
import com.ticketbox.module.ticket.OrderPort;
import com.ticketbox.module.ticket.OrderView;
import com.ticketbox.module.ticket.domain.Order;
import com.ticketbox.module.ticket.domain.OrderItem;
import com.ticketbox.module.ticket.domain.OrderItemRepository;
import com.ticketbox.module.ticket.domain.OrderRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OrderAdapter implements OrderPort {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ConcertOrderPort concertOrderPort;

    @Override
    public Optional<OrderView> findOrderById(UUID orderId) {
        return orderRepository.findById(orderId)
                .map(o -> new OrderView(
                        o.getId(),
                        o.getUserId(),
                        o.getTotalAmount(),
                        o.getStatus().name(),
                        o.getPaymentProvider() == null ? null : o.getPaymentProvider().name(),
                        o.getPaymentRef(),
                        o.getPaymentUrl()
                ));
    }

    @Override
    public Optional<OrderNotificationView> findNotificationViewByOrderId(UUID orderId) {
        return orderRepository.findById(orderId).flatMap(order -> {
            ConcertView concert = concertOrderPort.findConcertById(order.getConcertId()).orElse(null);
            if (concert == null) {
                return Optional.empty();
            }

            java.util.List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
            Map<UUID, String> ticketTypeNames = concertOrderPort
                    .findTicketTypesByIds(orderItems.stream().map(OrderItem::getTicketTypeId).toList())
                    .stream()
                    .collect(Collectors.toMap(TicketTypeView::id, TicketTypeView::name));

            java.util.List<OrderNotificationItemView> items = orderItems.stream()
                    .map(item -> new OrderNotificationItemView(
                            item.getTicketTypeId(),
                            ticketTypeNames.getOrDefault(item.getTicketTypeId(), "Ticket"),
                            item.getQuantity(),
                            item.getUnitPrice(),
                            item.getSubtotal()
                    ))
                    .toList();

            return Optional.of(new OrderNotificationView(
                    order.getId(),
                    order.getUserId(),
                    order.getConcertId(),
                    concert.title(),
                    concert.eventDate(),
                    null,
                    order.getTotalAmount(),
                    items
            ));
        });
    }

    @Override
    @Transactional
    public void markPaymentInitiated(UUID orderId, String provider, String providerRef, String paymentUrl) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));

        if (order.getStatus() != Order.Status.AWAITING_PAYMENT) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, "Order is not in payable status");
        }

        order.setPaymentProvider(Order.PaymentProvider.valueOf(provider));
        order.setPaymentRef(providerRef);
        order.setPaymentUrl(paymentUrl);
        orderRepository.save(order);
    }
}
