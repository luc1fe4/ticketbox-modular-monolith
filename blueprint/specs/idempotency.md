# Đặc tả: Cơ chế Idempotency chống xử lý trùng (BP12)

Tài liệu này đặc tả chi tiết cơ chế bảo vệ giao dịch (Idempotency) trên hệ thống TicketBox nhằm ngăn ngừa các lỗi nghiệp vụ nghiêm trọng như: trừ tiền hai lần, đặt chỗ trùng lặp, hoặc phát hành nhiều vé cho cùng một thanh toán do client gửi trùng request (do mạng chậm, người dùng bấm nút nhiều lần) hoặc do cổng thanh toán (VNPAY/MoMo) gửi webhook trùng lặp.

---

## 1. Mục tiêu
* **Chống trùng đơn đặt vé:** Việc gửi lại request tạo đơn hàng (`POST /api/orders`) với cùng một khóa `Idempotency-Key` chỉ được phép tạo ra tối đa **1 đơn hàng duy nhất**.
* **Chống xác nhận thanh toán trùng:** Việc xử lý Webhook/IPN của cổng thanh toán gửi về trùng lặp (do cơ chế retry tự động của VNPAY/MoMo) không được chuyển đổi trạng thái đơn hàng hai lần và không phát hành thừa vé.
* **Tối ưu hóa hiệu năng:** Sử dụng Redis làm chốt chặn kiểm tra nhanh (claim) trên RAM, đồng thời dùng Database constraint làm lớp bảo vệ bền vững cuối cùng (Database-level fallback).

---

## 2. Thiết kế Cơ chế Hoạt động (State Machine & Key Lifecycle)

Hệ thống TicketBox triển khai cơ chế kiểm tra trùng lặp thông qua hai tầng lưu trữ: **Redis (In-memory Cache)** và **PostgreSQL (Ràng buộc Unique Database)**.

### 2.1 Trạng thái của Key trong Redis
Mỗi giao dịch gửi lên đi kèm header `Idempotency-Key` sẽ được quản lý bằng một khóa trong Redis có dạng:
```text
idempotency:order:<userId>:<clientIdempotencyKey>
```
Vòng đời trạng thái của khóa này bao gồm:

```text
       Request mới 
            │
            ▼
    ┌───────────────┐        Giao dịch lỗi (Rollback)
    │  PROCESSING   ├───────────────────────────────► (Xóa Key khỏi Redis)
    └───────┬───────┘
            │
            │ Giao dịch thành công (Commit)
            ▼
    ┌───────────────┐
    │   COMPLETED   │ (TTL: 24 giờ, giá trị: COMPLETED:orderId)
    └───────────────┘
```

1. **Giai đoạn Đang xử lý (`PROCESSING`):**
   * Khi bắt đầu nhận request, server gọi `redisTemplate.opsForValue().setIfAbsent()` (lệnh `SETNX` nguyên tử) với giá trị là một `token` ngẫu nhiên và thời gian sống ngắn **TTL = 2 phút** (`RedisKeyConstants.TTL_IDEMPOTENCY_PROCESSING`).
   * Nếu có một request song song gửi lên cùng lúc với cùng key, `setIfAbsent` trả về `false`. Server lập tức ném lỗi `DuplicateIdempotencyKeyException` (`HTTP 409 Conflict`).
2. **Giai đoạn Đã hoàn tất (`COMPLETED`):**
   * Sau khi đơn hàng được lưu thành công vào PostgreSQL và transaction của Spring Boot **đã commit**, hệ thống thông qua `TransactionSynchronization` kích hoạt sự kiện `afterCommit()` để gọi Redis Lua Script cập nhật giá trị của key thành `"COMPLETED:" + orderId` và tăng thời gian sống lên **TTL = 24 giờ** (`RedisKeyConstants.TTL_IDEMPOTENCY`).
3. **Giai đoạn Giải phóng (Release):**
   * Nếu quá trình tạo đơn hàng xảy ra lỗi và transaction bị rollback (ví dụ: hết vé, lỗi logic nghiệp vụ), hệ thống kích hoạt sự kiện `afterCompletion(status != STATUS_COMMITTED)` để gọi Lua Script giải phóng key (del key khỏi Redis). Điều này cho phép client sửa dữ liệu và bấm gửi lại ngay lập tức.

---

## 3. Luồng xử lý chi tiết (Sequence Flow)

### A. Luồng tạo đơn hàng (`POST /api/orders`)
```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (React Web)
    participant Server as Spring Boot API
    database Redis as Cache Store
    database DB as PostgreSQL DB

    Client->>Server: POST /api/orders [Header: Idempotency-Key]
    Server->>Redis: SETNX idempotency:order:{userId}:{key} [PROCESSING, TTL 2m]
    
    alt Key đã tồn tại
        Redis-->>Server: Trả về FALSE (Đã có request đang chạy hoặc đã xong)
        Server->>DB: Đọc tìm Order theo userId & idempotency_key
        alt Order đã tồn tại trong DB
            DB-->>Server: Trả về OrderId hiện tại
            Server-->>Client: Trả về lỗi 409 Conflict (Duplicate Request Detected)
        else Không tìm thấy Order (Đang xử lý ở luồng kia)
            Server-->>Client: Trả về lỗi 409 Conflict (Request is processing)
        end
    else Key chưa tồn tại (Hợp lệ)
        Redis-->>Server: Trả về TRUE (Đã claim thành công)
        Server->>Server: Validate nghiệp vụ & trừ tồn kho trong Transaction
        Server->>DB: INSERT INTO orders (id, status = 'AWAITING_PAYMENT', idempotency_key = {key})
        Server->>DB: Commit Transaction
        
        alt Commit thành công (afterCommit)
            Server->>Redis: Cập nhật Key -> 'COMPLETED:{orderId}' [TTL 24h]
            Server-->>Client: Trả về OrderResponse (orderId, status)
        else Commit thất bại (afterCompletion - Rollback)
            Server->>Redis: DEL Key (Giải phóng để client gửi lại)
            Server-->>Client: Trả về lỗi nghiệp vụ / System Error
        end
    end
```

---

### B. Luồng xử lý Webhook thanh toán (Callback MoMo/VNPAY IPN)
Để chống trường hợp cổng thanh toán gửi webhook báo thành công nhiều lần dẫn đến phát hành vé trùng, lớp `PaymentService.java` áp dụng kiểm tra idempotency như sau:

```mermaid
sequenceDiagram
    autonumber
    actor Gateway as Payment Gateway (MoMo/VNPAY)
    participant Server as Backend API
    database DB as PostgreSQL (Payment Logs / Orders)
    participant Ticket as Ticket Module

    Gateway->>Server: Gọi Webhook / IPN API (Kèm chữ ký bảo mật & OrderId)
    Server->>Server: Xác minh tính hợp lệ (Verify signature, amount)
    
    Server->>DB: Kiểm tra trạng thái đơn hàng & nhật ký thanh toán
    alt Đơn đã thanh toán (Order status = 'PAID' hoặc đã tồn tại log SUCCESS)
        DB-->>Server: Trả về thông tin
        Server-->>Gateway: Phản hồi "02" - Order already confirmed (Thành công, không xử lý lại)
    else Đơn chưa thanh toán (status = 'AWAITING_PAYMENT' và chưa có log SUCCESS)
        Server->>DB: Ghi log thanh toán (INSERT INTO payment_logs)
        Server->>Ticket: Phát sự kiện PaymentCompletedEvent
        Ticket->>DB: Cập nhật order sang PAID & phát hành e-ticket
        Server-->>Gateway: Phản hồi "00" - Confirm Success (Thành công)
    end
```

---

## 4. Ràng buộc & Tương tác cụ thể

### 4.1 Cấu hình thời gian sống (TTL)
* **Thời gian xử lý tạm thời (Processing TTL):** **2 phút**. Khóa có giá trị là một `token` ngẫu nhiên để tránh việc một thread bất kỳ có thể xóa nhầm khóa của thread khác (sử dụng Lua Script kiểm tra token trước khi xóa).
* **Thời gian lưu trữ kết quả (Completed TTL):** **24 giờ**. Đây là cửa sổ an toàn để bao quát toàn bộ các kịch bản người dùng bị mất mạng tạm thời và cố gắng bấm thử lại đơn hàng trong ngày.
* **Thời gian lưu trữ vĩnh viễn:** Cột `idempotency_key` trong bảng `orders` của PostgreSQL được gán ràng buộc **UNIQUE** đối với cặp `(user_id, idempotency_key)` để ngăn cản việc ghi trùng lặp tuyệt đối ở tầng cơ sở dữ liệu nếu Redis gặp sự cố.

### 4.2 Thiết kế lớp bảo vệ chống Race Condition
Toàn bộ việc hoàn tất và giải phóng khóa trong `IdempotencyService` sử dụng các mã Lua Script để đảm bảo tính nguyên tử:
* **Mã hoàn tất khóa (Complete Script):**
  ```lua
  if redis.call('get', KEYS[1]) == ARGV[1] then
      redis.call('set', KEYS[1], ARGV[2], 'PX', ARGV[3])
      return 1
  end
  return 0
  ```
* **Mã giải phóng khóa (Release Script):**
  ```lua
  if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
  end
  return 0
  ```

---

## 5. Tiêu chí nghiệm thu (Acceptance Criteria)
1. **Request song song trùng lặp:** Gửi đồng thời $N$ request tạo đơn hàng với cùng một `Idempotency-Key` $\rightarrow$ Chỉ có đúng **1 đơn hàng** được tạo thành công, $N-1$ request còn lại lập tức bị từ chối với lỗi `HTTP 409 Conflict`.
2. **Request chậm trễ (Retry):** Sau khi đơn hàng đã tạo thành công và commit, gửi lại request với cùng key cũ $\rightarrow$ Hệ thống từ chối tạo đơn hàng mới, trả về mã lỗi `DUPLICATE_IDEMPOTENCY_KEY`.
3. **Webhook lặp của Gateway:** Cổng thanh toán gửi Webhook báo thành công lần thứ 2 cho cùng một đơn hàng $\rightarrow$ Hệ thống nhận diện trạng thái `PAID` hoặc sự tồn tại của nhật ký thanh toán thành công, ghi nhận kết quả và trả về mã thành công mà không phát hành thêm vé hay bắn thêm event.
4. **Lỗi hệ thống trong Transaction:** Nếu server sập hoặc lỗi giữa chừng trước khi commit đơn hàng $\rightarrow$ Khóa trong Redis phải được giải phóng hoàn toàn khi rollback hoặc tự động hết hạn sau 2 phút để người dùng có thể thử lại.
