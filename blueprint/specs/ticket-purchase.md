# Đặc tả: Mua vé & Giới hạn vé per-user

> Khung tài liệu — điền nội dung vào các phần `<!-- ... -->`.
> Phục vụ yêu cầu BP06/IM03/IM11: luồng mua vé, chống oversell, enforce giới hạn vé mỗi tài khoản dưới tải cao.
> Lưu ý: luồng thanh toán chi tiết đã có ở `specs/payment.md` — file này tập trung vào chọn vé, tồn kho và giới hạn per-user.

## 1. Mô tả
<!-- Khán giả chọn loại vé và số lượng, hệ thống giữ vé (reservation), tạo order, chuyển sang thanh toán.
     Mỗi tài khoản chỉ mua tối đa maxPerAccount vé/loại (VD SVIP 2 vé, CAT1 4 vé) tính trên
     toàn bộ đơn đã đặt/thanh toán — không lách bằng nhiều đơn nhỏ. -->

---

## 2. Luồng chính
<!-- - Chọn loại vé + số lượng.
     - Reservation: giữ vé tạm (TTL), atomic decrement tồn kho (availableQty >= quantity).
     - Kiểm tra giới hạn per-user: SUM(quantity) các order active + số đang giữ <= maxPerAccount.
     - Redis per-user lock để tuần tự hóa nhiều request cùng user.
     - Tạo order AWAITING_PAYMENT -> chuyển sang luồng payment (xem payment.md). -->

---

## 3. Kịch bản lỗi
<!-- - Hết vé (oversell attempt) -> TICKET_SOLD_OUT (atomic decrement trả 0 dòng).
     - Vượt giới hạn per-user -> TICKET_LIMIT_EXCEEDED.
     - Nhiều request đồng thời cùng user -> lock busy -> INVALID_REQUEST.
     - Redis down -> fail-closed (REDIS_UNAVAILABLE), không cho mua.
     - Reservation hết hạn -> release vé về tồn kho. -->

---

## 4. Ràng buộc
<!-- - Chống oversell: UPDATE ticket_type SET availableQty = availableQty - :qty WHERE id=:id AND availableQty >= :qty (atomic).
     - Giới hạn per-user: SUM trên status IN (AWAITING_PAYMENT, PAID); Redis lock lock:user<userId> TTL 5s.
     - Tính nhất quán: không được bán vượt tồn kho; không được vượt maxPerAccount dù request đồng thời. -->

---

## 5. Tiêu chí chấp nhận
<!-- 1. N buyer tranh M vé cuối (N > M) -> đúng M order thành công, availableQty về 0, không oversell.
     2. 1 user gửi nhiều request đồng thời không mua vượt maxPerAccount.
     3. Reservation hết hạn trả vé về kho.
     (Minh chứng: OrderConcurrencyIntegrationTest — oversell 50 buyer/10 vé, max-per-account, idempotency.) -->
