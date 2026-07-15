package com.ticketbox.module.payment.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketbox.module.payment.application.gateway.PaymentGateway;
import com.ticketbox.module.payment.application.gateway.PaymentInitiationResult;
import com.ticketbox.module.payment.application.gateway.PaymentWebhookResult;
import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.module.ticket.OrderView;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class MomoPaymentGateway implements PaymentGateway {

    private final MomoProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public MomoPaymentGateway(MomoProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
    }

    @Override
    public PaymentLog.Provider provider() {
        return PaymentLog.Provider.MOMO;
    }

    @Override
    @CircuitBreaker(name = "momo", fallbackMethod = "fallbackInitiatePayment")
    public PaymentInitiationResult initiatePayment(OrderView order) {
        requireConfigured();

        String requestId  = UUID.randomUUID().toString();
        String orderId    = order.id().toString();
        String orderInfo  = "Thanh toan ve TicketBox " + orderId;
        String amount     = order.totalAmount().setScale(0).toPlainString();
        String extraData  = "";
        String requestType = "payWithMethod";

        // Build rawSignature – fields phải đúng thứ tự alphabet theo docs MoMo
        String rawSignature = "accessKey="   + properties.accessKey()
                + "&amount="      + amount
                + "&extraData="   + extraData
                + "&ipnUrl="      + properties.ipnUrl()
                + "&orderId="     + orderId
                + "&orderInfo="   + orderInfo
                + "&partnerCode=" + properties.partnerCode()
                + "&redirectUrl=" + properties.returnUrl()
                + "&requestId="   + requestId
                + "&requestType=" + requestType;

        String signature = hmacSha256(properties.secretKey(), rawSignature);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("partnerCode", properties.partnerCode());
        body.put("partnerName", "TicketBox");
        body.put("storeId",     "TicketBoxStore");
        body.put("requestId",   requestId);
        body.put("amount",      Long.parseLong(amount));
        body.put("orderId",     orderId);
        body.put("orderInfo",   orderInfo);
        body.put("redirectUrl", properties.returnUrl());
        body.put("ipnUrl",      properties.ipnUrl());
        body.put("lang",        "vi");
        body.put("requestType", requestType);
        body.put("autoCapture", true);
        body.put("extraData",   extraData);
        body.put("signature",   signature);

        try {
            String responseBody = restClient.post()
                    .uri(properties.apiEndpointOrDefault())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode json = objectMapper.readTree(responseBody);
            String payUrl = json.path("payUrl").asText();

            if (payUrl == null || payUrl.isBlank()) {
                String message = json.path("message").asText("MoMo không trả về payUrl");
                throw new AppException(ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE, "Lỗi MoMo: " + message);
            }

            return new PaymentInitiationResult(provider(), payUrl, requestId, responseBody);

        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE,
                    "Không thể khởi tạo thanh toán MoMo: " + ex.getMessage());
        }
    }

    @Override
    public PaymentWebhookResult verifyWebhook(Map<String, String> params) {
        requireConfigured();

        String rawPayload = toJsonLike(params);
        String receivedSignature = params.get("signature");

        if (receivedSignature == null || receivedSignature.isBlank()) {
            return PaymentWebhookResult.invalid("Missing MoMo signature", rawPayload);
        }

        // Build rawSignature để verify – đúng thứ tự alphabet theo docs MoMo IPN
        String rawSignature = "accessKey="   + properties.accessKey()
                + "&amount="      + params.getOrDefault("amount", "")
                + "&extraData="   + params.getOrDefault("extraData", "")
                + "&message="     + params.getOrDefault("message", "")
                + "&orderId="     + params.getOrDefault("orderId", "")
                + "&orderInfo="   + params.getOrDefault("orderInfo", "")
                + "&orderType="   + params.getOrDefault("orderType", "")
                + "&partnerCode=" + params.getOrDefault("partnerCode", "")
                + "&payType="     + params.getOrDefault("payType", "")
                + "&requestId="   + params.getOrDefault("requestId", "")
                + "&responseTime=" + params.getOrDefault("responseTime", "")
                + "&resultCode="  + params.getOrDefault("resultCode", "")
                + "&transId="     + params.getOrDefault("transId", "");

        String expectedSignature = hmacSha256(properties.secretKey(), rawSignature);

        if (!expectedSignature.equalsIgnoreCase(receivedSignature)) {
            return PaymentWebhookResult.invalid("Invalid MoMo signature", rawPayload);
        }

        UUID orderId;
        try {
            orderId = UUID.fromString(params.get("orderId"));
        } catch (RuntimeException ex) {
            return PaymentWebhookResult.invalid("Invalid MoMo order reference", rawPayload);
        }

        // resultCode == 0 là thành công
        boolean success = "0".equals(params.get("resultCode"));
        String providerRef = params.getOrDefault("transId", params.getOrDefault("requestId", ""));
        BigDecimal amount = parseMomoAmount(params.get("amount"));

        return new PaymentWebhookResult(true, success, orderId, providerRef, amount, rawPayload, null);
    }

    @SuppressWarnings("unused")
    private PaymentInitiationResult fallbackInitiatePayment(OrderView order, Throwable throwable) {
        throw new AppException(ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE,
                "Cổng thanh toán MoMo tạm thời không khả dụng");
    }

    private void requireConfigured() {
        if (isBlank(properties.partnerCode())
                || isBlank(properties.accessKey())
                || isBlank(properties.secretKey())
                || isBlank(properties.returnUrl())
                || isBlank(properties.ipnUrl())) {
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE,
                    "Cấu hình MoMo chưa đầy đủ");
        }
    }

    private String hmacSha256(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hash.append(String.format("%02x", b));
            }
            return hash.toString();
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể ký dữ liệu MoMo");
        }
    }

    private BigDecimal parseMomoAmount(String amount) {
        if (amount == null || amount.isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(amount);
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }

    private String toJsonLike(Map<String, String> values) {
        StringBuilder sb = new StringBuilder("{");
        values.forEach((k, v) -> sb.append("\"").append(k).append("\":\"").append(v).append("\","));
        if (sb.length() > 1) sb.setLength(sb.length() - 1);
        sb.append("}");
        return sb.toString();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
