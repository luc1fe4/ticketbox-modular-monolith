# Authentication & Role-Based Access Control

## 1. Mục tiêu

Tài liệu này mô tả thiết kế kiểm soát truy cập cho TicketBox theo các vai trò `AUDIENCE`, `ORGANIZER`, `STAFF`, `ADMIN`, bao gồm quyền tại API, UI web, mobile scanner app và cách hệ thống trả lỗi `401/403`.

TicketBox dùng JWT stateless kết hợp RBAC:

- `AUDIENCE`: khán giả xem concert, vào waiting room, giữ vé, mua vé, xem vé và thông báo của chính mình.
- `ORGANIZER`: ban tổ chức quản lý concert thuộc phạm vi vận hành, ticket type, guest list, AI artist bio, đơn hàng và báo cáo doanh thu của concert liên quan.
- `STAFF`: nhân sự soát vé tại cổng, dùng staff web/mobile scanner để tải dataset, scan QR, đồng bộ log offline và tra cứu guest list.
- `ADMIN`: quản trị viên hệ thống, có quyền quản lý user/role/status và các màn hình vận hành toàn cục.

## 2. Luồng xác thực

### 2.1 Đăng ký

1. Khán giả gửi `POST /api/auth/register` với email, password, full name và phone.
2. Backend kiểm tra dữ liệu, hash mật khẩu bằng BCrypt.
3. User mới được lưu với role mặc định `AUDIENCE`.

### 2.2 Đăng nhập

1. User gửi `POST /api/auth/login`.
2. Backend xác thực email/password.
3. Backend sinh JWT chứa `userId`, `email`, `role`, `fullName` và thời hạn token.
4. Client lưu token và gửi kèm `Authorization: Bearer <jwt>` cho các request cần bảo vệ.

### 2.3 Lấy thông tin người dùng hiện tại

`GET /api/auth/me` yêu cầu JWT hợp lệ. Backend lấy user identity từ `SecurityContext` và trả về profile/role hiện tại để frontend quyết định menu, route guard và workspace mặc định.

## 3. Role-Permission Matrix

| Role | Nhóm quyền nghiệp vụ | API được phép | UI/App được phép | Giới hạn chính |
|---|---|---|---|---|
| `PUBLIC` | Xem thông tin công khai, đăng ký/đăng nhập, payment webhook từ provider | `GET /api/concerts/**`, `POST /api/auth/register`, `POST /api/auth/login`, `/api/payments/webhooks/**`, `/api/health` | Trang chủ, danh sách concert, chi tiết concert, login/register | Không được tạo order, giữ vé, xem vé cá nhân, truy cập admin/staff/organizer. |
| `AUDIENCE` | Mua vé và quản lý dữ liệu cá nhân của chính mình | `/api/queue/**`, `/api/reservations/**`, `/api/orders/**`, `/api/payments/**`, `/api/mock-payments/**`, `/api/tickets/**`, `/api/notifications`, `/api/users/me/**`, `/api/auth/me` | `/`, `/concerts/:id`, waiting room, chọn vé, checkout, payment result, my tickets, notifications, profile | Không được gọi `/api/admin/**`, `/api/organizer/**`, `/api/staff/**`; chỉ xem order/ticket của chính user. |
| `ORGANIZER` | Quản lý concert và dữ liệu vận hành thuộc phạm vi organizer | `/api/admin/concerts/**`, `/api/admin/ticket-types/**`, `/api/admin/concerts/{id}/guest-lists/import`, `/api/admin/artist-bio-jobs/**`, `/api/organizer/**`, `GET /api/staff/concerts/{id}/checkins` | `/organizer`, `/organizer/concerts`, `/organizer/ticket-types`, `/organizer/guests`, `/organizer/artist-bio`, `/organizer/revenue`, `/organizer/orders` | Không được quản lý user/role/status, notification ops toàn cục, admin order/ticket toàn hệ thống; dữ liệu organizer nên bị giới hạn theo concert sở hữu. |
| `STAFF` | Soát vé tại cổng và tra cứu guest list | `/api/staff/concerts/{id}/checkin-dataset`, `/api/staff/checkins/scan`, `/api/staff/checkins/sync`, `GET /api/staff/concerts/{id}/checkins`, `GET /api/staff/guestlist` | Web `/staff`, `/staff/check-in`, `/staff/guests`, `/staff/history`; mobile scanner app: login, chọn concert, tải dataset, scan QR, sync offline, tra cứu guest | Không được mua vé bằng workspace staff, không được quản lý concert/ticket type/order/user. Mobile app chỉ chấp nhận login role `STAFF`. |
| `ADMIN` | Quản trị hệ thống và vận hành toàn cục | `/api/admin/users/**`, `/api/admin/orders/**`, `/api/admin/tickets/**`, `/api/admin/concerts/{id}/tickets`, `/api/admin/concerts/{id}/checkin-summary`, `/api/admin/notifications/**`, `/api/admin/concerts/{id}/reminders/send`, `/api/admin/batch-jobs/**`, các API `/api/admin/**` còn lại; `GET /api/staff/concerts/{id}/checkins` | `/admin`, `/admin/concerts`, `/admin/ticket-types`, `/admin/guests`, `/admin/artist-bio`, `/admin/orders`, `/admin/notifications`, `/admin/users` | Không nên dùng quyền admin cho thao tác mua vé cá nhân; các tác vụ có ảnh hưởng toàn hệ thống cần audit/log rõ ràng. |

## 4. Endpoint Boundary Theo Nhóm API

| Nhóm API | Role hợp lệ | Enforcement chính |
|---|---|---|
| Public concert browsing | `PUBLIC`, `AUDIENCE` | `SecurityConfig` permitAll cho `GET /api/concerts/**`; frontend `GuestOrAudienceRoute` chuyển organizer/staff/admin về workspace của họ. |
| Auth/profile | `PUBLIC` cho register/login; `AUTHENTICATED` cho `/auth/me`, `/users/me/**` | JWT được parse bởi `JwtAuthenticationFilter`; request thiếu/sai token nhận `401`. |
| Queue/reservation/order/payment/ticket | `AUDIENCE` | `SecurityConfig` dùng `hasRole("AUDIENCE")`; service lấy user từ security context để không cho client chọn user khác. |
| Admin user management | `ADMIN` | Matcher `/api/admin/users/**` yêu cầu `ROLE_ADMIN`; UI route `/admin/users` chỉ nằm trong admin workspace. |
| Organizer/Admin concert ops | `ORGANIZER`, `ADMIN` | Matcher `/api/admin/**` cho `ADMIN/ORGANIZER`, nhưng các endpoint nhạy cảm được đặt matcher `ADMIN` trước. Organizer scope cần kiểm tra ownership ở service/controller. |
| Organizer-owned reports/orders/guest list | `ORGANIZER` | `/api/organizer/**` yêu cầu `ROLE_ORGANIZER`; backend trả `404/403` nếu concert/order không thuộc organizer. |
| Staff check-in/guest lookup | `STAFF` | `/api/staff/**` yêu cầu `ROLE_STAFF`, riêng `GET /api/staff/concerts/*/checkins` cho thêm `ORGANIZER/ADMIN` để xem log. |
| Payment webhooks | `PUBLIC` từ payment provider | `/api/payments/webhooks/**` permitAll nhưng controller phải verify chữ ký provider. |
| Notification ops | `ADMIN` | `/api/admin/notifications/**` và manual reminder endpoint yêu cầu `ROLE_ADMIN`. |

## 5. Enforcement Tại Backend

### 5.1 Spring Security

Backend dùng `SecurityConfig` để cấu hình:

- `csrf.disable()` vì API dùng Bearer token, không dùng server-side session.
- `SessionCreationPolicy.STATELESS` để mọi request tự xác thực bằng JWT.
- `JwtAuthenticationFilter` chạy trước `UsernamePasswordAuthenticationFilter`.
- `authorizeHttpRequests` định nghĩa matcher theo route prefix và role.
- `authenticationEntryPoint` trả `401` khi chưa xác thực.
- `accessDeniedHandler` trả `403` khi đã xác thực nhưng sai quyền.

Thứ tự matcher rất quan trọng: các endpoint `ADMIN` nhạy cảm như `/api/admin/users/**`, `/api/admin/orders/**`, `/api/admin/notifications/**` được đặt trước matcher rộng `/api/admin/**`, để `ORGANIZER` không đi vòng qua quyền admin.

### 5.2 JWT Filter

`JwtAuthenticationFilter` đọc header:

```text
Authorization: Bearer <jwt>
```

Nếu token hợp lệ, filter lấy `userId` và `role` từ JWT, tạo authority dạng `ROLE_<role>` và đặt vào `SecurityContext`. Cách này giúp request matcher của Spring Security kiểm tra role mà không cần client truyền role trong body/query.

Nếu token thiếu, sai format, hết hạn hoặc verify thất bại, request không được set authentication; khi chạm endpoint cần login, Spring Security trả `401`.

### 5.3 Kiểm tra ownership và dữ liệu của chính user

RBAC theo role chưa đủ cho dữ liệu có chủ sở hữu. Các service/controller cần áp dụng thêm rule nghiệp vụ:

- `AUDIENCE` chỉ được xem order/ticket/notification của chính mình.
- `ORGANIZER` chỉ được xem hoặc thao tác concert, order, guest list, revenue thuộc phạm vi concert được phép quản lý.
- `STAFF` chỉ được tải dataset/check-in theo concert được phân công nếu hệ thống mở rộng assignment theo event.
- `ADMIN` có quyền toàn cục nhưng các thao tác đổi role/status user cần audit.

## 6. Enforcement Tại Frontend Web

Frontend React dùng `ProtectedRoute` và `GuestOrAudienceRoute`:

- Nếu chưa login và truy cập route bảo vệ, người dùng bị chuyển về `/login`.
- Nếu đã login nhưng role không nằm trong `allowedRoles`, UI hiển thị trang access limited hoặc redirect về home theo role.
- `roleRoutes.ts` định nghĩa workspace mặc định:
  - `AUDIENCE` -> `/`
  - `ORGANIZER` -> `/organizer`
  - `STAFF` -> `/staff`
  - `ADMIN` -> `/admin`
- `PublicLayout` chỉ hiển thị link workspace phù hợp với role đang đăng nhập.

Ma trận route web:

| Route UI | Role được vào | Ghi chú |
|---|---|---|
| `/`, `/concerts/:id` | `PUBLIC`, `AUDIENCE` | Organizer/Admin/Staff được redirect về workspace để tránh thao tác mua vé nhầm vai trò. |
| `/concerts/:id/waiting-room`, `/concerts/:id/seats`, `/checkout`, `/my-tickets`, `/notifications`, `/profile` | `AUDIENCE` | Gắn với luồng mua vé và dữ liệu cá nhân. |
| `/organizer/**` | `ORGANIZER` | Quản lý concert, ticket type, guest import, artist bio, revenue, orders trong scope organizer. |
| `/staff/**` | `STAFF` | Web hỗ trợ check-in, guest lookup và lịch sử tại cổng. |
| `/admin/**` | `ADMIN` | Quản trị toàn cục: users, notifications, orders, tickets, guest import, concert ops. |

Frontend route guard chỉ là lớp UX và giảm nhầm thao tác. Backend Spring Security vẫn là nguồn enforce bắt buộc.

## 7. Enforcement Tại Mobile Staff Scanner

Mobile scanner là app riêng cho nhân sự soát vé:

- Login qua `/api/auth/login`.
- Sau khi nhận response, app kiểm tra `response.user.role`.
- Nếu role khác `STAFF`, app ném lỗi `403` với thông điệp chỉ tài khoản STAFF được dùng scanner.
- Token STAFF được lưu trong secure/local storage của app và gửi kèm các API dataset, scan, sync, guest lookup.
- Dataset và pending logs được lưu SQLite cục bộ để hỗ trợ offline; quyền staff vẫn được xác thực khi tải dataset hoặc sync online.

Điều này đảm bảo Audience/Organizer/Admin không thể dùng mobile scanner chỉ bằng cách biết endpoint login.

## 8. Chuẩn lỗi 401/403

| Trường hợp | HTTP | Ý nghĩa | Response mong muốn |
|---|---:|---|---|
| Không có token khi gọi endpoint protected | `401` | Chưa xác thực | `success=false`, `message="Authentication required"` |
| Token sai, hết hạn, không verify được | `401` | Không xác thực được danh tính | `success=false`, `message="Authentication required"` |
| Có token hợp lệ nhưng sai role | `403` | Đã xác thực nhưng không có quyền | `success=false`, `message="Access denied"` |
| Organizer truy cập dữ liệu không thuộc concert của mình | `403` hoặc `404` | Sai scope dữ liệu | Không lộ dữ liệu/tài nguyên của organizer khác |
| Mobile scanner login bằng role không phải STAFF | `403` tại client app | Sai workspace/app | App không lưu token và không vào màn scanner |

Ví dụ lỗi `401`:

```json
{
  "success": false,
  "message": "Authentication required",
  "data": null,
  "errors": null
}
```

Ví dụ lỗi `403`:

```json
{
  "success": false,
  "message": "Access denied",
  "data": null,
  "errors": null
}
```

## 9. Tài liệu và thành phần liên quan

- Backend enforcement: `backend/src/main/java/com/ticketbox/infrastructure/security/SecurityConfig.java`.
- JWT parsing: `backend/src/main/java/com/ticketbox/infrastructure/security/JwtAuthenticationFilter.java`.
- Frontend route guard: `frontend/src/features/auth/ProtectedRoute.tsx`.
- Frontend role home: `frontend/src/features/auth/roleRoutes.ts`.
- Mobile staff-only login: `mobile-scanner/src/api/services/auth.ts`.
- API contract: `docs/api/api-endpoints.md`.
- Demo RBAC: `docs/demo/full-demo-script.md`.
- Auth/RBAC Postman collection: `docs/api/postman/TicketBox-Auth-RBAC-Notification.postman_collection.json`.

## 10. Tiêu chí nghiệm thu

| Kịch bản |
|---|
| `PUBLIC` xem được concert list/detail nhưng không tạo được order nếu chưa login. |
| `AUDIENCE` tạo order, xem ticket của mình; gọi `/api/admin/users` nhận `403`. |
| Request không token tới `/api/orders/my` hoặc `/api/staff/checkins/scan` nhận `401`. |
| `STAFF` scan/sync check-in được; gọi API admin/organizer bị chặn. |
| `ORGANIZER` vào `/organizer/**`, xem báo cáo concert của mình, nhưng không vào `/admin/users`. |
| `ADMIN` vào `/admin/users`, đổi role/status user và xem dữ liệu vận hành toàn cục. |
| Mobile scanner từ chối login nếu tài khoản không phải `STAFF`. |
| Frontend redirect/hiển thị access limited khi user nhập trực tiếp URL không thuộc role. |
