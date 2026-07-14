package com.ticketbox.module.ticket;

import java.util.Optional;
import java.util.UUID;

public interface OrderPort {
    Optional<OrderView> findOrderById(UUID orderId);

    Optional<OrderNotificationView> findNotificationViewByOrderId(UUID orderId);

    void markPaymentInitiated(UUID orderId, String provider, String providerRef, String paymentUrl);
}
