# TicketBox API Endpoints

This document is the working API contract for TicketBox. It is intended for backend and frontend team coordination. Endpoint details can still change during implementation, but changes should be updated here before frontend integration.

## Conventions

Base URL:

```text
http://localhost:8080/api
```

Authentication:

```text
Authorization: Bearer <jwt>
```

Common roles:

```text
PUBLIC      No login required
AUDIENCE    Normal customer
ORGANIZER   Concert organizer/admin user
STAFF       Gate check-in staff
ADMIN       System admin, if separated from organizer
```

Common response shape:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "errors": null
}
```

Common error shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email"
    }
  ]
}
```

Pagination query convention:

```text
?page=0&size=20&sort=eventDate,asc
```

## Health

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/health` | PUBLIC | Simple application health check. |
| GET | `/actuator/health` | PUBLIC/OPS | Spring Actuator health check if exposed. |

## Auth

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | PUBLIC | Register an audience account. |
| POST | `/auth/login` | PUBLIC | Login with email/password and receive JWT. |
| POST | `/auth/refresh` | PUBLIC | Refresh access token if refresh token is implemented. |
| POST | `/auth/logout` | AUTHENTICATED | Logout current session/client. For stateless JWT this can be client-side only unless token blacklist is implemented. |
| GET | `/auth/me` | AUTHENTICATED | Get current authenticated user profile and role. |

Example login request:

```json
{
  "email": "audience@example.com",
  "password": "password"
}
```

Example login response data:

```json
{
  "accessToken": "jwt-token",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "audience@example.com",
    "fullName": "Audience User",
    "role": "AUDIENCE"
  }
}
```

## Users

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/users/me` | AUTHENTICATED | Get current user profile. |
| PATCH | `/users/me` | AUTHENTICATED | Update current user profile. |
| PATCH | `/users/me/password` | AUTHENTICATED | Change current user password. |
| GET | `/admin/users` | ADMIN | List users with filters. |
| GET | `/admin/users/{userId}` | ADMIN | Get user detail. |
| PATCH | `/admin/users/{userId}/status` | ADMIN | Activate or deactivate user. |
| PATCH | `/admin/users/{userId}/role` | ADMIN | Change user role. |

## Public Concerts

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/concerts` | PUBLIC | List published/upcoming concerts. Supports pagination and filters. |
| GET | `/concerts/{concertId}` | PUBLIC | Get concert detail including ticket types and seat map SVG. |
| GET | `/concerts/{concertId}/ticket-types` | PUBLIC | Get ticket types/zones for a concert. |
| GET | `/concerts/{concertId}/availability` | PUBLIC | Get near real-time available quantity by ticket type. Can be backed by Redis cache. |

Suggested concert list filters:

```text
GET /api/concerts?status=ON_SALE&keyword=say%20hi&page=0&size=20
```

Example availability response data:

```json
{
  "concertId": "uuid",
  "items": [
    {
      "ticketTypeId": "uuid",
      "name": "SVIP",
      "availableQty": 120,
      "totalQuantity": 200
    }
  ],
  "refreshedAt": "2026-06-04T10:00:00Z"
}
```

## Organizer Concert Management

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/admin/concerts` | ORGANIZER/ADMIN | List concerts for admin screen. |
| POST | `/admin/concerts` | ORGANIZER/ADMIN | Create a concert. |
| GET | `/admin/concerts/{concertId}` | ORGANIZER/ADMIN | Get concert detail for editing. |
| PUT | `/admin/concerts/{concertId}` | ORGANIZER/ADMIN | Update concert information. |
| PATCH | `/admin/concerts/{concertId}/status` | ORGANIZER/ADMIN | Change concert status: draft, on sale, cancelled, completed. |
| DELETE | `/admin/concerts/{concertId}` | ORGANIZER/ADMIN | Delete draft concert if no sales exist. Prefer status cancel for published concerts. |

## Ticket Type Management

Ticket type means zone or category, for example `SVIP`, `VIP`, `CAT1`, `CAT2`, `GA`.

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/admin/concerts/{concertId}/ticket-types` | ORGANIZER/ADMIN | Create ticket type/zone. |
| PUT | `/admin/ticket-types/{ticketTypeId}` | ORGANIZER/ADMIN | Update ticket type metadata before sales. |
| PATCH | `/admin/ticket-types/{ticketTypeId}/status` | ORGANIZER/ADMIN | Activate/deactivate ticket type. |
| DELETE | `/admin/ticket-types/{ticketTypeId}` | ORGANIZER/ADMIN | Delete ticket type if no order references exist. |

Example create ticket type request:

```json
{
  "name": "SVIP",
  "price": 3500000,
  "totalQuantity": 200,
  "maxPerAccount": 2,
  "saleStartAt": "2026-07-01T12:00:00Z",
  "saleEndAt": "2026-08-01T16:59:59Z",
  "zoneColor": "#E11D48",
  "isActive": true
}
```

## Orders And Purchase

The MVP does not use a separate `reservations` table. An order with status `AWAITING_PAYMENT` and `expiresAt` is the temporary ticket hold.

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/orders` | AUDIENCE | Create order, hold ticket quantities, and start payment. Requires idempotency key. |
| GET | `/orders` | AUDIENCE | List current user's orders. |
| GET | `/orders/{orderId}` | AUDIENCE | Get current user's order detail. |
| POST | `/orders/{orderId}/cancel` | AUDIENCE | Cancel an awaiting-payment order and release held tickets. |
| POST | `/orders/{orderId}/retry-payment` | AUDIENCE | Create a new payment attempt for an awaiting-payment or failed order if allowed. |
| GET | `/admin/orders` | ORGANIZER/ADMIN | List orders for admin reporting/support. |
| GET | `/admin/orders/{orderId}` | ORGANIZER/ADMIN | Get order detail for admin. |

Important headers for `POST /orders`:

```text
Idempotency-Key: <client-generated-unique-key>
```

Example create order request:

```json
{
  "concertId": "uuid",
  "paymentProvider": "MOCK",
  "items": [
    {
      "ticketTypeId": "uuid-vip",
      "quantity": 2
    },
    {
      "ticketTypeId": "uuid-cat1",
      "quantity": 2
    }
  ]
}
```

Example create order response data:

```json
{
  "orderId": "uuid",
  "status": "AWAITING_PAYMENT",
  "totalAmount": 8600000,
  "paymentUrl": "http://localhost:8080/api/mock-payment/orders/uuid",
  "expiresAt": "2026-06-04T10:05:00Z"
}
```

Backend rules:

```text
Use atomic update or lock to decrement ticket_types.available_qty.
Check per-user limit using PAID + active AWAITING_PAYMENT orders.
Create order_items as one row per ticket type.
Expire unpaid orders and release available_qty.
```

## Payment

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/payments/{orderId}/initiate` | AUDIENCE | Initiate payment if order exists and is payable. Can be merged into `POST /orders` for MVP. |
| GET | `/payments/{orderId}/status` | AUDIENCE | Get payment/order status. |
| POST | `/payments/webhooks/vnpay` | PUBLIC | Receive VNPAY webhook/IPN. Must verify signature. |
| POST | `/payments/webhooks/momo` | PUBLIC | Receive MoMo webhook/IPN. Must verify signature. |
| POST | `/mock-payments/{orderId}/success` | PUBLIC/DEV | Mock payment success for local demo. |
| POST | `/mock-payments/{orderId}/fail` | PUBLIC/DEV | Mock payment failure for local demo. |

Webhook behavior:

```text
Verify provider signature.
Write payment_logs.
If success and order is payable, mark order PAID.
Generate tickets.
Publish notification event.
If duplicate webhook, return OK without double-processing.
```

## Tickets

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/tickets` | AUDIENCE | List current user's e-tickets. |
| GET | `/tickets/{ticketId}` | AUDIENCE | Get current user's ticket detail. |
| GET | `/tickets/{ticketId}/qr` | AUDIENCE | Get QR payload or QR image for e-ticket. |
| GET | `/admin/concerts/{concertId}/tickets` | ORGANIZER/ADMIN | List tickets for a concert. |
| PATCH | `/admin/tickets/{ticketId}/status` | ORGANIZER/ADMIN | Cancel or update ticket status when needed. |

## Check-In

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/staff/concerts/{concertId}/checkin-dataset` | STAFF | Download valid ticket dataset for offline scanner. |
| POST | `/staff/checkins/scan` | STAFF | Online scan and check-in one QR code. |
| POST | `/staff/checkins/sync` | STAFF | Batch sync offline check-in logs from mobile scanner. |
| GET | `/staff/concerts/{concertId}/checkins` | STAFF/ORGANIZER | List check-in logs for a concert. |
| GET | `/admin/concerts/{concertId}/checkin-summary` | ORGANIZER/ADMIN | Get check-in count and conflict summary. |

Example online scan request:

```json
{
  "qrCode": "signed-ticket-token",
  "concertId": "uuid",
  "deviceId": "gate-a-device-01",
  "gate": "A"
}
```

Double check-in prevention:

```text
checkin_logs.ticket_id has a unique constraint.
Server must reject duplicate scans.
Offline conflicts are resolved during sync.
```

## Guest List CSV Import

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/admin/concerts/{concertId}/guest-lists/import` | ORGANIZER/ADMIN | Upload CSV and import guest list. |
| GET | `/admin/concerts/{concertId}/guest-lists` | ORGANIZER/ADMIN/STAFF | List guest entries. |
| GET | `/admin/batch-logs` | ORGANIZER/ADMIN | List batch job runs. |
| GET | `/admin/batch-logs/{batchLogId}` | ORGANIZER/ADMIN | Get batch import detail. |
| POST | `/admin/batch-jobs/guest-list-import/run` | ADMIN/DEV | Manually trigger guest list import job if implemented. |

CSV import behavior:

```text
Validate required fields.
Use upsert on (concert_id, phone).
Write batch_logs.
Reject or mark failed if error rate exceeds configured threshold.
```

## Notifications

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/notifications` | AUTHENTICATED | List current user's notifications. |
| PATCH | `/notifications/{notificationId}/read` | AUTHENTICATED | Mark notification as read if read state is implemented. |
| GET | `/admin/notifications` | ORGANIZER/ADMIN | List notification records for operations/debug. |
| POST | `/admin/notifications/{notificationId}/retry` | ORGANIZER/ADMIN | Retry failed notification. |
| POST | `/admin/concerts/{concertId}/reminders/send` | ORGANIZER/ADMIN | Trigger concert reminder notifications. |

Async design:

```text
Business event -> RabbitMQ -> notification consumer -> notifications table/email/app.
Failures should increment attempts and eventually go to DLQ or FAILED status.
```

## AI Artist Bio

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/admin/concerts/{concertId}/artist-bio-jobs` | ORGANIZER/ADMIN | Upload PDF or provide file URL to start AI artist bio job. |
| GET | `/admin/artist-bio-jobs/{jobId}` | ORGANIZER/ADMIN | Get AI job status and result. |
| POST | `/admin/artist-bio-jobs/{jobId}/apply` | ORGANIZER/ADMIN | Apply generated bio to concert.artist_bio. |
| POST | `/admin/artist-bio-jobs/{jobId}/retry` | ORGANIZER/ADMIN | Retry failed AI job. |

MVP option:

```text
Use mock AI response if real AI integration is out of scope for the implementation deadline.
Still persist artist_pdf_jobs and status transitions.
```

## Admin Dashboard And Reporting

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| GET | `/admin/dashboard/summary` | ORGANIZER/ADMIN | High-level totals: concerts, revenue, paid orders, tickets sold. |
| GET | `/admin/concerts/{concertId}/revenue` | ORGANIZER/ADMIN | Revenue summary for one concert. |
| GET | `/admin/concerts/{concertId}/sales-by-ticket-type` | ORGANIZER/ADMIN | Sales and remaining quantity by ticket type. |
| GET | `/admin/concerts/{concertId}/orders/export` | ORGANIZER/ADMIN | Export orders CSV if needed. |

## Queue And Rate Limiting

The current MVP can implement rate limiting without a full waiting room. If waiting room/queue is implemented, use these endpoints.

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| POST | `/queue/concerts/{concertId}/join` | AUDIENCE | Join waiting room or sale queue. |
| GET | `/queue/concerts/{concertId}/status` | AUDIENCE | Get current queue position and access status. |
| POST | `/queue/concerts/{concertId}/leave` | AUDIENCE | Leave queue. |

Rate limit behavior:

```text
Use Redis counters/token bucket.
Return HTTP 429 when limit is exceeded.
Protect purchase/payment endpoints more strictly than read endpoints.
```

## Suggested MVP Implementation Order

```text
1. Health + auth
2. Public concerts + admin concert CRUD
3. Ticket type management
4. Order purchase with AWAITING_PAYMENT hold
5. Mock payment success/fail
6. Ticket generation and QR
7. Check-in online
8. Redis cache/rate limit/idempotency
9. RabbitMQ notification
10. CSV import and AI mock
11. Reports/dashboard
```
