# Architecture

TicketBox uses a modular monolith architecture. The backend is a single Spring Boot API server
organized by package-by-domain under `com.ticketbox.module`.

Modules are intentionally placeholders at this stage:

- `auth`: authentication and authorization boundaries
- `concert`: concert catalog and event management
- `ticket`: ticket inventory and purchase transaction boundaries
- `payment`: payment integration and idempotency boundaries
- `checkin`: online check-in and offline sync coordination
- `notification`: asynchronous notification processing
- `admin`: administrative operations
- `ai`: AI-assisted artist biography workflow

Infrastructure packages are separated under `com.ticketbox.infrastructure` for database, Redis,
RabbitMQ, security, and batch configuration.
