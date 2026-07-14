# Báo cáo Kiểm thử - Cơ chế Cầu chì & Cô lập lỗi (Circuit Breaker)
**Người phụ trách:** Bùi Minh Quân  
**Yêu cầu cần chứng minh:** Circuit breaker và graceful degradation cài thật.  
**Minh chứng mong đợi:** `Test payment lỗi liên tiếp; trang concert vẫn hoạt động`

---

## 1. Giải pháp Thiết kế & Cài đặt
Để cô lập lỗi khi các dịch vụ bên ngoài (cổng thanh toán MoMo/VNPay) gặp sự cố sập kết nối hoặc phản hồi chậm, hệ thống triển khai cơ chế **Cầu chì bảo vệ (Circuit Breaker)** và **Suy thoái mềm dẻo (Graceful Degradation)**:
1. **Resilience4j Circuit Breaker:** Được cấu hình trên tầng kết nối của Module Payment đến các Gateway ngoại vi. Nếu tỷ lệ lỗi vượt ngưỡng cho phép (ví dụ: lỗi kết nối liên tiếp), trạng thái cầu chì tự động chuyển từ `CLOSED` sang `OPEN`. Khi ở trạng thái `OPEN`, tất cả các cuộc gọi API thanh toán mới sẽ bị chặn và trả lỗi Fallback lập tức để bảo vệ tài nguyên hệ thống, tránh làm nghẽn luồng xử lý của Server.
2. **Cô lập lỗi (Fault Isolation):** Áp dụng kiến trúc Modular Monolith. Các mô-đun liên lạc qua các Interface lỏng lẻo. Lỗi phát sinh trong mô-đun Payment sẽ được cô lập tại chỗ, không làm sập luồng nghiệp vụ của các mô-đun khác như Concert hay Ticket.

---

## 2. Minh chứng Kiểm thử Tự động (Automated Test)
* **File test:** `backend/src/test/java/com/ticketbox/module/payment/infrastructure/PaymentCircuitBreakerTest.java`
* **Các phương thức test:**
  * `momoCircuitBreakerTransitionsToOpenAfterFailuresAndCallsFallback` (Chứng minh cầu chì MoMo tự ngắt)
  * `vnpayCircuitBreakerTransitionsToOpenAfterFailuresAndCallsFallback` (Chứng minh cầu chì VNPay tự ngắt)
  * `testConcertServiceStillWorksWhenPaymentIsDown` (Chứng minh trang concert vẫn hoạt động bình thường khi thanh toán sập)
* **Kịch bản test:**
  * Giả lập cổng thanh toán sập hoàn toàn (ném ngoại lệ lỗi kết nối liên tục).
  * Gửi liên tiếp các yêu cầu thanh toán và kiểm tra trạng thái cầu chì.
* **Kết quả kỳ vọng (Assertion):**
  * Sau đúng 3 lần lỗi liên tiếp (ngưỡng tối thiểu cấu hình trong test), trạng thái cầu chì chuyển sang `OPEN`.
  * Lần gọi thứ 4 lập tức nhận về kết quả Fallback mà không tốn thời gian chờ kết nối.
  * Việc truy vấn danh sách concert hoặc chi tiết concert thông qua `ConcertService` vẫn trả về dữ liệu thành công 100%.

### Lệnh chạy test:
```powershell
.\mvnw.cmd test -Dtest=PaymentCircuitBreakerTest
```

---

## 3. Quy trình Kiểm thử Thủ công (Manual Verification)
1. Tắt kết nối mạng Internet của máy chủ (hoặc cấu hình URL endpoint cổng thanh toán trong `.env` thành một địa chỉ IP ảo không tồn tại).
2. Tạo đơn hàng và nhấn thanh toán. Hệ thống sẽ mất khoảng vài giây chờ timeout rồi báo lỗi. Thực hiện việc này 3 lần liên tiếp.
3. Ở lần bấm thanh toán thứ 4, hệ thống trả lỗi ngay lập tức mà không có thời gian trễ (cầu chì đã chuyển sang `OPEN` và kích hoạt hàm Fallback).
4. Mở trình duyệt truy cập trang chủ hoặc trang chi tiết Concert $\rightarrow$ Thông tin concert vẫn hiển thị đầy đủ, mượt mà (Graceful Degradation thành công).

---

## 4. Ghi chú Kỹ thuật
* Cấu hình Circuit Breaker trong thực tế được tinh chỉnh thông qua file `application.yml` của module payment, cho phép điều chỉnh ngưỡng lỗi (Failure Rate Threshold) và thời gian chờ để cầu chì tự động chuyển về trạng thái thử nghiệm `HALF-OPEN` nhằm khôi phục dịch vụ khi cổng thanh toán hoạt động trở lại.
* HTTP Client (`RestClient`) được cấu hình giới hạn thời gian chờ (Read Timeout & Connect Timeout) tối đa 5 giây để ngăn chặn hiện tượng "treo" luồng xử lý (thread starvation) khi các dịch vụ bên ngoài bị chậm.
