# Sprint 8, 9, 10 Feature Implementation Report: Member Công Phúc

This walkthrough describes the implementation details of Sprint 8, Sprint 9, and Sprint 10 features assigned to member **Công Phúc** under the `feature/cong-phuc-sprint8-10` branch. All work conforms to the repository's gitflow, architectural design, database migration patterns, security restrictions, and UI guidelines.

---

## 🚀 Sprint Summary

### 1. Sprint 8: Queue & Ticket Holding (Database & Backend Core)
*   **Database Schema**: Created the `V19__create_ticket_holds.sql` Flyway migration table `ticket_holds` with a unique constraint on `(user_id, concert_id)` to enforce the single-hold rule.
*   **Core Entities**: Added `TicketHold` entity and `TicketHoldRepository` with JPA queries.
*   **Core Services**:
    *   `ReservationService`: Manages ticket reservations (holds) and release actions. Auto-releases expired holds dynamically when a user queries their holds.
    *   `ReservationController`: Exposes `/api/reservations/concerts/{concertId}/ticket-types/{ticketTypeId}/reserve` and `/release` endpoints.
*   **Decoupled Events**: Integrated RabbitMQ message listening via `UserLeftQueueListener` which handles `UserLeftQueueEvent` to automatically clean up database ticket holds when a user exits or drops out of the queue.

### 2. Sprint 9: Admin Dashboard User & Status Management
*   **Backend REST Admin Control**:
    *   `AdminUserService` and `AdminUserController` exposing `/api/admin/users`, `/api/admin/users/{id}/role`, and `/api/admin/users/{id}/status` endpoints.
    *   Protected by Spring Security's `ROLE_ADMIN` check to ensure strict isolation.
*   **Frontend UI Additions**:
    *   Added **User Management** screen (`/admin/users`) with role dropdown controls and toggle buttons for activating/deactivating users.
    *   Restricted this sidebar view and page access strictly to users with the `ADMIN` role.

### 3. Sprint 10: Security Hardening & Documentation
*   **Security Configuration (`SecurityConfig`)**:
    *   Locked down `/api/admin/**` to `ROLE_ADMIN`.
    *   Locked down `/api/checkin/**` to `ROLE_STAFF` or `ROLE_ADMIN`.
    *   Locked down `/api/reservations/**` and `/api/orders/**` to `ROLE_AUDIENCE`.
*   **Integration Tests**:
    *   `SecurityRbacTest`: Validated all security boundaries for multiple roles.
    *   `SecurityHardeningTest`: Hardened edge cases, covering expired/fake queue access tokens, role boundary violations, and token expirations.
*   **Documentation**:
    *   Updated the main `README.md` file to include demo accounts, a Route and RBAC matrix, and detailed validation steps for testing.

---

## 🛠️ Verification and Codebase Diffs

### Backend Code Verification
All 19 tests in `SecurityRbacTest` and 6 tests in `SecurityHardeningTest` pass successfully.

To run tests locally:
```bash
cd backend
mvn test -Dtest=SecurityRbacTest,SecurityHardeningTest,OrderConcurrencyTest
```

### Git Diff Breakdown
The changes made across the workspace are detailed below:
*   [SecurityConfig.java](file:///d:/Regular_School/N3/HK2/TKPM/Project/ticketbox/backend/src/main/java/com/ticketbox/infrastructure/security/SecurityConfig.java) — Updated route roles.
*   [ReservationService.java](file:///d:/Regular_School/N3/HK2/TKPM/Project/ticketbox/backend/src/main/java/com/ticketbox/module/ticket/application/ReservationService.java) — Core holding logic.
*   [UserLeftQueueListener.java](file:///d:/Regular_School/N3/HK2/TKPM/Project/ticketbox/backend/src/main/java/com/ticketbox/module/ticket/application/UserLeftQueueListener.java) — Handles cleanup events.
*   [AdminUserController.java](file:///d:/Regular_School/N3/HK2/TKPM/Project/ticketbox/backend/src/main/java/com/ticketbox/module/auth/web/AdminUserController.java) — User status & role changes.
*   [AuthContext.tsx](file:///d:/Regular_School/N3/HK2/TKPM/Project/ticketbox/frontend/src/features/auth/AuthContext.tsx) — Added sidebar items & navigation security.
*   [README.md](file:///d:/Regular_School/N3/HK2/TKPM/Project/ticketbox/README.md) — Reference testing manual.
