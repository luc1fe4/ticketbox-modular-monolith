# TicketBox - Project Proposal

## 1. Bối cảnh

Các concert âm nhạc lớn tại Việt Nam như Anh Trai Say Hi, Anh Trai Vượt Ngàn Chông Gai, Em Xinh Say Hi hoặc Chị Đẹp Đạp Gió Rẽ Sóng thường thu hút hàng chục nghìn khán giả cùng truy cập trong vài phút đầu mở bán. Nếu hệ thống bán vé không được thiết kế tốt, người dùng có thể gặp các lỗi nghiêm trọng: website sập, bị trừ tiền nhưng không nhận vé, bot/scalper gom hết vé trong vài giây, hoặc cùng một vé bị xử lý nhiều lần.

Nhiều sự kiện vẫn bán vé qua các kênh rời rạc như Zalo OA, Google Form hoặc chuyển khoản thủ công. Cách vận hành này khó kiểm soát công bằng, không đảm bảo tính nhất quán dữ liệu và tạo nhiều khoảng trống cho gian lận. TicketBox được đề xuất như một nền tảng số hóa toàn bộ quy trình bán vé concert, từ lúc cấu hình sự kiện, mở bán, thanh toán, phát hành e-ticket đến soát vé tại cổng.

## 2. Vấn đề cần giải quyết

| Vấn đề | Mô tả |
|---|---|
| Tranh chấp vé cuối cùng | Một số khu vé như SVIP có số lượng rất ít nhưng nhu cầu cực lớn. Hệ thống phải đảm bảo không oversell và không phát hành trùng vé. |
| Tải truy cập đột biến | Trong giờ mở bán, hàng chục nghìn người có thể cùng xem concert, vào queue, giữ vé và thanh toán. Backend và database cần được bảo vệ khỏi quá tải. |
| Thanh toán không ổn định | Cổng VNPAY/MoMo có thể timeout hoặc trả callback trễ. TicketBox phải tránh trừ tiền hai lần, tránh phát hành vé sai và vẫn giữ các chức năng không liên quan hoạt động. |
| Soát vé trong môi trường mạng yếu | Sân vận động hoặc nhà thi đấu thường có sóng yếu. Staff cần quét vé offline và đồng bộ lại khi có mạng mà không cho phép một vé vào cổng hai lần. |
| Tích hợp guest list một chiều | Đối tác tài trợ chỉ gửi danh sách khách mời VIP bằng CSV, không có API. Hệ thống phải nhập file định kỳ, xử lý dòng lỗi/trùng và không làm gián đoạn bán vé. |
| Giới hạn vé theo tài khoản | Một người dùng không được mua vượt quá `max_per_account`, kể cả khi gửi nhiều request song song. |
| Dữ liệu concert bị đọc quá nhiều | Trang danh sách/chi tiết concert và số vé còn lại bị đọc liên tục trong giờ cao điểm. Cần cache hợp lý nhưng vẫn giữ inventory đúng. |

## 3. Mục tiêu

- Cung cấp trải nghiệm mua vé end-to-end: xem concert, vào waiting room, chọn loại vé, giữ vé, thanh toán và nhận e-ticket QR.
- Đảm bảo không oversell bằng transaction/atomic update tại PostgreSQL.
- Chống request trùng và nguy cơ trừ tiền hai lần bằng idempotency key, payment log và xác minh callback.
- Điều tiết tải bằng Redis rate limiting, waiting room/queue và cache cho dữ liệu đọc nhiều.
- Cô lập lỗi payment gateway bằng timeout/circuit breaker/graceful degradation.
- Hỗ trợ mobile scanner offline với SQLite local store và đồng bộ conflict-safe.
- Tự động nhập guest list CSV bằng Spring Batch, có batch log và error report.
- Tự động hỗ trợ tạo artist bio từ PDF bằng PDFBox và AI/mock provider.
- Tổ chức backend theo modular monolith để dễ demo, dễ kiểm thử và vẫn giữ ranh giới nghiệp vụ rõ ràng.

## 4. Phạm vi

### Trong phạm vi

- Backend Spring Boot modular monolith.
- React web cho audience, organizer/admin và staff web.
- Expo mobile scanner hỗ trợ offline SQLite.
- PostgreSQL/Flyway cho dữ liệu giao dịch chính.
- Redis cho cache, rate limit, idempotency, queue state và shopping session.
- RabbitMQ cho notification bất đồng bộ.
- VNPAY Sandbox, MoMo/mock provider cho thanh toán demo.
- SMTP/MailHog cho email trong môi trường local/demo.
- Spring Batch và Commons CSV cho guest list import.
- PDFBox và AI/mock provider cho artist bio.
- Docker Compose để chạy toàn bộ môi trường demo.

### Ngoài phạm vi

- Hạ tầng production như Kubernetes, CDN, load balancer, autoscaling thật.
- Xử lý tiền thật; đồ án chỉ dùng sandbox/mock payment.
- Seat map phức tạp tới từng ghế; hệ thống tập trung vào zone/category như SVIP, VIP, CAT1, CAT2, GA.
- Tích hợp hai chiều với hệ thống guest list của đối tác.

## 5. Rủi ro và ràng buộc

| Rủi ro/ràng buộc | Hướng xử lý trong thiết kế |
|---|---|
| Database contention khi nhiều người giữ vé | Dùng atomic update trên `ticket_types.available_qty`, giới hạn queue admission và rate limit. |
| Redis lỗi trong giờ mở bán | PostgreSQL vẫn là nguồn dữ liệu đúng; cache có thể bỏ qua, nhưng queue/rate limit/idempotency cần cảnh báo và khôi phục nhanh. |
| Payment callback trùng hoặc tới muộn | Xác minh chữ ký, ghi payment log có unique constraint, xử lý trạng thái order theo transaction. |
| Staff offline quá lâu | SQLite giữ dataset/log cục bộ; server giải quyết conflict khi sync bằng ràng buộc unique check-in. |
| CSV sai schema hoặc dữ liệu trùng | Validate header, skip faulty rows, upsert theo `(concert_id, phone)`, ghi batch log/error report. |
| AI API chậm hoặc tốn chi phí | Chạy async background job, có mock provider trong môi trường demo. |
| Frontend hiển thị số vé hơi cũ | Availability cache TTL ngắn, polling 3-5 giây, và backend luôn kiểm tra DB khi reserve/order. |

## 6. Cấu trúc tài liệu blueprint

| Tài liệu | Nội dung chính |
|---|---|
| `blueprint/proposal.md` | Bối cảnh, vấn đề, mục tiêu, phạm vi và rủi ro. |
| `blueprint/design.md` | Kiến trúc tổng thể, C4 diagrams, integration flows, data design, RBAC, protection mechanisms và ADR. |
| `blueprint/data-model/erd.md` | ERD và các ràng buộc dữ liệu quan trọng. |
| `blueprint/specs/payment.md` | Luồng mua vé, thanh toán, idempotency, chống oversell và xử lý payment failure. |
| `blueprint/specs/checkin.md` | Soát vé online/offline và đồng bộ check-in logs. |
| `blueprint/specs/auth.md` | Authentication, RBAC, role-permission matrix và 401/403. |
| `blueprint/specs/guest-list-import.md` | Đặc tả nhập guest list CSV bằng Spring Batch. |
| `blueprint/performance/cache-strategy.md` | Cache strategy cho concert list/detail và ticket availability. |
| `blueprint/flows/import-guest-list.mmd` | Mermaid sequence diagram cho guest list import. |
