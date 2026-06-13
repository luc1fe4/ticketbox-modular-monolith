package com.ticketbox.module.payment.web;

import com.ticketbox.module.payment.application.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/mock-payments")
@RequiredArgsConstructor
public class MockPaymentController {
    private final PaymentService paymentService;

    @PostMapping("/{orderId}/success")
    public ResponseEntity<?> mockSuccess(@PathVariable UUID orderId) {
        paymentService.processMockPaymentSuccess(orderId);
        return ResponseEntity.ok(Map.of("message", "Mock payment success processed successfully"));
    }

    @PostMapping("/{orderId}/fail")
    public ResponseEntity<?> mockFail(@PathVariable UUID orderId) {
        paymentService.processMockPaymentFail(orderId);
        return ResponseEntity.ok(Map.of("message", "Mock payment failure processed successfully"));
    }
}
