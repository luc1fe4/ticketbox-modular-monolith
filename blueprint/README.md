# TicketBox Blueprint

Thư mục này chứa bộ tài liệu thiết kế cho hệ thống TicketBox. Các tài liệu được tổ chức theo hướng nộp bài: bắt đầu từ proposal, đi vào thiết kế tổng thể, sau đó tách các đặc tả chi tiết theo từng năng lực kỹ thuật/nghiệp vụ.

## Cấu trúc tài liệu

| File | Vai trò |
|---|---|
| `proposal.md` | Bối cảnh, vấn đề, mục tiêu, phạm vi và rủi ro của đồ án. |
| `design.md` | Tài liệu thiết kế tổng thể: kiến trúc, C4, luồng tích hợp, dữ liệu, RBAC, cơ chế bảo vệ và ADR. |
| `data-model/erd.md` | ERD và giải thích lựa chọn datastore. |
| `specs/auth.md` | Authentication, JWT, RBAC, role-permission matrix và chuẩn lỗi 401/403. |
| `specs/payment.md` | Luồng mua vé/thanh toán, chống oversell, idempotency và payment failure handling. |
| `specs/checkin.md` | Luồng soát vé online/offline và đồng bộ log từ mobile scanner. |
| `specs/guest-list-import.md` | Đặc tả import danh sách khách mời VIP từ CSV. |
| `performance/cache-strategy.md` | Cache strategy cho concert list/detail và số vé còn lại. |
| `flows/import-guest-list.mmd` | Sequence diagram nguồn cho luồng guest list import. |

## Cách đọc đề xuất

1. Đọc `proposal.md` để hiểu bài toán và phạm vi.
2. Đọc `design.md` để nắm kiến trúc tổng thể và các quyết định kỹ thuật chính.
3. Đọc `data-model/erd.md` khi cần kiểm tra schema/entity.
4. Đọc các file trong `specs/` theo từng luồng nghiệp vụ.
5. Đọc `performance/cache-strategy.md` khi cần kiểm tra chiến lược cache và tính nhất quán availability.
