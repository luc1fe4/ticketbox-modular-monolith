# Đặc tả: Đồng bộ danh sách khách mời VIP (CSV Import)

> Khung tài liệu — điền nội dung vào các phần `<!-- ... -->`.
> Phục vụ yêu cầu: tích hợp một chiều, đọc CSV nhãn hàng gửi theo lịch, xử lý file lỗi/dữ liệu trùng, không làm gián đoạn hệ thống.

## 1. Mô tả
<!-- Nhãn hàng tài trợ không có API, chỉ gửi file CSV danh sách khách mời (Guest List)
     vào ban đêm trước ngày diễn. TicketBox định kỳ nhập để nhân sự soát vé xác nhận
     khách mời tại cổng VIP. -->

---

## 2. Luồng chính
<!-- - Cơ chế đọc file định kỳ: Spring Batch job + scheduler (cron GUEST_LIST_IMPORT_CRON).
     - Đọc CSV -> validate từng dòng -> ghi vào bảng guest_list.
     - Xử lý dữ liệu trùng: idempotent import (skip/update theo key nào).
     - Thành phần tham gia: Scheduler, Spring Batch, DB, thư mục chứa file CSV. -->

---

## 3. Kịch bản lỗi
<!-- - File lỗi định dạng / thiếu cột -> ghi log lỗi, bỏ qua dòng lỗi, không dừng cả job.
     - Dòng trùng -> xử lý idempotent, không tạo bản ghi trùng.
     - File rỗng / không tồn tại -> job kết thúc êm, không crash.
     - Import đang chạy không được làm gián đoạn các chức năng khác. -->

---

## 4. Ràng buộc
<!-- - Import chạy nền, không block request người dùng.
     - Ràng buộc UNIQUE để chống trùng khách mời.
     - Ghi lại lịch sử import (batch log) để organizer xem. -->

---

## 5. Tiêu chí chấp nhận
<!-- 1. Job import chạy đúng lịch, nhập được file CSV hợp lệ.
     2. File lỗi/dòng lỗi được bỏ qua và ghi log, hệ thống vẫn chạy bình thường.
     3. Chạy import 2 lần cùng file không tạo dữ liệu trùng.
     4. Nhân sự soát vé thấy được danh sách khách mời tại cổng VIP sau import. -->
