# Đặc tả: Authentication & Role-Based Access Control (RBAC)

## 1. Mô tả
Tính năng này quản lý đăng ký, đăng nhập người dùng và bảo mật hệ thống bằng cách kiểm soát quyền truy cập (RBAC) cho các vai trò khác nhau: `AUDIENCE` (Khán giả), `ORGANIZER` (Ban tổ chức), `STAFF` (Nhân viên soát vé), và `ADMIN` (Quản trị viên). Hệ thống sử dụng token JWT không trạng thái (stateless) để xác thực từng yêu cầu API.

---

## 2. Luồng chính
### Đăng ký tài khoản (Register)
1. Khán giả điền thông tin đăng ký (email, password, fullName, phone) tại trang đăng ký.
2. Client gửi yêu cầu `POST /api/auth/register` đến Backend.
3. Backend mã hóa mật khẩu bằng BCrypt, lưu thông tin user vào database với role mặc định là `AUDIENCE`, và trả về thông tin user đã đăng ký thành công.

### Đăng nhập và Nhận JWT (Login)
1. Người dùng nhập email và mật khẩu tại trang đăng nhập.
2. Client gửi yêu cầu `POST /api/auth/login` đến Backend.
3. Backend kiểm tra tài khoản:
   - Xác thực email và so khớp mật khẩu bằng `PasswordEncoder`.
   - Sinh JWT token chứa thông tin định danh (`userId`, `email`, và `role`).
4. Backend trả về token JWT và thông tin cơ bản của người dùng.
5. Client lưu trữ token (localStorage hoặc secure storage) và gửi kèm token trong header `Authorization: Bearer <jwt>` ở các yêu cầu tiếp theo.

### Lấy thông tin cá nhân (Profile)
1. Client gửi yêu cầu `GET /api/auth/me` kèm theo JWT hợp lệ.
2. Backend trích xuất JWT, kiểm tra tính hợp lệ và trả về thông tin cá nhân hiện tại.

---

## 3. Kịch bản lỗi
*   **Đăng ký trùng email:** Hệ thống trả về lỗi `409 Conflict` kèm thông báo email đã được đăng ký.
*   **Đăng nhập sai thông tin:** Hệ thống trả về lỗi `401 Unauthorized` kèm thông báo "Invalid credentials".
*   **Token không hợp lệ hoặc hết hạn:** Backend chặn yêu cầu tại `JwtAuthenticationFilter`, ghi log cảnh báo và chuyển tiếp đến `AuthenticationEntryPoint` để trả về lỗi `401 Unauthorized` dưới định dạng thống nhất:
    ```json
    {
      "success": false,
      "message": "Authentication required",
      "data": null,
      "errors": null
    }
    ```
*   **Truy cập vượt quyền (ví dụ: Audience gọi API của Admin):** Spring Security chặn yêu cầu và gọi `AccessDeniedHandler` để trả về lỗi `403 Forbidden` dưới định dạng thống nhất:
    ```json
    {
      "success": false,
      "message": "Access denied",
      "data": null,
      "errors": null
    }
    ```

---

## 4. Ràng buộc
*   **Độ mạnh mật khẩu:** Mật khẩu đăng ký phải có độ dài tối thiểu 6 ký tự.
*   **Mã hóa:** Mật khẩu lưu trong database phải luôn được băm bằng thuật toán BCrypt.
*   **Thời hạn Token:** JWT có thời gian hết hạn (TTL) mặc định là 24 giờ.
*   **Phạm vi CORS:** Chỉ các nguồn gốc (origins) được cấu hình rõ ràng trong `SecurityConfig` mới được phép thực hiện các yêu cầu RESTful đến API.

---

## 5. Tiêu chí chấp nhận
1. Người dùng có thể đăng ký tài khoản Khán giả và đăng nhập thành công để nhận JWT.
2. Khán giả bị chặn và trả về lỗi `403 Forbidden` khi cố gọi các API thuộc quyền quản trị như `/api/admin/**`.
3. Yêu cầu không có token đến các API được bảo vệ sẽ nhận lỗi `401 Unauthorized`.
4. Mọi phản hồi lỗi xác thực/phân quyền đều có cấu trúc JSON thống nhất và không lộ thông tin lỗi nội bộ hệ thống.
