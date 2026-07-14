# TicketBox — Blueprint

Tài liệu thiết kế hệ thống TicketBox theo cấu trúc OpenSpec (spec-driven development). Thư mục này gom các tài liệu từ proposal, thiết kế tổng thể, mô hình dữ liệu, luồng nghiệp vụ, đến đặc tả chi tiết cho từng năng lực kỹ thuật/nghiệp vụ.

## Cấu trúc tài liệu

| File | Nội dung |
| --- | --- |
| [proposal.md](proposal.md) | Bối cảnh, vấn đề, mục tiêu, phạm vi, rủi ro và ràng buộc của đồ án. |
| [design.md](design.md) | Kiến trúc tổng thể, C4 diagram (L1/L2), high-level architecture, thiết kế DB, RBAC, cơ chế bảo vệ hệ thống và ADR. |
| [adr.md](adr.md) | Architecture Decision Records: các quyết định kỹ thuật lớn và đánh đổi. |
| [data-model/erd.md](data-model/erd.md) | ERD và giải thích lựa chọn datastore. |
| [performance/cache-strategy.md](performance/cache-strategy.md) | Chiến lược cache cho concert list/detail, số vé còn lại và tính nhất quán availability. |
| [flows/import-guest-list.mmd](flows/import-guest-list.mmd) | Sequence diagram nguồn cho luồng import danh sách khách mời VIP. |
| [specs/](specs/) | Đặc tả chi tiết từng tính năng: luồng, kịch bản lỗi, ràng buộc và tiêu chí chấp nhận. |

## Danh mục Specs

| Spec | Tính năng | Yêu cầu liên quan |
| --- | --- | --- |
| [specs/auth.md](specs/auth.md) | Xác thực và phân quyền (RBAC), JWT, role-permission matrix, chuẩn lỗi 401/403. | BP09, IM06 |
| [specs/ticket-purchase.md](specs/ticket-purchase.md) | Mua vé, chống oversell, giới hạn per-user. | BP06, IM03, IM11 |
| [specs/payment.md](specs/payment.md) | Thanh toán, circuit breaker, idempotency, xử lý payment failure. | BP06, BP11, BP12, IM13, IM14 |
| [specs/checkin.md](specs/checkin.md) | Soát vé online/offline và đồng bộ log từ mobile scanner. | BP07, IM07, IM08 |
| [specs/queue.md](specs/queue.md) | Waiting room và rate limiting khi tải đột biến. | BP10, IM12 |
| [specs/concert-catalog.md](specs/concert-catalog.md) | Xem concert và caching. | BP13, IM01, IM15 |
| [specs/guest-list.md](specs/guest-list.md) | Đồng bộ khách mời VIP từ CSV. | BP08, IM10 |
| [specs/guest-list-import.md](specs/guest-list-import.md) | Đặc tả import danh sách khách mời VIP từ CSV. | BP08, IM10 |
| [specs/artist-bio.md](specs/artist-bio.md) | AI Artist Bio từ PDF. | IM09 |
| [specs/notification.md](specs/notification.md) | Thông báo app/email và khả năng mở rộng kênh. | IM04 |

## Cách đọc đề xuất

1. Đọc [proposal.md](proposal.md) để hiểu bài toán, mục tiêu và phạm vi.
2. Đọc [design.md](design.md) để nắm kiến trúc tổng thể và các quyết định kỹ thuật chính.
3. Đọc [data-model/erd.md](data-model/erd.md) khi cần kiểm tra schema/entity.
4. Đọc các file trong [specs/](specs/) theo từng luồng nghiệp vụ.
5. Đọc [performance/cache-strategy.md](performance/cache-strategy.md) khi cần kiểm tra chiến lược cache và tính nhất quán availability.
6. Đọc [flows/import-guest-list.mmd](flows/import-guest-list.mmd) khi cần xem sequence diagram cho luồng import guest list.

## Trạng thái

- Các spec **auth, checkin, payment** đã có nội dung đầy đủ.
- Các spec **queue, concert-catalog, guest-list, artist-bio, notification, ticket-purchase** và **adr.md** hiện là khung (template), cần điền nội dung vào các phần `<!-- ... -->`.
