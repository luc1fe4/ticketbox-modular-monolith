# TicketBox Data Model / ERD

ERD tập trung vào các entity quan trọng của TicketBox: user/role, concert, ticket type, order, payment log, ticket, check-in log, guest list, notification và AI artist bio job.

## Data Store Decision

TicketBox dùng PostgreSQL làm nguồn dữ liệu chính vì luồng bán vé cần ACID transaction, foreign key, unique constraint và audit log. Redis được dùng cho cache, token bucket rate limiting, idempotency key, waiting room/queue state và lock ngắn hạn. SQLite được dùng trên mobile scanner để lưu dataset vé và pending check-in logs khi thiết bị mất mạng.

## ERD

```mermaid
erDiagram
    USERS ||--o{ CONCERTS : creates
    USERS ||--o{ ORDERS : places
    USERS ||--o{ TICKETS : owns
    USERS ||--o{ CHECKIN_LOGS : scans
    USERS ||--o{ NOTIFICATIONS : receives

    CONCERTS ||--o{ TICKET_TYPES : has
    CONCERTS ||--o{ ORDERS : receives
    CONCERTS ||--o{ TICKETS : issues
    CONCERTS ||--o{ CHECKIN_LOGS : records
    CONCERTS ||--o{ GUEST_LISTS : has
    CONCERTS ||--o{ ARTIST_PDF_JOBS : has
    CONCERTS ||--o{ TICKET_HOLDS : has

    TICKET_TYPES ||--o{ ORDER_ITEMS : sold_as
    TICKET_TYPES ||--o{ TICKETS : generates
    TICKET_TYPES ||--o{ TICKET_HOLDS : reserved_as

    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ PAYMENT_LOGS : audited_by
    ORDER_ITEMS ||--o{ TICKETS : creates

    TICKETS ||--o| CHECKIN_LOGS : checked_in_once

    BATCH_LOGS ||--o{ GUEST_LIST_STAGING : contains

    USERS {
        uuid id PK
        varchar email UK
        varchar phone
        varchar full_name
        varchar password_hash
        varchar role
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    CONCERTS {
        uuid id PK
        varchar title
        text description
        text artist_bio
        varchar venue_name
        text venue_address
        timestamptz event_date
        timestamptz sale_start_at
        timestamptz sale_end_at
        varchar status
        text seat_map_svg
        uuid created_by FK
    }

    TICKET_TYPES {
        uuid id PK
        uuid concert_id FK
        varchar name
        numeric price
        integer total_quantity
        integer available_qty
        integer max_per_account
        boolean is_active
    }

    TICKET_HOLDS {
        uuid id PK
        uuid user_id FK
        uuid concert_id FK
        uuid ticket_type_id FK
        integer quantity
        timestamptz expires_at
        varchar status
    }

    ORDERS {
        uuid id PK
        uuid user_id FK
        uuid concert_id FK
        varchar status
        numeric total_amount
        varchar idempotency_key
        varchar payment_provider
        varchar payment_ref
        text payment_url
        timestamptz paid_at
        timestamptz expires_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid ticket_type_id FK
        integer quantity
        numeric unit_price
        numeric subtotal
    }

    PAYMENT_LOGS {
        uuid id PK
        uuid order_id FK
        varchar provider
        varchar event_type
        varchar provider_ref
        jsonb raw_payload
        numeric amount
        timestamptz created_at
    }

    TICKETS {
        uuid id PK
        uuid order_item_id FK
        uuid ticket_type_id FK
        uuid concert_id FK
        uuid user_id FK
        varchar qr_code UK
        varchar qr_secret
        varchar status
        timestamptz issued_at
        timestamptz used_at
    }

    CHECKIN_LOGS {
        uuid id PK
        uuid ticket_id FK
        uuid concert_id FK
        uuid staff_id FK
        varchar device_id
        timestamptz checked_at
        timestamptz sync_at
        boolean is_offline
        varchar gate
        text notes
    }

    GUEST_LISTS {
        uuid id PK
        uuid concert_id FK
        varchar phone
        varchar full_name
        varchar category
        varchar sponsor_name
        text notes
        boolean is_active
        timestamptz imported_at
        varchar batch_file
    }

    BATCH_LOGS {
        uuid id PK
        varchar job_name
        varchar file_name
        timestamptz started_at
        timestamptz completed_at
        varchar status
        integer total_rows
        integer success_rows
        integer error_rows
        text error_detail
    }

    GUEST_LIST_STAGING {
        uuid id PK
        uuid batch_log_id FK
        integer row_number
        text raw_payload
        text error_detail
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar channel
        varchar event_type
        varchar subject
        text body
        varchar status
        timestamptz sent_at
        integer attempts
        text last_error
    }

    ARTIST_PDF_JOBS {
        uuid id PK
        uuid concert_id FK
        varchar file_url
        varchar status
        text result_bio
        timestamptz started_at
        timestamptz completed_at
        text error_message
    }
```

## Ràng Buộc Quan Trọng

| Ràng buộc | Mục đích |
|---|---|
| `users.email` unique | Không cho đăng ký trùng email |
| `ticket_types.available_qty >= 0` | Chống tồn kho âm |
| `orders(user_id, idempotency_key)` unique | Chống tạo order trùng do retry |
| `payment_logs(order_id, event_type)` unique | Chống xử lý trùng callback success/failure |
| `tickets.qr_code` unique | Mỗi e-ticket có QR riêng |
| `checkin_logs.ticket_id` unique | Một ticket chỉ được check-in một lần |
| `guest_lists(concert_id, phone)` unique | Một khách mời không bị nhập trùng trong cùng concert |
| `ticket_holds(user_id, concert_id, ticket_type_id)` unique | Một user chỉ có một hold active theo concert/ticket type |

## Ghi Chú Thiết Kế

- `ticket_types.available_qty` được lưu sẵn để phục vụ inventory hot path; không tính lại bằng cách scan order mỗi request.
- `order_items.unit_price` và `subtotal` là snapshot tại thời điểm mua để giữ đúng lịch sử giá.
- `payment_logs.raw_payload` phục vụ audit/reconcile khi payment gateway gửi callback bất thường.
- `checkin_logs` là trạng thái server cuối cùng; SQLite trên mobile chỉ là bộ đệm offline.
- `guest_lists` được upsert từ CSV theo `(concert_id, phone)`, còn `batch_logs` và `guest_list_staging` lưu bằng chứng import.
- `artist_pdf_jobs` tách trạng thái xử lý AI khỏi bảng `concerts`; chỉ khi organizer apply kết quả thì `concerts.artist_bio` mới đổi.
