package com.ticketbox.module.payment.application;

import com.ticketbox.shared.event.PaymentCompletedEvent;
import com.ticketbox.module.payment.application.gateway.PaymentGateway;
import com.ticketbox.module.payment.application.gateway.PaymentGatewayResolver;
import com.ticketbox.module.payment.application.gateway.PaymentInitiationResult;
import com.ticketbox.module.payment.application.gateway.PaymentWebhookResult;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.payment.domain.PaymentLogRepository;
import com.ticketbox.module.ticket.OrderPort;
import com.ticketbox.module.ticket.OrderView;
import com.ticketbox.module.payment.web.dto.PaymentInitiationResponse;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentLogRepository paymentLogRepository;
    private final OrderPort orderPort;
    private final ApplicationEventPublisher eventPublisher;
    private final PaymentGatewayResolver gatewayResolver;

    @Transactional(noRollbackFor = AppException.class)
    public PaymentInitiationResponse initiatePayment(UUID orderId, String providerName, UUID userId) {
        PaymentLog.Provider provider = parseProvider(providerName);
        OrderView order = orderPort.getPayableOrderForUser(orderId, userId);

        // A provider session has the same lifetime as the order hold (15 minutes).
        // Reusing it avoids duplicate third-party transactions when a customer comes
        // back from the gateway before that hold expires.
        if (order.paymentUrl() != null && provider.name().equals(order.paymentProvider())) {
            return new PaymentInitiationResponse(order.id(), provider.name(), order.paymentRef(), order.paymentUrl());
        }

        PaymentGateway gateway = gatewayResolver.resolve(provider);
        PaymentInitiationResult result = gateway.initiatePayment(order);

        if (!paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.INITIATED)) {
            PaymentLog initiatedLog = new PaymentLog();
            initiatedLog.setOrderId(orderId);
            initiatedLog.setProvider(result.provider());
            initiatedLog.setEventType(PaymentLog.EventType.INITIATED);
            initiatedLog.setAmount(order.totalAmount());
            initiatedLog.setProviderRef(result.providerRef());
            initiatedLog.setRawPayload(result.rawPayload());
            paymentLogRepository.save(initiatedLog);
        }

        orderPort.markPaymentInitiated(
                orderId,
                result.provider().name(),
                result.providerRef(),
                result.paymentUrl()
        );

        return new PaymentInitiationResponse(
                order.id(),
                result.provider().name(),
                result.providerRef(),
                result.paymentUrl()
        );
    }

    public PaymentStatusResponse getPaymentStatus(UUID orderId, UUID userId) {
        OrderView order = orderPort.findOrderById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng"));
        if (!order.userId().equals(userId)) {
            throw new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng");
        }
        return new PaymentStatusResponse(
                order.id(),
                order.status(),
                order.paymentProvider(),
                order.paymentRef(),
                order.totalAmount()
        );
    }

    @Transactional
    public WebhookHandleResult handleWebhook(PaymentLog.Provider provider, Map<String, String> payload) {
        PaymentGateway gateway = gatewayResolver.resolve(provider);
        PaymentWebhookResult result = gateway.verifyWebhook(payload);

        if (!result.valid()) {
            return new WebhookHandleResult("97", result.failureReason());
        }

        OrderView order = orderPort.findOrderById(result.orderId())
                .orElse(null);
        if (order == null) {
            return new WebhookHandleResult("01", "Không tìm thấy đơn hàng");
        }

        if (result.amount() == null || result.amount().compareTo(order.totalAmount()) != 0) {
            return new WebhookHandleResult("04", "Số tiền không hợp lệ");
        }

        if ("PAID".equals(order.status())
                || paymentLogRepository.existsByOrderIdAndEventType(result.orderId(), PaymentLog.EventType.SUCCESS)) {
            return new WebhookHandleResult("02", "Đơn hàng đã được xác nhận");
        }

        if (!"AWAITING_PAYMENT".equals(order.status())) {
            return new WebhookHandleResult("02", "Đơn hàng không thể thanh toán");
        }

        PaymentLog.EventType eventType = result.success()
                ? PaymentLog.EventType.SUCCESS
                : PaymentLog.EventType.FAILED;
        if (paymentLogRepository.existsByOrderIdAndEventType(result.orderId(), eventType)) {
            return new WebhookHandleResult("02", "Kết quả thanh toán đã được ghi nhận");
        }

        PaymentLog log = new PaymentLog();
        log.setOrderId(result.orderId());
        log.setProvider(provider);
        log.setEventType(eventType);
        log.setAmount(result.amount());
        log.setProviderRef(result.providerRef());
        log.setRawPayload(result.rawPayload());
        paymentLogRepository.save(log);

        if (!result.success()) {
            return new WebhookHandleResult("00", "Đã ghi nhận kết quả thanh toán thất bại");
        }

        eventPublisher.publishEvent(
                new PaymentCompletedEvent(
                        UUID.randomUUID(),
                        result.orderId(),
                        order.userId(),
                        provider.name(),
                        result.providerRef(),
                        result.amount(),
                        OffsetDateTime.now()
                )
        );

        return new WebhookHandleResult("00", "Xác nhận thành công");
    }

    @Transactional
    public void processMockPaymentSuccess(UUID orderId) {
        if (paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.SUCCESS)) {
            return;
        }

        OrderView order = orderPort.findOrderById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng"));

        if (!"AWAITING_PAYMENT".equals(order.status())) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, "Đơn hàng không ở trạng thái có thể thanh toán");
        }

        PaymentLog successLog = new PaymentLog();
        successLog.setOrderId(orderId);
        successLog.setProvider(PaymentLog.Provider.MOCK);
        successLog.setEventType(PaymentLog.EventType.SUCCESS);
        successLog.setAmount(order.totalAmount());
        successLog.setProviderRef("MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        successLog.setRawPayload("{\"status\":\"SUCCESS\", \"provider\":\"MOCK\"}");
        paymentLogRepository.save(successLog);

        eventPublisher.publishEvent(
                new PaymentCompletedEvent(
                        UUID.randomUUID(),
                        orderId,
                        order.userId(),
                        PaymentLog.Provider.MOCK.name(),
                        successLog.getProviderRef(),
                        order.totalAmount(),
                        OffsetDateTime.now()
                )
        );
    }

    @Transactional
    public void processMockPaymentFail(UUID orderId) {
        if (paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.FAILED)) {
            return;
        }

        OrderView order = orderPort.findOrderById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng"));

        PaymentLog failLog = new PaymentLog();
        failLog.setOrderId(orderId);
        failLog.setProvider(PaymentLog.Provider.MOCK);
        failLog.setEventType(PaymentLog.EventType.FAILED);
        failLog.setAmount(order.totalAmount());
        failLog.setProviderRef("MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        failLog.setRawPayload("{\"status\":\"FAILED\", \"provider\":\"MOCK\"}");
        paymentLogRepository.save(failLog);
    }

    private PaymentLog.Provider parseProvider(String providerName) {
        if (providerName == null || providerName.isBlank()) {
            return PaymentLog.Provider.MOCK;
        }
        try {
            return PaymentLog.Provider.valueOf(providerName.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Nhà cung cấp thanh toán không được hỗ trợ: " + providerName);
        }
    }

    public record WebhookHandleResult(String responseCode, String message) {
    }

    public record PaymentStatusResponse(
            UUID orderId,
            String orderStatus,
            String provider,
            String providerRef,
            java.math.BigDecimal amount
    ) {
    }
}
