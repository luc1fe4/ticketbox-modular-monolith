```
4.2 Database Schema
Bảng users
sqlCREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    full_name   VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'AUDIENCE',
                -- AUDIENCE | ORGANIZER | STAFF
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);
Ghi chú: Role lưu thẳng vào bảng users vì hệ thống chỉ có 3 role cố định. Nếu
sau này cần fine-grained permission (VD: organizer A chỉ quản lý event A) thì
thêm bảng user_event_permissions.
```

```
Bảng concerts
sqlCREATE TABLE concerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    artist_bio      TEXT,           -- AI-generated, nullable
    venue_name      VARCHAR(500) NOT NULL,
    venue_address   TEXT NOT NULL,
    event_date      TIMESTAMPTZ NOT NULL,
    doors_open_at   TIMESTAMPTZ,
    sale_start_at   TIMESTAMPTZ NOT NULL,
    sale_end_at     TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                    -- DRAFT | ON_SALE | SOLD_OUT | CANCELLED | COMPLETED
    seat_map_svg    TEXT,           -- SVG content của sơ đồ chỗ ngồi
    poster_url      VARCHAR(500),
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```
CREATE INDEX idx_concerts_status     ON concerts(status);
CREATE INDEX idx_concerts_event_date ON concerts(event_date);
CREATE INDEX idx_concerts_created_by ON concerts(created_by);
Bảng ticket_types
sqlCREATE TABLE ticket_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concert_id      UUID NOT NULL REFERENCES concerts(id) ON DELETE RESTRICT,
    name            VARCHAR(100) NOT NULL,
                    -- GA, VIP, SVIP, CAT1, CAT2
    price           NUMERIC(12, 0) NOT NULL,  -- VND, không có decimal
    total_quantity  INTEGER NOT NULL CHECK (total_quantity > 0),
    available_qty   INTEGER NOT NULL CHECK (available_qty >= 0),
    max_per_account INTEGER NOT NULL DEFAULT 4,
    zone_color      VARCHAR(7),     -- hex color cho SVG map, VD: #FF5733
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

```
    CONSTRAINT chk_available_lte_total CHECK (available_qty <= total_quantity),
    CONSTRAINT chk_price_positive CHECK (price >= 0)
```

```
);
```

```
CREATE INDEX idx_ticket_types_concert ON ticket_types(concert_id);
```

```
-- Đây là cột bị lock khi mua vé:
-- SELECT * FROM ticket_types WHERE id = ? FOR UPDATE
-- Lock chỉ row này, không ảnh hưởng concert khác
Tại sao lưu available_qty thay vì tính từ orders:
Cách tính total - COUNT(orders) yêu cầu full scan hoặc index scan mỗi lần kiểm
tra, rất chậm dưới tải cao. Lưu sẵn available_qty và DECREMENT khi bán — đây là
pattern chuẩn cho hệ thống inventory.
```

```
Bảng orders
sqlCREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    concert_id          UUID NOT NULL REFERENCES concerts(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                        -- PENDING | AWAITING_PAYMENT | PAID | CANCELLED |
REFUNDED
    total_amount        NUMERIC(12, 0) NOT NULL,
    idempotency_key     VARCHAR(255) UNIQUE,    -- client-generated, lưu để
check
    payment_provider    VARCHAR(20),            -- VNPAY | MOMO
    payment_ref         VARCHAR(255),           -- transaction ID từ gateway
    payment_url         TEXT,                   -- URL redirect cho user
    paid_at             TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,            -- order tự hủy nếu quá giờ này
chưa thanh toán
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```
CREATE INDEX idx_orders_user_id    ON orders(user_id);
CREATE INDEX idx_orders_concert_id ON orders(concert_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_idempotency ON orders(idempotency_key);
CREATE INDEX idx_orders_expires    ON orders(expires_at) WHERE status =
'AWAITING_PAYMENT';
```

```
Bảng order_items
sqlCREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id  UUID NOT NULL REFERENCES ticket_types(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12, 0) NOT NULL,  -- snapshot giá tại thời điểm mua
    subtotal        NUMERIC(12, 0) NOT NULL
);
CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_type    ON order_items(ticket_type_id);
Tại sao snapshot giá vào unit_price:
Giá vé có thể thay đổi (ban tổ chức chỉnh sửa). Nếu join sang
ticket_types.price, đơn hàng cũ sẽ hiển thị giá sai. Lưu snapshot là chuẩn trong
e-commerce.
```

```
Bảng tickets (e-ticket)
sqlCREATE TABLE tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id   UUID NOT NULL REFERENCES order_items(id),
    ticket_type_id  UUID NOT NULL REFERENCES ticket_types(id),
    concert_id      UUID NOT NULL REFERENCES concerts(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    qr_code         VARCHAR(500) NOT NULL UNIQUE,
```

```
                    -- JWT signed: {ticket_id, concert_id, issued_at}
    qr_secret       VARCHAR(255) NOT NULL,  -- secret dùng để verify JWT
    status          VARCHAR(20) NOT NULL DEFAULT 'VALID',
                    -- VALID | USED | CANCELLED | TRANSFERRED
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at         TIMESTAMPTZ,            -- set khi check-in thành công
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tickets_user_id    ON tickets(user_id);
CREATE INDEX idx_tickets_concert_id ON tickets(concert_id);
CREATE INDEX idx_tickets_qr_code    ON tickets(qr_code);
CREATE INDEX idx_tickets_status     ON tickets(status);
Thiết kế QR code:
QR code là JWT có chữ ký: JWT(payload={ticket_id, concert_id, iat},
secret=qr_secret). Khi quét:
```

```
Mobile app verify signature (có thể offline nếu biết public key)
Kiểm tra ticket_id trong danh sách đã tải về
Khi sync online: server check lại trong DB
```

```
Bảng checkin_logs
sqlCREATE TABLE checkin_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id),
    concert_id      UUID NOT NULL REFERENCES concerts(id),
    staff_id        UUID REFERENCES users(id),
    device_id       VARCHAR(255),   -- mobile device ID
    checked_at      TIMESTAMPTZ NOT NULL,
    sync_at         TIMESTAMPTZ,    -- khi nào được sync lên server
    is_offline      BOOLEAN NOT NULL DEFAULT FALSE,
    gate            VARCHAR(50),    -- cổng nào (A, B, VIP gate)
    notes           TEXT,           -- ghi chú thêm nếu có conflict
    CONSTRAINT uq_ticket_checkin UNIQUE (ticket_id)
    -- Một ticket chỉ được check-in 1 lần
    -- Đây là constraint chống double check-in quan trọng nhất
);
```

```
CREATE INDEX idx_checkin_concert ON checkin_logs(concert_id);
CREATE INDEX idx_checkin_staff   ON checkin_logs(staff_id);
Bảng payment_logs
sqlCREATE TABLE payment_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id),
    provider        VARCHAR(20) NOT NULL,   -- VNPAY | MOMO
    event_type      VARCHAR(50) NOT NULL,
                    -- INITIATED | WEBHOOK_RECEIVED | SUCCESS | FAILED | TIMEOUT
    provider_ref    VARCHAR(255),
    raw_payload     JSONB,          -- raw webhook payload lưu để debug
    amount          NUMERIC(12, 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```
CREATE INDEX idx_payment_logs_order ON payment_logs(order_id);
Lý do lưu raw webhook: Khi VNPAY/MoMo trừ tiền nhưng hệ thống không nhận được
webhook, cần raw log để reconcile thủ công. Đây là yêu cầu thực tế của mọi hệ
thống thanh toán.
```

```
Bảng guest_lists
sqlCREATE TABLE guest_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
```

```
    concert_id      UUID NOT NULL REFERENCES concerts(id),
    phone           VARCHAR(20) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    category        VARCHAR(100),       -- loại khách: Sponsor A, Press, VIP
Guest
    sponsor_name    VARCHAR(255),       -- tên nhãn hàng
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    batch_file      VARCHAR(255),       -- tên file CSV nguồn
```

```
    CONSTRAINT uq_guest_concert_phone UNIQUE (concert_id, phone)
    -- Dùng cho ON CONFLICT DO UPDATE khi import CSV
);
```

```
CREATE INDEX idx_guest_concert  ON guest_lists(concert_id);
CREATE INDEX idx_guest_phone    ON guest_lists(phone);
```

```
Bảng batch_logs
sqlCREATE TABLE batch_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name        VARCHAR(100) NOT NULL,  -- 'GUEST_LIST_IMPORT'
    file_name       VARCHAR(255),
    started_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL,   -- RUNNING | SUCCESS | PARTIAL |
FAILED
    total_rows      INTEGER DEFAULT 0,
    success_rows    INTEGER DEFAULT 0,
    error_rows      INTEGER DEFAULT 0,
    error_detail    TEXT                    -- tóm tắt lỗi
);
```

```
Bảng notifications
sqlCREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    channel         VARCHAR(20) NOT NULL,   -- EMAIL | ZALO | SMS | APP
    event_type      VARCHAR(50) NOT NULL,
                    -- TICKET_PURCHASED | CONCERT_REMINDER | CONCERT_CANCELLED
    subject         VARCHAR(500),
    body            TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    -- PENDING | SENT | FAILED | SKIPPED
    sent_at         TIMESTAMPTZ,
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

```
CREATE INDEX idx_notif_user    ON notifications(user_id);
CREATE INDEX idx_notif_status  ON notifications(status) WHERE status =
'PENDING';
```

```
Bảng artist_pdf_jobs
sqlCREATE TABLE artist_pdf_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concert_id      UUID NOT NULL REFERENCES concerts(id),
    file_url        VARCHAR(500) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    -- PENDING | PROCESSING | DONE | FAILED
    result_bio      TEXT,           -- kết quả từ AI
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
```

```
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

```
);
```

```
4.3 Indexing Strategy
Nguyên tắc: Index theo query pattern, không index tất cả.
Query phổ biến nhất và index tương ứng:
sql-- 1. Trang chủ: danh sách concert sắp diễn ra
SELECT * FROM concerts WHERE status = 'ON_SALE' ORDER BY event_date ASC;
→ Index: (status, event_date)
CREATE INDEX idx_concerts_status_date ON concerts(status, event_date);
```

```
-- 2. Kiểm tra giới hạn vé per user (chạy mỗi lần mua)
SELECT SUM(oi.quantity) FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.user_id = ? AND oi.ticket_type_id = ? AND o.status = 'PAID';
→ Index: (user_id, status) trên orders; (order_id, ticket_type_id) trên
order_items
```

```
-- 3. Soát vé: tìm ticket theo QR
SELECT * FROM tickets WHERE qr_code = ?;
→ Index: UNIQUE trên qr_code (đã có)
```

```
-- 4. Thống kê doanh thu theo concert
SELECT SUM(total_amount) FROM orders WHERE concert_id = ? AND status = 'PAID';
→ Index: (concert_id, status) trên orders
CREATE INDEX idx_orders_concert_status ON orders(concert_id, status);
```

