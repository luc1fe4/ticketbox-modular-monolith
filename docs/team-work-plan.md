# TicketBox - Kế Hoạch Phân Việc Nhóm 4 Người

Deadline cuối cùng: **24/06/2026**

Mục tiêu: hoàn thành hệ thống TicketBox có thể chạy demo end-to-end bằng Docker Compose, bao gồm backend Spring Boot, frontend React, database schema/migration, Redis, RabbitMQ, seed data, README và video demo.

File này được viết để nhóm có thể copy task sang Google Sheet. Mỗi task nên có các cột:

```text
Sprint | Người phụ trách | Module | Task | Output | Trạng thái | Ghi chú
```

## 1. Git Flow Cho Cả Nhóm

### Nhánh chính

```text
main      Chỉ chứa bản ổn định cuối cùng hoặc bản nộp.
develop   Nhánh tích hợp hằng ngày của nhóm.
feature/* Nhánh làm từng tính năng.
```

Không code trực tiếp trên `main`. Hạn chế code trực tiếp trên `develop`, trừ khi sửa docs rất nhỏ.

### Lần đầu clone project

```bash
git clone <repo-url>
cd ticketbox-modular-monolith
git checkout develop
git pull origin develop
```

Nếu chưa có nhánh `develop` trên remote, nhóm trưởng tạo:

```bash
git checkout -b develop
git push -u origin develop
```

### Trước khi bắt đầu task mới

Luôn cập nhật `develop` trước:

```bash
git checkout develop
git pull origin develop
```

Tạo nhánh feature từ `develop`:

```bash
git checkout -b feature/auth-login
```

Tên branch gợi ý:

```text
feature/auth-security
feature/concert-ticket-type
feature/order-payment-ticket
feature/redis-rabbitmq-notification
feature/checkin-csv-ai
feature/frontend-auth
feature/frontend-audience
feature/frontend-admin-staff
```

### Trong lúc code

Commit nhỏ theo từng phần chạy được:

```bash
git status
git add .
git commit -m "feat: implement login api"
```

Push branch lên remote:

```bash
git push -u origin feature/auth-login
```

### Khi muốn cập nhật code mới từ develop vào branch đang làm

```bash
git checkout develop
git pull origin develop
git checkout feature/auth-login
git merge develop
```

Nếu conflict thì xử lý conflict, chạy lại app/test, rồi commit merge.

### Khi task xong

Checklist trước khi tạo pull request:

```text
Code compile được.
Docker Compose không bị phá.
API mới đã cập nhật docs/api-endpoints.md nếu có thay đổi.
Migration mới chạy được từ DB trắng nếu có thay đổi schema.
Không commit .env thật, password, token, secret.
```

Push lần cuối:

```bash
git push
```

Tạo Pull Request:

```text
base: develop
compare: feature/<ten-task>
```

Ít nhất một người khác review trước khi merge. Sau khi merge, người làm task xóa branch nếu không cần nữa.

### Quy tắc migration

```text
Migration đã merge vào develop thì không sửa lại.
Muốn đổi schema thì tạo migration V tiếp theo.
Trước khi tạo migration mới phải pull develop để tránh trùng version.
```

Ví dụ:

```text
V2__create_ticketbox_schema.sql
V3__seed_demo_data.sql
V4__add_notification_read_state.sql
```

## 2. Nguyên Tắc Làm Việc

```text
develop phải luôn chạy được.
Task nên nhỏ đủ để merge trong 2-3 ngày.
Không giữ branch quá lâu.
Mỗi người chủ động ghi tiến độ vào Google Sheet.
Nếu đổi API contract thì báo team và sửa docs/api-endpoints.md.
Nếu bị block quá nửa ngày thì báo nhóm, không tự kẹt quá lâu.
```

Definition of Done cho backend:

```text
Entity/migration nếu cần schema.
DTO request/response.
Controller endpoint.
Service/use case.
Validation input.
Exception rõ ràng.
Test bằng curl/Postman hoặc test tự động.
Không phá docker compose.
```

Definition of Done cho frontend:

```text
Page/component hoàn chỉnh.
API client tương ứng.
Loading/error/empty state cơ bản.
Form validation cơ bản.
Chạy được bằng npm run dev hoặc Docker.
Không hard-code dữ liệu nếu API đã có.
```

## 3. Phân Vai Chính

| Thành viên | Vai trò chính | Phần code chính | Ghi chú |
| --- | --- | --- | --- |
| Duy Khánh | backend integration | Redis, RabbitMQ, Notification, Idempotency, Rate limit, integration review | Vẫn code chính, thêm trách nhiệm review/tổng hợp |
| Công Phúc | Backend foundation | Auth, RBAC, User, Security, shared response/exception | Làm nền bảo mật để các module khác dùng |
| Minh Quân | Backend business core | Concert, Ticket Type, Order, Payment mock, Ticket generation | Phần chính của luồng mua vé |
| Trọng Quân | Backend support + frontend lead | Check-in, CSV import, AI mock, frontend foundation/admin/staff | Làm cầu nối BE/FE |

Giai đoạn frontend:

| Thành viên | Frontend ownership |
| --- | --- |
| Duy Khánh | API integration, notification UI, end-to-end testing, fix bug cross-module |
| Công Phúc | Login/register/profile, route guard, auth state |
| Minh Quân | Audience flow: concert list/detail, purchase/payment result, my tickets |
| Trọng Quân | Admin/staff flow: concert management, ticket type management, check-in screen |

## 4. Mốc Tổng Quan

| Sprint | Thời gian | Mục tiêu |
| --- | --- | --- |
| Sprint 1 | 04/06 - 06/06 | Setup, Git flow, schema, API contract, backend foundation |
| Sprint 2 | 07/06 - 09/06 | Auth, concert public/admin, ticket type, seat map SVG, Redis cache/idempotency skeleton |
| Sprint 3 | 10/06 - 12/06 | Order purchase, payment mock, ticket issuing, Redis rate limit, RabbitMQ notification |
| Sprint 4 | 13/06 - 15/06 | Integration checkpoint, check-in hardening, circuit breaker, notification reminder |
| Sprint 4.5 | 16/06 - 17/06 | Blueprint docs, CSV import, AI mock, rate limit nâng cao, graceful degradation |
| Sprint 5 | 18/06 - 19/06 | Frontend foundation, API integration, audience + auth UI |
| Sprint 6 | 20/06 - 21/06 | Frontend purchase/admin/staff flows, second integration checkpoint |
| Sprint 7 | 22/06 - 24/06 | Seed data, README, Docker full run, bug fixing, video, final submission |

## 5. Sprint 1 - 04/06 Đến 06/06

Mục tiêu:

```text
Mọi người chạy được project.
Chốt không dùng reservation table riêng.
Chốt API contract ban đầu.
Tạo schema bằng Flyway.
Tạo nền backend để các module bắt đầu code.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Architecture | Review schema, chốt order AWAITING_PAYMENT là ticket hold thay cho reservation table | Quyết định kiến trúc reservation được ghi rõ |
| Duy Khánh | Database | Tạo Flyway migration cho schema nền | DB có các bảng users, concerts, ticket_types, orders, order_items, tickets, checkin_logs, payment_logs, notifications |
| Công Phúc | Shared backend | Tạo `ApiResponse`, error response format, global exception handler skeleton | Response/error format thống nhất |
| Công Phúc | Security | Tạo `SecurityConfig` skeleton, cấu hình public/private endpoint ban đầu | App có nền Spring Security |
| Minh Quân | Domain skeleton | Tạo entity/repository skeleton cho concert, ticket type, order, order item, ticket | Entity compile được |
| Minh Quân | Purchase design | Viết note ngắn order lifecycle: AWAITING_PAYMENT, PAID, EXPIRED, CANCELLED, PAYMENT_FAILED | Team thống nhất trạng thái order |
| Duy Khánh | Support domain skeleton | Tạo entity/repository skeleton cho check-in, guest list, batch log, artist PDF job | Entity compile được |
| Duy Khánh | Docs | Tạo API endpoint contract ban đầu cho tất cả module | Có `docs/api-endpoints.md` với đầy đủ endpoint, method, request/response mẫu |
| Trọng Quân | Check-in design | Nghiên cứu và thiết kế luồng check-in online/offline, database log, offline sync strategy | Chốt luồng check-in an toàn, có sequence diagram |

## 6. Sprint 2 - 07/06 Đến 09/06

Mục tiêu:

```text
Auth chạy được.
Concert public/admin chạy được.
Ticket type/zone chạy được.
Redis bắt đầu có cache hoặc idempotency skeleton.
Frontend có màn hình mock để không chờ BE xong hoàn toàn.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Redis | Cấu hình Redis connection và key convention | App connect Redis được, có tài liệu key naming |
| Duy Khánh | Redis cache | Implement cache-aside cơ bản cho concert list/detail và availability | Có cache key trong Redis khi gọi API, TTL phân biệt theo loại data |
| Duy Khánh | Idempotency | Tạo service skeleton cho Idempotency-Key dùng ở `POST /orders` | Service có API lưu/đọc request key, TTL 24h |
| Công Phúc | Auth | Implement register/login bằng email/password | Auth API trả JWT |
| Công Phúc | Auth | Implement `GET /auth/me` và lấy current user từ JWT | API biết user hiện tại |
| Công Phúc | RBAC | Chặn endpoint admin/staff theo role (AUDIENCE/ORGANIZER/STAFF/ADMIN) | Audience không gọi được admin/staff endpoint |
| Minh Quân | Concert | Implement public concert list/detail kèm thông tin artist_bio | FE xem được danh sách và chi tiết concert |
| Minh Quân | Admin concert | Implement admin create/update/status concert | Organizer tạo/sửa concert được |
| Minh Quân | Ticket type | Implement ticket type CRUD và availability endpoint real-time | Admin tạo zone SVIP/VIP/CAT1 được, FE hiển thị số vé còn |
| Trọng Quân | Seat map | Implement API trả SVG sơ đồ chỗ ngồi theo khu (GA/SVIP/VIP/CAT1/CAT2) | FE hiển thị được seat map tương tác |
| Trọng Quân | Check-in online | Implement `POST /staff/checkins/scan`, chống double check-in | Một vé chỉ check-in được một lần |
| Trọng Quân | Offline sync | Implement check-in dataset API và batch sync offline logs | Có API offline sync, không mất data khi reconnect |

## 7. Sprint 3 - 10/06 Đến 12/06

Mục tiêu:

```text
Luồng mua vé backend chạy được từ tạo order đến payment success sinh ticket.
Redis dùng cho idempotency/rate limit.
RabbitMQ dùng cho notification sau payment.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Redis idempotency | Gắn Idempotency-Key vào `POST /orders`, request trùng không tạo order/vé lần 2 | Gửi cùng key trả cùng kết quả hoặc báo duplicate an toàn |
| Duy Khánh | Redis rate limit | Implement Token Bucket rate limit cho purchase/payment endpoint | Spam request bị HTTP 429, legitimate user không bị ảnh hưởng |
| Duy Khánh | RabbitMQ | Cấu hình exchange, queue, routing key cho notification (DLQ cho retry) | RabbitMQ có exchange/queue chạy được, có Dead Letter Queue |
| Duy Khánh | Notification | Consumer nhận message và tạo row `notifications`, publish sau payment success | Payment success tạo notification qua MQ |
| Công Phúc | Security integration | Bảo vệ order/payment/ticket endpoint theo AUDIENCE | User chưa login không mua vé được |
| Công Phúc | Notification API | Implement `GET /notifications` và `PATCH /notifications/{id}/read` | User xem và đánh dấu đã đọc notification được |
| Công Phúc | User profile | Implement `GET /users/me/profile` và `PATCH /users/me/profile` | User xem và cập nhật thông tin cá nhân |
| Minh Quân | Order | Implement `POST /orders` mua nhiều zone trong một order | VIP x2 + CAT1 x2 tạo 2 order_items |
| Minh Quân | Inventory | Atomic update `ticket_types.available_qty` và check max_per_account per-user dưới tải cao | Không oversell, không vượt limit dù gửi đồng thời |
| Minh Quân | Payment | Mock payment success/fail, payment_logs, duplicate payment safe | Payment mock chạy được |
| Minh Quân | Ticket | Generate ticket/QR payload sau payment success, `GET /tickets/my` | Payment success sinh đúng số vé, user xem được vé |
| Trọng Quân | Conflict handling | Xử lý trùng vé khi offline sync lên server: ưu tiên server-side, trả thông báo rõ | Conflict check-in có thông báo |
| Trọng Quân | Admin API | API thống kê doanh thu, tổng vé bán theo zone cho Organizer | Organizer xem được dashboard đơn giản |
| Trọng Quân | Guest list API | `GET /staff/guestlist?concert_id=&phone=` xác nhận khách mời VIP tại cổng | Staff tra cứu khách mời được, trả được thông tin rõ |

## 8. Sprint 4 - 13/06 Đến 15/06

Mục tiêu:

```text
Demo nội bộ lần 1.
Hoàn thiện check-in online/offline API.
Harden luồng order/payment/ticket.
```

Demo nội bộ bắt buộc ở cuối sprint:

```text
Login audience.
Xem concert.
Chọn VIP x2 + CAT1 x2.
Tạo order.
Mock payment success.
Sinh 4 tickets.
Notification được tạo qua RabbitMQ.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Integration | Chạy end-to-end backend, review Redis key và RabbitMQ message | Có bug list sau demo nội bộ |
| Duy Khánh | Notification reminder | Implement scheduled job gửi reminder trước concert 24h | User nhận nhắc nhở tự động qua MQ |
| Công Phúc | Security | Fix inconsistency auth/RBAC, staff role guard cho check-in | STAFF-only endpoint hoạt động |
| Công Phúc | Testing | Viết Postman/curl collection cho auth, RBAC và notification | Có test script auth và notification cơ bản |
| Minh Quân | Order hardening | Scheduled job expire AWAITING_PAYMENT và trả lại available_qty | Order quá hạn không giữ vé mãi |
| Minh Quân | Payment hardening | Đảm bảo mock/webhook success gọi lại không sinh vé trùng | Payment idempotent |
| Minh Quân | Circuit Breaker | Cài đặt Circuit Breaker (Resilience4j) với Closed/Open/Half-Open cho cổng thanh toán | Hệ thống graceful degradation khi payment gateway lỗi, tính năng khác vẫn chạy |
| Trọng Quân | Check-in hardening | Implement lock/check tại server khi offline sync để chống double check-in | Không vé nào vào cổng 2 lần dù đồng bộ muộn |
| Trọng Quân | Guest list API | API xác nhận khách mời VIP tại cổng theo concert_id + phone | Staff check-in khách mời được |

## 9. Sprint 4.5 - 16/06 Đến 17/06

Mục tiêu:

```text
Hoàn thành Blueprint docs để nộp (proposal, design, specs).
CSV import và AI mock sẵn sàng demo.
Rate limit nâng cao và graceful degradation hoàn chỉnh.
Review toàn bộ backend trước khi bắt đầu FE thật.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Blueprint | Viết `blueprint/proposal.md`: bối cảnh, vấn đề, mục tiêu, phạm vi | Có proposal hoàn chỉnh |
| Duy Khánh | Blueprint | Viết `blueprint/design.md`: kiến trúc, C4 diagram, RBAC, cơ chế bảo vệ (rate limit/CB/idempotency/cache) | Có design hoàn chỉnh |
| Duy Khánh | Rate limit nâng cao | Kiểm tra Token Bucket hoạt động đúng dưới tải cao, viết note demo | Rate limit demo được |
| Công Phúc | Blueprint specs | Viết `specs/auth.md` và `specs/checkin.md` theo template OpenSpec | Đặc tả auth và check-in hoàn chỉnh |
| Công Phúc | Backend hardening | Kiểm tra toàn bộ endpoint trả lỗi đúng format, không lộ stack trace | API production-safe |
| Minh Quân | Blueprint specs | Viết `specs/payment.md`: luồng mua vé, chống trùng, circuit breaker | Đặc tả payment hoàn chỉnh |
| Minh Quân | Backend tests | Test oversell case và max_per_account enforcement dưới concurrent request | Proof of correctness |
| Trọng Quân | CSV import | Upload CSV, validate, upsert guest list theo concert_id + phone, ghi batch_logs | CSV import chạy được, dữ liệu trùng được upsert |
| Trọng Quân | AI mock | Tạo artist bio job: nhận PDF, mock AI call, persist kết quả, apply result vào concert.artist_bio | AI flow demo được end-to-end |

## 10. Sprint 5 - 18/06 Đến 19/06

Mục tiêu:

```text
Frontend khởi tạo và bắt đầu nối API thật.
Auth UI, concert list, khung Admin/Staff hoàn chỉnh.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | FE Foundation | Cấu hình axios, API client chung, xử lý interceptor token/lỗi toàn cục | Framework gọi API chuẩn |
| Duy Khánh | API integration | Hỗ trợ fix CORS, token header, response format khi FE gọi API | FE gọi API ổn định |
| Công Phúc | Frontend auth | Login/register/profile/route guard dùng API thật | Auth UI hoạt động với JWT thật |
| Công Phúc | Auth UI polish | Logout, redirect sau login, hiển thị role-based menu | UX auth hoàn chỉnh |
| Minh Quân | Frontend Audience | Concert list với seat map SVG, trang detail concert với artist_bio | FE có trang xem sự kiện và sơ đồ chỗ ngồi |
| Minh Quân | Backend tests | Hoàn thiện test order/payment/oversell bằng Postman/curl | Core purchase có bằng chứng test |
| Trọng Quân | Frontend Admin | Layout, navigation, admin/staff route skeleton, trang quản lý concert/ticket type | FE Admin/Staff có khung thật |
| Trọng Quân | Frontend Staff | Trang check-in cơ bản: nhập mã QR thủ công, hiển thị kết quả | Staff check-in được qua web |

## 11. Sprint 6 - 20/06 Đến 21/06

Mục tiêu:

```text
Frontend purchase flow hoàn chỉnh.
Admin/Staff flow demo được.
Demo nội bộ lần 2 gần giống bản nộp.
```

Demo nội bộ bắt buộc ở cuối sprint:

```text
Organizer tạo concert + ticket types.
Audience mua nhiều zone trong một order.
Payment success sinh tickets.
User xem QR e-ticket.
Staff check-in vé, chống double check-in.
Notification tạo qua RabbitMQ.
Redis cache/rate limit/idempotency có thể giải thích và demo.
Circuit Breaker trạng thái Open/Half-Open demo được.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Integration | Debug Redis rate limit/idempotency/circuit breaker khi FE gọi thật | Purchase flow ổn khi dùng FE |
| Duy Khánh | Notification UI | Tích hợp notification list và badge số lượng chưa đọc | User thấy notification real-time |
| Duy Khánh | Demo rehearsal | Chạy full demo nội bộ, ghi bug list ưu tiên | Có danh sách bug cuối sprint |
| Công Phúc | Frontend auth | Hoàn thiện auth UI, profile, route guard, logout | Auth flow hoàn chỉnh |
| Công Phúc | Admin guard | Kiểm tra audience/organizer/staff route không lẫn quyền trong FE | RBAC FE demo được |
| Minh Quân | FE audience | Ticket selection (seat map interactive), create order, payment result | Audience mua vé từ FE |
| Minh Quân | FE tickets | My tickets page, QR display, trạng thái vé | User xem e-ticket |
| Trọng Quân | FE admin | Admin create/edit concert, ticket type form, dashboard thống kê đơn giản | Organizer quản lý concert |
| Trọng Quân | FE staff | Staff check-in scan QR (webcam hoặc nhập tay), success/duplicate/error | Staff check-in bằng UI |
| Trọng Quân | FE CSV/AI | CSV upload UI, AI mock job status admin page | Demo admin đầy đủ |

## 12. Sprint 7 - 22/06 Đến 24/06

Mục tiêu:

```text
Đóng gói bản nộp.
Seed data đầy đủ.
README rõ.
Docker Compose chạy được một lệnh.
Quay video demo.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Final integration | Chạy Docker Compose full, kiểm tra backend/frontend/Postgres/Redis/RabbitMQ | Một lệnh `docker compose up` chạy được |
| Duy Khánh | Demo script | Chốt kịch bản video end-to-end, phân đoạn cho từng người | Có script demo chi tiết |
| Duy Khánh | Submission | Tổng hợp source, docs, README, kiểm tra cấu trúc Google Drive | Bản nộp cuối đúng format |
| Công Phúc | README | Viết hướng dẫn cài đặt, env, account demo (audience/organizer/staff/admin), mô tả RBAC | Người chấm clone và chạy được không cần hỏi |
| Công Phúc | Video auth | Quay/cắt phần auth/RBAC, route guard, profile | Clip auth |
| Minh Quân | Seed business data | Seed 4 concerts: Anh Trai Say Hi, Anh Trai Vượt Ngàn Chông Gai, Em Xinh Say Hi, Chị Đẹp Đạp Gió Rẽ Sóng, đủ ticket_types và seat map | Có data demo đủ |
| Minh Quân | Video purchase | Quay/cắt phần mua vé, payment, e-ticket QR, my tickets | Clip purchase flow |
| Trọng Quân | Seed support data | Seed guest list CSV sample, artist PDF job sample, batch_logs | Demo admin/CSV/AI có data thật |
| Trọng Quân | Video admin/check-in | Quay/cắt phần admin quản lý concert, staff check-in, CSV import, AI bio | Clip admin và check-in |

