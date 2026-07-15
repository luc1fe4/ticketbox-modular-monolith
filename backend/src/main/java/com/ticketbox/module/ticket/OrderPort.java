package com.ticketbox.module.ticket;

import java.util.Optional;
import java.util.UUID;

public interface OrderPort {
    Optional<OrderView> findOrderById(UUID orderId);

    /**
     * Loads an order that the supplied user may still pay while holding a row lock.
     * An order that has crossed its payment deadline is expired and its inventory is
     * released before this method returns an error.
     */
    OrderView getPayableOrderForUser(UUID orderId, UUID userId);

    Optional<OrderNotificationView> findNotificationViewByOrderId(UUID orderId);

    void markPaymentInitiated(UUID orderId, String provider, String providerRef, String paymentUrl);
}
