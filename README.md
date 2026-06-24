# TicketBox

TicketBox is a modular-monolith ticketing platform for concert discovery, ticket purchase, payment, e-ticket QR display, staff check-in, notifications, guest-list import, and AI-assisted artist biography generation.

The project is prepared for a local end-to-end demo with Docker Compose: Spring Boot backend, React frontend, PostgreSQL, Redis, RabbitMQ, and MailHog.

## Tech Stack

- Backend: Java 21, Spring Boot 3, Spring Security JWT, Spring Data JPA, Flyway, Spring Batch, Spring AMQP, Spring Data Redis, Resilience4j
- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios
- Mobile scanner: Expo React Native, TypeScript, SQLite-based offline scanner flow
- Infrastructure: PostgreSQL 16, Redis 7, RabbitMQ 3 Management, MailHog, Docker Compose

## Prerequisites

- Docker Desktop
- Git
- Java 21, only for running backend outside Docker
- Node.js LTS, only for running frontend outside Docker

## Quick Start With Docker

1. Copy the environment template.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Start the full stack.

```bash
docker compose up --build
```

3. Open the demo services.

| Service | URL |
| --- | --- |
| Frontend web | http://localhost:5173 |
| Backend health | http://localhost:8080/api/health |
| RabbitMQ Management | http://localhost:15672 |
| MailHog inbox | http://localhost:8025 |
| PostgreSQL host port | localhost:5433 |
| Redis host port | localhost:6379 |

RabbitMQ uses the credentials from `.env`: `ticketbox` / `ticketbox` by default.

## Environment Variables

The default `.env.example` is suitable for local demo. Important values:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | Backend PostgreSQL connection inside Docker | `jdbc:postgresql://postgres:5432/ticketbox` |
| `JWT_SECRET` | HMAC secret for JWT signing | Development-only sample secret |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:8080` |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection | `redis`, `6379` |
| `RABBITMQ_HOST`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` | RabbitMQ connection | `rabbitmq`, `ticketbox`, `ticketbox` |
| `MAIL_HOST`, `MAIL_PORT` | SMTP target used by backend | Defaults to `mailhog`, `1025` in Docker Compose |
| `PAYMENT_MOCK_BASE_URL` | Local mock payment base URL | `http://localhost:8080` |
| `VNPAY_PAY_URL` | VNPAY sandbox payment URL | Sandbox URL in `.env.example` |
| `VNPAY_RETURN_URL` | Browser return URL after VNPAY | `http://localhost:5173/payment/result` |
| `VNPAY_IPN_URL` | Public backend webhook URL for VNPAY IPN | Replace with an ngrok/cloudflared URL for real sandbox callback |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | VNPAY sandbox merchant credentials | Replace with real sandbox credentials |
| `GUEST_LIST_IMPORT_CRON` | Scheduled guest-list import interval | Every 5 minutes |
| `ARTIST_BIO_AI_PROVIDER`, `ARTIST_BIO_AI_API_KEY` | AI artist bio provider config | `auto`, empty key uses local mock fallback |

Do not commit real `.env` files, real secrets, API keys, payment credentials, or tunnel URLs.

## Demo Accounts

Seed data creates these primary demo users:

| Role | Email | Password | Main use |
| --- | --- | --- | --- |
| Audience | `audience@ticketbox.com` | `password123` | Browse concerts, buy tickets, view profile/orders/e-tickets |
| Organizer | `organizer@ticketbox.com` | `password123` | Open admin dashboard, guest-list import, batch logs, reports |
| Admin | `admin@ticketbox.com` | `password123` | Admin-level dashboard and operations endpoints |
| Staff | `staff@ticketbox.com` | `password123` | Staff check-in APIs and mobile scanner flow |

Additional `.vn` test accounts may exist for backend tests, but the `.com` accounts above are the intended demo accounts.

## RBAC Summary

Backend security and frontend route guards are aligned around these roles:

| Area | Roles |
| --- | --- |
| Public concert list/detail/availability | Public |
| Register/login | Public |
| Profile | Any authenticated user |
| Purchase, checkout, mock payment, my orders, my tickets | `AUDIENCE` |
| Admin web, concert operations, guest-list import, batch logs | `ORGANIZER`, `ADMIN` |
| Staff check-in dataset, scan, offline sync, guest lookup | `STAFF` |
| Organizer revenue reports | `ORGANIZER` |

If a signed-in user opens a frontend route outside their role, the UI shows an access-limited state instead of silently mixing permissions.

## Payment Demo

Local demo supports two payment paths:

1. Mock payment for fast local testing.
   - Create an order from the audience flow.
   - Use the mock payment success path to mark the order paid.
   - The backend generates tickets and publishes notification events.

2. VNPAY sandbox configuration.
   - Set `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET` in `.env`.
   - Set `VNPAY_IPN_URL` to a public tunnel pointing to `/api/payments/webhooks/vnpay`.
   - Keep `VNPAY_RETURN_URL=http://localhost:5173/payment/result` for the local frontend return screen.

The payment adapter is protected by Resilience4j circuit breaker settings in `backend/src/main/resources/application.yml`. Duplicate webhooks are handled idempotently so tickets are not generated twice.

## Email And Notifications

The Docker stack starts MailHog for local SMTP capture.

- SMTP host inside Docker: `mailhog`
- SMTP port inside Docker: `1025`
- Web inbox: http://localhost:8025

After successful purchase or reminder jobs, app notifications are persisted and email messages can be inspected in MailHog. RabbitMQ Management at http://localhost:15672 can be used to inspect notification queues and retry/DLQ behavior.

## Useful API Docs And Scripts

- API contract: `docs/api/api-endpoints.md`
- Full Postman collection: `docs/api/full API/TicketBox-FULL-Demo.postman_collection.json`
- Order/payment concurrency guide: `docs/api/order-payment-concurrency-test-guide.md`
- Local API flow script: `scripts/test-api-flows.ps1`
- Order concurrency script: `scripts/test-order-concurrency.sh`

## Run Services Separately

Backend only:

```bash
cd backend
./mvnw spring-boot:run
```

Frontend only:

```bash
cd frontend
npm install
npm run dev
```

The frontend reads `VITE_API_BASE_URL`; use `http://localhost:8080` for the local backend.

## Verification Checklist

Before final submission or a pull request:

```bash
docker compose up --build
```

Then verify:

- Frontend opens at http://localhost:5173.
- Backend health returns OK at http://localhost:8080/api/health.
- Login works for audience, organizer, staff, and admin demo accounts.
- Audience can access purchase/profile/ticket flows.
- Organizer/admin can access admin dashboard and guest-list batch logs.
- Staff is blocked from admin web but can use staff scanner APIs/mobile flow.
- Mock payment success generates tickets and notifications.
- MailHog receives purchase/reminder email.
- RabbitMQ, Redis, and PostgreSQL containers are healthy.

## Project Structure

- `backend/`: Spring Boot API server organized by package-by-domain.
- `frontend/`: React TypeScript Vite web application.
- `mobile-scanner/`: Expo TypeScript scanner for offline gate check-in.
- `blueprint/`: Proposal, design, and OpenSpec-style requirement docs.
- `docs/`: API contracts, team plan, and demo/testing guides.
- `scripts/`: Local verification helpers.
- `skills/`: TicketBox frontend design guidance for Codex.

## Commit Convention

Use conventional commits:

- `chore:` tooling, configuration, and maintenance
- `feat:` user-facing feature work
- `fix:` bug fixes
- `docs:` documentation-only changes
- `test:` test-only changes
