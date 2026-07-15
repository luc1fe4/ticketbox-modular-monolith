package com.ticketbox.module.payment.application.gateway;

import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.ticket.OrderView;

import java.util.Map;

public interface PaymentGateway {
    PaymentLog.Provider provider();

    PaymentInitiationResult initiatePayment(OrderView order);

    PaymentWebhookResult verifyWebhook(Map<String, String> params);
}
