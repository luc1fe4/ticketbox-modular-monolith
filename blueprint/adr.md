# Architecture Decision Records (ADR)

> Khung tài liệu — điền nội dung vào các phần `<!-- ... -->`.
> Phục vụ yêu cầu BP14. Mỗi ADR ghi: **Quyết định** (chọn gì), **Bối cảnh** (tại sao cần quyết định), **Lý do** (vì sao chọn), **Đánh đổi** (từ bỏ gì, rủi ro gì).
> Lưu ý: `design.md` §7 đã có ADR 01 (SQL vs NoSQL), ADR 02 (Modular Monolith vs Microservices), ADR 03 (Polling vs WebSocket). File này bổ sung các ADR còn thiếu — có thể gộp toàn bộ về một chỗ.

---

## ADR 04 — JWT vs Session

**Trạng thái:** <!-- Accepted / Proposed -->

**Bối cảnh**
<!-- Hệ thống cần cơ chế xác thực cho web + mobile scanner, chịu tải cao, stateless. -->

**Quyết định**
<!-- Chọn JWT (stateless) hay Session (server-side)? -->

**Lý do**
<!-- Vì sao phù hợp: stateless dễ scale, mobile offline, không cần shared session store... -->

**Đánh đổi**
<!-- JWT: khó revoke trước hạn, cần xử lý refresh/expiry. Session: cần store tập trung. -->

---

## ADR 05 — Message Broker: RabbitMQ vs Kafka

**Trạng thái:** <!-- Accepted -->

**Bối cảnh**
<!-- Cần broker cho notification (email/app), retry, DLQ. Khối lượng message vừa phải. -->

**Quyết định**
<!-- Chọn RabbitMQ hay Kafka? -->

**Lý do**
<!-- RabbitMQ: routing linh hoạt, retry/DLQ sẵn, phù hợp task queue. Kafka: throughput cực cao, event streaming. -->

**Đánh đổi**
<!-- RabbitMQ throughput thấp hơn Kafka; Kafka phức tạp vận hành, thừa cho quy mô đồ án. -->

---

## ADR 06 — Locking Strategy (Optimistic vs Pessimistic vs Atomic)

**Trạng thái:** <!-- Accepted -->

**Bối cảnh**
<!-- Chống oversell vé cuối + giới hạn per-user khi hàng chục nghìn người mua đồng thời. -->

**Quyết định**
<!-- Tồn kho: atomic conditional UPDATE (availableQty >= qty).
     Order/payment: pessimistic lock (@Lock PESSIMISTIC_WRITE / findByIdForUpdate).
     Per-user: Redis distributed lock. -->

**Lý do**
<!-- Atomic decrement: nhanh, không cần khóa dòng lâu, chống race tốt.
     Pessimistic khi cần đọc-sửa-ghi nhất quán (payment success). -->

**Đánh đổi**
<!-- Pessimistic: giảm throughput khi contention cao. Redis lock: phụ thuộc Redis (fail-closed khi down). -->

<!-- (Tùy chọn) Bổ sung thêm ADR khác nếu cần: chọn Spring Batch cho CSV import,
     chọn Cache-aside thay vì write-through, chọn Testcontainers cho integration test... -->
