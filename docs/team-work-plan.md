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
| Minh Quân | Backend business core | Concert, Ticket Type, Order, Payment mock/sandbox, Ticket generation | Phần chính của luồng mua vé |
| Trọng Quân | Backend support + frontend lead | Check-in, mobile scanner offline, CSV import định kỳ, AI integration, frontend admin/staff | Làm cầu nối BE/FE |

Giai đoạn frontend:

| Thành viên | Frontend ownership |
| --- | --- |
| Duy Khánh | API integration, notification UI, end-to-end testing, fix bug cross-module |
| Công Phúc | Login/register/profile, route guard, auth state |
| Minh Quân | Audience flow: concert list/detail, purchase/payment result, my tickets |
| Trọng Quân | Admin/staff flow: concert management, ticket type management, Expo mobile scanner offline |

## 4. Mốc Tổng Quan

| Sprint | Thời gian | Mục tiêu |
| --- | --- | --- |
| Sprint 1 | 04/06 - 06/06 | Setup, Git flow, schema, API contract, backend foundation |
| Sprint 2 | 07/06 - 09/06 | Auth, concert public/admin, ticket type, seat map SVG, Redis cache/idempotency skeleton |
| Sprint 3 | 10/06 - 12/06 | Order purchase, payment mock, ticket issuing, Redis rate limit, RabbitMQ notification |
| Sprint 4 | 13/06 - 15/06 | Integration checkpoint, check-in hardening, payment sandbox/circuit breaker, email notification |
| Sprint 4.5 | 16/06 - 17/06 | Blueprint docs, CSV import định kỳ, PDF/AI adapter, rate limit nâng cao, graceful degradation |
| Sprint 5 | 18/06 - 19/06 | Frontend foundation, API integration, audience/auth UI, Expo scanner foundation |
| Sprint 6 | 20/06 - 21/06 | Frontend purchase/admin, mobile scanner offline, second integration checkpoint |
| Sprint 7 | 22/06 - 24/06 | Requirement acceptance, seed data, README, Docker full run, bug fixing, video, final submission |
| Sprint 8 | 30/06 - 02/07 | Waiting room, shopping session 10 phút, giữ vé tạm khi bấm +/- |
| Sprint 9 | 03/07 - 05/07 | Hoàn thiện các gap API/UI: notification UI, staff web, admin vận hành, MoMo scope |
| Sprint 10 | 06/07 - 08/07 | Hardening, test bằng chứng, docs/video cuối theo implementation thật |

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
Hoàn thiện check-in online/offline API và nền lưu trữ offline cho mobile scanner.
Harden luồng order/payment/ticket, có ít nhất một payment sandbox adapter thật.
Thông báo mua vé/reminder gửi được qua APP và email.
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
Email xác nhận mua vé xem được trong MailHog.
Payment adapter có thể chuyển giữa MOCK và sandbox provider bằng cấu hình.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Integration | Chạy end-to-end backend, review Redis key và RabbitMQ message | Có bug list sau demo nội bộ |
| Duy Khánh | Notification delivery | Implement scheduled reminder trước concert 24h và email consumer qua SMTP/MailHog; retry/DLQ khi gửi lỗi | Payment success/reminder tạo APP notification và email; lỗi gửi không làm hỏng luồng mua vé |
| Công Phúc | Security | Fix inconsistency auth/RBAC, staff role guard cho check-in | STAFF-only endpoint hoạt động |
| Công Phúc | Testing | Viết Postman/curl collection cho auth, RBAC và notification | Có test script auth và notification cơ bản |
| Minh Quân | Order hardening | Scheduled job expire AWAITING_PAYMENT và trả lại available_qty | Order quá hạn không giữ vé mãi |
| Minh Quân | Payment hardening | Đảm bảo mock/webhook success gọi lại không sinh vé trùng | Payment idempotent |
| Minh Quân | Payment sandbox + Circuit Breaker | Tạo `PaymentGateway` interface, tích hợp ít nhất một provider sandbox (ưu tiên VNPAY), verify chữ ký callback/webhook và bọc bằng Resilience4j Closed/Open/Half-Open; giữ MOCK làm fallback local | Demo được redirect/callback sandbox hoặc adapter giả lập HTTP thật; webhook sai chữ ký bị từ chối, webhook trùng không sinh vé lần hai |
| Trọng Quân | Check-in hardening | Implement lock/check tại server khi offline sync để chống double check-in | Không vé nào vào cổng 2 lần dù đồng bộ muộn |
| Trọng Quân | Mobile scanner data layer | Trong Expo app: đăng nhập STAFF, tải check-in dataset, lưu SQLite, lưu offline check-in log và gọi batch sync khi có mạng | Tắt mạng vẫn tra dataset và ghi nhận check-in cục bộ; log pending không mất khi đóng/mở app |

## 9. Sprint 4.5 - 16/06 Đến 17/06

Mục tiêu:

```text
Hoàn thành Blueprint docs để nộp (proposal, design, specs).
CSV import thủ công và scheduled import sẵn sàng demo.
PDF được trích xuất và gửi qua AI provider interface; mock chỉ dùng làm fallback.
Rate limit nâng cao và graceful degradation hoàn chỉnh.
Review toàn bộ backend trước khi bắt đầu FE thật.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Blueprint | Viết `blueprint/proposal.md`: bối cảnh, vấn đề, mục tiêu, phạm vi | Có proposal hoàn chỉnh |
| Duy Khánh | Blueprint | Viết `blueprint/design.md`: kiến trúc, C4 diagram, RBAC, cơ chế bảo vệ (rate limit/CB/idempotency/cache); chốt availability dùng polling 3-5 giây hoặc implement đúng WebSocket đã mô tả | Design khớp với code, không cam kết thành phần chưa cài đặt |
| Duy Khánh | Rate limit nâng cao | Kiểm tra Token Bucket hoạt động đúng dưới tải cao, viết note demo | Rate limit demo được |
| Công Phúc | Blueprint specs | Viết `specs/auth.md` và `specs/checkin.md` theo template OpenSpec | Đặc tả auth và check-in hoàn chỉnh |
| Công Phúc | Backend hardening | Kiểm tra toàn bộ endpoint trả lỗi đúng format, không lộ stack trace | API production-safe |
| Minh Quân | Blueprint specs | Viết `specs/payment.md`: luồng mua vé, chống trùng, circuit breaker | Đặc tả payment hoàn chỉnh |
| Minh Quân | Backend tests | Test oversell case và max_per_account enforcement dưới concurrent request | Proof of correctness |
| Trọng Quân | CSV import + scheduled job | Upload CSV và Spring Batch scheduled import từ thư mục cấu hình; validate, upsert theo concert_id + phone, ghi batch_logs, cô lập file lỗi | Import tay và tự động chạy được; dữ liệu trùng được upsert, file lỗi không làm gián đoạn dữ liệu cũ |
| Trọng Quân | PDF/AI artist bio | Nhận PDF, trích text bằng PDFBox, làm sạch nội dung, gọi `ArtistBioGenerator` provider; dùng AI thật khi có API key và mock fallback khi local; persist/apply kết quả | AI flow demo end-to-end, provider thay được bằng cấu hình và mock không nằm trực tiếp trong business service |

## 10. Sprint 5 - 18/06 Đến 19/06

Mục tiêu:

```text
Frontend web khởi tạo và bắt đầu nối API thật.
Auth UI, concert list và khung Admin hoàn chỉnh.
Expo scanner có luồng đăng nhập, tải dataset và check-in offline cơ bản.
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
| Trọng Quân | Expo mobile scanner | Implement màn hình đăng nhập STAFF, chọn concert, tải dataset, nhập/quét QR và hiển thị trạng thái local pending/synced | Staff check-in được bằng Expo app; thao tác cơ bản vẫn chạy khi mất mạng |

## 11. Sprint 6 - 20/06 Đến 21/06

Mục tiêu:

```text
Frontend purchase flow hoàn chỉnh, availability được cập nhật định kỳ.
Admin web và mobile scanner offline demo được.
Demo nội bộ lần 2 gần giống bản nộp.
```

Demo nội bộ bắt buộc ở cuối sprint:

```text
Organizer tạo concert + ticket types.
Audience mua nhiều zone trong một order.
Payment success sinh tickets.
User xem QR e-ticket.
Staff check-in vé, chống double check-in.
Tắt mạng trên scanner, check-in, bật mạng và đồng bộ thành công.
Notification tạo qua RabbitMQ.
Email mua vé/reminder xem được trong MailHog.
CSV scheduled job tự nhập file và ghi batch_logs.
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
| Minh Quân | FE audience | Ticket selection (seat map interactive), create order, payment result; polling availability 3-5 giây nếu không dùng WebSocket | Audience mua vé từ FE và thấy số lượng vé được cập nhật gần thời gian thực |
| Minh Quân | FE tickets | My tickets page, QR display, trạng thái vé | User xem e-ticket |
| Trọng Quân | FE admin | Admin create/edit concert, ticket type form, dashboard thống kê đơn giản | Organizer quản lý concert |
| Trọng Quân | Mobile scanner offline sync | Hoàn thiện camera/manual QR scan, SQLite persistence, tự sync khi reconnect, conflict UI và retry log lỗi | Demo tắt mạng -> check-in -> bật mạng -> sync; duplicate/conflict hiển thị rõ và không mất dữ liệu |
| Trọng Quân | FE CSV/AI | CSV upload/job history UI, AI job status/result/apply page | Demo admin đầy đủ cho import thủ công, scheduled batch và AI artist bio |

## 12. Sprint 7 - 22/06 Đến 24/06

Mục tiêu:

```text
Đóng gói bản nộp.
Seed data đầy đủ.
README rõ.
Docker Compose chạy được một lệnh.
Quay video demo.
Không nhận feature mới; chỉ sửa bug chặn requirement hoặc demo.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Requirement acceptance | Chạy checklist từng requirement: purchase, payment idempotency, email, reminder, RBAC, offline check-in, CSV scheduled import, AI bio, cache/rate limit/circuit breaker | Có bảng PASS/FAIL và bằng chứng curl/screenshot/log cho từng requirement bắt buộc |
| Duy Khánh | Final integration | Chạy Docker Compose full, kiểm tra backend/frontend/Postgres/Redis/RabbitMQ/MailHog | Một lệnh `docker compose up` chạy được cho toàn bộ thành phần demo |
| Duy Khánh | Demo script | Chốt kịch bản video end-to-end, phân đoạn cho từng người | Có script demo chi tiết |
| Duy Khánh | Submission | Tổng hợp source, docs, README, kiểm tra cấu trúc Google Drive | Bản nộp cuối đúng format |
| Công Phúc | README | Viết hướng dẫn cài đặt, env, account demo (audience/organizer/staff/admin), mô tả RBAC, payment sandbox và cấu hình SMTP/MailHog | Người chấm clone và chạy được không cần hỏi |
| Công Phúc | Video auth | Quay/cắt phần auth/RBAC, route guard, profile | Clip auth |
| Minh Quân | Seed business data | Seed 4 concerts: Anh Trai Say Hi, Anh Trai Vượt Ngàn Chông Gai, Em Xinh Say Hi, Chị Đẹp Đạp Gió Rẽ Sóng, đủ ticket_types và seat map | Có data demo đủ |
| Minh Quân | Video purchase | Quay/cắt phần mua vé, payment, e-ticket QR, my tickets | Clip purchase flow |
| Trọng Quân | Seed support data | Seed guest list CSV sample, artist PDF job sample, batch_logs | Demo admin/CSV/AI có data thật |
| Trọng Quân | Mobile README | Viết hướng dẫn chạy Expo scanner, tải dataset, test offline, reconnect/sync và tài khoản STAFF demo | Người chấm chạy và kiểm tra luồng offline mà không cần hỏi |
| Trọng Quân | Video admin/check-in | Quay/cắt phần admin quản lý concert, mobile offline check-in, CSV scheduled import, AI bio | Clip admin và check-in có cảnh mất mạng rồi đồng bộ lại |

## 13. Audit Sau Sprint 7 - 30/06

Mục tiêu của phần bổ sung này là sửa các điểm còn thiếu hoặc chưa đúng sau khi đã merge nhiều PR vào `develop`. Các sprint mới kéo dài 3 ngày/sprint và ưu tiên hoàn thiện đúng yêu cầu môn học trước, sau đó mới mở rộng phần nhóm tự thiết kế.

### 13.1. Đã có và tiếp tục giữ

| Nhóm chức năng | Trạng thái hiện tại | Ghi chú |
| --- | --- | --- |
| Auth/RBAC | Đã có | Register/login/me, JWT, role AUDIENCE/ORGANIZER/STAFF/ADMIN, backend guard và FE guard cơ bản |
| Concert public/admin | Đã có | Public list/detail/seat map, admin/organizer create/update/status/delete, upload poster |
| Ticket type/availability | Đã có | CRUD ticket type, cache availability, polling ở FE |
| Order/payment core | Đã có | Create order, giữ vé ở `AWAITING_PAYMENT`, idempotency key, expire order, mock payment, VNPAY adapter |
| E-ticket/QR | Đã có | Payment success sinh ticket và QR; user xem vé |
| Redis/RabbitMQ | Đã có | Token bucket cho purchase/payment, idempotency, cache, notification queue, email queue, DLQ |
| Check-in backend/mobile | Đã có | Staff API, online scan, offline sync, Expo scanner, SQLite local dataset/log |
| CSV guest list | Đã có | Upload/scheduled import, batch logs, staff lookup/list |
| AI artist bio | Đã có | Upload PDF, extract text, AI provider/mock fallback, retry/apply |
| Revenue report | Đã có | Organizer summary, zone revenue, sales trend, export CSV/PDF |

### 13.2. Còn thiếu hoặc chưa đúng

| Mức ưu tiên | Gap | Vì sao cần sửa |
| --- | --- | --- |
| P0 | Chưa có waiting room/queue | Đây là phần nhóm đã bàn để xử lý sale nóng và làm cho flow giữ vé theo lượt hợp lý hơn |
| P0 | Chưa có shopping session 10 phút và giữ vé tạm khi bấm `+/-` | Flow hiện tại chỉ giữ vé khi tạo order ở checkout, UX bất lợi khi vé hết sát giờ |
| P0 | Chưa có release hold rõ ràng khi user thoát, hết 10 phút, bấm `-`, hoặc không thanh toán | Nếu giữ vé tạm mà không release chuẩn sẽ tạo vé treo và làm sai inventory |
| P0 | Docs/API có endpoint đã ghi nhưng chưa implement: queue, cancel/retry order, admin orders, admin tickets, admin users, admin notifications, manual reminder, admin check-in summary | Người chấm hoặc nhóm test theo docs sẽ gặp drift giữa tài liệu và code |
| P1 | Notification UI/badge chưa rõ | Backend notification đã có nhưng user chưa có màn hình xem thông báo đúng nghĩa |
| P1 | Staff web vẫn có route placeholder | Mobile scanner đã có, nhưng web staff flow chưa hoàn thiện nếu demo trên browser |
| P1 | MoMo chỉ có trong enum/docs, chưa có adapter/webhook | Nếu giữ trong docs là requirement thì phải implement hoặc ghi rõ out-of-scope |
| P1 | Circuit breaker VNPAY khó demo outage thật | Adapter hiện build redirect URL local, circuit breaker chưa chứng minh được lỗi network provider |
| P2 | Mobile README và một số README cũ còn ghi future scope | Code đã vượt README, cần cập nhật để người chấm không hiểu nhầm |
| P2 | Thiếu checklist PASS/FAIL có bằng chứng mới nhất | Cần bảng test cuối cùng theo code thật sau khi thêm waiting room/hold |

## 14. Sprint 8 - 30/06 Đến 02/07

Mục tiêu:

```text
Hoàn thiện waiting room và shopping session.
Khi tới lượt mua, user có 10 phút để chọn vé.
Bấm + giữ vé tạm trên server, bấm - release vé.
Hết 10 phút, thoát flow, hoặc không thanh toán thì hệ thống tự trả vé.
Khi bấm thanh toán, hold được convert thành order AWAITING_PAYMENT và bước thanh toán có 15 phút như hiện tại.
```

Quyết định thiết kế:

```text
Không tạo ticket QR khi bấm +.
Không coi vé là đã mua khi đang chọn vé.
Bấm + chỉ tạo hold/reservation tạm gắn với shopping session.
Ticket thật chỉ sinh sau payment success.
Popup hết vé chỉ là UX; backend vẫn phải chặn bot bằng token, rate limit, atomic update, TTL và giới hạn per-user.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Waiting room design | Chốt thiết kế Redis sorted set/list cho queue, access token vào phiên mua, TTL 10 phút, state WAITING/ADMITTED/EXPIRED | Có `blueprint/specs/waiting-room.md` hoặc section mới trong design, mô tả rõ flow và race condition |
| Duy Khánh | Queue backend | Implement `POST /api/queue/concerts/{concertId}/join`, `GET /api/queue/concerts/{concertId}/status`, `POST /api/queue/concerts/{concertId}/leave` | User vào hàng chờ, thấy vị trí, tới lượt nhận quyền vào chọn vé |
| Duy Khánh | Anti-spam | Gắn rate limit theo IP/user/session cho queue và reserve endpoint; log khi bị 429 | Bot spam join/status/reserve bị chặn ở backend, không phụ thuộc popup FE |
| Công Phúc | Security | Thiết kế và implement `queueAccessToken` hoặc session token bắt buộc cho reserve/checkout; mỗi user/concert chỉ có 1 active shopping session | User chưa tới lượt không gọi được reserve; không mở nhiều session song song |
| Công Phúc | Session lifecycle | Xử lý logout, leave, expired session, refresh trang, token hết hạn | Session không bị treo; reload trang vẫn khôi phục được nếu còn TTL |
| Minh Quân | Reservation model | Tạo migration cho `reservation_sessions`/`reservation_items` hoặc `draft_orders`/`draft_order_items`; ghi rõ trạng thái ACTIVE/EXPIRED/CONVERTED/CANCELLED | Schema giữ vé tạm rõ ràng, không lẫn với order đã thanh toán |
| Minh Quân | Reserve/release API | Implement API bấm `+/-`: reserve 1 vé, release 1 vé, atomic update `available_qty >= 1`, enforce `max_per_account` gồm PAID + AWAITING_PAYMENT + ACTIVE_HOLD | Không oversell, không vượt per-user limit, trả lỗi rõ khi hết vé |
| Minh Quân | Convert hold to order | Khi user bấm thanh toán, convert active hold thành order `AWAITING_PAYMENT`, giữ timer thanh toán 15 phút hiện có | Checkout dùng order thật, payment flow cũ vẫn chạy |
| Minh Quân | Cleanup job | Scheduled job expire shopping session và trả vé; idempotent nếu chạy lại | Vé được trả khi hết 10 phút hoặc session chết |
| Trọng Quân | FE waiting room | Thêm màn waiting room trước chọn vé: join queue, poll status, show position/estimated status | User không vào selection nếu chưa tới lượt |
| Trọng Quân | FE reserve UX | Đổi nút `+/-` ở seat selection sang gọi reserve/release API; show popup hết vé, show selected holds và loading từng zone | User biết ngay vé nào giữ được hoặc đã hết |
| Trọng Quân | FE timers | Hiển thị timer chọn vé 10 phút và timer thanh toán 15 phút; cảnh báo khi gần hết giờ | Demo rõ luật 10 phút chọn vé + 15 phút thanh toán |

Demo bắt buộc cuối Sprint 8:

```text
2 user cùng tranh vé cuối: chỉ 1 user reserve thành công.
User tới lượt giữ vé bằng nút +, user khác thấy availability giảm.
Bấm - trả vé lại.
Hết 10 phút tự release vé.
Convert hold sang order, thanh toán mock success sinh ticket.
User chưa tới lượt gọi reserve API bị từ chối.
```

## 15. Sprint 9 - 03/07 Đến 05/07

Mục tiêu:

```text
Đóng các gap còn lại giữa docs và code.
Hoàn thiện các UI vận hành còn thiếu.
Quyết định rõ MoMo: implement tối thiểu hoặc ghi out-of-scope nhất quán trong docs.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Notification UI | Tích hợp notification list, badge chưa đọc, mark-as-read vào PublicLayout/Profile hoặc một page riêng | User thấy app notification sau mua vé/reminder |
| Duy Khánh | Admin notification ops | Implement hoặc cắt khỏi docs các endpoint `GET /api/admin/notifications`, retry notification, trigger reminder thủ công | Docs và code không còn lệch |
| Duy Khánh | Docs drift audit | So toàn bộ `docs/api/api-endpoints.md` với controller thật; đánh dấu implemented/out-of-scope/deferred | Không còn endpoint "ảo" trong tài liệu nộp |
| Công Phúc | Admin users | Implement admin user list/detail/change role/status hoặc xóa khỏi scope nếu không làm | Admin user management không còn chỉ nằm trong docs |
| Công Phúc | RBAC tests | Viết test/Postman cho queue token, reserve token, admin/staff/audience boundary | Có bằng chứng audience không gọi được admin/staff/reserve trái phép |
| Minh Quân | Order support | Implement cancel awaiting-payment order và retry payment nếu còn hợp lệ; cập nhật FE nếu cần | User có thể hủy order giữ vé và release inventory đúng |
| Minh Quân | Admin order/ticket ops | Implement admin/organizer order list/detail và ticket status update nếu vẫn giữ trong docs | Organizer/admin hỗ trợ vận hành order/ticket |
| Minh Quân | MoMo scope | Một trong hai: implement MoMo mock/sandbox adapter + webhook signature, hoặc cập nhật docs/README nói rõ project chỉ demo VNPAY + MOCK | Không còn enum/docs hứa MoMo nhưng code không có |
| Trọng Quân | Staff web | Thay placeholder `/staff/check-in`, `/staff/guests`, `/staff/history` bằng UI gọi API staff thật hoặc redirect rõ sang mobile scanner | Staff web không còn là màn rỗng khi demo |
| Trọng Quân | Mobile docs | Cập nhật `mobile-scanner/README.md` và README con đã lỗi thời: login, dataset, offline scan, auto sync, guest list | Người chấm chạy mobile không bị nhầm là future scope |
| Trọng Quân | Admin check-in summary UI | Nếu endpoint summary được làm, thêm widget summary vào admin/organizer; nếu không, xóa khỏi docs | Check-in summary nhất quán giữa FE/API/docs |

Demo bắt buộc cuối Sprint 9:

```text
Notification hiện trên UI sau payment success.
Admin docs không còn endpoint chưa làm mà không ghi out-of-scope.
Cancel order trả vé lại.
Staff web không còn placeholder hoặc có hướng dẫn rõ dùng mobile scanner.
MoMo được demo tối thiểu hoặc được loại khỏi phạm vi nộp một cách nhất quán.
```

## 16. Sprint 10 - 06/07 Đến 08/07

Mục tiêu:

```text
Chốt bản nộp sau khi thêm waiting room/hold.
Không nhận feature mới trừ bug P0/P1.
Tạo bằng chứng test cho từng yêu cầu môn học và từng phần nhóm tự thiết kế.
```

| Người phụ trách | Module | Task | Output để note vào Sheet |
| --- | --- | --- | --- |
| Duy Khánh | Acceptance checklist | Lập bảng PASS/FAIL cuối cùng: auth, RBAC, waiting room, reserve hold, purchase, payment, notification, CSV, AI, mobile offline, Redis, RabbitMQ, Docker | Checklist có link file/log/screenshot/Postman tương ứng |
| Duy Khánh | Full integration | Chạy Docker Compose full, kiểm tra frontend/backend/Postgres/Redis/RabbitMQ/MailHog; ghi lỗi còn lại | Một lệnh chạy được và có hướng dẫn fix nếu env thiếu |
| Duy Khánh | Performance demo | Chuẩn bị script/demo tranh vé cuối, reserve race, rate limit, idempotency, queue admission | Có bằng chứng hệ thống không oversell |
| Công Phúc | Security hardening | Test token hết hạn, user sai role, queue token giả, session hết hạn, admin-only endpoint | Không có bypass quyền cơ bản |
| Công Phúc | README auth/RBAC | Cập nhật tài khoản demo, role matrix, route matrix, cách test RBAC | README đủ để người chấm tự kiểm tra |
| Minh Quân | Payment/order hardening | Test create order, reserve-to-order, cancel, expire, retry, VNPAY/mock callback trùng, payment failed | Order/payment không sinh vé trùng và trả inventory đúng |
| Minh Quân | Seed/data sanity | Kiểm tra seed 4 concert, ticket zones, availability, poster/seat map, demo user/order/ticket không conflict migration | DB trắng chạy Flyway xong demo được ngay |
| Trọng Quân | Mobile E2E | Chạy Expo scanner: login staff, tải dataset, tắt mạng, scan, bật mạng, sync, conflict duplicate | Có ảnh/video/log chứng minh mobile offline thật |
| Trọng Quân | FE polish | Kiểm tra responsive cho audience/admin/staff/waiting room/checkout/payment result; sửa text lỗi/mã hóa nếu còn | UI không vỡ ở desktop/mobile, không còn mojibake trong app |
| Cả nhóm | Final video | Quay video theo script: waiting room -> giữ vé -> thanh toán -> QR -> mobile offline check-in -> notification/admin | Video thể hiện đúng phần khó nhất thay vì chỉ CRUD |

Checklist khóa scope trước khi nộp:

```text
Nếu tính năng chưa implement thì không để trong docs như đã có.
Nếu endpoint còn trong docs thì phải có controller hoặc ghi rõ deferred/out-of-scope.
Nếu backend có logic quan trọng thì phải có Postman/curl/test chứng minh.
Nếu demo cần env thật như VNPAY/AI/Cloudinary thì README phải nói rõ fallback local.
```

