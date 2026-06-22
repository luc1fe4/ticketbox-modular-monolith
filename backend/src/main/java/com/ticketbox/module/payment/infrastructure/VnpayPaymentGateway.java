package com.ticketbox.module.payment.infrastructure;

import com.ticketbox.module.payment.application.gateway.PaymentGateway;
import com.ticketbox.module.payment.application.gateway.PaymentInitiationResult;
import com.ticketbox.module.payment.application.gateway.PaymentWebhookResult;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.ticket.OrderView;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class VnpayPaymentGateway implements PaymentGateway {
    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VNPAY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final VnpayProperties properties;

    public VnpayPaymentGateway(VnpayProperties properties) {
        this.properties = properties;
    }

    @Override
    public PaymentLog.Provider provider() {
        return PaymentLog.Provider.VNPAY;
    }

    @Override
    @CircuitBreaker(name = "vnpay", fallbackMethod = "fallbackInitiatePayment")
    public PaymentInitiationResult initiatePayment(OrderView order) {
        requireConfigured();

        String providerRef = order.id().toString();
        LocalDateTime now = LocalDateTime.now(VNPAY_ZONE);
        TreeMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", properties.tmnCode());
        params.put("vnp_Amount", toVnpayAmount(order.totalAmount()));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", providerRef);
        params.put("vnp_OrderInfo", "Thanh toan don hang " + providerRef);
        params.put("vnp_OrderType", properties.orderTypeOrDefault());
        params.put("vnp_Locale", properties.localeOrDefault());
        params.put("vnp_ReturnUrl", properties.returnUrl());
        params.put("vnp_IpAddr", "127.0.0.1");
        params.put("vnp_CreateDate", now.format(VNPAY_DATE_FORMAT));
        params.put("vnp_ExpireDate", now.plusMinutes(15).format(VNPAY_DATE_FORMAT));

        String hashData = buildHashData(params);
        String secureHash = hmacSha512(properties.hashSecret(), hashData);
        String paymentUrl = properties.payUrl() + "?" + buildQuery(params) + "&vnp_SecureHash=" + secureHash;

        return new PaymentInitiationResult(provider(), paymentUrl, providerRef, toJsonLike(params));
    }

    @Override
    public PaymentWebhookResult verifyWebhook(Map<String, String> params) {
        requireConfigured();

        String rawPayload = toJsonLike(params);
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return PaymentWebhookResult.invalid("Missing VNPAY secure hash", rawPayload);
        }

        TreeMap<String, String> signedParams = params.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isBlank())
                .filter(entry -> !entry.getKey().equals("vnp_SecureHash"))
                .filter(entry -> !entry.getKey().equals("vnp_SecureHashType"))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> right,
                        TreeMap::new
                ));

        String expectedHash = hmacSha512(properties.hashSecret(), buildHashData(signedParams));
        if (!expectedHash.equalsIgnoreCase(receivedHash)) {
            return PaymentWebhookResult.invalid("Invalid VNPAY signature", rawPayload);
        }

        UUID orderId;
        try {
            orderId = UUID.fromString(params.get("vnp_TxnRef"));
        } catch (RuntimeException ex) {
            return PaymentWebhookResult.invalid("Invalid VNPAY order reference", rawPayload);
        }

        BigDecimal amount = fromVnpayAmount(params.get("vnp_Amount"));
        boolean success = "00".equals(params.get("vnp_ResponseCode"))
                && "00".equals(params.get("vnp_TransactionStatus"));
        String providerRef = params.getOrDefault("vnp_TransactionNo", params.get("vnp_TxnRef"));

        return new PaymentWebhookResult(true, success, orderId, providerRef, amount, rawPayload, null);
    }

    @SuppressWarnings("unused")
    private PaymentInitiationResult fallbackInitiatePayment(OrderView order, Throwable throwable) {
        throw new AppException(ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE, "VNPAY payment gateway is temporarily unavailable");
    }

    private void requireConfigured() {
        if (isBlank(properties.payUrl())
                || isBlank(properties.returnUrl())
                || isBlank(properties.tmnCode())
                || isBlank(properties.hashSecret())) {
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE, "VNPAY configuration is incomplete");
        }
    }

    private String toVnpayAmount(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.UNNECESSARY)
                .toPlainString();
    }

    private BigDecimal fromVnpayAmount(String amount) {
        if (amount == null || amount.isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(amount).divide(BigDecimal.valueOf(100), 0, RoundingMode.UNNECESSARY);
    }

    private String buildQuery(TreeMap<String, String> params) {
        return params.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private String buildHashData(TreeMap<String, String> params) {
        return params.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII);
    }

    private String hmacSha512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hash.append(String.format("%02x", b));
            }
            return hash.toString();
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Could not sign VNPAY payload");
        }
    }

    private String toJsonLike(Map<String, String> values) {
        return values.entrySet().stream()
                .map(entry -> "\"" + entry.getKey() + "\":\"" + entry.getValue() + "\"")
                .collect(Collectors.joining(",", "{", "}"));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
