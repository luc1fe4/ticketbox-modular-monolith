# Đặc tả: Offline Gate Check-In & Synchronization

## 1. Mô tả
Tính năng này cho phép nhân viên soát vé (Staff) thực hiện kiểm tra vé trực tuyến và ngoại tuyến (offline) thông qua ứng dụng di động Expo tại các địa điểm tổ chức sự kiện có sóng di động yếu hoặc không ổn định. Hệ thống đảm bảo tính toàn vẹn của dữ liệu soát vé và ngăn chặn tuyệt đối một vé được sử dụng để vào cổng nhiều lần.

---

## 2. Luồng chính
### A. Chuẩn bị dữ liệu (Online)
1. Staff đăng nhập vào ứng dụng mobile, chọn concert đang phụ trách soát vé và nhấn "Tải dữ liệu soát vé".
2. Mobile gửi yêu cầu `GET /api/staff/concerts/{concertId}/checkin-dataset` để tải danh sách các vé hợp lệ (gồm ticket ID và chữ ký/QR secret).
3. Mobile lưu dữ liệu tải về vào database SQLite cục bộ trên thiết bị di động.

### B. Soát vé Ngoại tuyến (Offline Mode)
1. Thiết bị mất kết nối mạng.
2. Khán giả xuất trình mã QR e-ticket. Staff quét mã QR bằng camera của thiết bị.
3. Ứng dụng mobile phân tích mã QR, kiểm tra chữ ký và đối chiếu trong SQLite cục bộ:
   - Nếu vé không tồn tại hoặc không khớp thông tin concert: Báo lỗi "Vé không hợp lệ".
   - Nếu vé tồn tại nhưng đã có log check-in trong SQLite: Báo lỗi "Vé đã được quét trước đó" (Double check-in).
   - Nếu vé hợp lệ và chưa quét: Tạo bản ghi check-in log mới trong SQLite (`is_offline = true`, `sync_at = null`), hiển thị thông báo "Hợp lệ - Cho phép vào cổng".

### C. Đồng bộ dữ liệu (Khi có mạng trở lại)
1. Thiết bị khôi phục kết nối mạng.
2. Ứng dụng tự động hoặc Staff chủ động nhấn "Đồng bộ logs".
3. Mobile gửi danh sách check-in logs chưa đồng bộ (`sync_at = null`) lên Backend qua API `POST /api/staff/checkins/sync`.
4. Backend xử lý đồng bộ từng log trong transaction:
   - Kiểm tra xem ticket ID đã được soát vé trên Server chưa (bằng cách kiểm tra bảng `checkin_logs` toàn cục).
   - Nếu chưa check-in: Ghi nhận check-in thành công.
   - Nếu đã check-in (xảy ra conflict do soát vé song song ở các cổng khác): Tạo bản ghi log lỗi hoặc cảnh báo conflict trên Server.
5. Server trả về kết quả đồng bộ. Mobile cập nhật trạng thái `sync_at` cho các log đồng bộ thành công và hiển thị cảnh báo đối với các log bị conflict.

---

## 3. Kịch bản lỗi
*   **Vé giả / Sai concert:** Ứng dụng báo lỗi ngay tại màn hình quét, không cho phép vào cổng.
*   **Trùng lặp check-in khi offline:** Nếu 2 thiết bị khác nhau quét cùng một vé khi đang offline, cả hai đều báo thành công. Tuy nhiên khi đồng bộ lên Server, thiết bị đồng bộ sau sẽ bị Server từ chối và ghi nhận lỗi conflict (`uq_checkin_logs_ticket`).

---

## 4. Ràng buộc
*   **Database Server:** Cột `ticket_id` trong bảng `checkin_logs` trên Server có ràng buộc `UNIQUE` để ngăn chặn tuyệt đối double-checkin.
*   **SQLite cục bộ:** Dữ liệu check-in logs phải được lưu trữ an toàn trong SQLite trên thiết bị, không bị mất khi ứng dụng bị tắt đột ngột.

---

## 5. Tiêu chí chấp nhận
1. Staff có thể tải xuống dataset soát vé khi có mạng.
2. Khi mất mạng hoàn toàn, ứng dụng di động vẫn soát được vé dựa trên SQLite cục bộ và ghi nhận chính xác lịch sử quét.
3. Khi khôi phục mạng, hệ thống đồng bộ logs thành công lên Server và giải quyết xung đột (conflict) một cách minh bạch, ghi nhận chi tiết lỗi nếu có.
