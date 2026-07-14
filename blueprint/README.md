# TicketBox — Blueprint

Tài liệu thiết kế hệ thống theo cấu trúc OpenSpec (spec-driven development).

## Cấu trúc

| File | Nội dung |
| --- | --- |
| [proposal.md](proposal.md) | Bối cảnh, vấn đề, mục tiêu, phạm vi, rủi ro & ràng buộc |
| [design.md](design.md) | Kiến trúc tổng thể, C4 diagram (L1/L2), high-level architecture, thiết kế DB, RBAC, cơ chế bảo vệ hệ thống, ADR |
| [adr.md](adr.md) | Architecture Decision Records — các quyết định kỹ thuật lớn và đánh đổi |
| [specs/](specs/) | Đặc tả chi tiết từng tính năng (luồng, kịch bản lỗi, ràng buộc, tiêu chí chấp nhận) |

## Danh mục Specs

| Spec | Tính năng | Yêu cầu liên quan |
| --- | --- | --- |
| [specs/auth.md](specs/auth.md) | Xác thực & phân quyền (RBAC) | BP09, IM06 |
| [specs/ticket-purchase.md](specs/ticket-purchase.md) | Mua vé, chống oversell, giới hạn per-user | BP06, IM03, IM11 |
| [specs/payment.md](specs/payment.md) | Thanh toán, circuit breaker, idempotency | BP06, BP11, BP12, IM13, IM14 |
| [specs/checkin.md](specs/checkin.md) | Soát vé offline & đồng bộ | BP07, IM07, IM08 |
| [specs/queue.md](specs/queue.md) | Waiting room & rate limiting (tải đột biến) | BP10, IM12 |
| [specs/concert-catalog.md](specs/concert-catalog.md) | Xem concert & caching | BP13, IM01, IM15 |
| [specs/guest-list.md](specs/guest-list.md) | Đồng bộ khách mời VIP từ CSV | BP08, IM10 |
| [specs/artist-bio.md](specs/artist-bio.md) | AI Artist Bio từ PDF | IM09 |
| [specs/notification.md](specs/notification.md) | Thông báo app/email, mở rộng kênh | IM04 |

## Trạng thái

- Các spec **auth, checkin, payment** đã có nội dung đầy đủ.
- Các spec **queue, concert-catalog, guest-list, artist-bio, notification, ticket-purchase** và **adr.md** hiện là khung (template), cần điền nội dung vào các phần `<!-- ... -->`.
