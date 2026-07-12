# MoMo Payment Gateway – Implementation Plan

> Mục tiêu: tích hợp MoMo sandbox theo đúng pattern của VNPAY hiện có.
> Tài liệu tham khảo MoMo API: https://developers.momo.vn/v3/docs/payment/api/payment-api

---

## 1. Tổng Quan Kiến Trúc

Hệ thống đã có sẵn `PaymentGateway` interface và `PaymentGatewayResolver` tự động inject mọi implementation. Thêm MoMo chỉ cần:

1. Tạo `MomoProperties` – config sandbox credentials
2. Tạo `MomoPaymentGateway` – implement `PaymentGateway`
3. Thêm webhook endpoint `POST /api/payments/webhooks/momo` vào `PaymentController`
4. Cập nhật `application.yml` và `.env.example`
5. Thêm MoMo vào FE `CheckoutPage`

Không cần sửa `PaymentService`, `PaymentGatewayResolver`, hay `OrderService` – architecture đã hỗ trợ sẵn.

---

## 2. MoMo Sandbox Flow

```
User chọn MoMo → POST /api/payments/{orderId}/initiate (provider: MOMO)
  → MomoPaymentGateway.initiatePayment()
  → Gọi POST https://test-payment.momo.vn/v2/gateway/api/create
  → Nhận payUrl từ MoMo
  → FE redirect user sang payUrl

User thanh toán xong trên sandbox MoMo → MoMo gọi IPN callback
  → POST /api/payments/webhooks/momo
  → MomoPaymentGateway.verifyWebhook()  -- verify chữ ký HMAC-SHA256
  → PaymentService.handleWebhook()
  → Order → PAID, sinh ticket
```

---

## 3. Các File Cần Tạo / Sửa

### [NEW] `MomoProperties.java`

```
Path: backend/src/main/java/com/ticketbox/module/payment/infrastructure/MomoProperties.java
```

```java
@ConfigurationProperties(prefix = "ticketbox.payment.momo")
public record MomoProperties(
        String apiEndpoint,   // https://test-payment.momo.vn/v2/gateway/api/create
        String partnerCode,   // MOMO sandbox partner code
        String accessKey,     // sandbox access key
        String secretKey,     // sandbox secret key (dùng để ký HMAC-SHA256)
        String returnUrl,     // FE redirect sau thanh toán
        String ipnUrl         // URL MoMo gọi callback (BE webhook endpoint)
) {}
```

---

### [NEW] `MomoPaymentGateway.java`

```
Path: backend/src/main/java/com/ticketbox/module/payment/infrastructure/MomoPaymentGateway.java
```

#### `initiatePayment()` – gọi MoMo API tạo payment URL

MoMo yêu cầu request body dạng JSON với chữ ký HMAC-SHA256:

```
rawSignature = "accessKey=<>&amount=<>&extraData=<>&ipnUrl=<>&orderId=<>
                &orderInfo=<>&partnerCode=<>&redirectUrl=<>&requestId=<>
                &requestType=payWithMethod"

signature = HMAC_SHA256(secretKey, rawSignature)
```

Request body gửi lên MoMo:
```json
{
  "partnerCode": "MOMO...",
  "partnerName": "TicketBox",
  "storeId":     "TicketBoxStore",
  "requestId":   "<UUID>",
  "amount":      150000,
  "orderId":     "<orderId>",
  "orderInfo":   "Thanh toan ve TicketBox",
  "redirectUrl": "http://localhost:5173/payment/result",
  "ipnUrl":      "http://<BE>/api/payments/webhooks/momo",
  "lang":        "vi",
  "requestType": "payWithMethod",
  "autoCapture": true,
  "extraData":   "",
  "signature":   "<HMAC-SHA256>"
}
```

MoMo trả về `payUrl` để redirect user.

#### `verifyWebhook()` – xác thực callback từ MoMo

MoMo gửi IPN callback dạng JSON POST với các field:
```
partnerCode, orderId, requestId, amount, orderInfo,
orderType, transId, resultCode, message, payType,
responseTime, extraData, signature
```

Cách verify chữ ký:
```
rawSignature = "accessKey=<>&amount=<>&extraData=<>&message=<>
                &orderId=<>&orderInfo=<>&orderType=<>&partnerCode=<>
                &payType=<>&requestId=<>&responseTime=<>&resultCode=<>
                &transId=<>"

expectedSignature = HMAC_SHA256(secretKey, rawSignature)
// So sánh với signature trong request body
```

Kết quả thành công khi `resultCode == 0`.

---

### [MODIFY] `PaymentController.java`

Thêm endpoint webhook cho MoMo:

```java
@PostMapping("/webhooks/momo")
public ResponseEntity<Map<String, Object>> handleMomoIpn(
        @RequestBody Map<String, Object> body
) {
    Map<String, String> params = body.entrySet().stream()
            .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    e -> e.getValue() != null ? e.getValue().toString() : ""
            ));
    PaymentService.WebhookHandleResult result =
            paymentService.handleWebhook(PaymentLog.Provider.MOMO, params);
    return ResponseEntity.ok(Map.of(
            "partnerCode",  params.getOrDefault("partnerCode", ""),
            "orderId",      params.getOrDefault("orderId", ""),
            "requestId",    params.getOrDefault("requestId", ""),
            "responseTime", String.valueOf(System.currentTimeMillis()),
            "resultCode",   result.responseCode(),
            "message",      result.message()
    ));
}
```

> **Lưu ý:** VNPAY dùng `GET` webhook, MoMo dùng `POST` webhook.

---

### [MODIFY] `application.yml`

```yaml
ticketbox:
  payment:
    momo:
      api-endpoint: ${MOMO_API_ENDPOINT:https://test-payment.momo.vn/v2/gateway/api/create}
      partner-code: ${MOMO_PARTNER_CODE:}
      access-key:   ${MOMO_ACCESS_KEY:}
      secret-key:   ${MOMO_SECRET_KEY:}
      return-url:   ${MOMO_RETURN_URL:http://localhost:5173/payment/result}
      ipn-url:      ${MOMO_IPN_URL:}

resilience4j:
  circuitbreaker:
    instances:
      momo:
        sliding-window-size: 5
        minimum-number-of-calls: 3
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 2
```

---

### [MODIFY] `.env.example`

```bash
# MoMo Sandbox
MOMO_PARTNER_CODE=<your-momo-partner-code>
MOMO_ACCESS_KEY=<your-momo-access-key>
MOMO_SECRET_KEY=<your-momo-secret-key>
MOMO_RETURN_URL=http://localhost:5173/payment/result
MOMO_IPN_URL=https://<your-static-domain>.ngrok-free.dev/api/payments/webhooks/momo
```

---

### [MODIFY] `docker-compose.yml`

Thêm vào service `backend`:

```yaml
MOMO_PARTNER_CODE: ${MOMO_PARTNER_CODE:-}
MOMO_ACCESS_KEY:   ${MOMO_ACCESS_KEY:-}
MOMO_SECRET_KEY:   ${MOMO_SECRET_KEY:-}
MOMO_RETURN_URL:   ${MOMO_RETURN_URL:-http://localhost:5173/payment/result}
MOMO_IPN_URL:      ${MOMO_IPN_URL:-}
```

---

### [MODIFY] Frontend `orders.ts` + `CheckoutPage.tsx`

```ts
// orders.ts
export type PaymentProvider = 'MOCK' | 'VNPAY' | 'MOMO';
```

```tsx
// CheckoutPage.tsx – thêm vào paymentOptions array
{
  value: 'MOMO',
  title: 'MoMo',
  copy: 'Continue securely to the MoMo sandbox payment page.',
  badge: 'MoMo',
},
```

---

## 4. Lấy Sandbox Credentials

1. Sandbox credentials đã có sẵn (public test account của MoMo):
   - `partnerCode`: `<your-momo-partner-code>`
   - `accessKey`: `<your-momo-access-key>`
   - `secretKey`: `<your-momo-secret-key>`
   - `apiEndpoint`: `https://test-payment.momo.vn/v2/gateway/api/create`
2. Test IPN local cần tunnel (ngrok):
   ```bash
   ngrok http 8080
   # Dùng URL ngrok làm MOMO_IPN_URL trong .env
   ```

---

## 5. Thứ Tự Implement

```
Bước 1: Tạo MomoProperties.java
Bước 2: Tạo MomoPaymentGateway.java (initiatePayment + verifyWebhook)
Bước 3: Thêm POST /api/payments/webhooks/momo vào PaymentController.java
Bước 4: Cập nhật application.yml, .env.example, docker-compose.yml
Bước 5: FE – thêm 'MOMO' vào PaymentProvider type và paymentOptions
Bước 6: Whitelist /api/payments/webhooks/momo trong SecurityConfig (không cần JWT)
Bước 7: Test end-to-end với sandbox credentials
```

---

## 6. Điểm Khác Biệt Quan Trọng So Với VNPAY

| | VNPAY | MoMo |
|---|---|---|
| **Ký hash** | HMAC-SHA512 | HMAC-SHA256 |
| **Webhook method** | GET | POST (JSON body) |
| **Webhook response** | `{RspCode, Message}` | `{partnerCode, orderId, requestId, responseTime, resultCode, message}` |
| **Amount format** | `amount * 100` (đồng) | `amount` trực tiếp (VND) |
| **Mã thành công** | `vnp_ResponseCode == "00"` | `resultCode == 0` |
| **HTTP call** | Không (chỉ build URL) | Có (POST lên MoMo API) |
| **Circuit breaker** | `@CircuitBreaker(name = "vnpay")` | `@CircuitBreaker(name = "momo")` |

---

## 7. Lưu Ý Security

- Không commit `MOMO_SECRET_KEY` thật vào git
- Verify chữ ký **trước** khi xử lý bất kỳ webhook nào
- Webhook endpoint `/api/payments/webhooks/momo` phải được whitelist trong `SecurityConfig` (MoMo server gọi trực tiếp, không có JWT)
- `HttpClient` gọi MoMo phải có timeout hợp lý (5-10 giây) để Circuit Breaker hoạt động đúng
