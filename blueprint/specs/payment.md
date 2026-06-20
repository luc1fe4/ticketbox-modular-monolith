# Đặc tả: Ticket Purchase Lifecycle, Double-Spend Prevention & Circuit Breaker

## 1. Mô tả
Tính năng này chịu trách nhiệm cho toàn bộ luồng mua vé và thanh toán của khách hàng: từ khi tạo đơn hàng (giữ vé tạm thời), thực hiện giao dịch qua cổng thanh toán, sinh vé điện tử (e-ticket), đến xử lý hủy đơn hàng hết hạn. Đặc tả này tập trung vào các cơ chế kỹ thuật bảo vệ hệ thống: chống overselling, chống trừ tiền hai lần (Idempotency), và cô lập lỗi cổng thanh toán (Circuit Breaker).

---

## 2. Luồng chính
### A. Tạo Đơn hàng & Giữ vé (Ticket Hold)
1. Khán giả chọn loại vé, số lượng và cổng thanh toán (`MOCK` hoặc `VNPAY`).
2. Client gửi yêu cầu `POST /api/orders` kèm theo header `Idempotency-Key` và payload đơn hàng.
3. Backend kiểm tra trùng lặp trong Redis bằng `Idempotency-Key`. Nếu trùng, trả về phản hồi đã lưu trước đó.
4. Backend kiểm tra rate limit bằng Token Bucket. Nếu vượt ngưỡng, trả về lỗi `429 Too Many Requests`.
5. Backend bắt đầu một transaction database:
   - Sử dụng khóa dòng (Pessimistic Write Lock) trên bảng `ticket_types` để lấy số lượng vé khả dụng (`available_qty`).
   - Kiểm tra giới hạn mua vé tối đa của tài khoản (`max_per_account`) dựa trên số vé đã mua thành công và các đơn hàng đang chờ thanh toán.
   - Nếu không đủ vé hoặc vượt quá giới hạn, rollback transaction và báo lỗi `409 Conflict`.
   - Nếu hợp lệ: Trực tiếp trừ `available_qty`, tạo đơn hàng `orders` với trạng thái `AWAITING_PAYMENT`, `expires_at = now + 5 minutes`, và tạo các `order_items` tương ứng.
6. Commit transaction.
7. Backend gọi dịch vụ thanh toán để tạo link thanh toán (nếu là VNPAY Sandbox) và trả về thông tin đơn hàng cho Client.

### B. Thanh toán & Sinh vé (Payment & Ticket Issuance)
1. Khách hàng thực hiện thanh toán trên giao diện VNPAY hoặc Mock Sandbox.
2. Cổng thanh toán gửi thông tin giao dịch qua Webhook/IPN đến endpoint của Backend.
3. Backend tiếp nhận Webhook:
   - Kiểm tra chữ ký bảo mật (secure hash) để đảm bảo dữ liệu không bị sửa đổi.
   - Bắt đầu transaction: Lock bản ghi đơn hàng. Nếu đơn hàng đã có trạng thái `PAID`, bỏ qua an toàn (Idempotent Webhook).
   - Cập nhật trạng thái đơn hàng thành `PAID` và ghi nhận `payment_logs`.
   - Sinh các bản ghi `tickets` tương ứng với số lượng vé đã mua, tạo QR code kèm chữ ký số và lưu `qr_secret`.
4. Commit transaction.
5. Phát tin nhắn qua RabbitMQ để gửi email xác nhận mua vé và thông báo trên app cho khách hàng.

### C. Thu hồi vé quá hạn (Order Expiration)
1. Một Spring Scheduled job chạy định kỳ mỗi 60 giây.
2. Job quét các đơn hàng ở trạng thái `AWAITING_PAYMENT` có `expires_at <= now`.
3. Với mỗi đơn hàng hết hạn, Job thực hiện trong transaction:
   - Lock đơn hàng và đổi trạng thái thành `EXPIRED`.
   - Hoàn trả lại số lượng vé đã giữ về `available_qty` trong bảng `ticket_types`.

---

## 3. Kịch bản lỗi & Cơ chế Bảo vệ

### A. Chống Overselling & Double-Spend
*   Dưới tải cao (ví dụ: 10,000 requests/giây mua cùng 200 vé cuối cùng), việc sử dụng Pessimistic Write Lock (`SELECT ... FOR UPDATE`) trên bản ghi `ticket_types` đảm bảo các yêu cầu được xếp hàng tuần tự tại database. Không xảy ra tình trạng đọc dữ liệu cũ (dirty read), loại bỏ hoàn toàn khả năng bán vượt số lượng vé hiện có (overselling).

### B. Cổng thanh toán gặp sự cố (Circuit Breaker)
*   **Cài đặt:** Resilience4j Circuit Breaker được cấu hình bọc quanh API gọi sang VNPAY trong `PaymentService`.
*   **Kích hoạt:** Nếu tỷ lệ lỗi gọi sang VNPAY vượt quá 50% trong sliding window 5 cuộc gọi, Circuit Breaker chuyển sang trạng thái `OPEN`.
*   **Hành vi Graceful Degradation:** Khi ở trạng thái `OPEN`, các yêu cầu thanh toán qua VNPAY sẽ bị từ chối ngay lập tức tại Backend mà không cần gửi request mạng sang VNPAY, đồng thời kích hoạt cơ chế fallback: tự động chuyển hướng sang cổng `MOCK` thanh toán (đối với môi trường thử nghiệm) hoặc trả về lỗi `503 Service Unavailable` thông báo hệ thống thanh toán đang bảo trì, giúp bảo vệ backend khỏi nghẽn luồng xử lý chính.

### C. Trùng lặp thanh toán
*   Cột `provider_ref` kết hợp `provider` trong bảng `payment_logs` có ràng buộc `UNIQUE`. Nếu Webhook gửi thông báo trùng lặp cho cùng một mã giao dịch, database sẽ chặn lỗi trùng khóa, giúp ngăn chặn việc sinh vé trùng hoặc thay đổi số lượng vé đã bán.

---

## 4. Ràng buộc
*   Thời gian hết hạn của đơn hàng: Đúng 5 phút từ lúc tạo.
*   Idempotency Key: Hết hạn sau 24 giờ kể từ lúc lưu vào Redis.
*   Giới hạn mua vé: Áp dụng trên từng tài khoản và được tính toán động dựa trên lịch sử mua thực tế.

---

## 5. Tiêu chí chấp nhận
1. Đảm bảo số lượng vé còn lại luôn khớp chính xác sau các giao dịch thanh toán thành công hoặc hết hạn.
2. Không bao giờ xảy ra overselling, dù chạy test đồng thời (concurrency test) với hàng nghìn luồng.
3. Khi giả lập VNPAY bị sập, Circuit Breaker chuyển sang trạng thái `OPEN` và luồng mua vé không bị treo, các chức năng khác (xem danh sách concert, kiểm tra vé còn lại) vẫn hoạt động bình thường.
4. Giao dịch webhook trùng lặp được xử lý an toàn (trả về OK mà không tạo thêm vé).
