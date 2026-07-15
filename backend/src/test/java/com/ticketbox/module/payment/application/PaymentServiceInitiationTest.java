package com.ticketbox.module.payment.application;

import com.ticketbox.module.payment.application.gateway.PaymentGateway;
import com.ticketbox.module.payment.application.gateway.PaymentGatewayResolver;
import com.ticketbox.module.payment.application.gateway.PaymentInitiationResult;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.payment.domain.PaymentLogRepository;
import com.ticketbox.module.ticket.OrderPort;
import com.ticketbox.module.ticket.OrderView;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceInitiationTest {

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

    @Test
    void reusesTheExistingProviderSessionForTheAuthenticatedPayableOrder() {
        UUID orderId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OrderView order = new OrderView(
                orderId,
                userId,
                new BigDecimal("250000"),
                "AWAITING_PAYMENT",
                "VNPAY",
                "OLD-REF",
                "https://old-payment-url"
        );
        when(orderPort.getPayableOrderForUser(orderId, userId)).thenReturn(order);

        var response = paymentService.initiatePayment(orderId, "VNPAY", userId);

        assertThat(response.paymentUrl()).isEqualTo("https://old-payment-url");
        assertThat(response.providerRef()).isEqualTo("OLD-REF");
        verify(orderPort).getPayableOrderForUser(orderId, userId);
        verify(gatewayResolver, never()).resolve(PaymentLog.Provider.VNPAY);
        verify(paymentGateway, never()).initiatePayment(order);
        verify(orderPort, never()).markPaymentInitiated(orderId, "VNPAY", "OLD-REF", "https://old-payment-url");
    }

    @Test
    void doesNotContactTheGatewayWhenTheOrderIsNotPayableForTheAuthenticatedUser() {
        UUID orderId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AppException denied = new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng");
        when(orderPort.getPayableOrderForUser(orderId, userId)).thenThrow(denied);

        assertThatThrownBy(() -> paymentService.initiatePayment(orderId, "MOMO", userId))
                .isSameAs(denied);

        verify(gatewayResolver, never()).resolve(PaymentLog.Provider.MOMO);
        verify(paymentGateway, never()).initiatePayment(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void allowsTheCustomerToSwitchFromVnpayToMomoWhileTheOrderIsStillPayable() {
        UUID orderId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OrderView order = new OrderView(
                orderId,
                userId,
                new BigDecimal("250000"),
                "AWAITING_PAYMENT",
                "VNPAY",
                "VNPAY-REF",
                "https://vnpay-payment-url"
        );
        PaymentInitiationResult momoSession = new PaymentInitiationResult(
                PaymentLog.Provider.MOMO,
                "https://momo-payment-url",
                "MOMO-REF",
                "{}"
        );

        when(orderPort.getPayableOrderForUser(orderId, userId)).thenReturn(order);
        when(gatewayResolver.resolve(PaymentLog.Provider.MOMO)).thenReturn(paymentGateway);
        when(paymentGateway.initiatePayment(order)).thenReturn(momoSession);
        when(paymentLogRepository.existsByOrderIdAndEventType(orderId, PaymentLog.EventType.INITIATED))
                .thenReturn(true);

        var response = paymentService.initiatePayment(orderId, "MOMO", userId);

        assertThat(response.provider()).isEqualTo("MOMO");
        assertThat(response.paymentUrl()).isEqualTo("https://momo-payment-url");
        verify(paymentGateway).initiatePayment(order);
        verify(orderPort).markPaymentInitiated(orderId, "MOMO", "MOMO-REF", "https://momo-payment-url");
    }
}
