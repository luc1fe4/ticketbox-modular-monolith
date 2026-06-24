# TicketBox Mobile Scanner

Ứng dụng Expo React Native dành cho STAFF tại cổng sự kiện. App hỗ trợ tải dataset về SQLite, quét vé khi mất mạng và đồng bộ các lượt quét khi có mạng trở lại.

## Chuẩn bị

- Node.js LTS và npm.
- Backend TicketBox đang chạy, đã chạy Flyway migration để có dữ liệu demo.
- Expo Go trên điện thoại thật hoặc Android emulator.

Từ thư mục gốc repository, khởi động backend và các dịch vụ phụ trợ:

```bash
docker compose up --build
```

Kiểm tra backend tại `http://localhost:8080/api/health`.

## Cấu hình môi trường

Từ thư mục `mobile-scanner`, tạo file cấu hình local:

```powershell
Copy-Item .env.example .env
```

Các biến được hỗ trợ:

| Biến | Ý nghĩa | Mặc định |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL của backend, bao gồm `/api` | `http://localhost:8080/api` |
| `EXPO_PUBLIC_MAX_SYNC_BATCH_SIZE` | Số lượt check-in offline tối đa trong một lần sync | `500` |
| `EXPO_PUBLIC_SCAN_DUPLICATE_WINDOW_MS` | Khoảng thời gian bỏ qua cùng một QR được camera đọc liên tiếp | `3000` |

Chọn API URL theo thiết bị chạy app:

- Expo Web: `http://localhost:8080/api`.
- Android emulator: `http://10.0.2.2:8080/api`.
- Điện thoại thật: `http://<LAN_IP_CUA_MAY_TINH>:8080/api`; điện thoại và máy tính phải cùng mạng Wi-Fi.

Biến `EXPO_PUBLIC_*` được nhúng vào client, vì vậy không lưu secret, JWT hoặc mật khẩu thật trong các biến này. Sau khi sửa `.env`, dừng Expo và khởi động lại để nạp cấu hình mới.

## Cài đặt và chạy Expo Scanner

```bash
cd mobile-scanner
npm install
npm run start
```

Trong Expo CLI, nhấn `a` để mở Android hoặc `w` để mở Web. Có thể chạy trực tiếp bằng:

```bash
npm run android
npm run web
```

Camera QR nên được kiểm thử trên điện thoại thật. Trước khi đăng nhập, có thể mở `http://<LAN_IP_CUA_MAY_TINH>:8080/api/health` bằng trình duyệt điện thoại để xác nhận backend truy cập được.

## Tài khoản STAFF demo

Migration `V11__seed_staff_data.sql` tạo tài khoản:

```text
Email: staff@ticketbox.com
Mật khẩu: staff123
Concert test: STAFF Scanner Test Concert
Cổng gợi ý: A
```

Tài khoản này chỉ dùng cho môi trường phát triển có dữ liệu seed, không dùng ở production.

## Tải dataset

1. Đăng nhập bằng tài khoản STAFF demo khi thiết bị đang online.
2. Chọn `STAFF Scanner Test Concert`.
3. Tại tab **Tổng quan**, nhập `A` vào **Cổng đang làm việc**.
4. Bấm **Tải dataset** và đợi trạng thái chuyển sang **Sẵn sàng**. Dataset vé lúc này đã được lưu trong SQLite trên thiết bị.
5. Mở tab **Dữ liệu → Danh sách vé** để xác nhận vé local đã xuất hiện.

Để lấy đầy đủ QR `VALID_A` dùng cho test nhập tay, chạy từ thư mục gốc repository:

```bash
docker exec ticketbox-postgres psql -U ticketbox -d ticketbox -t -A -c "SELECT qr_code FROM tickets WHERE id = '10000000-0000-0000-0000-000000000401';"
```

Nếu đã đổi `POSTGRES_USER` hoặc `POSTGRES_DB` trong `.env` ở thư mục gốc, thay `ticketbox` trong lệnh bằng giá trị tương ứng.

Nếu backend có dữ liệu vé mới, bấm **Cập nhật dataset** khi online trước khi bắt đầu ca quét.

## Test offline

1. Hoàn tất bước tải dataset khi còn mạng.
2. Tắt Wi-Fi/mobile data hoặc ngắt mạng của emulator; chờ badge trong app chuyển sang **Offline**.
3. Mở tab **Quét vé**. Nếu test bằng chuỗi QR, chọn **Nhập tay**, dán QR `VALID_A` lấy bằng lệnh ở trên, rồi bấm **Lưu check-in offline**.
4. Kết quả hợp lệ phải hiển thị **Đã lưu offline** và bộ đếm **Chờ sync** tăng lên.
5. Quét lại cùng QR để kiểm tra app báo vé đã được quét local; thử một chuỗi bất kỳ để kiểm tra trường hợp vé không hợp lệ.

Không xóa dữ liệu app hoặc gỡ app trong lúc test, vì thao tác đó sẽ xóa dataset và log check-in local.

## Reconnect và đồng bộ

1. Bật lại mạng và chờ badge chuyển sang **Online**.
2. App tự động gọi sync khi phát hiện kết nối trở lại. Giữ app mở và đang chọn đúng concert cho đến khi hoàn tất.
3. Nếu cần chạy thủ công, vào **Tổng quan** và bấm **Đồng bộ ngay**.
4. Kiểm tra **Chờ sync** giảm về `0`; kết quả sync gần nhất hiển thị số `accepted`, `skipped` và `invalid`.
5. Mở **Dữ liệu → Lịch sử quét** và kéo xuống để refresh, sau đó đối chiếu trạng thái local/server.

`accepted` là lượt được server chấp nhận; `skipped` thường là xung đột như vé đã được thiết bị khác sử dụng; `invalid` là dữ liệu không được server chấp nhận. Các lượt lỗi vẫn được giữ trong lịch sử để kiểm tra.

## Kiểm tra TypeScript

```bash
npm run typecheck
```
