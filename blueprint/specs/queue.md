# Đặc tả: Waiting Room & Rate Limiting (Kiểm soát tải đột biến)

Tài liệu này đặc tả cơ chế kiểm soát tải đột biến và giới hạn tần suất yêu cầu (Rate Limiting) nhằm bảo vệ Backend và Database của hệ thống TicketBox dưới áp lực tải cao (ví dụ: đợt mở bán concert lớn với ~80.000 người truy cập trong 5 phút đầu, trong đó 70% tập trung ở phút đầu tiên).

---

## 1. Mô tả
* **Waiting Room (Phòng chờ):** Điều tiết luồng người dùng đi vào trang chọn vé theo từng đợt (admit). Tránh tình trạng hàng chục nghìn người cùng lúc truy cập sơ đồ SVG và gửi yêu cầu giữ vé, giúp cô lập tải trọng và bảo vệ tài nguyên Database.
* **Rate Limiting (Giới hạn tần suất):** Lớp bảo vệ API cấp thấp tại tầng Redis, ngăn chặn bot, kịch bản spam F5, hoặc các cuộc tấn công DDoS trực tiếp vào các endpoint nhạy cảm như tạo đơn hàng và thanh toán.
* **Mục tiêu:** Đảm bảo tính công bằng giữa khán giả thực tế (người xếp hàng trước/đúng giờ được ưu tiên ngẫu nhiên) và duy trì sự ổn định tuyệt đối của hệ thống (hệ thống không sập khi quá tải).

---

## 2. Luồng chính

### A. Waiting Room (Phòng chờ)
1. **Trước giờ mở bán (1 tiếng):** Người dùng có thể truy cập trang chi tiết concert và tham gia Waiting Room (Lobby). Trạng thái của toàn bộ người dùng lúc này là ngang nhau, chưa có thứ tự xếp hàng cụ thể.
2. **Đến giờ mở bán (`sale_start_at`):** Hệ thống chụp snapshot danh sách session hiện tại trong phòng chờ, xáo trộn ngẫu nhiên (randomize) vị trí xếp hàng (Queue Position) và lưu vào Redis. Những người vào sau thời điểm này sẽ được xếp nối tiếp vào cuối hàng chờ (không xáo lại).
3. **Cấp lượt vào mua (Admit):** Hệ thống chỉ cho phép một lượng người dùng nhất định (ví dụ: tối đa `1.000 người` cùng lúc) chuyển sang trạng thái `ADMITTED` để vào trang chọn vé và mua vé.
4. **Mua vé & Hết hạn:** Người được duyệt vào có thời gian shopping session là **10 phút**. Khi một người hoàn tất mua vé hoặc hết hạn session, hệ thống sẽ tự động giải phóng vị trí đó và duyệt người tiếp theo từ hàng chờ vào.
5. **Giao tiếp thời gian thực:** Trạng thái vị trí xếp hàng được cập nhật liên tục tới trình duyệt của người dùng thông qua kết nối **WebSocket (STOMP over SockJS)**, loại bỏ việc reload trang hoặc polling liên tục lên server.

#### Sơ đồ luồng hoạt động Waiting Room
```mermaid
sequenceDiagram
    autonumber
    actor User as Khán giả (Browser)
    participant Server as Backend API (Spring Boot)
    database Redis as Cache/Queue (Redis)
    database DB as Transactional DB (PostgreSQL)

    Note over User, Server: 1. Giai đoạn chuẩn bị mở bán (Lobby)
    User->>Server: HTTP GET /api/concerts/{id} (Vào trang chi tiết)
    Server->>Redis: Đọc trạng thái mở bán & thông tin cache
    Redis-->>Server: Trả về dữ liệu
    Server-->>User: Hiển thị đếm ngược (Chưa mở bán)

    Note over User, Server: 2. Đến giờ mở bán (Xáo trộn Queue)
    Server->>Server: Kích hoạt sự kiện sale_start_at
    Server->>Redis: Chụp snapshot danh sách User đang ở Lobby
    Server->>Redis: Xáo ngẫu nhiên vị trí & gán Queue Position

    Note over User, Server: 3. Xếp hàng & Nhận trạng thái
    User->>Server: Kết nối STOMP WebSocket
    Server->>Redis: Đọc Queue Position của User
    Redis-->>Server: Trả về vị trí hiện tại (Vị trí #N)
    Server-->>User: Gửi vị trí xếp hàng qua WebSocket (N người phía trước)

    Note over User, Server: 4. Được duyệt vào mua vé (Admit)
    Server->>Redis: Kiểm tra số session đang hoạt động (Active Sessions < 1000)
    Redis-->>Server: Có slot trống
    Server->>Redis: Cấp quyền ADMITTED & cấp token session (Hạn 10 phút)
    Server-->>User: Gửi lệnh redirect qua WebSocket (Được phép vào mua)

    Note over User, Server: 5. Chọn vé & Đặt giữ chỗ
    User->>Server: HTTP POST /api/orders/reserve (Chọn khu vé x Số lượng)
    Server->>DB: Trừ tồn kho & Tạo order giữ vé tạm thời (Hạn 5 phút)
    Server-->>User: Chuyển hướng sang trang thanh toán
```

### B. Rate Limiting (Giới hạn tần suất)
* **Thuật toán sử dụng:** **Smooth-refill Token Bucket** chạy bằng **Redis Lua script** nguyên tử (atomic). Lượng token được tự động nạp lại dựa trên khoảng thời gian thực tế trôi qua giữa 2 yêu cầu, tránh hiện tượng reset cứng của phương pháp fixed window.
* **Phạm vi áp dụng:** Bộ lọc `PurchasePaymentRateLimitInterceptor` chặn tại các yêu cầu `POST`:
  * Tạo đơn hàng: `/api/orders`
  * Thanh toán đơn hàng: `/api/payments/**` và `/api/mock-payments/**`
* **Key giới hạn:**
  * **Người dùng đã đăng nhập:** `rate_limit:user:<userId>:<bucket_name>`
  * **Khách chưa nhận dạng (chưa đăng nhập):** `rate_limit:ip:<ip_address>:<bucket_name>`

#### Sơ đồ luồng xử lý Rate Limiting
```mermaid
flowchart TD
    Start([Client gửi Request POST]) --> Interceptor{Rate Limit Interceptor}
    Interceptor -->|Kiểm tra URL| CheckURL{Cần giới hạn?}
    
    CheckURL -->|No| Allow([Cho phép qua: Vào xử lý nghiệp vụ])
    CheckURL -->|Yes| ResolveKey[Xác định Key giới hạn]
    
    ResolveKey --> IsAuth{Đã đăng nhập?}
    IsAuth -->|Yes| KeyUser[Key: rate_limit:user:userId:bucket]
    IsAuth -->|No| KeyIP[Key: rate_limit:ip:IPAddress:bucket]
    
    KeyUser --> LuaScript[Gọi Redis Lua Script: tryConsume]
    KeyIP --> LuaScript
    
    LuaScript --> RedisCheck{Redis kết nối tốt?}
    
    RedisCheck -->|No (Error)| FailOpen[Ghi log cảnh báo & Fail-Open]
    FailOpen --> Allow
    
    RedisCheck -->|Yes| TokenCheck{Xô còn xu không?}
    
    TokenCheck -->|Yes| Deduct[Trừ 1 xu & Cập nhật Redis]
    Deduct --> Allow
    
    TokenCheck -->|No| Reject[Từ chối Request: Trả về HTTP 429]
    Reject --> ErrorPage([Lỗi: RATE_LIMIT_EXCEEDED])
```

#### Nguyên lý hoạt động chi tiết của thuật toán Token Bucket
Thuật toán **Token Bucket (Thùng chứa token)** hoạt động dựa trên mô hình một chiếc xô chứa các quyền thực thi (gọi là token/đồng xu). Cơ chế hoạt động bao gồm các khái niệm cốt lõi sau:

1. **Token (Đồng xu):** Mỗi token đại diện cho 1 quyền được đi qua bộ lọc để xử lý nghiệp vụ (như tạo order, gọi thanh toán). Mỗi request thành công sẽ tiêu thụ đúng **1 token**.
2. **Bucket (Chiếc xô):** Mỗi khóa định danh (`User ID` hoặc `IP`) sở hữu một chiếc xô riêng biệt lưu trữ trên Redis. Xô có giới hạn sức chứa tối đa là **Capacity** (ví dụ: xô mua vé chứa tối đa 5 token).
3. **Smooth Refill (Nạp mịn theo thời gian):** Thay vì nạp lại toàn bộ token cố định sau một khoảng thời gian (dễ gây nghẽn cục bộ ở đầu chu kỳ mới), hệ thống tính toán lượng token nạp thêm một cách liên tục dựa trên khoảng thời gian trôi qua giữa hai request liên tiếp ($\Delta t$):
   $$\Delta t = t_{now} - t_{last\_refill}$$
   $$\text{Lượng token nạp thêm} = \Delta t \times \frac{\text{Refill Tokens}}{\text{Refill Period}}$$
   $$\text{Số token hiện tại} = \min\left(\text{Capacity}, \text{Số token cũ} + \text{Lượng token nạp thêm}\right)$$
4. **Xử lý yêu cầu (Consume):**
   * **Nếu Số token hiện tại $\ge 1$:** Yêu cầu được chấp nhận, số token giảm đi 1, lưu lại thời điểm giao dịch (`last_refill_ms`) và cho phép request đi tiếp.
   * **Nếu Số token hiện tại $< 1$:** Yêu cầu bị chặn ngay lập tức và ném lỗi `HTTP 429`.

#### Tính nguyên tử (Atomic) bằng Redis Lua Script
Khi hàng nghìn request gửi lên đồng thời trong cùng một mili-giây, nếu sử dụng code Java thông thường để đọc số token từ Redis, tính toán rồi ghi ngược lại, sẽ rất dễ xảy ra lỗi **Race Condition** (hai luồng cùng đọc được xô còn 1 xu và cùng cho phép đi qua, dẫn đến việc tiêu thụ quá số lượng cho phép).

Để giải quyết triệt để vấn đề này, toàn bộ logic tính toán nạp/trừ token được viết bằng **Lua Script** và đẩy xuống thực thi trực tiếp trên RAM của Redis.
* Redis đảm bảo thực thi Lua Script dưới dạng **đơn luồng (single-threaded)** và **nguyên tử (atomic)**.
* Không một lệnh nào khác của client khác có thể xen vào giữa quá trình tính toán và cập nhật xô xu của cùng một user. Điều này đảm bảo tính chính xác tuyệt đối ngay cả dưới tải cực kỳ lớn.

---

## 3. Kịch bản lỗi
* **Vượt ngưỡng giới hạn (Rate Limit Exceeded):** Hệ thống lập tiếp từ chối yêu cầu và trả về lỗi `HTTP 429 Too Many Requests` với mã lỗi `RATE_LIMIT_EXCEEDED` và thông báo `"Too many requests. Please retry later."`.
* **Redis ngoại tuyến (Redis Down):**
  * **Đối với Rate Limiting:** Áp dụng cơ chế **Fail-Open**. Nếu kết nối Redis bị lỗi, hệ thống ghi log cảnh báo và cho phép yêu cầu đi qua để tránh làm sập toàn bộ dịch vụ mua vé.
  * **Đối với Waiting Room/Queue:** Áp dụng cơ chế **Fail-Closed**. Do luồng xếp hàng và giữ chỗ phụ thuộc hoàn toàn vào Redis để chống oversell, nếu Redis sập, hệ thống sẽ dừng cho phép mua vé mới để bảo vệ toàn vẹn dữ liệu trong PostgreSQL.
* **Hết hạn slot / Người dùng rời đi:** Nếu shopping session 10 phút hết hạn mà chưa thanh toán thành công, vé đang giữ sẽ bị thu hồi trả về kho, slot mua được chuyển cho người tiếp theo trong hàng đợi.

---

## 4. Ràng buộc

### Ngưỡng cụ thể (Cấu hình trong `application.yml`)
1. **Luồng mua vé (Purchase Rate Limit):**
   * **Capacity (Sức chứa):** 5 tokens.
   * **Refill Rate (Tốc độ nạp):** 1 token mỗi 2 giây (`refill-period: 2s`).
   * *Ý nghĩa:* Cho phép burst tối đa 5 yêu cầu liên tục, sau đó giới hạn tối đa 1 yêu cầu mỗi 2 giây cho một User/IP.
2. **Luồng thanh toán (Payment Rate Limit):**
   * **Capacity (Sức chứa):** 3 tokens.
   * **Refill Rate (Tốc độ nạp):** 1 token mỗi 5 giây (`refill-period: 5s`).
   * *Ý nghĩa:* Hạn chế tối đa việc spam nút thanh toán, chỉ cho phép thực hiện giao dịch mới sau mỗi 5 giây.
3. **Waiting Room Join / Status Limits:**
   * **Join Limit:** Tối đa 20 token, nạp lại 10 token mỗi 10 giây.
   * **Status Check Limit:** Tối đa 60 token, nạp lại 30 token mỗi 10 giây.
4. **Giới hạn mua đồng thời:** Mặc định cho phép tối đa 1.000 người vào phiên mua vé cùng lúc.
5. **Thời gian giữ slot mua:** 10 phút.

### Sức chịu tải thực tế (Đối phó với 80.000 người/5 phút)
* **Phút đầu tiên dồn 70% tải (~56.000 người):**
  * Hầu hết 56.000 người dùng này sẽ được giữ lại ở tầng phòng chờ (Waiting Room) thông qua WebSocket. Tải kết nối được duy trì ở mức nhẹ vì WebSocket không tạo truy vấn Database.
  * Chỉ tối đa 1.000 người dùng được phép truy cập API mua vé và DB.
  * Nếu có bot hoặc attacker cố tình bỏ qua giao diện web để gửi yêu cầu trực tiếp đến API `/api/orders` với tần suất cực cao (ví dụ: 100 request/giây): Hệ thống sẽ chặn đứng 95% số request đó tại tầng Redis thông qua Token Bucket Rate Limiter.
* **Hiệu năng xử lý:** 
  * Do thuật toán Token Bucket được viết bằng Lua script chạy trực tiếp trên RAM của Redis, tốc độ phản hồi cực nhanh (trung bình **< 1.5ms** mỗi lượt kiểm tra).
  * Bộ lọc Rate Limiter nằm trên bộ nhớ đệm, hoàn toàn không đụng đến PostgreSQL DB, đảm bảo CPU của API Server và Database không bị quá tải.

---

## 5. Tiêu chí chấp nhận
1. Khi lượng truy cập vượt ngưỡng rate limit, toàn bộ request thừa bị từ chối bằng lỗi `HTTP 429` mà không gây ảnh hưởng đến hiệu năng của các request hợp lệ khác.
2. Số lượng tài khoản thực hiện chọn vé trong cùng một thời điểm không được vượt quá số cấu hình của Waiting Room (1.000 người).
3. Vị trí trong hàng chờ của người dùng ở Waiting Room trước giờ mở bán phải được xáo trộn ngẫu nhiên để chống lại bot tự động truy cập sớm.
4. Trường hợp xảy ra lỗi Redis, hệ thống ngắt kích hoạt rate limit (fail-open) và ghi nhận cảnh báo vận hành để đảm bảo hệ thống không bị ngừng hoạt động hoàn toàn.
