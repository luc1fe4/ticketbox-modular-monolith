# Tổng hợp Báo cáo Fix Bug & Best Practices (Cập Nhật Toàn Diện)

Tài liệu này tổng hợp lại toàn bộ các vấn đề kiến trúc, bug logic, lỗ hổng bảo mật và convention đã được giải quyết trong quá trình refactor dự án TicketBox Modular Monolith. Các thành viên trong team cần đọc kỹ để nắm bắt **Convention** mới và tránh lặp lại các lỗi tương tự.

---

## 1. Lỗi Hiệu Năng: Auth Filter Query DB liên tục (Nút thắt cổ chai)
> [!WARNING]
> **Vấn đề:** Trong file `JwtAuthenticationFilter`, cứ mỗi request gửi lên, hệ thống lại thực hiện 1 câu query vào DB (`userRepository.findById(userId)`) để lấy thông tin User và gán quyền. Với tải cao (VD: 80.000 user/5 phút lúc mở bán vé), DB sẽ sập ngay lập tức.

**Cách Fix & Best Practice:**
- Bản thân JWT đã chứa Payload, ta hoàn toàn có thể nhúng **Role** của user vào token lúc login.
- Khi verify JWT, chỉ cần lấy `userId` và `role` trực tiếp từ Token thông qua `jwtService.extractRole()`, không cần gọi DB.
- **Lưu ý:** Sự đánh đổi (Trade-off) ở đây là nếu admin ban user, JWT cũ vẫn valid cho đến khi hết hạn. Trong tương lai, chúng ta sẽ implement thêm cơ chế Redis Token Blacklist để revoke token tức thời nếu cần.

---

## 2. Vấn đề về DTO và Mapper (Chống giả mạo dữ liệu)
> [!CAUTION]
> **Vấn đề 1:** Khách hàng (Client) có thể truyền lên trường `createdBy` giả mạo (UUID của người khác) trong `CreateConcertRequest`, và Mapper tự động bê nguyên nó gán vào Entity gây rò rỉ quyền sở hữu.
> **Vấn đề 2:** DTO đặt sai vị trí ở `application/dto` thay vì `web/dto` theo chuẩn.

**Cách Fix & Best Practice:**
- Bắt buộc xóa các trường như `createdBy`, `id`, `status` khỏi **Request DTO**. Các giá trị này phải được trích xuất từ Backend (VD: lấy `organizerId` từ `Authentication` object).
- Tất cả DTO **bắt buộc** phải nằm trong thư mục `web/dto/` và phân định rõ `XxxRequest` vs `XxxResponse`. Không dùng tên `XxxDto`.
- Sử dụng **MapStruct** thay cho việc gán tay rườm rà trong Service.
- Luôn phải có `@Mapping(target = "id", ignore = true)` (và các system fields khác) khi map Request vào Entity để bảo vệ dữ liệu.

---

## 3. Lỗi Đóng Gói (Encapsulation) của Spring Modulith
> [!NOTE]
> **Vấn đề:** Code bị dính lỗi `non-exposed type` khi module `checkin` cố truy cập vào `shared.response.ApiResponse`. File có "ổ khóa". Việc comment bỏ `@ApplicationModule` ở `concert` chỉ là lách luật.

**Cách Fix & Best Practice:**
- Spring Modulith sẽ khóa tất cả sub-package của 1 module, biến chúng thành Internal API.
- Để biến 1 module chuyên dùng chung như `shared` thành Public, cần phải tạo file `package-info.java` tại thư mục gốc của nó (`com.ticketbox.shared`) với config `ApplicationModule.Type.OPEN`.
- Đảm bảo các module khác vẫn giữ nguyên `@ApplicationModule` để duy trì luật lệ thiết kế.

---

## 4. Vi phạm ranh giới Module (Cross-Module Violation)
> [!IMPORTANT]
> **Vấn đề:** `CheckinService` (nằm ở module checkin) lại import trực tiếp `TicketRepository` (thuộc module ticket) để tìm kiếm vé. Điều này phá vỡ hoàn toàn nguyên lý Modular Monolith (giống như thò tay vào túi quần của người khác lấy đồ).

**Cách Fix & Best Practice:**
- Áp dụng **Port & Adapter Pattern**. 
- Module `ticket` phải định nghĩa một Interface (Port) tên là `TicketCheckinPort` và expose một DTO/Record đơn giản (VD: `TicketView`).
- `CheckinService` chỉ được phép gọi qua `TicketCheckinPort` chứ tuyệt đối không được truy cập Repository hay Entity của module khác.

---

## 5. Lỗi Thiết Kế Domain (BaseEntity và JPA)
> [!WARNING]
> **Vấn đề 1:** `BaseEntity` chỉ có `createdAt` và `updatedAt` mà lại quên mất `id` UUID. Điều này bắt buộc mọi Entity phải tự khai báo lại ID rất tốn thời gian và vi phạm DRY (Don't Repeat Yourself).
> **Vấn đề 2:** Entity `CheckinLog` quên không extends `BaseEntity`, đồng thời thiếu luôn No-Arg Constructor (`@NoArgsConstructor(access = AccessLevel.PROTECTED)`) mà JPA bắt buộc phải có để map data.

**Cách Fix & Best Practice:**
- `BaseEntity` phải gom cả `@Id` UUID, `@CreationTimestamp`, `@UpdateTimestamp`.
- Tất cả các Entity trong hệ thống (như `Concert`, `User`, `CheckinLog`, `TicketType`) đều phải kế thừa `BaseEntity` để đảm bảo đồng nhất hệ thống.
- Luôn kiểm tra constructor của Entity, không được quên No-Arg Constructor đối với JPA/Hibernate.

---

## 6. Lỗ hổng Bảo mật & Security Căn Bản
> [!CAUTION]
> **Vấn đề 1:** Trong `CheckinService`, khối lệnh verify chữ ký QR Code bị *comment out* bằng `//`. Nếu đem lên Production, bất kỳ ai generate một chuỗi JSON có đúng định dạng cũng sẽ check-in thành công mà không cần quan tâm Secret Key.
> **Vấn đề 2:** Thiếu cấu hình Stateless Session trong Spring Security, và bộ lọc `JwtAuthenticationFilter` nằm sai vị trí (bị nhét vào module auth thay vì thư mục hạ tầng bảo mật chung).

**Cách Fix & Best Practice:**
- Bỏ comment các đoạn code kiểm tra chữ ký JWT/QR Code ngay lập tức.
- Trong `SecurityConfig`, phải tắt CSRF (`csrf.disable()`) vì chúng ta dùng Bearer Token, và cấu hình `sessionManagement` thành `STATELESS`.
- Các filter liên quan đến Security toàn hệ thống phải được đặt trong thư mục `infrastructure/security/` để tuân thủ kiến trúc.

---
**Lời nhắn gửi Team:** Kiến trúc Modular Monolith đòi hỏi kỷ luật viết code rất cao. Các bạn khi tạo mới API hay viết logic, vui lòng luôn kiểm tra chéo (Cross-check) với các quy tắc trên để dự án duy trì được độ Clean và dễ dàng scale trong tương lai!
