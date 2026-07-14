# TicketBox

TicketBox is a modular monolith ticketing platform skeleton. This repository currently contains
only the initial coding environment, package structure, Docker Compose setup, placeholder modules,
and minimal health check. Business logic, ticket purchasing, payment, check-in, AI, CSV import, and
notification workflows are intentionally not implemented yet.

## Tech Stack

- Backend: Java 21, Spring Boot 3.x, Spring Web, Spring Security, Spring Data JPA, Flyway, Spring
  Validation, Spring Batch, Spring AMQP, Spring Data Redis, Actuator
- Frontend: React, TypeScript, Vite, ESLint, Prettier
- Mobile scanner: Expo React Native, TypeScript, Expo SQLite placeholder
- Infrastructure: PostgreSQL 16, Redis 7, RabbitMQ 3 Management, Docker Compose

## Prerequisites

- Java 17 or 21
- Node.js LTS
- Docker Desktop
- Git
- GitHub CLI, only if automatic repository creation is needed

## Run Locally

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Backend health check: `http://localhost:8080/api/health`.
4. Frontend: `http://localhost:5173`.
5. RabbitMQ Management: `http://localhost:15672`.

For development overrides, use `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`.

## Folder Structure

- `backend/`: Spring Boot API server organized by package-by-domain.
- `frontend/`: React TypeScript Vite web application.
- `mobile-scanner/`: Expo TypeScript scanner shell for offline gate check-in.
- `infra/`: Infrastructure notes and future service-specific configuration.
- `docs/`: System design, architecture, database, and development setup documentation.
- `scripts/`: Local development helper scripts.

## Commit Convention

Use conventional commits:

- `chore:` tooling, configuration, and maintenance
- `feat:` user-facing feature work
- `fix:` bug fixes
- `docs:` documentation-only changes
- `test:` test-only changes

## Next Steps

- Implement database schema.
- Implement auth and RBAC.
- Implement concert management.
- Implement ticket inventory transaction handling.
- Implement payment idempotency.
- Implement offline check-in sync.
- Implement notification worker.
- Implement AI artist bio workflow.
- Implement CSV import job.
