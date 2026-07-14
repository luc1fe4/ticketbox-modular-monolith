# Đặc tả: Xem Concert & Caching

> Khung tài liệu — điền nội dung vào các phần `<!-- ... -->`.
> Phục vụ yêu cầu: xem danh sách/chi tiết concert, sơ đồ chỗ ngồi SVG, số vé còn lại real-time, và chiến lược cache khi hàng nghìn request/giây.

## 1. Mô tả
<!-- Khán giả xem danh sách concert sắp diễn ra, chi tiết concert (nghệ sĩ, địa điểm,
     sơ đồ chỗ ngồi SVG theo khu GA/SVIP/VIP/CAT1/CAT2), số vé còn lại theo thời gian thực. -->

---

## 2. Luồng chính
### A. Xem danh sách / chi tiết concert
<!-- - Endpoint: GET /api/concerts, GET /api/concerts/{id}.
     - Cache-aside với Redis: đọc cache trước, miss thì query DB rồi ghi cache.
     - Sơ đồ chỗ ngồi SVG tương tác theo khu. -->

### B. Số vé còn lại real-time
<!-- - Cách lấy availableQty; cập nhật khi có giao dịch thành công.
     - Có dùng WebSocket/polling để cập nhật UI không. -->

---

## 3. Kịch bản lỗi
<!-- - Redis down -> fallback query thẳng DB.
     - Concert không tồn tại / đã hủy -> 404.
     - Cache stale -> chấp nhận sai số bao nhiêu cho số vé còn lại. -->

---

## 4. Ràng buộc (Caching strategy)
<!-- - Chiến lược: Cache-aside.
     - TTL từng loại dữ liệu:
        + Thông tin concert (ít đổi): TTL dài (VD ? phút/giờ).
        + Số vé còn lại (đổi liên tục): TTL ngắn (VD ? giây) HOẶC invalidate chủ động khi giao dịch thành công.
     - Cách invalidate cache khi organizer sửa/hủy concert hoặc khi bán được vé. -->

---

## 5. Tiêu chí chấp nhận
<!-- 1. Trang danh sách/chi tiết chịu được hàng nghìn request/giây nhờ cache.
     2. Số vé còn lại phản ánh gần đúng thực tế (sai số trong ngưỡng TTL chấp nhận).
     3. Khi organizer cập nhật concert, cache được invalidate và dữ liệu mới hiển thị. -->
