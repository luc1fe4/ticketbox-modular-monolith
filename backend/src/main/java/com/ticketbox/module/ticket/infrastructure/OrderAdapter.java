package com.ticketbox.module.ticket.infrastructure;

import com.ticketbox.module.ticket.OrderPort;
import com.ticketbox.module.ticket.OrderView;
import com.ticketbox.module.ticket.domain.Order;
import com.ticketbox.module.ticket.domain.OrderRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrderAdapter implements OrderPort {
    private final OrderRepository orderRepository;

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
