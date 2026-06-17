package com.ticketbox.module.payment.web;

import com.ticketbox.module.payment.application.PaymentService;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.payment.web.dto.InitiatePaymentRequest;
import com.ticketbox.module.payment.web.dto.PaymentInitiationResponse;
import com.ticketbox.module.payment.web.dto.VnpayIpnResponse;
import com.ticketbox.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

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

    @GetMapping("/webhooks/vnpay")
    public ResponseEntity<VnpayIpnResponse> handleVnpayIpn(@RequestParam Map<String, String> params) {
        PaymentService.WebhookHandleResult result =
                paymentService.handleWebhook(PaymentLog.Provider.VNPAY, params);
        return ResponseEntity.ok(new VnpayIpnResponse(result.responseCode(), result.message()));
    }
}
