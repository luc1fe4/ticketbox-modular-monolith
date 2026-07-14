# Đặc tả: Mua vé & Giới hạn vé per-user (BP06)

Tài liệu này đặc tả luồng mua vé cốt lõi từ thời điểm khách hàng chọn hạng vé cho đến khi phát hành e-ticket thành công, bao gồm các cơ chế kiểm tra giới hạn vé mỗi tài khoản, kiểm soát tồn kho chống bán vượt (oversell), và các kịch bản xử lý lỗi giữa chừng.

---

## 1. Mô tả
Khán giả thực hiện chọn loại vé, số lượng và gửi yêu cầu đặt chỗ. Hệ thống tiến hành kiểm tra giới hạn số vé tối đa của tài khoản (`maxPerAccount`), giữ chỗ tạm thời (Reservation), và tạo đơn hàng (`AWAITING_PAYMENT`). Sau khi khách hàng hoàn tất thanh toán qua cổng ngoài (MoMo/VNPAY), hệ thống chuyển đơn hàng sang `PAID` và phát hành e-ticket kèm mã QR bảo mật.

---

## 2. Luồng chính & Sơ đồ trình tự

```mermaid
sequenceDiagram
    autonumber
    actor Client as Khán giả (Browser)
    participant Server as Backend API (Spring Boot)
    database Redis as Cache / Lock (Redis)
    database DB as Transactional DB (PostgreSQL)
    participant Gateway as Cổng Thanh toán
    participant MQ as Message Broker (RabbitMQ)

    Client->>Server: POST /api/orders [Hạng vé + Số lượng, Idempotency-Key]
    
    Server->>Redis: Claim Idempotency Key (idempotency:order:...)
    Server->>Redis: Acquire lock:user:{userId} (Thời gian 5 giây)
    
    Server->>DB: Đọc tổng số vé đã mua + đang giữ của tài khoản
    alt Vượt giới hạn tài khoản (Tổng số vé > maxPerAccount)
        Server-->>Client: Trả về lỗi TICKET_LIMIT_EXCEEDED (400)
    else Hợp lệ
        Server->>DB: Trừ tồn kho nguyên tử (Atomic Update available_qty)
        alt Hết vé / Không đủ tồn kho (Rows affected = 0)
            Server-->>Client: Trả về lỗi TICKET_SOLD_OUT (400)
        else Giữ chỗ thành công
            Server->>DB: Tạo đơn hàng status AWAITING_PAYMENT & Order Items
            Server->>Redis: Release lock:user:{userId} & Update Idempotency
            Server-->>Client: Trả về orderId + expiresAt (5 phút)
        end
    end

    Client->>Server: POST /api/payments/{orderId}/initiate
    Server->>Gateway: Gọi API khởi tạo giao dịch lấy URL
    Gateway-->>Server: Trả về URL thanh toán
    Server-->>Client: Chuyển hướng trình duyệt sang cổng thanh toán
    
    Note over Client, Gateway: Người dùng nhập thông tin và xác nhận chuyển tiền
    
    Gateway->>Server: Gọi Webhook / IPN báo thanh toán thành công
    Server->>DB: Ghi nhận payment_logs, Đổi trạng thái order -> PAID
    Server->>DB: Phát hành e-ticket kèm mã QR độc nhất
    Server->>MQ: Publish event gửi Email thông báo vé
    Server-->>Gateway: Trả về mã thành công (00)
    
    MQ->>Server: Consumer lấy tin nhắn gửi email vé cho khách
```

---

## 3. Kịch bản lỗi giữa chừng và cách xử lý

Hệ thống TicketBox được thiết kế để xử lý linh hoạt và an toàn khi xảy ra lỗi ở bất kỳ bước nào trong luồng mua vé:

| Bước xảy ra lỗi | Chi tiết lỗi | Cơ chế xử lý và Khôi phục của Hệ thống |
|---|---|---|
| **1. Khởi tạo đơn hàng** | Trùng lặp request do click đúp hoặc lag mạng | Chốt chặn **Idempotency-Key** trên Redis chặn đứng yêu cầu thứ hai, trả về lỗi `HTTP 409 Conflict`. Không tạo đơn trùng. |
| **2. Kiểm tra giới hạn** | Người dùng cố tình dùng nhiều thiết bị gửi yêu cầu song song để mua vượt `maxPerAccount` | Lớp khóa phân tán **Redis lock** (`lock:user:{userId}`) tuần tự hóa các request. Request thứ hai sẽ bị từ chối do không lấy được lock, hoặc bị Database chặn lại khi tính tổng số vé của đơn đang giữ. |
| **3. Giữ tồn kho** | Hết vé (đang tranh chấp vé cuối cùng) | Chạy câu lệnh **Atomic Update** trực tiếp trên DB. Chỉ request chạy trước được DB phản hồi `rows affected = 1`, các request sau nhận `0` và lập tức kết thúc với lỗi `TICKET_SOLD_OUT`, không ghi đơn hàng ảo. |
| **4. Thanh toán** | Người dùng không thanh toán hoặc tắt trình duyệt nửa chừng | Đơn hàng được giữ ở trạng thái `AWAITING_PAYMENT` có thời gian hết hạn (`expires_at` mặc định là 5 phút). Một **Scheduler định kỳ** chạy mỗi 1 phút quét các đơn quá hạn, đổi trạng thái sang `EXPIRED`, đồng thời **cộng lại số lượng vé vào tồn kho** để người khác mua. |
| **5. Webhook cổng thanh toán** | Cổng thanh toán báo lỗi giao dịch hoặc khách hủy thanh toán | Đơn hàng giữ nguyên trạng thái `AWAITING_PAYMENT` để cho phép khách hàng nhấn thử lại (retry) thanh toán, hoặc tự động hết hạn giải phóng vé sau 5 phút. |
| **6. Gửi email thông báo** | Hệ thống email (SMTP) bị sập hoặc RabbitMQ quá tải sau khi thanh toán thành công | Đơn hàng và e-ticket **đã được lưu thành công** trong Database và trạng thái là `PAID`. Vé của khách hàng đã an toàn. Hệ thống gửi email chạy bất đồng bộ sẽ tự động retry khi kết nối được khôi phục. Khách hàng vẫn có thể xem vé trực tiếp trong tài khoản web của họ. |

---

## 4. Ràng buộc và Tính nhất quán nghiệp vụ
* **Atomic Inventory Control:** Việc trừ tồn kho phải thực hiện bằng câu lệnh SQL duy nhất có điều kiện kiểm tra tồn kho tối thiểu:
  ```sql
  UPDATE ticket_types
  SET available_qty = available_qty - :quantity
  WHERE id = :ticketTypeId AND available_qty >= :quantity;
  ```
* **Giới hạn số lượng:** Tổng số lượng vé tính trên các đơn hàng có trạng thái `PAID` và `AWAITING_PAYMENT` của cùng một tài khoản không được vượt quá giới hạn tối đa của hạng vé đó (`maxPerAccount`).
* **Database Unique Constraints:** Ràng buộc duy nhất trên cột `idempotency_key` trong bảng `orders` và cặp `(order_item_id, ticket_code)` trong bảng `tickets` làm lá chắn cuối cùng bảo vệ tính nhất quán dữ liệu.

---

## 5. Tiêu chí nghiệm thu (Acceptance Criteria)
1. **Mua vé thành công:** Hoàn tất luồng mua vé thông thường, giảm tồn kho trong DB, tạo đơn hàng dạng `PAID`, phát hành e-ticket QR khớp thông tin và gửi email vé thành công.
2. **Chống Oversell:** Khi mở bán 10 vé cuối cùng cho 50 người mua đồng thời, hệ thống chỉ chấp nhận đúng 10 đơn hàng thành công, 40 người còn lại nhận thông báo hết vé rõ ràng.
3. **Tuân thủ giới hạn tài khoản:** Một tài khoản không thể sở hữu quá số lượng vé cho phép bằng bất cứ cách nào (gửi request đồng thời, chia nhỏ đơn hàng).
4. **Giải phóng vé quá hạn:** Các đơn hàng không được thanh toán sau 5 phút phải được tự động thu hồi, hủy đơn và hoàn lại số lượng tồn kho chính xác.
