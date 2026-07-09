package com.ticketbox.module.payment.web;

import com.ticketbox.module.payment.application.PaymentService;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.payment.web.dto.InitiatePaymentRequest;
import com.ticketbox.module.payment.web.dto.PaymentInitiationResponse;
import com.ticketbox.module.payment.web.dto.VnpayIpnResponse;
import com.ticketbox.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping("/{orderId}/initiate")
    public ResponseEntity<ApiResponse<PaymentInitiationResponse>> initiatePayment(
            @PathVariable UUID orderId,
            @RequestBody(required = false) InitiatePaymentRequest request
    ) {
        String provider = request == null ? null : request.provider();
        PaymentInitiationResponse response = paymentService.initiatePayment(orderId, provider);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<PaymentService.PaymentStatusResponse>> getPaymentStatus(
            @PathVariable UUID orderId,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(paymentService.getPaymentStatus(orderId, userId)));
    }

    @GetMapping("/webhooks/vnpay")
    public ResponseEntity<VnpayIpnResponse> handleVnpayIpn(@RequestParam Map<String, String> params) {
        PaymentService.WebhookHandleResult result =
                paymentService.handleWebhook(PaymentLog.Provider.VNPAY, params);
        return ResponseEntity.ok(new VnpayIpnResponse(result.responseCode(), result.message()));
    }

    @PostMapping("/webhooks/momo")
    public ResponseEntity<Map<String, Object>> handleMomoIpn(@RequestBody Map<String, Object> body) {
        Map<String, String> params = body.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue() != null ? e.getValue().toString() : ""
                ));
        PaymentService.WebhookHandleResult result =
                paymentService.handleWebhook(PaymentLog.Provider.MOMO, params);
        
        int momoResultCode = 99;
        if ("00".equals(result.responseCode()) || "02".equals(result.responseCode())) {
            momoResultCode = 0;
        }

        return ResponseEntity.ok(Map.of(
                "partnerCode",  params.getOrDefault("partnerCode", ""),
                "orderId",      params.getOrDefault("orderId", ""),
                "requestId",    params.getOrDefault("requestId", ""),
                "responseTime", System.currentTimeMillis(),
                "resultCode",   momoResultCode,
                "message",      result.message()
        ));
    }
}
