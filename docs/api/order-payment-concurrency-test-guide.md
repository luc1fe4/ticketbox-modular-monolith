# Order, Payment, and Concurrency Test Evidence

This guide provides repeatable evidence for the Sprint 5 backend-test task:

- Order creation and inventory reservation
- Mock payment success and ticket issuance
- Idempotency protection
- Oversell prevention under concurrent requests
- `max_per_account` enforcement under concurrent requests

## Existing automated coverage

The repository already contains:

- `docs/api/postman/TicketBox-Order-Payment-Flow.postman_collection.json`
  - Audience login
  - Concert and ticket-type checks
  - Order creation
  - Payment initiation
  - Mock payment success
  - Paid-order verification
  - Issued-ticket and notification checks
- `backend/src/test/java/com/ticketbox/module/ticket/application/OrderConcurrencyIntegrationTest.java`
  - 50 buyers competing for 10 tickets
  - 20 concurrent requests from one account
  - 20 concurrent requests sharing one idempotency key

Postman is appropriate for the sequential purchase flow. The concurrent cases use the curl
runner in this guide because a normal Postman collection run is sequential and is not reliable
evidence of concurrency.

## Prerequisites

Run from the repository root using Linux, macOS, or WSL:

```bash
docker compose up -d --build
docker compose ps
```

Required command-line tools:

```text
curl
jq
docker
```

Verify the API:

```bash
curl --fail http://localhost:8080/api/health
```

## Part A: Sequential order and payment flow with Postman

Import:

```text
docs/api/postman/TicketBox-Order-Payment-Flow.postman_collection.json
```

Run requests in numerical order.

Expected checkpoints:

| Request | Expected evidence |
| --- | --- |
| Login Seeded Audience | HTTP `200`; collection variable `token` is populated |
| Check Seeded Ticket Types | HTTP `200`; SVIP, VIP, CAT1, and GA are returned |
| Create Order | HTTP `201`; status is `AWAITING_PAYMENT`; `orderId` is populated |
| Get Order Before Payment | Reserved items and total amount match the request |
| Initiate Payment | HTTP `200`; provider/payment data is returned |
| Mock Payment Success | Request succeeds in the non-production profile |
| Get Order After Payment | Order status is `PAID` |
| List My Tickets | Tickets exist for the paid order |

Save the Postman run summary or screenshots as Sprint evidence.

## Part B: Concurrent API proof with curl

Run:

```bash
bash scripts/test-order-concurrency.sh
```

The script creates isolated database fixtures and temporary audience accounts, then executes:

1. Twelve buyers competing concurrently for five tickets.
2. Twenty concurrent requests from one account where `max_per_account = 2`.

Expected summary:

```text
OVERSELL TEST
HTTP 201: 5
HTTP 409: 7
Remaining inventory: 0
Stored quantity: 5

MAX_PER_ACCOUNT TEST
HTTP 201: 1
HTTP 400/409/429: 19 total rejections
Final account quantity: 2
Remaining inventory: 98
```

For `max_per_account`, rejected requests may be:

- HTTP `409` with `Ticket purchase limit exceeded`
- HTTP `400` with `Another request is being processed`
- HTTP `429` when the per-user purchase rate limiter rejects excess concurrent requests

All are valid rejections under concurrency. The authoritative invariant is that the final active quantity
for the account is exactly `2`.

The script exits non-zero when any database invariant fails.

## Part C: Database evidence

Inspect the test fixture while or immediately after a failed run:

```bash
docker exec ticketbox-postgres psql -U ticketbox -d ticketbox
```

Oversell invariant:

```sql
SELECT
    tt.total_quantity,
    tt.available_qty,
    COALESCE(SUM(oi.quantity), 0) AS stored_quantity,
    tt.available_qty + COALESCE(SUM(oi.quantity), 0) AS inventory_accounted_for
FROM ticket_types tt
LEFT JOIN order_items oi ON oi.ticket_type_id = tt.id
LEFT JOIN orders o
    ON o.id = oi.order_id
   AND o.status IN ('AWAITING_PAYMENT', 'PAID')
WHERE tt.id = '40000000-0000-0000-0000-000000000001'
GROUP BY tt.id;
```

Expected:

```text
total_quantity = 5
available_qty = 0
stored_quantity = 5
inventory_accounted_for = 5
```

Account-limit invariant:

```sql
SELECT
    u.email,
    tt.max_per_account,
    COALESCE(SUM(oi.quantity), 0) AS active_quantity
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN ticket_types tt ON tt.id = oi.ticket_type_id
WHERE u.email = 'concurrency-limit@ticketbox.test'
  AND o.status IN ('AWAITING_PAYMENT', 'PAID')
GROUP BY u.email, tt.max_per_account;
```

Expected:

```text
max_per_account = 2
active_quantity = 2
```

Exit PostgreSQL:

```sql
\q
```

## Part D: JUnit concurrency proof

The strongest deterministic concurrency proof remains the Spring integration test:

```bash
cd backend
mvn -Dtest=OrderConcurrencyIntegrationTest test
```

Expected tests:

```text
Inventory 10: only 10 of 50 concurrent buyers succeed
One account cannot exceed max_per_account under concurrent requests
Concurrent requests sharing one idempotency key create one order
```

Capture the Maven summary and the printed result blocks as additional evidence.

## Evidence checklist

- [ ] Postman sequential flow completed
- [ ] Order changed from `AWAITING_PAYMENT` to `PAID`
- [ ] Tickets were generated
- [ ] Oversell curl test exited successfully
- [ ] Account-limit curl test exited successfully
- [ ] Database inventory equation remained valid
- [ ] JUnit concurrency test passed
- [ ] Console output or screenshots were attached to the Sprint task

## Cleanup

The curl runner cleans its fixtures before and after successful execution. To clean manually:

```bash
bash scripts/test-order-concurrency.sh --cleanup
```
