# Báo cáo Kiểm thử - Chống bán lố vé cuối cùng (Oversell Prevention)
**Người phụ trách:** Bùi Minh Quân  
**Yêu cầu cần chứng minh:** Không oversell vé cuối cùng khi nhiều người mua đồng thời.  
**Minh chứng mong đợi:** `Concurrency test + transaction/locking/atomic update`

---

## 1. Giải pháp Thiết kế & Cài đặt
Để giải quyết bài toán tranh mua vé cuối cùng khi hệ thống chịu tải cao từ hàng ngàn khách hàng mua đồng thời, hệ thống sử dụng giải pháp **Cập nhật nguyên tử trực tiếp dưới cơ sở dữ liệu (Atomic Database Update)**:
* Không thực hiện quy trình: đọc số lượng vé còn lại lên RAM $\rightarrow$ kiểm tra bằng Java $\rightarrow$ trừ số lượng rồi lưu lại (quy trình này dễ gây race condition khi nhiều luồng cùng đọc một giá trị cũ).
* Thay vào đó, thực hiện một câu lệnh cập nhật duy nhất có điều kiện (Atomic UPDATE) tại `TicketTypeRepository.java`:
  ```sql
  UPDATE ticket_types 
  SET available_qty = available_qty - :quantity 
  WHERE id = :id AND available_qty >= :quantity
  ```
* Cơ chế của PostgreSQL sẽ tự động đặt khóa ghi độc quyền lên dòng dữ liệu đang cập nhật, xếp hàng các yêu cầu đồng thời và thực hiện trừ vé tuần tự. Khi số lượng vé khả dụng (`availableQty`) nhỏ hơn số lượng yêu cầu (`quantity`), câu lệnh `UPDATE` sẽ không khớp điều kiện và trả về số dòng được cập nhật bằng `0`. Từ đó, backend Java ném ra lỗi `TICKET_SOLD_OUT`.

---

## 2. Minh chứng Kiểm thử Tự động (Automated Test)
* **File test:** `backend/src/test/java/com/ticketbox/module/ticket/application/OrderConcurrencyIntegrationTest.java`
* **Phương thức test:** `concurrentBuyersCannotOversellTheLastTickets`
* **Kịch bản test:**
  * Giả lập tồn kho của một loại vé chỉ còn đúng **10 vé cuối cùng** (`initialInventory = 10`).
  * Sử dụng đa luồng kích hoạt **50 tài khoản khách hàng khác nhau** gửi yêu cầu mua vé cùng một thời điểm.
* **Kết quả kỳ vọng (Assertion):**
  * Đúng 10 người mua thành công (`successfulOrders == 10`).
  * Đúng 40 người nhận mã lỗi hết vé (`ErrorCode.TICKET_SOLD_OUT`).
  * Số lượng vé còn lại trong database bằng chính xác 0 và không bị âm lố.

### Lệnh chạy test:
```powershell
.\mvnw.cmd test -Dtest=OrderConcurrencyIntegrationTest#concurrentBuyersCannotOversellTheLastTickets
```

---

## 3. Quy trình Kiểm thử Thủ công (Manual Verification)
1. Đăng nhập vào cơ sở dữ liệu, sửa cột `available_qty` của một loại vé thành `1`.
2. Mở hai trình duyệt web khác nhau (ví dụ: Google Chrome và Mozilla Firefox), đăng nhập vào hai tài khoản khách hàng khác nhau.
3. Cùng truy cập vào trang mua vé và tiến hành thanh toán cho loại vé trên.
4. Nhấn nút đặt vé đồng thời trên cả 2 trình duyệt.
5. **Kết quả:** Một trình duyệt đặt thành công đơn hàng, trình duyệt còn lại hiển thị thông báo lỗi lập tức: *"Tickets are sold out for zone..."*. Số lượng vé trong database giảm từ 1 về 0, không bị âm.

---

## 4. Ghi chú Kỹ thuật
* Phương pháp Atomic Update này tránh được việc sử dụng Pessimistic Locking (`SELECT ... FOR UPDATE`), giúp tăng băng thông xử lý (throughput) của hệ thống lên gấp nhiều lần do không làm treo các luồng đọc dữ liệu (Read Operations) của người dùng khác khi họ chỉ xem thông tin vé.
