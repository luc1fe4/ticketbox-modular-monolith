# Đặc tả: Thông báo (Notification)

> Khung tài liệu — điền nội dung vào các phần `<!-- ... -->`.
> Phục vụ yêu cầu: gửi xác nhận qua app + email kèm e-ticket sau khi mua, nhắc trước 24h, và thiết kế dễ bổ sung kênh mới (Zalo OA, SMS).

## 1. Mô tả
<!-- Sau khi mua vé thành công, khán giả nhận thông báo xác nhận qua app + email kèm e-ticket.
     Trước concert 24 giờ, hệ thống gửi nhắc nhở tự động.
     Kiến trúc phải dễ mở rộng thêm kênh mới mà không thay đổi lớn. -->

---

## 2. Luồng chính
### A. Thông báo xác nhận sau mua
<!-- - Sự kiện PaymentCompletedEvent -> publish message lên RabbitMQ.
     - Listener consume -> gửi app notification (lưu DB) + email (SMTP/MailHog).
     - Kèm e-ticket QR. -->

### B. Nhắc nhở trước 24h
<!-- - Scheduler quét concert sắp diễn ra -> gửi reminder. -->

### C. Khả năng mở rộng kênh (Strategy/abstraction)
<!-- - Interface NotificationChannel; mỗi kênh (Email, App, Zalo, SMS) là một implementation.
     - Thêm kênh mới = thêm class mới, không sửa code cũ (Open/Closed). -->

---

## 3. Kịch bản lỗi
<!-- - Gửi email/thông báo thất bại -> retry qua RabbitMQ; hết retry -> Dead Letter Queue (DLQ).
     - SMTP down -> không chặn luồng mua vé (async).
     - Message trùng -> xử lý idempotent (không gửi 2 lần). -->

---

## 4. Ràng buộc
<!-- - Gửi thông báo bất đồng bộ, không block luồng thanh toán.
     - Cấu hình retry/DLQ trong RabbitMQ.
     - Thêm kênh mới không cần sửa code hiện có. -->

---

## 5. Tiêu chí chấp nhận
<!-- 1. Mua vé thành công -> nhận app notification + email kèm e-ticket (kiểm tra MailHog).
     2. Concert trước 24h -> nhận reminder tự động.
     3. Thêm được một kênh thông báo mới chỉ bằng cách thêm implementation, không sửa luồng cũ.
     4. Gửi lỗi được retry và vào DLQ, không mất message. -->
