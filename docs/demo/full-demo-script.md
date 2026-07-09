# TicketBox Full Demo Script

Tai lieu nay dung de demo end-to-end TicketBox theo code hien tai. Moi kich ban deu co muc tieu, buoc thao tac, cach kiem tra va output mong doi.

## 0. Chuan bi moi truong

### 0.1. Chay full stack

Chay tai thu muc goc repo:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Mo cac man hinh:

| Dich vu | URL | Output mong doi |
| --- | --- | --- |
| Web frontend | http://localhost:5173 | Trang ban ve hien danh sach concert |
| Backend health | http://localhost:8080/api/health | JSON thanh cong hoac chuoi OK |
| MailHog | http://localhost:8025 | Inbox rong hoac co email demo |
| RabbitMQ Management | http://localhost:15672 | Login duoc voi `ticketbox` / `ticketbox` |

Neu can reset sach du lieu demo, dung khi khong can giu database local:

```powershell
docker compose down -v
docker compose up --build
```

### 0.2. Tai khoan demo

| Role | Email | Password | Man hinh chinh |
| --- | --- | --- | --- |
| Audience | `audience@ticketbox.com` | `password123` | `/`, `/my-tickets`, `/profile`, `/notifications` |
| Staff | `staff@ticketbox.com` | `password123` | `/staff`, `/staff/check-in`, `/staff/guests`, `/staff/history` |
| Organizer | `organizer@ticketbox.com` | `password123` | `/organizer` |
| Admin | `admin@ticketbox.com` | `password123` | `/admin` |

Du lieu seed co concert mua ve chinh:

| Du lieu | ID |
| --- | --- |
| Concert mua ve | `10000000-0000-0000-0000-000000000001` |
| SVIP | `20000000-0000-0000-0000-000000000001` |
| VIP | `20000000-0000-0000-0000-000000000002` |
| CAT1 | `20000000-0000-0000-0000-000000000003` |
| GA | `20000000-0000-0000-0000-000000000004` |

Du lieu seed cho check-in/mobile scanner:

| Du lieu | ID |
| --- | --- |
| Concert check-in demo | `70000000-0000-0000-0000-000000000001` |
| Ticket type check-in demo | `70000000-0000-0000-0000-000000000101` |

## 1. Demo public catalog

Muc tieu: chung minh khach chua dang nhap van xem duoc concert public.

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Mo http://localhost:5173 | Nhin trang homepage | Danh sach concert hien ra, co poster, ten concert, venue, ngay dien |
| 2 | Bam vao mot concert, nen chon `Anh Trai Say Hi Live 2026` | URL thanh `/concerts/{id}` | Man hinh chi tiet concert hien seat map, mo ta, hang ve |
| 3 | Chua dang nhap, bam nut mua/chon ve | Quan sat dieu huong | Bi dua den login hoac yeu cau dang nhap truoc khi vao waiting room |
| 4 | Mo DevTools Network goi `GET /api/concerts` | Status code | `200 OK`, khong can token |

Noi dung thuyet minh:

```text
Day la lop public cua TicketBox. Nguoi dung co the xem su kien va thong tin ve ma chua can dang nhap. Cac hanh dong co tac dong den inventory nhu giu ve, tao order, thanh toan moi yeu cau role AUDIENCE.
```

## 2. Demo authentication va RBAC

Muc tieu: chung minh moi role chi vao dung workspace cua minh.

### 2.1. Audience

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Login `audience@ticketbox.com` / `password123` | Header hien thong tin user | Dang nhap thanh cong |
| 2 | Go truc tiep `http://localhost:5173/admin` | Quan sat URL | Bi redirect ve trang phu hop, khong vao duoc admin |
| 3 | Go truc tiep `http://localhost:5173/staff/check-in` | Quan sat URL | Bi chan, khong vao duoc staff |
| 4 | Vao `/my-tickets`, `/profile`, `/notifications` | Quan sat man hinh | Audience vao duoc cac trang ca nhan |

### 2.2. Staff

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Logout, login `staff@ticketbox.com` | Header/sidebar | Vao workspace staff |
| 2 | Mo `/staff/check-in` | Man hinh staff | Co form chon concert, cong, upload anh QR |
| 3 | Bam logo trong layout staff | Quan sat URL | Van o trong khu staff, khong quay ve trang ban ve `/` |
| 4 | Go truc tiep `/admin/users` | Quan sat URL | Bi chan vi khong phai ADMIN |

### 2.3. Organizer

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Login `organizer@ticketbox.com` | URL | Vao `/organizer` |
| 2 | Mo `/organizer/concerts`, `/organizer/ticket-types`, `/organizer/guests`, `/organizer/revenue` | Sidebar va page | Chi thay chuc nang cua nha to chuc |
| 3 | Go truc tiep `/admin/users` | Quan sat URL | Bi chan, vi quan ly user la ADMIN-only |
| 4 | Bam logo trong organizer layout | Quan sat URL | Ve `/organizer`, khong quay ve trang ban ve |

### 2.4. Admin

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Login `admin@ticketbox.com` | URL | Vao `/admin` |
| 2 | Mo `/admin/users` | Bang user | Thay danh sach user, role, trang thai active/locked |
| 3 | Mo `/admin/notifications` | Bang notification | Thay danh sach notification, retry email neu co failed email |
| 4 | Bam logo trong admin layout | Quan sat URL | Ve `/admin`, khong quay ve trang ban ve |

Kiem tra API RBAC nhanh:

```powershell
curl -i http://localhost:8080/api/admin/users
```

Output mong doi: `401 Unauthorized`.

Dang nhap audience lay token roi goi:

```powershell
curl -i -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/admin/users
```

Output mong doi: `403 Forbidden`.

## 3. Demo mua ve thanh cong bang Mock Payment

Muc tieu: di het luong nghiep vu khach mua ve: waiting room -> giu ve tam thoi -> tao order -> thanh toan -> phat hanh e-ticket -> notification/email.

### 3.1. Luong UI

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Login `audience@ticketbox.com` | Header | Dang nhap role AUDIENCE |
| 2 | Mo concert `Anh Trai Say Hi Live 2026` | URL `/concerts/10000000-0000-0000-0000-000000000001` | Trang chi tiet concert hien |
| 3 | Bam mua/chon ve | URL | Vao `/concerts/{id}/waiting-room` |
| 4 | Doi waiting room admit | Page tu dong chuyen | Chuyen sang `/concerts/{id}/seats` khi co `ADMITTED` |
| 5 | Chon 1 ve VIP hoac CAT1 bang nut `+` | Network | Goi reserve API thanh cong, so ve held tang len |
| 6 | Bam `Continue to checkout` | URL `/checkout` | Checkout hien tong tien va timer thanh toan |
| 7 | Chon `Demo payment` | Payment method | Provider la `MOCK` |
| 8 | Bam `Continue with demo payment` | Quan sat redirect | Vao trang booking confirmation thanh cong |
| 9 | Bam `View my tickets` | Trang `/my-tickets` | Ve moi xuat hien status `VALID`, co QR |
| 10 | Mo `/profile` | Tab/list orders | Order moi co status `PAID` |
| 11 | Mo `/notifications` | Danh sach notification | Co notification mua ve/thanh toan thanh cong |
| 12 | Mo MailHog `http://localhost:8025` | Inbox | Co email xac nhan mua ve hoac notification lien quan |

### 3.2. Output backend mong doi

Sau khi thanh toan thanh cong:

| Bang/nguon | Gia tri mong doi |
| --- | --- |
| `orders.status` | `PAID` |
| `orders.payment_provider` | `MOCK` |
| `tickets.status` | `VALID` |
| `notifications.channel` | Co ban ghi `APP`, co the co `EMAIL` |
| MailHog | Co email bi capture local, khong gui ra Gmail that |

Kiem tra bang API:

```powershell
curl -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/orders/my
curl -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/tickets
curl -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/notifications
```

Output mong doi: response `success: true`, order `PAID`, ticket `VALID`.

Noi dung thuyet minh:

```text
Khi khach chon ve, he thong chua tao ve that. Dau tien backend giu so luong tam thoi. Khi vao checkout, backend tao order AWAITING_PAYMENT va co thoi gian het han. Sau khi mock payment success, order chuyen PAID, ticket moi duoc generate QR, notification duoc ghi DB va email duoc day qua MailHog.
```

## 4. Demo thanh toan that bai va retry payment

Muc tieu: chung minh order that bai/chua thanh toan khong phat hanh ve, va co the retry khi con hop le.

### 4.1. Cach demo nhanh bang API

Lam cac buoc mua ve den checkout, khi order da duoc tao thi lay `orderId` trong Network tab tu response `POST /api/orders`.

Goi mock fail:

```powershell
curl -i -X POST `
  -H "Authorization: Bearer <AUDIENCE_TOKEN>" `
  http://localhost:8080/api/mock-payments/<ORDER_ID>/fail
```

Kiem tra:

```powershell
curl -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/payments/<ORDER_ID>/status
curl -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/orders/<ORDER_ID>
curl -H "Authorization: Bearer <AUDIENCE_TOKEN>" http://localhost:8080/api/tickets
```

Output mong doi:

| Noi dung | Output mong doi |
| --- | --- |
| Mock fail | `200 OK`, message xu ly fail thanh cong |
| Payment status | Order status la `PAYMENT_FAILED` hoac trang thai that bai tu service |
| Tickets | Khong co ticket moi duoc phat hanh tu order fail |
| UI confirmation | Neu quay lai UI, hien payment unsuccessful hoac order trong profile khong phai `PAID` |

### 4.2. Retry payment cho order con `AWAITING_PAYMENT`

Neu order van `AWAITING_PAYMENT` va chua het han, vao `/profile`, chon order do, bam retry payment va chon provider.

Kiem tra API:

```powershell
curl -i -X POST `
  -H "Authorization: Bearer <AUDIENCE_TOKEN>" `
  http://localhost:8080/api/orders/<ORDER_ID>/retry-payment
```

Output mong doi:

| Truong hop | Output mong doi |
| --- | --- |
| Order `AWAITING_PAYMENT`, chua het han | `200 OK`, tra order hien tai de initiate payment lai |
| Order da `PAID` | Loi conflict/khong cho retry |
| Order het han | Loi conflict/khong cho retry, ve duoc release boi job expire |

## 5. Demo payment gateway sandbox VNPAY/MoMo

Muc tieu: giai thich ranh gioi giua mock payment va thanh toan sandbox/real.

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Trong `.env`, cau hinh `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_IPN_URL` bang public tunnel | Backend co du credential de tao payment URL |
| 2 | Mua ve den checkout, chon `VNPAY` | Trinh duyet redirect sang sandbox VNPAY |
| 3 | Thanh toan tren sandbox | VNPAY goi IPN ve `/api/payments/webhooks/vnpay` |
| 4 | Quay lai `/payment/result` | UI hien ket qua, order duoc cap nhat neu IPN hop le |

Luu y demo:

```text
Neu chi chay localhost khong co ngrok/cloudflared public URL, VNPAY/MoMo sandbox khong goi duoc IPN ve backend local. Khi do nen demo Mock Payment de chung minh nghiep vu local, va giai thich VNPAY/MoMo can credential + public webhook.
```

Kiem tra webhook sai chu ky:

```powershell
curl -i "http://localhost:8080/api/payments/webhooks/vnpay?vnp_TxnRef=<ORDER_ID>&vnp_Amount=100000&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_SecureHash=invalid-demo-signature"
```

Output mong doi: VNPAY response code bao signature invalid, order khong bi mark `PAID`.

## 6. Demo notification, email va MailHog

Muc tieu: chung minh notification co 2 lop: in-app notification va email local capture.

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Sau khi mua ve thanh cong, nhin header | Notification badge | Badge so thong bao chua doc tang len |
| 2 | Vao `/notifications` | Danh sach | Co thong bao moi cua user dang login |
| 3 | Mo MailHog `http://localhost:8025` | Inbox | Co email lien quan den booking/reminder |
| 4 | Login admin, vao `/admin/notifications` | Bang notification | Thay record APP/EMAIL, status, attempts |
| 5 | Neu co email failed, bam retry | Toast/status | Notification duoc day lai vao luong gui email |
| 6 | Chon concert, bam send reminder | MailHog/admin notifications | Reminder duoc tao/gui cho user co ticket cua concert |

Output mong doi:

```text
MailHog chi capture email trong local Docker. Day la hanh vi dung: mail khong gui ra Gmail/Yahoo that neu backend dang cau hinh MAIL_HOST=mailhog.
```

## 7. Demo e-ticket va QR

Muc tieu: chung minh ve chi xuat hien sau khi thanh toan thanh cong.

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Login audience da mua ve thanh cong | Vao `/my-tickets` | Thay list ticket |
| 2 | Bam mot ticket | Modal detail | Hien Ticket ID, Zone, Status, Event date, Venue, QR |
| 3 | Kiem tra status | Label tren ticket | `VALID` |
| 4 | Dung QR nay de check-in | Staff page/mobile scanner | Lan scan dau thanh cong, ticket chuyen `USED` |
| 5 | Quay lai `/my-tickets` reload | Ticket status | Ticket do thanh `USED`, QR khong con dung de vao lai |

Neu can tao anh QR de upload vao web staff:

1. Mo ticket detail.
2. Dung screenshot/snipping tool chup vung QR.
3. Luu anh PNG/JPG.
4. Dung anh do upload o `/staff/check-in`.

## 8. Demo staff check-in

Muc tieu: staff quet QR online, chan ve sai/ve da dung, xem lich su check-in.

### 8.1. Check-in bang web staff

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Login `staff@ticketbox.com` | URL | Vao `/staff` |
| 2 | Mo `/staff/check-in` | Form | Co select concert, gate, upload QR image |
| 3 | Chon concert dung voi ve | Select | Nen chon concert cua ticket vua mua hoac concert demo |
| 4 | Nhap gate `A` | Input | Gate duoc gan vao log |
| 5 | Upload anh QR tu e-ticket | Preview/decoded QR | Page doc duoc QR va hien payload |
| 6 | Bam xac nhan check-in | Ket qua | `Check-in thanh cong`, co Ticket ID va thoi gian |
| 7 | Upload lai cung QR va check-in lai | Ket qua | Server tu choi duplicate/ve da USED |
| 8 | Mo `/staff/history` | Log table | Co log check-in moi, gate/device/time |

Output mong doi:

| Truong hop | Output |
| --- | --- |
| QR hop le, concert dung, ticket `VALID` | `SUCCESS`, ticket chuyen `USED` |
| QR scan lan 2 | `FAILED` hoac message ve da check-in |
| QR khong thuoc concert dang chon | Bi tu choi |
| QR khong doc duoc | UI bao khong tim thay ma QR trong anh |

### 8.2. Mobile scanner

Chay mobile scanner:

```powershell
cd mobile-scanner
npm install
$env:EXPO_PUBLIC_API_BASE_URL="http://localhost:8080/api"
npm run web
```

Mo app Expo Web, login:

```text
staff@ticketbox.com / password123
```

Output mong doi:

| Chuc nang | Output mong doi |
| --- | --- |
| Login staff | Vao scanner app |
| Download dataset | Co danh sach ticket valid cho concert |
| Online scan | Goi backend va tra ket qua ngay |
| Offline scan | Luu local SQLite |
| Sync offline | Day log len backend, conflict duplicate duoc bao ro |

## 9. Demo guest list

Muc tieu: organizer/admin import CSV khach moi, staff tra cuu tai cong.

### 9.1. Tao CSV hop le

Tao file `guest-list-demo.csv`:

```csv
phone,full_name,category,sponsor_name,notes
0901234567,Nguyen Van VIP,Sponsor VIP,Sponsor A,Use VIP gate
0907654321,Tran Thi Guest,Media,Partner B,Bring ID card
```

### 9.2. Admin import ngay

| Buoc | Thao tac | Cach kiem tra | Output mong doi |
| --- | --- | --- | --- |
| 1 | Login admin | Vao `/admin/guests` | Trang import guest |
| 2 | Chon concert | Select | Concert duoc gan cho guest list |
| 3 | Upload `guest-list-demo.csv` | Latest batch | Batch hien `RUNNING` roi `SUCCESS` |
| 4 | Mo detail batch | Dialog | `totalRows=2`, `successRows=2`, `errorRows=0` |

### 9.3. Organizer import theo scheduler

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Login organizer | Vao `/organizer/guests` |
| 2 | Upload CSV | Batch ban dau co the la `PENDING` |
| 3 | Doi scheduler hoac refresh | Batch chuyen `RUNNING` -> `SUCCESS/PARTIAL/FAILED` |

### 9.4. Staff tra cuu guest

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Login staff | Vao `/staff/guests` |
| 2 | Chon dung concert | Form ready |
| 3 | Nhap `0901234567` | Ket qua found, hien ten, hang, sponsor, notes |
| 4 | Nhap so khong co, vi du `0999999999` | `found=false`, UI bao khong tim thay khach |

### 9.5. CSV loi de demo validation

```csv
phone,full_name,category,sponsor_name,notes
0901234567,Nguyen Van VIP,Sponsor VIP,Sponsor A,Duplicate 1
0901234567,Nguyen Van VIP Duplicate,Sponsor VIP,Sponsor A,Duplicate 2
,Missing Phone,VIP,Sponsor C,No phone
```

Output mong doi: batch `PARTIAL` hoac `FAILED`, co `errorRows > 0`, detail hien thong tin loi.

## 10. Demo admin operations

Muc tieu: admin quan tri he thong, user, order, concert, ticket type, check-in summary, notification.

### 10.1. Admin dashboard

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Login admin | Vao `/admin` |
| 2 | Mo overview cards | Co link Concerts, Ticket types, Guests, Orders, Notifications, Users |
| 3 | Bam tung card | Vao dung page con |

### 10.2. Quan ly user

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Mo `/admin/users` | Bang user |
| 2 | Doi role mot user test | Role trong bang cap nhat |
| 3 | Lock user test | User khong dang nhap duoc hoac bi chan theo status |
| 4 | Unlock lai | User active tro lai |

Khong nen doi role/lock cac account demo chinh neu dang demo lien tuc. Neu da doi nham, reset database bang `docker compose down -v`.

### 10.3. Quan ly concert va ticket type

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Mo `/admin/concerts` | Thay danh sach concert |
| 2 | Kiem tra cot check-in summary | Hien `checkedIn / totalTickets`, online/offline |
| 3 | Tao hoac sua concert neu UI cho phep | Concert luu thanh cong |
| 4 | Mo `/admin/ticket-types` | Thay zone/price/quantity |
| 5 | Sua gia/so luong ticket type chua ban | Cap nhat thanh cong |

API check-in summary:

```powershell
curl -H "Authorization: Bearer <ADMIN_TOKEN>" `
  http://localhost:8080/api/admin/concerts/70000000-0000-0000-0000-000000000001/checkin-summary
```

Output mong doi: JSON co `totalTickets`, `checkedIn`, `onlineCheckins`, `offlineCheckins`.

### 10.4. Quan ly orders

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Mo `/admin/orders` | Thay order cua tat ca user |
| 2 | Loc/xem detail | Thay status, amount, payment provider |
| 3 | Doi qua audience tao order moi | Admin orders reload thay order moi |

### 10.5. Notification operations

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Mo `/admin/notifications` | Thay notification records |
| 2 | Bam retry voi email failed | Status/attempt cap nhat, RabbitMQ/MailHog co xu ly lai |
| 3 | Chon concert va bam send reminder | Tao notification reminder cho user co ticket |

## 11. Demo organizer workspace

Muc tieu: organizer chi quan ly concert minh so huu va cac nghiep vu cua nha to chuc.

| Page | Thao tac demo | Output mong doi |
| --- | --- | --- |
| `/organizer` | Mo dashboard | Hien card Concert, Ticket types, Guests, AI Artist Bio, Revenue |
| `/organizer/concerts` | Xem danh sach concert | Chi scope organizer, khong co admin-only user management |
| `/organizer/ticket-types` | Xem/sua hang ve | Cap nhat trong pham vi concert so huu |
| `/organizer/guests` | Upload CSV scheduled | Batch `PENDING`/`RUNNING`/`SUCCESS` |
| `/organizer/artist-bio` | Upload PDF press kit | Job tao bio, review, apply |
| `/organizer/revenue` | Chon completed concert | Hien revenue summary/zone trend neu co du lieu paid/completed |
| `/organizer/orders` | Xem order | Chi thay order cua concert organizer so huu |

RBAC mong doi:

```text
Organizer khong vao duoc /admin/users, /admin/notifications, /admin/concerts/{id}/checkin-summary neu endpoint yeu cau ADMIN.
```

## 12. Demo AI Artist Bio

Muc tieu: tao artist bio tu PDF text-based, review truoc khi apply vao concert.

### 12.1. Tao PDF text nhanh

Co the dung bat ky PDF co text. Noi dung goi y:

```text
Artist: Demo Band
Demo Band is a Vietnamese pop group known for high-energy live performance, city-pop influences, and fan interaction.
Recent highlights include sold-out showcases and collaboration stages.
Tone: modern, concise, suitable for concert landing page.
```

Luu thanh PDF text-based, khong dung anh scan.

### 12.2. Demo UI

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Login admin hoac organizer | Mo `/admin/artist-bio` hoac `/organizer/artist-bio` |
| 2 | Chon concert | Select concert |
| 3 | Upload PDF | Job `PENDING` -> `PROCESSING` |
| 4 | Doi job `DONE` | Dialog hien ban draft `resultBio` |
| 5 | Bam apply | Concert artist bio duoc cap nhat |
| 6 | Mo trang public concert | Artist bio moi hien tren chi tiet concert |

Output loi mong doi:

| Truong hop | Output |
| --- | --- |
| File khong phai PDF | UI tu choi |
| PDF rong/scan anh khong co text | Job `FAILED` hoac upload bi tu choi |
| Provider AI chua co API key | Local/dev dung mock fallback neu provider `auto` |

## 13. Demo revenue report

Muc tieu: organizer xem doanh thu theo concert da completed.

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Login organizer | Vao `/organizer/revenue` |
| 2 | Chon concert completed neu co | Summary hien revenue, tickets sold, capacity, sold rate |
| 3 | Xem zone revenue | Moi hang ve co sold quantity, revenue, sold rate |
| 4 | Xem sales trend | Bieu do/bang doanh thu theo ngay |
| 5 | Export CSV/PDF neu UI/API co nut | File download thanh cong |

Neu khong co completed concert trong seed:

```text
Giai thich rang report chi tinh cho concert COMPLETED va order PAID. Day la constraint nghiep vu de khong bao cao doanh thu su kien dang ban dang dang thay doi.
```

API tham chieu:

```powershell
curl -H "Authorization: Bearer <ORGANIZER_TOKEN>" `
  http://localhost:8080/api/organizer/concerts
```

## 14. Demo order expiration va release inventory

Muc tieu: chung minh ve giu tam thoi khong bi treo vo han.

| Buoc | Thao tac | Output mong doi |
| --- | --- | --- |
| 1 | Audience vao waiting room -> seats | Duoc shopping session |
| 2 | Chon 1 ve | Available quantity giam/held quantity tang |
| 3 | Vao checkout tao order nhung khong thanh toan | Order `AWAITING_PAYMENT`, co `expiresAt` |
| 4 | Cho qua thoi gian expire hoac dung API/test setup | Scheduler chuyen order thanh `EXPIRED` |
| 5 | Kiem tra availability | So luong ve duoc release lai |

Noi dung thuyet minh:

```text
He thong co hai muc tam giu: hold trong selection va order AWAITING_PAYMENT trong checkout. Neu user thoat/chua thanh toan, job expire se release inventory de nguoi khac mua.
```

## 15. Demo rate limit, idempotency va oversell protection

Muc tieu: chung minh cac bug thuong gap trong ban ve duoc bao ve.

Chay test backend:

```powershell
cd backend
.\mvnw.cmd -B test
```

Output mong doi:

```text
BUILD SUCCESS
Tests run: 97, Failures: 0, Errors: 0
```

Trong log test co cac khoi:

| Khoi test | Y nghia | Output mong doi |
| --- | --- | --- |
| `MAX PER ACCOUNT` | Mot user khong mua qua gioi han | Chi 1 so request thanh cong, con lai bi reject |
| `IDEMPOTENCY` | Nhieu request cung key khong tao nhieu order | Chi 1 order duoc luu |
| `OVERSELL PROTECTION` | Nhieu buyer tranh ve cuoi | Khong ban qua inventory |
| Redis rate limiter | Bao ve endpoint nhay cam | Vuot nguong tra 429 hoac fail-open co log neu Redis loi |

## 16. Demo Postman/API full flow

Muc tieu: neu UI gap loi do browser/cache, van demo backend day du.

Import collection:

```text
docs/api/full API/TicketBox-FULL-Demo.postman_collection.json
```

Thu tu chay folder goi y:

1. Auth - login audience/staff/organizer/admin.
2. Public concerts - list/detail/ticket types.
3. Order/payment - create order, initiate mock, mock success/fail.
4. Tickets/notifications - list tickets, notification, MailHog.
5. Staff check-in - dataset, scan, duplicate scan, sync.
6. Admin - users, concerts, orders, notifications.
7. Organizer - revenue/guest list/artist bio.

Output mong doi:

```text
Moi request thanh cong co response shape:
{
  "success": true,
  "message": "...",
  "data": ...
}
```

Loi mong doi:

| Request | Output mong doi |
| --- | --- |
| Khong token vao admin | `401 Unauthorized` |
| Audience token vao admin | `403 Forbidden` |
| Duplicate check-in | Response failed/conflict, khong tao check-in hop le lan 2 |
| Invalid payment signature | Webhook bi tu choi, order khong `PAID` |

## 17. Checklist ket thuc demo

Sau khi demo xong, kiem tra cac diem nay de ket luan he thong hoat dong:

| Hang muc | Ket qua can co |
| --- | --- |
| Public catalog | Guest xem concert duoc |
| Auth/RBAC | Moi role vao dung workspace, logo khong dua staff/admin/organizer ve trang ban ve |
| Purchase success | Order `PAID`, ticket `VALID`, QR hien trong `/my-tickets` |
| Purchase fail | Khong tao ticket, order khong `PAID` |
| Retry payment | Chi cho retry order con payable |
| Notification | In-app notification hien, badge cap nhat |
| Email | MailHog nhan email local |
| Staff check-in | Scan lan 1 success, scan lai bi tu choi |
| Guest list | Import CSV va staff lookup duoc |
| Admin | Quan ly users/orders/notifications/check-in summary |
| Organizer | Quan ly concert/ticket/guest/revenue trong scope organizer |
| AI bio | Upload PDF, tao draft, apply vao concert |
| Test suite | Backend test, frontend build, mobile typecheck pass |

Lenh verify cuoi:

```powershell
cd backend
.\mvnw.cmd -B test

cd ..\frontend
npm run build

cd ..\mobile-scanner
npm run typecheck
```

Output mong doi: ca 3 lenh deu pass.
