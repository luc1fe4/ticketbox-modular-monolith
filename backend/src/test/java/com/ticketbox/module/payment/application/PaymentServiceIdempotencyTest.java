package com.ticketbox.module.payment.application;

import com.ticketbox.module.payment.application.gateway.PaymentGateway;
import com.ticketbox.module.payment.application.gateway.PaymentGatewayResolver;
import com.ticketbox.module.payment.application.gateway.PaymentWebhookResult;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.payment.domain.PaymentLogRepository;
import com.ticketbox.module.ticket.OrderPort;
import com.ticketbox.module.ticket.OrderView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import com.ticketbox.shared.event.PaymentCompletedEvent;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceIdempotencyTest {

    @Mock
    private PaymentLogRepository paymentLogRepository;

    @Mock
    private OrderPort orderPort;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private PaymentGatewayResolver gatewayResolver;

    @Mock
    private PaymentGateway paymentGateway;

    @InjectMocks
    private PaymentService paymentService;

    private UUID orderId;
    private UUID userId;
    private BigDecimal amount;
    private Map<String, String> payload;
    private OrderView orderAwaitingPayment;
    private OrderView orderPaid;

    @BeforeEach
    void setUp() {
        orderId = UUID.randomUUID();
        userId = UUID.randomUUID();
        amount = new BigDecimal("500000");
        payload = new HashMap<>();

        orderAwaitingPayment = new OrderView(
                orderId,
                userId,
                amount,
                "AWAITING_PAYMENT",
                "MOCK",
                null,
                null
        );

        orderPaid = new OrderView(
                orderId,
                userId,
                amount,
                "PAID",
                "MOCK",
                null,
                null
        );
    }

    @Test
    @DisplayName("Webhook sequential retry: first success, second returns duplicate code 02")
    void testWebhookSequentialRetryIdempotency() {
        // Cấu hình mock cho lần gọi đầu tiên
        when(gatewayResolver.resolve(PaymentLog.Provider.MOCK)).thenReturn(paymentGateway);
        
        PaymentWebhookResult successResult = new PaymentWebhookResult(
                true, // valid payload
                true, // success payment
                orderId,
                "MOCK-TXN-123",
                amount,
                "{}",
                null
        );
        when(paymentGateway.verifyWebhook(payload)).thenReturn(successResult);
        when(orderPort.findOrderById(orderId)).thenReturn(Optional.of(orderAwaitingPayment));
        
        // Trong lần gọi 1, chưa tồn tại log SUCCESS nào trong database
        when(paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.SUCCESS))
                .thenReturn(false);

        // Thực hiện cuộc gọi Webhook lần 1
        PaymentService.WebhookHandleResult firstResult = paymentService.handleWebhook(PaymentLog.Provider.MOCK, payload);
        
        // Đảm bảo lần 1 xử lý thành công (code "00"), lưu log và phát event phát vé
        assertThat(firstResult.responseCode()).isEqualTo("00");
        assertThat(firstResult.message()).isEqualTo("Confirm Success");
        verify(paymentLogRepository, times(1)).save(any(PaymentLog.class));
        verify(eventPublisher, times(1)).publishEvent(any(PaymentCompletedEvent.class));

        // Giả lập cuộc gọi Webhook lần 2 (cổng thanh toán gửi trùng lặp/retry)
        // Lúc này, log SUCCESS đã được lưu trong hệ thống
        when(paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.SUCCESS))
                .thenReturn(true);

        // Thực hiện cuộc gọi Webhook lần 2
        PaymentService.WebhookHandleResult secondResult = paymentService.handleWebhook(PaymentLog.Provider.MOCK, payload);

        // Đảm bảo lần 2 trả về mã trùng lặp "02" và KHÔNG thực hiện lưu log hay phát event lần nữa
        assertThat(secondResult.responseCode()).isEqualTo("02");
        assertThat(secondResult.message()).isEqualTo("Order already confirmed");
        
        // Kiểm tra tổng số lần lưu DB và gửi event vẫn chỉ là 1 lần (từ lần gọi 1)
        verify(paymentLogRepository, times(1)).save(any(PaymentLog.class));
        verify(eventPublisher, times(1)).publishEvent(any(PaymentCompletedEvent.class));
    }

    @Test
    @DisplayName("Webhook sequential retry when order status is already PAID returns duplicate code 02")
    void testWebhookSequentialRetryWithPaidOrderStatus() {
        when(gatewayResolver.resolve(PaymentLog.Provider.MOCK)).thenReturn(paymentGateway);

        PaymentWebhookResult successResult = new PaymentWebhookResult(
                true,
                true,
                orderId,
                "MOCK-TXN-123",
                amount,
                "{}",
                null
        );
        when(paymentGateway.verifyWebhook(payload)).thenReturn(successResult);
        
        // Giả lập trạng thái đơn hàng trong DB đã là PAID
        when(orderPort.findOrderById(orderId)).thenReturn(Optional.of(orderPaid));

        // Gọi Webhook
        PaymentService.WebhookHandleResult result = paymentService.handleWebhook(PaymentLog.Provider.MOCK, payload);

        // Đảm bảo hệ thống chặn ngay từ đầu, trả về code "02", không lưu DB hay gửi event
        assertThat(result.responseCode()).isEqualTo("02");
        assertThat(result.message()).isEqualTo("Order already confirmed");
        verify(paymentLogRepository, never()).save(any(PaymentLog.class));
        verify(eventPublisher, never()).publishEvent(any());
    }
}
