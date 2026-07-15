# Architecture Decision Records (ADR)

Tài liệu này tập hợp các quyết định kiến trúc quan trọng của TicketBox. Mỗi ADR ghi rõ bối cảnh, quyết định, lý do và đánh đổi để người đọc hiểu vì sao hệ thống được thiết kế như hiện tại.

---

## ADR 01 - Chọn PostgreSQL cho lõi giao dịch

**Trạng thái:** Accepted

**Bối cảnh**

TicketBox cần xử lý các nghiệp vụ có tính nhất quán cao: giữ vé, tạo order, xác nhận thanh toán, phát hành e-ticket, kiểm soát vé vào cổng một lần và audit payment callback. Các dữ liệu này có quan hệ chặt chẽ giữa user, concert, ticket type, order, payment log, ticket và check-in log.

**Quyết định**

Sử dụng PostgreSQL làm database giao dịch chính thay vì dùng NoSQL document store cho lõi bán vé.

**Lý do**

- Cần ACID transaction để giữ vé, thanh toán và phát hành ticket không rơi vào trạng thái nửa vời.
- Cần foreign key và unique constraint để chống ticket trùng, QR trùng, payment callback trùng và check-in trùng.
- Cần atomic conditional update trên `ticket_types.available_qty` để chống oversell dưới tải cao.
- Dữ liệu có quan hệ tự nhiên, phù hợp relational schema hơn document model.

**Đánh đổi**

PostgreSQL có thể chịu áp lực ghi lớn trong giờ mở bán. Thiết kế giảm rủi ro bằng Waiting Room, Redis rate limiting, cache cho dữ liệu đọc nhiều và atomic update ở mức row cho inventory.

---

## ADR 02 - Modular Monolith thay vì Microservices

**Trạng thái:** Accepted

**Bối cảnh**

Hệ thống có nhiều domain: auth, concert, queue, ticket, payment, check-in, notification, admin, AI và CSV import. Tuy nhiên đồ án cần dễ chạy local bằng Docker Compose, team nhỏ, thời gian triển khai hạn chế và luồng bán vé cần transaction nhất quán.

**Quyết định**

Backend dùng Spring Boot Modular Monolith, chia module theo domain bằng package boundary/Spring Modulith, thay vì tách microservices ngay từ đầu.

**Lý do**

- Một deployable backend đơn giản hơn cho demo, test và vận hành local.
- Transaction nội bộ giữa order, payment log và ticket dễ kiểm soát hơn.
- Vẫn giữ được ranh giới nghiệp vụ qua module public port/interface và domain event.
- Tránh chi phí vận hành microservices như service discovery, distributed tracing, distributed transaction và versioning API nội bộ.

**Đánh đổi**

Các module vẫn chạy cùng process và chia sẻ database, nên lỗi nghiêm trọng ở backend có thể ảnh hưởng nhiều domain. Đổi lại, độ phức tạp vận hành thấp hơn và phù hợp hơn với yêu cầu nhất quán mạnh của bài toán bán vé.

---

## ADR 03 - Polling Availability thay vì WebSocket liên tục

**Trạng thái:** Accepted

**Bối cảnh**

Trong giờ mở bán, hàng chục nghìn người có thể xem số vé còn lại. Nếu giữ WebSocket cho toàn bộ người xem chỉ để cập nhật availability, backend phải duy trì rất nhiều kết nối lâu dài.

**Quyết định**

Frontend dùng polling 3-5 giây cho `GET /api/concerts/{id}/availability`, kết hợp Redis cache TTL ngắn, thay vì WebSocket liên tục cho mọi người xem.

**Lý do**

- HTTP polling stateless dễ scale hơn trong bối cảnh 80.000 người truy cập.
- Dễ kết hợp cache Redis/CDN và rate limiting.
- Availability chỉ là thông tin hiển thị gần thời gian thực, không phải cam kết giữ vé.
- Backend vẫn kiểm tra PostgreSQL khi reserve/order nên cache cũ không gây oversell.

**Đánh đổi**

UI có thể hiển thị số vé còn lại lệch vài giây. Độ lệch được giới hạn bằng TTL ngắn, frontend polling 3-5 giây và invalidation sau mutation inventory quan trọng.

---

## ADR 04 - JWT Stateless Authentication thay vì Server-side Session

**Trạng thái:** Accepted

**Bối cảnh**

TicketBox có web frontend, mobile scanner và các API cần phân quyền theo `AUDIENCE`, `ORGANIZER`, `STAFF`, `ADMIN`. Hệ thống cần dễ scale theo nhiều instance backend và không muốn phụ thuộc server-side session store cho mỗi request.

**Quyết định**

Sử dụng JWT stateless authentication. Token chứa `userId`, `email`, `role`, `fullName` và được backend xác minh bằng chữ ký.

**Lý do**

- Backend không cần lưu session server-side, phù hợp stateless API.
- Dễ dùng cho web và mobile scanner.
- Role có thể được đọc từ token để Spring Security enforce RBAC nhanh.
- Không cần sticky session khi scale nhiều backend instance.

**Đánh đổi**

JWT khó revoke tức thời trước khi hết hạn. Nếu Admin khóa user, token cũ có thể còn hiệu lực đến khi hết hạn trừ khi bổ sung blacklist/denylist bằng Redis. Vì vậy cần TTL hợp lý, secret đủ mạnh và không log token.

---

## ADR 05 - RabbitMQ làm Message Broker thay vì Kafka

**Trạng thái:** Accepted

**Bối cảnh**

Hệ thống cần tách luồng notification/email khỏi critical path mua vé, hỗ trợ retry và Dead Letter Queue khi SMTP/MailHog lỗi. Khối lượng message ở mức vừa phải, chủ yếu là task queue và async notification.

**Quyết định**

Sử dụng RabbitMQ cho notification broker thay vì Kafka.

**Lý do**

- RabbitMQ phù hợp task queue, routing key, retry và DLQ.
- Dễ chạy local trong Docker Compose và dễ quan sát qua RabbitMQ Management UI.
- Notification sau payment cần delivery/retry theo message hơn là event streaming throughput cực lớn.
- Kafka mạnh về event streaming và throughput rất cao, nhưng vận hành phức tạp hơn và dư cho scope đồ án.

**Đánh đổi**

RabbitMQ không tối ưu bằng Kafka cho event stream dung lượng cực lớn hoặc lưu lịch sử event lâu dài. Đổi lại, RabbitMQ đơn giản hơn và khớp hơn với nhu cầu email/app notification bất đồng bộ.

---

## ADR 06 - Atomic Update + Redis Lock cho tranh chấp vé và giới hạn per-user

**Trạng thái:** Accepted

**Bối cảnh**

Khi mở bán concert lớn, nhiều user có thể cùng tranh vé cuối. Một user cũng có thể gửi nhiều request song song từ nhiều tab/thiết bị để cố vượt `maxPerAccount`. Cần chống oversell và enforce per-user limit chính xác dưới tải cao.

**Quyết định**

- Tồn kho vé dùng atomic conditional update trong PostgreSQL: chỉ trừ khi `available_qty >= quantity`.
- Per-user purchase flow dùng Redis lock ngắn theo `userId/concertId` để tuần tự hóa request cùng tài khoản.
- Payment/order state quan trọng dùng transaction và constraint ở PostgreSQL làm lớp bảo vệ cuối.

**Lý do**

- Atomic update nhanh, ngắn, ít giữ lock lâu và chống race tốt cho inventory.
- Redis lock giảm khả năng một user gửi request song song vượt limit.
- Unique constraint/idempotency key trong DB bảo vệ khi Redis lỗi hoặc request lặp.
- Pessimistic lock toàn bộ inventory có thể làm giảm throughput mạnh trong rush sale.

**Đánh đổi**

Redis lock làm hệ thống phụ thuộc Redis cho lớp điều tiết. Nếu Redis lỗi, các chức năng queue/rate limit/idempotency suy giảm hoặc phải fail-closed/fail-open tùy luồng. Atomic update cũng yêu cầu thiết kế transaction cẩn thận để release inventory khi order hết hạn.

---

## ADR 07 - Redis Cache-aside cho Concert Catalog và Availability

**Trạng thái:** Accepted

**Bối cảnh**

Trang danh sách concert, chi tiết concert và availability có thể bị đọc với tần suất rất cao trong giờ mở bán. Nếu mọi request đều đọc PostgreSQL, database sẽ chịu tải đọc lớn trong khi dữ liệu concert ít thay đổi hơn giao dịch.

**Quyết định**

Dùng Redis cache-aside cho concert list, concert detail và availability:

- Concert list TTL khoảng 60 giây.
- Concert detail TTL khoảng 120 giây.
- Availability TTL khoảng 10 giây hoặc invalidate sau mutation inventory.

**Lý do**

- Cache-aside đơn giản, dễ kiểm soát và phù hợp dữ liệu public đọc nhiều.
- Redis giúp giảm tải PostgreSQL trong giờ cao điểm.
- PostgreSQL vẫn là source of truth cho reserve/order, nên cache cũ không gây bán vượt.
- Có thể invalidate rõ khi Admin/Organizer sửa concert, ticket type, poster hoặc artist bio.

**Đánh đổi**

UI có thể thấy dữ liệu cũ trong TTL ngắn. Nếu Redis lỗi, API có thể đọc PostgreSQL trực tiếp nhưng DB chịu tải cao hơn; riêng rush-sale cần cảnh báo và khôi phục Redis nhanh.

---

## ADR 08 - Spring Batch + Commons CSV cho Guest List Import

**Trạng thái:** Accepted

**Bối cảnh**

Đối tác tài trợ chỉ gửi danh sách khách mời VIP bằng CSV, không có API hai chiều. Hệ thống phải import định kỳ hoặc thủ công, xử lý file lỗi, dòng lỗi, dữ liệu trùng và không làm gián đoạn luồng bán vé.

**Quyết định**

Sử dụng Spring Batch kết hợp Commons CSV để import guest list, ghi `batch_logs`, validate header/dòng dữ liệu và upsert theo `(concert_id, phone)`.

**Lý do**

- Spring Batch phù hợp workflow xử lý file, chunk processing, retry và job log.
- Commons CSV đủ nhẹ cho định dạng CSV một chiều.
- Upsert theo `(concert_id, phone)` giúp import idempotent khi đối tác gửi lại file.
- Batch chạy nền, lỗi CSV không ảnh hưởng purchase/payment/check-in.

**Đánh đổi**

Spring Batch có thêm độ phức tạp cấu hình job/repository so với đọc file thủ công. Tuy nhiên đổi lại có audit, trạng thái job và khả năng retry rõ ràng, phù hợp yêu cầu chứng minh xử lý lỗi file và dòng trùng.

