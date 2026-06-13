package com.ticketbox.module.ticket.application;

import com.ticketbox.module.payment.PaymentCompletedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PaymentCompletedListener {
    private final OrderService orderService;

    @ApplicationModuleListener
    public void on(PaymentCompletedEvent event) {
        orderService.handlePaymentSuccess(event.orderId(), event.provider(), event.providerRef());
    }
}
