package com.ticketbox.module.payment.application;

import com.ticketbox.shared.event.PaymentCompletedEvent;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.payment.domain.PaymentLogRepository;
import com.ticketbox.module.ticket.OrderPort;
import com.ticketbox.module.ticket.OrderView;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentLogRepository paymentLogRepository;
    private final OrderPort orderPort;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void processMockPaymentSuccess(UUID orderId) {
        // Idempotency: Check if success is already logged for this orderId
        if (paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.SUCCESS)) {
            return;
        }

        OrderView order = orderPort.findOrderById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));

        if (!"AWAITING_PAYMENT".equals(order.status())) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, "Order is not in payable status");
        }

        // Save Success Log
        PaymentLog successLog = new PaymentLog();
        successLog.setOrderId(orderId);
        successLog.setProvider(PaymentLog.Provider.MOCK);
        successLog.setEventType(PaymentLog.EventType.SUCCESS);
        successLog.setAmount(order.totalAmount());
        successLog.setProviderRef("MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        successLog.setRawPayload("{\"status\":\"SUCCESS\", \"provider\":\"MOCK\"}");
        paymentLogRepository.save(successLog);

        // Publish event to notify ticket module
        eventPublisher.publishEvent(new PaymentCompletedEvent(
                orderId,
                PaymentLog.Provider.MOCK.name(),
                successLog.getProviderRef(),
                order.totalAmount()
        ));
    }

    @Transactional
    public void processMockPaymentFail(UUID orderId) {
        if (paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.FAILED)) {
            return;
        }

        OrderView order = orderPort.findOrderById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));

        PaymentLog failLog = new PaymentLog();
        failLog.setOrderId(orderId);
        failLog.setProvider(PaymentLog.Provider.MOCK);
        failLog.setEventType(PaymentLog.EventType.FAILED);
        failLog.setAmount(order.totalAmount());
        failLog.setProviderRef("MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        failLog.setRawPayload("{\"status\":\"FAILED\", \"provider\":\"MOCK\"}");
        paymentLogRepository.save(failLog);
    }
}
