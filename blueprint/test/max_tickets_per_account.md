# Báo cáo Kiểm thử - Giới hạn số vé tối đa trên mỗi tài khoản
**Người phụ trách:** Bùi Minh Quân  
**Yêu cầu cần chứng minh:** Enforce giới hạn vé/tài khoản trên toàn bộ đơn thành công, kể cả request đồng thời.  
**Minh chứng mong đợi:** `Test concurrent + constraint/transaction/lock`

---

## 1. Giải pháp Thiết kế & Cài đặt
Để kiểm soát số lượng vé tối đa một tài khoản có thể mua trong cả điều kiện tải cao và các yêu cầu đồng thời (concurrent requests) từ một người dùng:
1. **Tầng ứng dụng (Application Layer):** Sử dụng **Khóa phân tán Redis (Redis Distributed Lock)** với key dạng `lock:user:<userId>` và thời hạn (TTL) là 5 giây khi bắt đầu quá trình tạo đơn hàng. Điều này đảm bảo rằng tại một thời điểm, chỉ có duy nhất một yêu cầu tạo đơn từ một user được xử lý, loại bỏ hoàn toàn khả năng chạy song song nhiều request tạo đơn của cùng một người dùng để lách luật.
2. **Kiểm tra giới hạn (Limit Verification):** Sau khi giữ khóa phân tán thành công, hệ thống thực hiện đếm tổng số vé đã đặt mua thành công và đang giữ (`alreadyOrdered + alreadyHeld`). Nếu tổng số lượng này cộng với số lượng vé đang yêu cầu vượt quá giới hạn cấu hình của loại vé (`maxPerAccount`), hệ thống ném ra ngoại lệ `TICKET_LIMIT_EXCEEDED` và dừng giao dịch.

---

## 2. Minh chứng Kiểm thử Tự động (Automated Test)
* **File test:** `backend/src/test/java/com/ticketbox/module/ticket/application/OrderConcurrencyIntegrationTest.java`
* **Phương thức test:** `concurrentRequestsFromOneAccountCannotExceedMaxPerAccount`
* **Kịch bản test:**
  * Cấu hình giới hạn loại vé: tối đa **2 vé/tài khoản**.
  * Dùng 1 tài khoản user gửi đồng thời **20 request** mua vé song song (mỗi request mua 2 vé).
* **Kết quả kỳ vọng (Assertion):**
  * Đúng 1 request thành công mua được 2 vé.
  * 19 request còn lại thất bại và bị reject với mã lỗi `INVALID_REQUEST` (do bị chặn bởi khóa phân tán Redis) hoặc `TICKET_LIMIT_EXCEEDED` (vượt quá giới hạn).
  * Tổng số lượng vé sở hữu trong DB của user sau kiểm thử bằng chính xác 2.

### Lệnh chạy test:
```powershell
.\mvnw.cmd test -Dtest=OrderConcurrencyIntegrationTest#concurrentRequestsFromOneAccountCannotExceedMaxPerAccount
```

---

## 3. Quy trình Kiểm thử Thủ công (Manual Verification)
1. Đăng nhập vào tài khoản kiểm thử trên giao diện web.
2. Tiến hành đặt mua vé cho tới khi đạt đúng giới hạn tối đa cho phép (ví dụ: mua 2 vé).
3. Quay lại trang chi tiết concert, chọn mua thêm 1 vé và bấm Xác nhận đặt vé.
4. **Kết quả:** Hệ thống chặn lại ngay lập tức và hiển thị thông báo lỗi màu đỏ trên màn hình: *"Purchase limit exceeded for zone..."*.

---

## 4. Ghi chú Kỹ thuật
* Cơ chế khóa phân tán Redis sử dụng lệnh nguyên tử `SET key value NX PX 5000` (`setIfAbsent` trên Java Spring Redis Template). Ràng buộc này đảm bảo an toàn tuyệt đối ngay cả khi hệ thống chạy trên môi trường phân tán (nhiều instance backend chạy song song).
