# TicketBox

TicketBox là một nền tảng bán vé sự kiện âm nhạc được thiết kế theo kiến trúc **Modular Monolith**. Hệ thống hỗ trợ các tính năng khám phá concert, đặt giữ chỗ, thanh toán trực tuyến, hiển thị vé điện tử dưới dạng mã QR, soát vé cho nhân viên, thông báo tự động (App/Email), nhập danh sách khách mời bằng tệp tin và tự động tạo tiểu sử nghệ sĩ bằng trí tuệ nhân tạo (AI).

Dự án đã được cấu hình sẵn để chạy demo từ đầu đến cuối (end-to-end) bằng Docker Compose, bao gồm: Spring Boot backend, React frontend, PostgreSQL, Redis, RabbitMQ và MailHog.

---

## Công nghệ sử dụng (Tech Stack)

* **Backend:** Java 21, Spring Boot 3, Spring Security JWT, Spring Data JPA, Flyway, Spring Batch, Spring AMQP (RabbitMQ), Spring Data Redis, Resilience4j (Circuit Breaker)
* **Frontend:** React, TypeScript, Vite, Tailwind CSS, Axios
* **Mobile Scanner (Soát vé):** Expo React Native, TypeScript, SQLite (luồng quét vé ngoại tuyến offline)
* **Hạ tầng hỗ trợ:** PostgreSQL 16, Redis 7, RabbitMQ 3 (Management), MailHog (SMTP Server ảo), Docker Compose

---

## Yêu cầu hệ thống (Prerequisites)

* **Docker Desktop** (khuyên dùng để chạy nhanh toàn bộ hệ thống)
* **Git**
* **Java 21** (chỉ cần thiết nếu bạn muốn chạy backend trực tiếp ngoài Docker)
* **Node.js LTS** (chỉ cần thiết nếu bạn muốn chạy frontend trực tiếp ngoài Docker)

---

## Khởi chạy nhanh với Docker

1. **Sao chép tệp cấu hình môi trường:**

   ```bash
   cp .env.example .env
   ```

   Trên Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. **Khởi chạy toàn bộ hệ thống:**

   ```bash
   docker compose up --build
   ```

3. **Truy cập các dịch vụ demo:**

   | Dịch vụ | URL / Thông tin kết nối |
   | --- | --- |
   | **Frontend Web** | http://localhost:5173 |
   | **Backend Health** | http://localhost:8080/api/health |
   | **RabbitMQ Management** | http://localhost:15672 (tài khoản: `ticketbox` / mật khẩu: `ticketbox`) |
   | **MailHog (Hòm thư ảo)** | http://localhost:8025 |
   | **PostgreSQL Database** | host: `localhost`, port: `5433`, DB: `ticketbox`, user: `ticketbox`, password: `ticketbox` |
   | **Redis Database** | host: `localhost`, port: `6379` |

---

## Biến môi trường (Environment Variables)

Các giá trị mặc định trong `.env.example` đã được tối ưu hóa cho môi trường phát triển local. Dưới đây là các biến môi trường quan trọng:

| Biến số | Ý nghĩa | Giá trị local mặc định |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | Chuỗi kết nối tới PostgreSQL bên trong mạng Docker | `jdbc:postgresql://postgres:5432/ticketbox` |
| `JWT_SECRET` | Mã bí mật dùng để ký và xác thực JWT | Mã mẫu dùng cho dev |
| `VITE_API_BASE_URL` | URL API Backend phục vụ Frontend | `http://localhost:8080` |
| `REDIS_HOST`, `REDIS_PORT` | Kết nối Redis | `redis`, `6379` |
| `RABBITMQ_HOST`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` | Kết nối RabbitMQ | `rabbitmq`, `ticketbox`, `ticketbox` |
| `MAIL_HOST`, `MAIL_PORT` | Cổng SMTP để gửi mail | `mailhog`, `1025` (trong Docker Compose) |
| `PAYMENT_MOCK_BASE_URL` | URL phục vụ cổng thanh toán ảo | `http://localhost:8080` |
| `VNPAY_PAY_URL` | URL trang thanh toán thử nghiệm VNPAY Sandbox | URL Sandbox mặc định |
| `VNPAY_RETURN_URL` | Trang Frontend điều hướng về sau khi thanh toán VNPAY | `http://localhost:5173/payment/result` |
| `VNPAY_IPN_URL` | Địa chỉ Webhook (IPN) công khai để VNPAY gọi về cập nhật đơn | Thay bằng link public từ ngrok để test cổng thanh toán thật |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | Mã kết nối Sandbox VNPAY của merchant | Thay bằng thông tin tài khoản thử nghiệm của bạn |
| `MOMO_RETURN_URL` | Trang Frontend điều hướng về sau khi thanh toán MoMo | `http://localhost:5173/payment/result` |
| `MOMO_IPN_URL` | Địa chỉ Webhook (IPN) công khai để MoMo gọi về cập nhật đơn | Thay bằng link public từ ngrok để test cổng thanh toán thật |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` | Thông tin kết nối Sandbox MoMo của merchant | Thay bằng thông tin tài khoản thử nghiệm của bạn |
| `GUEST_LIST_IMPORT_CRON` | Chu kỳ tự động quét tệp Excel khách mời | `0 0 3 * * *` (mỗi ngày lúc 3h sáng) |
| `ARTIST_BIO_AI_PROVIDER`, `ARTIST_BIO_AI_API_KEY` | Nhà cung cấp AI và khóa API để tạo tiểu sử nghệ sĩ | `auto` (nếu để trống khóa API sẽ tự động dùng mock data) |

> [!CAUTION]
> Tuyệt đối không commit các file chứa cấu hình bảo mật thực tế, thông tin tài khoản thanh toán thật hoặc đường dẫn ngrok tạm thời lên Git.

---

## Tài khoản Demo kiểm thử

Cơ sở dữ liệu mẫu (Database Seed) đã tự động khởi tạo sẵn các tài khoản sau để phục vụ chạy thử nghiệm:

| Vai trò (Role) | Email | Mật khẩu | Quyền hạn chính |
| --- | --- | --- | --- |
| **Audience** (Khán giả) | `audience@ticketbox.com` | `password123` | Khám phá concert, giữ chỗ, thanh toán vé, xem danh sách vé đã mua |
| **Organizer** (Ban tổ chức) | `organizer@ticketbox.com`| `password123` | Vào trang quản lý của ban tổ chức, xem báo cáo doanh thu, import danh sách khách mời |
| **Admin** (Quản trị viên) | `admin@ticketbox.com` | `password123` | Toàn quyền kiểm soát hệ thống, quản lý tài khoản người dùng, đổi vai trò, xem lịch sử quét vé |
| **Staff** (Nhân viên soát vé) | `staff@ticketbox.com` | `password123` | Soát vé tại cổng sự kiện, tìm kiếm thông tin khách hàng, sử dụng app quét QR soát vé |

Ngoài ra, hệ thống cũng tạo sẵn các tài khoản tương tự với đuôi tên miền `.vn` (mật khẩu `password123`) để kiểm tra tính năng phân quyền: `audience@ticketbox.vn`, `organizer@ticketbox.vn`, `admin@ticketbox.vn`, `staff@ticketbox.vn`.

---

## Ma trận Phân quyền (RBAC Matrix)

### 1. Phân quyền trên giao diện Web (Frontend)

| Đường dẫn / Trang | Public | Audience | Staff | Organizer | Admin | Hành động khi chưa phân quyền |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| `/` (Trang chủ) | ✅ | ✅ | ✅ | ✅ | ✅ | Cho phép truy cập công khai |
| `/login`, `/register` | ✅ | ✅ | ✅ | ✅ | ✅ | Cho phép truy cập công khai |
| `/concerts/:id` | ✅ | ✅ | ✅ | ✅ | ✅ | Cho phép truy cập công khai |
| `/profile` | ❌ | ✅ | ✅ | ✅ | ✅ | Chuyển hướng về `/login` |
| `/tickets`, `/orders` | ❌ | ✅ | ❌ | ❌ | ❌ | Chuyển hướng về trang chủ `/` |
| `/admin` (Trang Admin) | ❌ | ❌ | ❌ | ❌ | ✅ | Chuyển hướng về trang chủ của vai trò |
| `/organizer` (Trang BTC) | ❌ | ❌ | ❌ | ✅ | ❌ | Chuyển hướng về trang chủ của vai trò |
| `/admin/users` (Quản lý User) | ❌ | ❌ | ❌ | ❌ | ✅ | Chuyển hướng về trang chủ `/` |
| `/staff/check-in` (Soát vé) | ❌ | ❌ | ✅ | ❌ | ❌ | Chuyển hướng về trang chủ của vai trò |

### 2. Phân quyền trên APIs (Backend REST API)

| API Endpoint | HTTP Method | Public | `AUDIENCE` | `STAFF` | `ORGANIZER` | `ADMIN` | Mã lỗi khi không có quyền |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/auth/login`, `/register` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | Cho phép truy cập |
| `/api/concerts/**` (Xem danh sách) | GET | ✅ | ✅ | ✅ | ✅ | ✅ | Cho phép truy cập |
| `/api/profile/**` | GET/PUT | ❌ | ✅ | ✅ | ✅ | ✅ | `401 Unauthorized` |
| `/api/reservations/**` (Giữ chỗ) | POST/GET | ❌ | ✅ | ❌ | ❌ | ❌ | `403 Forbidden` |
| `/api/orders/**` (Đặt hàng) | POST/GET | ❌ | ✅ | ❌ | ❌ | ❌ | `403 Forbidden` |
| `/api/checkin/**` (Quét vé) | POST/GET | ❌ | ❌ | ✅ | ❌ | ✅ | `403 Forbidden` |
| `/api/organizer/**` | GET/POST | ❌ | ❌ | ❌ | ✅ | ❌ | `403 Forbidden` |
| `/api/admin/users/**` | GET/PUT | ❌ | ❌ | ❌ | ❌ | ✅ | `403 Forbidden` |

---

## Cách kiểm thử & Xác minh phân quyền (RBAC)

### Cách A: Thử nghiệm thủ công trên Web UI
1. **Kiểm tra cách ly người dùng thường (Audience vs Admin/Organizer):**
   * Đăng nhập bằng `audience@ticketbox.com`.
   * Thử gõ trực tiếp URL quản trị trên thanh trình duyệt: `http://localhost:5173/admin` hoặc `http://localhost:5173/admin/users`.
   * **Kết quả mong muốn:** Bạn lập tức bị chuyển hướng về trang chủ `/`. Menu quản trị trên thanh sidebar cũng hoàn toàn bị ẩn.
2. **Kiểm tra quyền hạn của Organizer và Admin:**
   * Đăng nhập bằng `organizer@ticketbox.com`. Bạn có quyền vào trang `/organizer` nhưng nếu cố truy cập vào `http://localhost:5173/admin/users` của Admin thì sẽ bị hệ thống chặn lại và chuyển hướng về.
   * Đăng xuất và đăng nhập lại bằng `admin@ticketbox.com`. Lúc này bạn mới có quyền vào xem, đổi vai trò người dùng, kích hoạt/vô hiệu hóa tài khoản ở trang `/admin/users`.
3. **Kiểm tra quyền kiểm soát soát vé (Staff):**
   * Đăng nhập bằng `audience@ticketbox.com` hoặc `organizer@ticketbox.com` và truy cập `http://localhost:5173/staff/check-in`.
   * **Kết quả mong muốn:** Truy cập bị từ chối và bị đẩy về trang chủ. Chỉ khi đăng nhập bằng tài khoản `staff@ticketbox.com` hoặc `admin@ticketbox.com` thì màn hình soát vé mới hiển thị.

### Cách B: Gọi API trực tiếp bằng cURL
1. **Truy cập API Admin khi chưa đăng nhập:**
   ```bash
   curl -i http://localhost:8080/api/admin/users
   ```
   *Kết quả mong muốn:* Trả về mã lỗi `401 Unauthorized`.
2. **Truy cập API Admin bằng Token của Audience:**
   * Thực hiện đăng nhập để lấy Bearer token của `audience@ticketbox.com`.
   * Gửi request lấy danh sách user:
     ```bash
     curl -i -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/admin/users
     ```
   *Kết quả mong muốn:* Trả về mã lỗi `403 Forbidden`.
3. **Xác minh bảo mật Token hàng chờ (Queue Bypass Protection):**
   * Khi gọi API giữ chỗ (`/api/reservations/...`), nếu bạn không truyền kèm Header `Queue-Access-Token` hợp lệ (được sinh ra sau khi vượt qua hàng chờ), API Backend sẽ từ chối xử lý và trả về lỗi `403 Forbidden` hoặc lỗi validate để ngăn việc bỏ qua hàng đợi.

---

## Hướng dẫn cấu hình Ngrok để test VNPAY / MoMo Sandbox

Khi khách hàng thanh toán qua cổng thanh toán Sandbox (VNPAY/MoMo), các cổng này sẽ gửi một yêu cầu xác thực thanh toán bất đồng bộ (gọi là **IPN Webhook**) trực tiếp đến Backend của bạn. Do máy local của bạn không có IP public, bạn phải dùng **ngrok** để mở một đường hầm public dẫn về backend local (cổng `8080`).

### Các bước cài đặt và cấu hình:

1. **Cài đặt ngrok:**
   * Tải ngrok phù hợp với hệ điều hành của bạn từ trang chủ [ngrok.com](https://ngrok.com/) hoặc cài qua Package Manager:
     * *macOS (Homebrew):* `brew install ngrok/ngrok/ngrok`
     * *Windows (Chocolatey):* `choco install ngrok`
     * *Linux (APT):* Làm theo hướng dẫn trên trang chủ ngrok.

2. **Kết nối tài khoản ngrok (Chỉ cần làm lần đầu):**
   * Đăng ký tài khoản ngrok miễn phí và chạy lệnh sau để thiết lập auth token của bạn (lấy token tại trang Dashboard của ngrok):
     ```bash
     ngrok config add-authtoken <YOUR_PERSONAL_AUTHTOKEN>
     ```

3. **Khởi tạo đường hầm dẫn tới Backend (cổng 8080):**
   * Chạy lệnh sau để ngrok tạo ra một URL public trỏ về backend:
     ```bash
     ngrok http 8080
     ```
   * Sau khi chạy, ngrok sẽ cung cấp một liên kết public dạng: `https://xxxx-xxxx-xxxx.ngrok-free.app`. Hãy copy đường link này.

4. **Cập nhật cấu hình trong tệp `.env`:**
   Mở tệp `.env` của dự án ra và thay thế phần tiền tố URL trong cấu hình IPN bằng link ngrok của bạn:
   ```properties
   # VNPAY Webhook URL (Thay phần subdomain bằng link ngrok của bạn)
   VNPAY_IPN_URL=https://xxxx-xxxx-xxxx.ngrok-free.app/api/payments/webhooks/vnpay

   # MoMo Webhook URL (Thay phần subdomain bằng link ngrok của bạn)
   MOMO_IPN_URL=https://xxxx-xxxx-xxxx.ngrok-free.app/api/payments/webhooks/momo
   ```
   *(Lưu ý: Không đổi các cấu hình VNPAY_RETURN_URL hay MOMO_RETURN_URL vì các luồng đó chạy trên trình duyệt client nên trỏ về localhost:5173 là chính xác).*

---

## Trình diễn Thanh toán (Payment Demo)

Hệ thống hỗ trợ 3 cách kiểm thử luồng thanh toán:

1. **Mock Payment (Thanh toán giả lập tại local):**
   * Khách hàng đặt mua vé trên giao diện web.
   * Bấm nút "Thanh toán giả lập" để mô phỏng thanh toán thành công ngay lập tức.
   * Hệ thống sinh vé tự động, gửi email thông báo và lưu lịch sử mua. Đây là luồng nhanh nhất để test tính năng hàng đợi và soát vé mà không cần cấu hình internet.
2. **VNPAY Sandbox:**
   * Điền mã `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` của bạn vào `.env`.
   * Cấu hình Ngrok để nhận webhook IPN (như hướng dẫn ở mục trên).
   * Tiến hành đặt vé trên Web, bạn sẽ được chuyển hướng tới cổng thanh toán sandbox của VNPAY để nhập tài khoản thẻ test và hoàn thành thanh toán thực tế.
3. **MoMo Sandbox:**
   * Cập nhật các khóa `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, và `MOMO_SECRET_KEY` vào `.env`.
   * Cấu hình IPN Webhook qua ngrok.
   * Tiến hành đặt vé và quét mã QR MoMo Sandbox để thực hiện thanh toán thử nghiệm.

---

## Quản lý Email và Thông báo

Hệ thống khởi chạy MailHog để giả lập một máy chủ SMTP local giúp bạn bắt và đọc tất cả email hệ thống gửi ra:
* **SMTP Host:** `mailhog` (trong Docker network) hoặc `localhost` (ngoài Docker)
* **SMTP Port:** `1025`
* **Giao diện Hòm thư (Web Inbox):** http://localhost:8025

Khi có đơn hàng thanh toán thành công hoặc scheduler quét lịch gửi nhắc nhở trước 24 giờ diễn ra concert, hệ thống sẽ đồng thời gửi thông báo qua app (lưu DB hiển thị trên Web) và gửi email qua MailHog. Bạn có thể kiểm tra danh sách hàng đợi xử lý thông báo và cơ chế Dead Letter Queue (DLQ) bằng công cụ quản lý RabbitMQ Management tại địa chỉ http://localhost:15672.

---

## Các tài liệu API và Script bổ trợ

* **Đặc tả API gốc:** [api-endpoints.md](file:///e:/just%20write%20some%20code/ticketbox-modular-monolith/docs/api/api-endpoints.md)
* **Postman Collection đầy đủ:** [TicketBox-FULL-Demo.postman_collection.json](file:///e:/just%20write%20some%20code/ticketbox-modular-monolith/docs/api/full%20API/TicketBox-FULL-Demo.postman_collection.json)
* **Hướng dẫn kiểm thử đồng thời (Concurrency):** [order-payment-concurrency-test-guide.md](file:///e:/just%20write%20some%20code/ticketbox-modular-monolith/docs/api/order-payment-concurrency-test-guide.md)
* **Script PowerShell chạy thử luồng API:** `scripts/test-api-flows.ps1`
* **Script Bash kiểm tra tải đặt hàng đồng thời:** `scripts/test-order-concurrency.sh`

---

## Chạy các dịch vụ độc lập (Không dùng Docker toàn bộ)

Nếu bạn muốn chạy backend và frontend trực tiếp trên máy của mình để phục vụ phát triển (hot reload, sửa code trực tiếp, debug dễ dàng), bạn chỉ cần chạy phần hạ tầng hỗ trợ (Database, Redis, RabbitMQ, MailHog) bằng Docker Compose:

```bash
docker compose up -d postgres redis rabbitmq mailhog
```

Sau đó, tiến hành khởi chạy các service:

* **Chạy Backend:**
  ```bash
  cd backend
  ./mvnw spring-boot:run
  ```
* **Chạy Frontend:**
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  *Giao diện Frontend đọc cấu hình biến `VITE_API_BASE_URL` trong file `.env` local để trỏ về API của backend tại `http://localhost:8080`.*

---

## Danh sách kiểm tra nghiệm thu (Verification Checklist)

Trước khi gửi Pull Request hoặc bàn giao code, hãy đảm bảo bạn đã kiểm tra qua các mục sau:
* [ ] Cả 2 phần Frontend và Backend đều chạy trơn tru (Web mở tại cổng 5173, Backend trả về trạng thái OK tại `/api/health`).
* [ ] Đăng nhập thành công với cả 4 vai trò tài khoản demo: Audience, Organizer, Staff và Admin.
* [ ] Khán giả có thể vào phòng chờ, xếp hàng tự động, vào trang chọn vé, đặt mua và xem vé đã thanh toán.
* [ ] Ban tổ chức (Organizer) và Admin truy cập được trang quản lý của mình; xem được lịch sử xử lý tệp Excel khách mời.
* [ ] Nhân viên (Staff) bị chặn truy cập vào trang Admin web nhưng có quyền gọi API soát vé.
* [ ] Luồng thanh toán (Mock/Sandbox) hoạt động chính xác; tạo được vé mới có mã QR và gửi email xác nhận.
* [ ] MailHog nhận được email xác nhận mua vé và email nhắc lịch trước 24 giờ.
* [ ] Các dịch vụ PostgreSQL, Redis, RabbitMQ hoạt động ổn định, dữ liệu không bị thất thoát khi có tải cao.

---

## Cấu trúc thư mục dự án

* `/backend`: Mã nguồn ứng dụng Spring Boot, tổ chức theo gói nghiệp vụ (package-by-domain).
* `/frontend`: Ứng dụng web React TypeScript Vite.
* `/mobile-scanner`: Ứng dụng soát vé React Native (Expo) dành cho nhân viên soát vé ngoại tuyến.
* `/blueprint`: Bản đề xuất, bản thiết kế kiến trúc và đặc tả nghiệp vụ dự án.
* `/docs`: Bản hợp đồng API, tài liệu làm việc nhóm và cẩm nang kiểm thử.
* `/scripts`: Các script tự động hóa hỗ trợ chạy thử luồng.

---

## Quy ước đặt tên Commit (Commit Convention)

Dự án áp dụng quy ước **Conventional Commits** để quản lý lịch sử git rõ ràng:

* `feat:` Tính năng mới cho người dùng.
* `fix:` Vá lỗi trong mã nguồn.
* `docs:` Thay đổi hoặc bổ sung tài liệu.
* `test:` Thêm hoặc sửa mã nguồn kiểm thử (unit/integration test).
* `chore:` Cập nhật thư viện, file cấu hình, tooling hỗ trợ.
