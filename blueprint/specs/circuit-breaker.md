# Đặc tả: Circuit Breaker & Graceful Degradation (BP11)

Tài liệu này đặc tả cơ chế tự bảo vệ của hệ thống TicketBox thông qua mô hình **Circuit Breaker (Bộ ngắt mạch)** và **Graceful Degradation (Suy giảm dịch vụ có kiểm soát)** khi các cổng thanh toán bên thứ ba (VNPAY/MoMo) hoặc các dịch vụ AI bên ngoài gặp sự cố kết nối, lỗi hệ thống hoặc phản hồi chậm (timeout).

---

## 1. Mục tiêu
* **Ngăn chặn lỗi sập dây chuyền (Cascading Failure):** Khi cổng thanh toán VNPAY/MoMo bị lỗi hoặc phản hồi rất chậm, các luồng (threads) xử lý của backend Spring Boot có nguy cơ bị nghẽn (treo) do phải đợi phản hồi. Việc nghẽn thread này sẽ làm cạn kiệt tài nguyên của server API và kéo sập các dịch vụ không liên quan khác.
* **Tự động phục hồi (Self-Healing):** Hệ thống có khả năng tự động ngắt kết nối lỗi, tự động thử lại sau một khoảng thời gian chờ để kiểm tra xem dịch vụ ngoài đã phục hồi chưa.
* **Suy giảm dịch vụ có kiểm soát (Graceful Degradation):** Khi một cổng thanh toán bị sập, hệ thống chỉ tạm dừng tính năng thanh toán của cổng đó (hoặc hiển thị thông báo lỗi thân thiện) mà **vẫn giữ cho các chức năng khác hoạt động bình thường** (như duyệt danh sách concert, xếp hàng waiting room, soát vé).

---

## 2. Nguyên lý hoạt động của Circuit Breaker (Bộ ngắt mạch)

Hệ thống TicketBox tích hợp thư viện **Resilience4j** để thiết lập 3 trạng thái hoạt động chính của bộ ngắt mạch:

```text
               ┌───────────────────────┐
               │        CLOSED         │◄────────────────────────┐
               │ (Mạch đóng - Cho qua) │                         │
               └───────────┬───────────┘                         │
                           │                                     │
                           │ Tỷ lệ lỗi > 50%                     │ 2 cuộc gọi thử
                           ▼                                     │ thành công
               ┌───────────────────────┐                         │
               │         OPEN          │                         │
               │ (Mạch mở - Ngắt nhanh)│                         │
               └───────────┬───────────┘                         │
                           │                                     │
                           │ Sau 30 giây chờ                     │
                           ▼                                     │
               ┌───────────────────────┐                         │
               │       HALF-OPEN       │─────────────────────────┘
               │ (Mở một nửa - Thử lại)│
               └───────────┬───────────┘
                           │
                           │ Ít nhất 1 cuộc gọi thử lỗi
                           ▼
                      (Quay lại OPEN)
```

1. **Trạng thái Đóng (CLOSED - Hoạt động bình thường):**
   * Tất cả yêu cầu khởi tạo thanh toán từ Client đều được gửi trực tiếp đến cổng MoMo/VNPAY.
   * Hệ thống liên tục theo dõi kết quả của các cuộc gọi trong một "Cửa sổ trượt" (Sliding Window).
2. **Trạng thái Mở (OPEN - Ngắt kết nối lỗi):**
   * Nếu tỷ lệ cuộc gọi thất bại (hoặc timeout) vượt quá ngưỡng cấu hình (ví dụ: **50%** trong 5 cuộc gọi gần nhất).
   * Bộ ngắt mạch chuyển sang trạng thái **OPEN**.
   * Hệ thống **ngắt ngay lập tức** kết nối tới cổng thanh toán lỗi. Mọi yêu cầu thanh toán mới từ client gửi đến cổng này sẽ bị từ chối ngay lập tức bằng lỗi nhanh (Fail-Fast) mà không cần gọi sang cổng thanh toán ngoài, giúp giải phóng thread xử lý của backend.
3. **Trạng thái Mở một nửa (HALF-OPEN - Thử nghiệm phục hồi):**
   * Sau khi nằm ở trạng thái OPEN trong **30 giây** (`wait-duration-in-open-state`).
   * Bộ ngắt mạch tự động chuyển sang **HALF-OPEN**.
   * Hệ thống cho phép tối đa **2 cuộc gọi thử nghiệm** (`permitted-number-of-calls-in-half-open-state`) đi qua đến cổng MoMo/VNPAY.
   * **Đánh giá kết quả:**
     * Nếu cả 2 cuộc gọi thử nghiệm đều **Thành công**: Bộ ngắt mạch quay lại trạng thái **CLOSED** (Mạch hoạt động bình thường).
     * Nếu có **ít nhất 1 cuộc gọi thất bại**: Bộ ngắt mạch lập tức quay lại trạng thái **OPEN** và tiếp tục chờ thêm 30 giây nữa.

---

## 3. Graceful Degradation (Suy giảm dịch vụ có kiểm soát)

Khi xảy ra lỗi tại cổng thanh toán hoặc AI provider khiến bộ ngắt mạch ở trạng thái **OPEN**, hệ thống tự động điều chỉnh luồng dịch vụ để duy trì trải nghiệm tốt nhất có thể:

### A. Đối với cổng thanh toán (MoMo/VNPAY)
* **Kích hoạt Fallback:** Khi gọi API khởi tạo thanh toán bị lỗi/OPEN, phương thức fallback `fallbackInitiatePayment` được kích hoạt lập tức, ném ra lỗi thân thiện `ErrorCode.PAYMENT_GATEWAY_UNAVAILABLE` với thông báo *"MoMo/VNPAY payment gateway is temporarily unavailable"*.
* **Trải nghiệm khách hàng:** Người dùng sẽ nhận được thông báo lỗi rõ ràng trên màn hình đặt vé: *"Cổng thanh toán MoMo hiện đang bảo trì, vui lòng chọn phương thức thanh toán khác (như VNPAY hoặc ví điện tử khác) để hoàn tất đơn hàng"*.
* **Cô lập vùng lỗi:** Các đơn đặt vé chờ thanh toán (`AWAITING_PAYMENT`) có thể hết hạn sau 5 phút và tự động giải phóng vé. Hệ thống không bị treo hay mất dữ liệu, các chức năng khác như phòng chờ (Waiting Room), xem thông tin concert, soát vé của Staff vẫn hoạt động hoàn toàn bình thường.

### B. Đối với AI Artist Bio Generator
* **Phạm vi áp dụng:** Lớp `OpenAiCompatibleArtistBioGenerator.java` có gắn `@CircuitBreaker(name = "artistBioAi")`.
* **Cơ chế Fallback:** Khi AI service ngoài bị sập hoặc quá giới hạn yêu cầu (rate limit của OpenAI/Gemini), hệ thống ngắt mạch và không gọi API AI nữa. 
* **Trải nghiệm:** Tác vụ xử lý Bio nghệ sĩ sẽ tạm thời hiển thị trạng thái lỗi hoặc sử dụng tiểu sử mặc định (Mock/Manual Bio) đã thiết lập thủ công. Việc AI lỗi **hoàn toàn không được phép ảnh hưởng** đến luồng đặt vé cốt lõi của Khán giả.

---

## 4. Tham số cấu hình chi tiết (Resilience4j trong `application.yml`)

Hệ thống TicketBox cấu hình chi tiết các tham số của bộ ngắt mạch như sau:

| Tên Instance | Kích thước cửa sổ trượt (sliding-window-size) | Số cuộc gọi tối thiểu để tính tỷ lệ lỗi (minimum-number-of-calls) | Ngưỡng tỷ lệ lỗi kích hoạt ngắt mạch (failure-rate-threshold) | Thời gian chờ ở trạng thái OPEN (wait-duration-in-open-state) | Số cuộc gọi thử nghiệm ở HALF-OPEN (permitted-number-of-calls) |
|---|---|---|---|---|---|
| **vnpay** | 5 cuộc gọi | 3 cuộc gọi | 50% | 30 giây | 2 cuộc gọi |
| **momo** | 5 cuộc gọi | 3 cuộc gọi | 50% | 30 giây | 2 cuộc gọi |
| **artistBioAi** | 5 cuộc gọi | 3 cuộc gọi | 50% | 30 giây | 2 cuộc gọi |

---

## 5. Tiêu chí nghiệm thu (Acceptance Criteria)
1. **Ngắt mạch nhanh (Fail-Fast):** Khi cổng MoMo bị giả lập lỗi (timeout hoặc kết nối thất bại) liên tiếp 3 lần $\rightarrow$ Bộ ngắt mạch chuyển sang `OPEN`. Kể từ lần thứ 4, yêu cầu thanh toán qua MoMo lập tức bị từ chối với mã lỗi `PAYMENT_GATEWAY_UNAVAILABLE` trong vòng `< 5ms` mà không tạo thêm bất kỳ HTTP request nào sang server MoMo.
2. **Cô lập lỗi hoàn hảo:** Khi mạch MoMo hoặc VNPAY ở trạng thái `OPEN` $\rightarrow$ Khán giả vẫn có thể đăng ký tài khoản, xem danh sách concert, vào phòng chờ, và soát vé bình thường.
3. **Thử nghiệm phục hồi:** Sau 30 giây từ khi ngắt mạch MoMo, gửi yêu cầu thanh toán qua MoMo $\rightarrow$ Hệ thống cho phép request đi qua (HALF-OPEN). Nếu MoMo đã hoạt động trở lại thành công $\rightarrow$ Hệ thống tự động chuyển mạch về `CLOSED`.
4. **Không ảnh hưởng luồng chính khi AI lỗi:** Khi upload file PDF và AI service ngoài gặp sự cố $\rightarrow$ Tác vụ sinh Artist Bio kết thúc với trạng thái lỗi được ghi nhận trong bảng `artist_pdf_jobs`, không gây treo server và khán giả vẫn mua vé bình thường.
