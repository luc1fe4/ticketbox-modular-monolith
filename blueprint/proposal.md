# TicketBox - Project Proposal

## 1. Background (Bối cảnh)
Concerts by popular artists in Vietnam (e.g., *Anh Trai Say Hi*, *Anh Trai Vượt Ngàn Chông Gai*, *Em Xinh Say Hi*, *Chị Đẹp Đạp Gió Rẽ Sóng*) attract tens of thousands of fans simultaneously. During the opening minutes of ticket sales, website usually crashes due to sudden traffic spikes. Customers encounter issues such as being charged money without receiving their tickets, scalper bots purchasing all tickets in seconds, and double-spent tickets. Currently, many events still sell tickets through fragmented and manual channels (e.g., Zalo OA, Google Forms, manual bank transfers), which lack transparency, fairness, and security.
To resolve these issues, the TicketBox platform is designed to digitize the end-to-end ticketing process, ensuring a smooth flow from configuration to purchase and check-in.

## 2. Problems (Vấn đề)
*   **High Concurrent Demand & Seat Contention:** SVIP areas are highly coveted but limited (e.g., 200 seats for 80,000 interested users). The system must guarantee that no two users are issued the same seat/ticket (preventing overselling) under high concurrency.
*   **System Overload:** Traffic spikes (e.g., 80,000 concurrent users in the first 5 minutes) can easily overwhelm backend services and database connections if not properly throttled.
*   **Payment Unreliability:** Slow or failing payment gateways (VNPAY/MoMo) can cause transaction timeouts, leading to situations where money is deducted but tickets are not issued, or holding tickets indefinitely, depriving other customers of buying opportunities.
*   **Offline Gates / Weak Network Check-In:** Large stadiums have poor mobile coverage. Staff must be able to scan and record check-ins offline, and then synchronize cleanly back to the server without allowing double entry.
*   **One-way Integration (Guest Lists):** Sponsoring partners send guest lists in CSV format late at night. The system needs to periodically import these files safely, handle data duplication, skip faulty rows, and avoid interrupting active services.
*   **Enforcing Purchase Limits:** Enforcing a maximum limit of tickets per account (e.g., max 4 tickets per zone) is difficult when a user spawns multiple concurrent requests.

## 3. Goals (Mục tiêu)
*   **Overselling Protection:** Guarantee 100% accuracy in ticket inventory; zero overselling or duplicate seat assignments.
*   **High Throughput & Rate Limiting:** Handle sudden traffic spikes of up to thousands of requests per second using Redis token bucket rate limiting.
*   **Circuit Breaker Protection:** Implement Resilience4j circuit breakers around the payment gateway (VNPAY) to prevent external failures from propagating and freezing internal services.
*   **Robust Offline Check-In:** Enable staff to check in attendees offline using local SQLite storage on an Expo mobile app and synchronize logs back to the server once online, with server-side conflict resolution.
*   **Automated Batch Processing:** Support scheduled imports of sponsor guest lists via Spring Batch with row-level validation and error logging.
*   **AI-Enhanced Metadata:** Provide PDF parsing of press kits/artist profiles and use Gemini/LLM APIs to automatically generate artist bio summaries.

## 4. Scope (Phạm vi)
*   **In Scope:**
    *   Spring Boot modular monolith backend.
    *   React-based admin and audience web applications.
    *   Expo-based mobile check-in app with offline SQLite support.
    *   Redis for caching ticket availability, rate limiting, and idempotency keys.
    *   RabbitMQ for async notifications (ticket issuance, concert reminders).
    *   VNPAY Sandbox payment gateway integration.
    *   Spring Batch for CSV guest list import.
    *   PDFBox and Mock/Gemini AI API integration for artist bio generation.
*   **Out of Scope:**
    *   Production deployment infrastructure (Kubernetes, CDN, Load Balancer).
    *   Real money payment processing (only sandbox/testing mode).
    *   Complex seat-selection maps (instead, zone-level selection with interactive SVG is used).

## 5. Risks and Constraints (Rủi ro và Ràng buộc)
*   **Database Contention:** Row locks on `ticket_types` can slow down checkout. The database must use optimistic locking or atomic updates.
*   **Network Interruption during Check-In:** Staff devices might go offline for hours. Sync algorithms must prevent duplicate check-ins even if logs are uploaded out of order.
*   **AI API Cost & Latency:** LLM API calls are slow and expensive. They must run asynchronously in the background.
