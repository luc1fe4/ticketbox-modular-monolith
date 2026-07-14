# Báo cáo Kiểm thử - Tính lặp đơn trị (Idempotency)
**Người phụ trách:** Bùi Minh Quân  
**Yêu cầu cần chứng minh:** Idempotency cài thật, cùng request không tạo/trừ tiền hai lần.  
**Minh chứng mong đợi:** `Test retry/same key/concurrent retry`

---

## 1. Giải pháp Thiết kế & Cài đặt
Để tránh việc người dùng bấm đúp tạo 2 đơn hàng trùng nhau hoặc cổng thanh toán gửi webhook IPN xác nhận thanh toán nhiều lần gây phát vé/trừ tiền trùng lặp, hệ thống triển khai cơ chế **Idempotency đa lớp**:

1. **Đầu vào tạo đơn hàng (Order Creation Input):**
   * **Redis Idempotency Claim:** Sử dụng lệnh nguyên tử `SET idempotency:order:<userId>:<key> <value> NX PX 120000` (thời hạn 2 phút). Request gửi lên đầu tiên sẽ giữ khóa thành công và xử lý tạo đơn. Request trùng key gửi lên sau đó trong vòng 2 phút sẽ bị chặn lại lập tức.
   * **Database Unique Constraint:** Đặt ràng buộc duy nhất `UNIQUE(user_id, idempotency_key)` trên bảng `orders` của Database làm chốt chặn cuối cùng ngăn chặn dữ liệu trùng lặp ghi vào đĩa.
2. **Đầu ra xử lý Webhook (Payment Webhook Response):**
   * **Trạng thái đơn hàng:** Trước khi xử lý webhook thanh toán, hệ thống kiểm tra trạng thái đơn hàng hiện tại. Nếu trạng thái đơn hàng đã là `PAID`, hệ thống lập tức bỏ qua và phản hồi mã thành công hoặc mã báo trùng `02` (Order already confirmed).
   * **Nhật ký thanh toán (Payment Logs Unique Constraint):** Thiết lập ràng buộc duy nhất `UNIQUE(order_id, event_type)` trên bảng `payment_logs` để chặn đứng các trường hợp xác nhận thanh toán trùng lặp ghi nhận vào database.

---

## 2. Minh chứng Kiểm thử Tự động (Automated Test)
* **File test 1 (Chống tạo đơn trùng):** `backend/src/test/java/com/ticketbox/module/ticket/application/OrderConcurrencyIntegrationTest.java`
  * **Phương thức test:** `concurrentRequestsSharingOneIdempotencyKeyCreateOneOrder`
  * **Kịch bản test:** Gửi đồng thời **20 request** tạo đơn hàng song song mang **cùng 1 Idempotency Key**.
  * **Kết quả kỳ vọng (Assertion):** Đúng 1 đơn hàng được tạo thành công trong database.
* **File test 2 (Chống nhận webhook trùng):** `backend/src/test/java/com/ticketbox/module/payment/application/PaymentServiceIdempotencyTest.java`
  * **Phương thức test:** `testWebhookSequentialRetryIdempotency` & `testWebhookSequentialRetryWithPaidOrderStatus`
  * **Kịch bản test:** Giả lập nhận webhook thanh toán lần 1 báo thành công (trả về code `00`), sau đó tiếp tục gửi webhook lần 2 cho đơn hàng đó.
  * **Kết quả kỳ vọng (Assertion):** webhook lần 2 bị từ chối và trả về mã lỗi báo trùng `02 - Order already confirmed`.

### Lệnh chạy test:
```powershell
# Chạy test idempotency tạo đơn hàng
.\mvnw.cmd test -Dtest=OrderConcurrencyIntegrationTest#concurrentRequestsSharingOneIdempotencyKeyCreateOneOrder
# Chạy test idempotency webhook thanh toán
.\mvnw.cmd test -Dtest=PaymentServiceIdempotencyTest
```

---

## 3. Quy trình Kiểm thử Thủ công (Manual Verification)
1. Dùng công cụ **Postman** gửi request tạo đơn hàng (`POST /api/orders`) kèm Header `Idempotency-Key: test-key-123`.
2. Bấm nút gửi liên tiếp 2 lần thật nhanh.
3. **Kết quả:** Request thứ nhất tạo đơn hàng thành công, request thứ hai trả về lỗi hoặc kết quả đơn hàng cũ chứ không sinh ra bản ghi đơn hàng mới trong DB.
4. Sử dụng công cụ ngrok Web Inspect (`http://localhost:4040`), bấm nút **Replay** trên một request Webhook đã được cổng thanh toán (MoMo/VNPay) gửi thành công trước đó để gửi lại request webhook đó một lần nữa.
5. **Kết quả:** Backend nhận request lần 2 và phản hồi mã lỗi `02` báo trùng lặp, số lượng vé và nhật ký giao dịch không bị cộng dồn hay thay đổi.

---

## 4. Ghi chú Kỹ thuật
* Cơ chế Idempotency Claim trên Redis sử dụng thời hạn lưu trữ (TTL) ngắn (2 phút) để tối ưu dung lượng bộ nhớ đệm, trong khi DB Unique Constraint và kiểm tra trạng thái đơn hàng đảm bảo tính an toàn dữ liệu vĩnh viễn.
