# Đặc tả Guest List CSV Import

## 1. Mục tiêu

Chức năng Guest List CSV Import cho phép Organizer/Admin nhập danh sách khách mời VIP từ file CSV do đối tác tài trợ hoặc đơn vị vận hành sự kiện cung cấp. Đây là luồng tích hợp một chiều vào TicketBox: file CSV được đưa vào hệ thống, dữ liệu hợp lệ được ghi vào danh sách khách mời của concert, còn dữ liệu lỗi được bỏ qua có kiểm soát và ghi nhận trong batch log.

Mục tiêu của chức năng:

- Hệ thống xử lý được file CSV hợp lệ, file sai định dạng, dòng lỗi và dòng trùng lặp.
- Import có tính idempotent: chạy lại cùng một tập dữ liệu không tạo bản ghi trùng và không làm sai trạng thái guest list.
- Lỗi import không làm gián đoạn các luồng chính như mua vé, thanh toán, check-in và tra cứu staff tại cổng.
- Có báo cáo kết quả import để Organizer/Admin biết số dòng thành công, số dòng lỗi và lý do lỗi.

## 2. Phạm vi chức năng

Chức năng bao gồm hai cách đưa file vào hệ thống:

- Import trực tiếp bởi Admin/Organizer qua API upload CSV cho một concert.
- Import theo lịch: Organizer đưa file vào hàng đợi, scheduler/Spring Batch quét thư mục incoming và xử lý file ổn định.

Phạm vi này không bao gồm đồng bộ hai chiều với đối tác ngoài, không yêu cầu webhook từ đối tác, và không thay thế luồng bán vé/chuyển vé thông thường.

## 3. Thành phần tham gia

| Thành phần | Vai trò |
|---|---|
| Organizer/Admin Web | Tải lên file CSV, xem batch log và kết quả lỗi. |
| Spring Boot API Server | Nhận request upload/schedule, tạo batch log, lưu file, kích hoạt job import khi cần. |
| Guest CSV Storage | Lưu file theo cấu trúc incoming/processing/processed/error cho từng concert. |
| Spring Batch Importer | Đọc CSV, validate header/dòng dữ liệu, phát hiện trùng lặp, upsert guest list và ghi báo cáo. |
| PostgreSQL | Lưu `guest_lists`, `batch_logs` và dữ liệu staging nếu cần. |
| Staff Gate Lookup | Tra cứu guest list đã commit theo concert và phone tại cổng check-in. |

## 4. Dữ liệu đầu vào

File CSV cần có header logic sau:

| Trường logic | Bắt buộc | Ghi chú |
|---|---:|---|
| `phone` | Có | Số điện thoại dùng làm khóa nghiệp vụ trong phạm vi concert. Có thể chấp nhận alias `phone_number` hoặc `mobile`. |
| `full_name` | Có | Họ tên khách mời. Có thể chấp nhận alias `name`. |
| `category` | Có | Nhóm khách mời/VIP. Có thể chấp nhận alias `guest_type`. |
| `sponsor_name` | Có | Đơn vị tài trợ/nguồn mời. Có thể chấp nhận alias `sponsor`. |
| `notes` | Có | Ghi chú phục vụ vận hành tại cổng. Có thể chấp nhận alias `note`. |
| `status` | Không | Nếu là `CANCELLED` thì import thành guest inactive; nếu bỏ trống thì mặc định active. |

Dữ liệu cần được chuẩn hóa trước khi so khớp: trim khoảng trắng, chuẩn hóa phone theo định dạng nội bộ, mapping alias header về trường logic, và từ chối dòng thiếu trường bắt buộc.

## 5. Luồng xử lý chính

### 5.1 Import trực tiếp

1. Organizer/Admin tải file CSV cho một concert.
2. API kiểm tra quyền truy cập concert và tạo `batch_logs` với trạng thái `RUNNING`.
3. File được lưu vào vùng xử lý riêng của guest list import.
4. Spring Batch đọc header, mapping alias và validate cấu trúc file.
5. Từng dòng được validate độc lập; dòng lỗi được ghi vào error report và không làm dừng toàn bộ job nếu các dòng khác hợp lệ.
6. Hệ thống phát hiện phone trùng trong cùng file. Dòng trùng được xem là lỗi dòng để tránh ambiguity.
7. Dòng hợp lệ được upsert vào `guest_lists` theo khóa nghiệp vụ `(concert_id, phone)`.
8. Batch log cập nhật `SUCCESS`, `PARTIAL` hoặc `FAILED` kèm `total_rows`, `success_rows`, `error_rows`, `error_detail`.

### 5.2 Import theo lịch

1. Organizer schedule file import; API tạo batch log `PENDING` và lưu file vào `incoming/{concertId}`.
2. Scheduler chỉ claim file đã ổn định, tránh đọc file đang ghi dở.
3. File được chuyển sang vùng `processing`; batch log chuyển sang `RUNNING`.
4. Importer xử lý validate, duplicate detection, upsert và error report như luồng trực tiếp.
5. File thành công/partial được đưa sang processed; file lỗi cấu trúc nghiêm trọng được đưa sang error.
6. Kết quả import được xem qua batch log detail.

## 6. Xử lý lỗi và dữ liệu trùng

| Tình huống | Cách xử lý mong muốn | Kết quả batch |
|---|---|---|
| Thiếu header bắt buộc và không có alias hợp lệ | Từ chối file, không ghi dữ liệu guest list mới | `FAILED` |
| Dòng thiếu `phone` hoặc `full_name` | Bỏ qua dòng lỗi, ghi lý do vào error report | `PARTIAL` nếu còn dòng hợp lệ; `FAILED` nếu không có dòng hợp lệ |
| Phone trùng trong cùng một file | Đánh dấu dòng trùng là lỗi để tránh ghi đè không rõ chủ đích | `PARTIAL` hoặc `FAILED` |
| Phone đã tồn tại trong `guest_lists` của concert | Upsert bản ghi hiện có theo `(concert_id, phone)`, không tạo duplicate | `SUCCESS` hoặc `PARTIAL` tùy dòng khác |
| `status=CANCELLED` | Cập nhật guest thành inactive, staff lookup không xem là guest active | `SUCCESS` nếu dòng hợp lệ |
| Lỗi DB tạm thời hoặc job bị ngắt | Ghi nhận batch log, có thể retry; upsert giúp retry không tạo trùng | `FAILED`/`PARTIAL`, retry an toàn |
| File đang được ghi dở | Scheduler chưa claim cho đến khi file ổn định | Không tạo batch lỗi giả |

## 7. Idempotency

Idempotency của import được đảm bảo ở các lớp sau:

- Khóa nghiệp vụ của guest là `(concert_id, phone)`, tương ứng ràng buộc unique trên bảng `guest_lists`.
- Dòng hợp lệ được ghi bằng upsert, nên chạy lại cùng file sẽ cập nhật bản ghi hiện có thay vì tạo guest mới.
- Phone trùng trong cùng một file bị báo lỗi dòng, tránh trường hợp hai dòng của cùng file cạnh tranh kết quả ghi đè.
- Batch log lưu trạng thái và thống kê import để người vận hành biết lần import nào đã thành công, partial hoặc failed.
- Scheduler chỉ claim file ổn định và tách incoming/processing/processed/error để hạn chế việc xử lý lại file đang ghi.

## 8. Không làm gián đoạn hệ thống

Guest List CSV Import chạy như một batch/background workflow, tách khỏi các luồng giao dịch trực tiếp của người dùng. Lỗi import chỉ ảnh hưởng batch log và tập dữ liệu guest list của concert liên quan, không được làm dừng:

- luồng mua vé và thanh toán VNPAY;
- luồng sinh ticket/QR;
- luồng check-in vé thường;
- staff lookup với dữ liệu guest list đã commit trước đó;
- các tác vụ admin/organizer khác.

Nếu batch bị lỗi, dữ liệu guest list đã commit trước đó vẫn là nguồn tra cứu hợp lệ. Các dòng lỗi không được ghi chen nửa vời với trạng thái không rõ ràng.

## 9. Tài liệu liên quan

- Spec này: `blueprint/specs/guest-list-import.md`.
- Sơ đồ Mermaid nguồn: `blueprint/flows/import-guest-list.mmd`.
- Liên kết tổng quan trong `blueprint/design.md`, mục High-Level Integration Flows.
- Log/API liên quan trong docs hiện có: các endpoint guest list import, batch log và staff guest lookup.

## 10. Tiêu chí nghiệm thu

| Kịch bản |
|---|
| Import file hợp lệ với nhiều guest tạo batch `SUCCESS`, `success_rows = total_rows`, `error_rows = 0`. |
| File có dòng thiếu phone tạo error report, dòng hợp lệ vẫn được import và batch là `PARTIAL`. |
| File có phone trùng trong cùng file không tạo hai guest trùng; dòng trùng được ghi lỗi. |
| Chạy lại cùng file không tạo duplicate do upsert theo `(concert_id, phone)`. |
| Dòng `status=CANCELLED` cập nhật guest inactive và không hiện như guest active khi staff lookup. |
| File sai header bị `FAILED`, không ghi dữ liệu guest mới. |
| Batch import lỗi không ảnh hưởng luồng mua vé, thanh toán, check-in và tra cứu dữ liệu đã commit. |
