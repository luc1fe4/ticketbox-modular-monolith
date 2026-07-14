# Đặc tả: Waiting Room & Rate Limiting (Kiểm soát tải đột biến)

> Khung tài liệu — điền nội dung vào các phần `<!-- ... -->`.
> Mục này phục vụ yêu cầu BP10: bảo vệ backend khi ~80.000 người truy cập trong 5 phút đầu mở bán (70% dồn vào phút đầu).

## 1. Mô tả
<!-- Tính năng này làm gì? Waiting-room điều tiết luồng người mua vào hệ thống,
     rate limiting bảo vệ API khỏi bot/spam. Nêu rõ mục tiêu công bằng giữa khán giả thật. -->

---

## 2. Luồng chính
### A. Waiting Room (phòng chờ)
<!-- Các bước: Lobby -> Waiting Room -> Queue -> Zone Selection -> Reservation -> Payment.
     - Người dùng vào phòng chờ khi mở bán, nhận vị trí queue (random/snapshot).
     - Giới hạn số người được vào mua đồng thời (VD: 1000 người).
     - Cơ chế cấp "lượt vào mua" (token/slot) và thời gian giữ slot.
     - Thành phần tham gia: Frontend, Backend API, Redis, WebSocket (cập nhật vị trí). -->

### B. Rate Limiting
<!-- Thuật toán: Token Bucket (Redis Lua script).
     - Áp dụng cho endpoint nào: POST /api/orders, /api/payments/**.
     - Key limit theo gì: IP + userId. -->

---

## 3. Kịch bản lỗi
<!-- - Vượt ngưỡng rate limit -> HTTP 429 Too Many Requests.
     - Redis down -> hành vi fail-open hay fail-closed? Giải thích lựa chọn.
     - Người dùng rời phòng chờ / hết hạn slot -> xử lý ra sao. -->

---

## 4. Ràng buộc
### Ngưỡng cụ thể (bắt buộc điền số)
<!-- - Token Bucket: capacity = ? token/user, refill rate = ? token/giây.
     - Số người được vào mua đồng thời: ? người.
     - Thời gian giữ slot mua: ? giây/phút.
     - Map với con số 80.000/5 phút: giải thích ngưỡng đủ để hệ thống không sập. -->

### Hiệu năng
<!-- Rate limiter phải chạy < ? ms/request để không thành bottleneck. -->

---

## 5. Tiêu chí chấp nhận
<!-- 1. Khi vượt ngưỡng, request thừa nhận HTTP 429, không làm sập backend.
     2. Số người vào mua đồng thời không vượt giới hạn cấu hình.
     3. Thứ tự phòng chờ công bằng, không ưu tiên bot gửi request liên tục.
     4. Redis down xử lý theo đúng chính sách đã nêu (fail-open/closed). -->
