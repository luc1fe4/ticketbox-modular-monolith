# TicketBox - Thiết kế Queue & Mua Vé Concert (Tóm tắt)

## 1. Quy trình tổng thể

```text
Lobby
↓
Waiting Room
↓
Queue
↓
Zone Selection
↓
Reservation (Hold)
↓
Payment
↓
Ticket Issued
```

---

## 2. Waiting Room

### Mục đích

- Giảm tải cho hệ thống khi mở bán.
- Thu thập danh sách người dùng trước giờ bán.
- Chống bot và tránh spam F5.

### Ví dụ

```text
18:45 Waiting Room mở
19:00 Bắt đầu bán vé
```

Trong khoảng:

```text
18:45 -> 18:59:59
```

100.000 người có thể vào Waiting Room.

---

## 3. Tạo Queue

Khi đến giờ mở bán:

```text
19:00:00
```

Hệ thống:

1. Chụp snapshot toàn bộ session trong Waiting Room.
2. Random vị trí Queue.
3. Gán Queue Position.

Ví dụ:

```text
User A -> #100
User B -> #5231
User C -> #20000
```

### Người vào sau giờ mở bán

Ví dụ:

```text
100.000 người đã ở Waiting Room
↓
Queue được tạo
↓
50.000 người mới vào
```

Những người mới:

```text
Đứng sau toàn bộ 100.000 người ban đầu
```

Không random lại.

---

## 4. Queue

Ví dụ:

```text
43 people ahead of you
```

Nghĩa là:

```text
43 session đang được phục vụ trước bạn
```

Queue dùng để:

- Giới hạn tải hệ thống.
- Tránh quá nhiều người cùng thao tác mua vé.
- Kiểm soát số lượng người được vào mua.

---

## 5. TicketBox không có Seat

Hệ thống không bán ghế cụ thể.

Không có:

```text
A12
B15
C20
```

Chỉ có:

```text
VIP Zone
GA Zone
Fan Zone
```

Ví dụ:

```text
VIP Capacity = 500
GA Capacity = 2000
```

Người dùng chọn:

```text
VIP x 2 vé
```

thay vì chọn ghế.

---


## 6. Reservation (Hold Vé)

Khi người dùng chọn:

```text
VIP x 4
```

Tạo Reservation:

```text
Reservation
-------------------
Zone = VIP
Quantity = 4
Status = HOLDING
ExpiresAt = Now + 5 phút
```

Đồng thời:

```text
AvailableSlots -= 4
```

### Thanh toán thành công

```text
Status = CONFIRMED
```

### Timeout

Background Job:

```sql
Status = HOLDING
AND ExpiresAt < NOW()
```

Thực hiện:

```text
AvailableSlots += Quantity
Status = EXPIRED
```

---

## 8. Bao nhiêu người được vào mua cùng lúc?

Ví dụ:

```text
10.000 vé
```

Không nên cho toàn bộ người dùng vào.

Thiết kế đề xuất:

```text
Queue
↓
1000 người được vào mua
↓
Checkout
↓
Mở thêm slot khi có người hoàn tất hoặc timeout
```

Ưu điểm:

- Giảm tải DB.
- Giảm tình trạng giữ vé hàng loạt.
- Trải nghiệm ổn định.

---

## 9. Vấn đề Concurrent Access

Ví dụ:

```text
VIP còn 10 vé

A mua 4
B mua 4
C mua 4
```

Nếu chỉ:

```text
SELECT
↓
CHECK
↓
UPDATE
```

có thể bán:

```text
12 vé
```

=> Oversell.

---

## 10. Pessimistic Lock

Ví dụ:

```sql
SELECT *
FROM zone
WHERE id = 1
FOR UPDATE;
```

### Cách hoạt động

```text
A lock
↓
A xử lý
↓
A commit
↓
B mới được xử lý
```

### Ưu điểm

- Dễ hiểu.
- Không oversell.

### Nhược điểm

- Chịu tải kém.
- Nhiều request phải chờ lock.

Không phù hợp concert lớn.

---

## 11. Optimistic Lock

Thêm:

```java
@Version
private Long version;
```

### Cách hoạt động

A đọc:

```text
version = 5
```

B đọc:

```text
version = 5
```

A cập nhật:

```text
version -> 6
```

B cập nhật thất bại:

```text
OptimisticLockException
```

### Ưu điểm

- Không lock DB.
- Chạy song song tốt.

### Nhược điểm

- Có retry khi cạnh tranh cao.

---

## 12. Atomic Update

Khuyến nghị cho TicketBox.

```sql
UPDATE zones
SET available_slots = available_slots - :qty
WHERE id = :zoneId
AND available_slots >= :qty;
```

### Kết quả

Nếu:

```text
Rows Affected = 1
```

=> Thành công.

Nếu:

```text
Rows Affected = 0
```

=> Không đủ vé.

### Ưu điểm

- Không oversell.
- Không cần lock lâu.
- Scale tốt.

---

## 13. Redis

Redis dùng để:

- Cache số lượng vé còn lại.
- Giảm số lần đọc PostgreSQL.
- Tăng tốc truy vấn.

Ví dụ:

```text
VIP = 100
GA = 500
```

được lưu trong Redis.

### Vai trò

```text
User
↓
Redis
↓
Database
```

Không phải request nào cũng phải đọc DB.

---

## 14. Kiến trúc đề xuất cho TicketBox

```text
Waiting Room
↓
Random Queue Position
↓
Queue
↓
Zone Selection
↓
Atomic Update
↓
Reservation (Hold 5 phút)
↓
Payment
↓
Ticket Issued
```

---

### Đồng bộ dữ liệu

Ưu tiên:

```text
Atomic Update
+
Redis
```

Có thể bổ sung:

```text
Optimistic Lock
```

### Không khuyến nghị

```text
Pessimistic Lock
```

cho các đợt mở bán có lượng truy cập rất lớn.

---

## Kết luận

Đối với TicketBox dạng Zone-Based:

- Không cần Seat Selection.
- Chỉ quản lý Zone Capacity.
- Dùng Waiting Room + Queue để điều tiết tải.
- Dùng Reservation để giữ vé tạm thời.
- Dùng Atomic Update để tránh oversell.
- Redis hỗ trợ cache và tăng khả năng chịu tải.
- Thiết kế này gần với các hệ thống bán vé concert thực tế hơn so với việc sử dụng Pessimistic Lock.
