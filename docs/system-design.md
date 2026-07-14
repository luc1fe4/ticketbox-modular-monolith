1. # **Tài liệu Thiết kế Hệ thống — TicketBox**

## **1\. Tổng quan kiến trúc**

### **1.1 Lựa chọn kiến trúc**

Hệ thống TicketBox được xây dựng theo mô hình Modular Monolith — một tiến trình triển khai duy nhất nhưng được tổ chức nội bộ thành các module độc lập theo ranh giới nghiệp vụ.  
Quyết định này xuất phát từ các yếu tố thực tiễn của dự án. Kiến trúc microservices giải quyết bài toán mở rộng theo tổ chức — phù hợp khi nhiều nhóm phát triển độc lập cần triển khai riêng lẻ — nhưng đi kèm với chi phí vận hành đáng kể: distributed tracing, service mesh, xác thực liên dịch vụ, và quản lý tính nhất quán phân tán. Với quy mô một nhóm phát triển duy nhất, những chi phí này không mang lại lợi ích tương xứng.  
Modular Monolith cho phép áp dụng nguyên tắc phân tách theo domain mà không phát sinh overhead của hệ thống phân tán. Đặc biệt, các nghiệp vụ cốt lõi như mua vé và thanh toán yêu cầu tính nhất quán ACID nghiêm ngặt — điều kiện này được đảm bảo tự nhiên trong một transaction cơ sở dữ liệu duy nhất, thay vì phải triển khai Saga Pattern phức tạp như trong kiến trúc microservices. Đồng thời, ranh giới module được thiết kế rõ ràng từ đầu, tạo nền tảng để tách thành microservices trong tương lai nếu quy mô hệ thống yêu cầu.

### **1.2 Cấu trúc module**

Mã nguồn backend được tổ chức theo nguyên tắc package-by-domain, mỗi module đóng gói toàn bộ logic nghiệp vụ của một domain:  
com.ticketbox  
├── module  
│   ├── concert        — Quản lý concert, cấu hình loại vé, sơ đồ chỗ ngồi  
│   ├── ticket           — Mua vé, kiểm soát tồn kho, phát hành e-ticket  
│   ├── payment      — Tích hợp cổng thanh toán, xử lý webhook, idempotency  
│   ├── checkin       — Soát vé tại cổng, đồng bộ dữ liệu offline  
│   ├── notification — Gửi thông báo đa kênh theo sự kiện  
│   ├── auth             — Xác thực, phân quyền, quản lý người dùng  
│   ├── admin         — Quản trị hệ thống, thống kê doanh thu  
│   └── ai                — Xử lý tài liệu PDF, tạo artist bio tự động  
├── shared              — Xử lý ngoại lệ, base entity, tiện ích dùng chung  
└── infrastructure   — Cấu hình Redis, RabbitMQ, cơ sở dữ liệu  
Các module chỉ được giao tiếp với nhau thông qua interface công khai, không truy cập trực tiếp vào repository của module khác. Quy tắc này duy trì tính độc lập giữa các domain và ngăn chặn sự phụ thuộc ngầm định làm suy giảm khả năng bảo trì.

## **2\. Các thành phần hệ thống**

### **2.1 React Web Application**

Ứng dụng web một trang (Single Page Application) phục vụ đồng thời hai nhóm người dùng: khán giả và ban tổ chức. Phân tách quyền truy cập được thực hiện tại tầng định tuyến — route guard kiểm tra role của người dùng trước khi cho phép truy cập vào khu vực quản trị.  
Ứng dụng giao tiếp với backend qua REST API (HTTPS) cho các thao tác nghiệp vụ thông thường, và qua WebSocket (STOMP over SockJS) để nhận cập nhật số lượng vé còn lại theo thời gian thực trong giai đoạn mở bán.

### **2.2 Spring Boot API Server**

Thành phần xử lý toàn bộ logic nghiệp vụ của hệ thống. Server được thiết kế theo nguyên tắc stateless — mọi thông tin xác thực được mang trong JWT token, không lưu trạng thái phiên làm việc phía server. Thiết kế này là điều kiện tiên quyết để hệ thống có thể mở rộng theo chiều ngang bằng cách tăng số lượng instance khi cần.  
Tích hợp với các hệ thống bên ngoài (cổng thanh toán, mô hình AI) được bọc trong các lớp bảo vệ — Circuit Breaker ngăn lỗi từ dịch vụ bên ngoài lan sang các chức năng không liên quan.

### **2.3 PostgreSQL**

Cơ sở dữ liệu quan hệ đóng vai trò nguồn sự thật cho toàn bộ dữ liệu nghiệp vụ. PostgreSQL được lựa chọn dựa trên các yêu cầu cụ thể của hệ thống: đảm bảo tính toàn vẹn ACID cho luồng mua vé và thanh toán, hỗ trợ row-level locking để kiểm soát tranh chấp tồn kho, và khả năng thực hiện các truy vấn phân tích phức tạp cho tính năng thống kê doanh thu.

### **2.4 Redis**

Phục vụ ba mục đích riêng biệt trong hệ thống:

* Cache: Lưu trữ tạm thời danh sách concert và thông tin chi tiết theo chiến lược Cache-aside, giảm tải truy vấn lặp lại lên cơ sở dữ liệu trong thời điểm lưu lượng cao.  
* Rate Limiting: Duy trì bộ đếm Token Bucket theo từng địa chỉ IP và tài khoản người dùng, ngăn chặn các request lạm dụng trong giai đoạn mở bán.  
* Idempotency Store: Lưu trữ kết quả của các giao dịch đã xử lý theo idempotency key với TTL 24 giờ, đảm bảo một giao dịch thanh toán chỉ được thực hiện đúng một lần dù client gửi request trùng lặp.

### **2.5 RabbitMQ**

Message broker tách biệt luồng thông báo khỏi luồng xử lý nghiệp vụ chính. Sau khi thanh toán thành công, API server publish sự kiện vào exchange và trả về phản hồi cho người dùng ngay lập tức mà không chờ thông báo được gửi đi. Notification Worker subscribe các queue tương ứng và xử lý việc gửi thông báo bất đồng bộ với cơ chế retry tự động và Dead Letter Queue cho các thông báo thất bại.  
Thiết kế này đảm bảo lỗi ở tầng thông báo (SMTP chậm, Zalo OA lỗi tạm thời) không ảnh hưởng đến trải nghiệm mua vé. Đồng thời, việc thêm kênh thông báo mới trong tương lai (SMS, push notification) chỉ cần bổ sung consumer mới mà không cần thay đổi luồng nghiệp vụ hiện có.

### **2.6 Mobile Application (Soát vé)**

Ứng dụng di động dành riêng cho nhân sự soát vé tại cổng. Trước khi sự kiện diễn ra, ứng dụng tải toàn bộ danh sách vé hợp lệ về bộ nhớ cục bộ (SQLite). Trong quá trình soát vé, mọi thao tác quét mã QR và ghi nhận kết quả được thực hiện hoàn toàn trên thiết bị mà không phụ thuộc kết nối mạng. Dữ liệu được đồng bộ lên server theo batch khi kết nối được phục hồi.

### **2.7 Spring Batch — CSV Import Job**

Tác vụ định kỳ chạy tự động vào 3:00 sáng mỗi ngày trước sự kiện, đọc file CSV danh sách khách mời do nhãn hàng tài trợ cung cấp, thực hiện kiểm tra dữ liệu, loại bỏ trùng lặp, và cập nhật vào cơ sở dữ liệu theo cơ chế upsert. Toàn bộ quá trình được ghi log chi tiết; nếu tỷ lệ lỗi vượt ngưỡng cho phép, hệ thống gửi cảnh báo và giữ nguyên dữ liệu cũ thay vì ghi đè.

## **3\. Triển khai hệ thống**

### **3.1 Môi trường phát triển và demo**

Toàn bộ hệ thống được đóng gói bằng Docker Compose, cho phép khởi động môi trường đầy đủ bằng một lệnh duy nhất. Cấu hình bao gồm các container cho Spring Boot API, React (được serve bởi Nginx), PostgreSQL, Redis, và RabbitMQ.

### **3.2 Khả năng mở rộng theo chiều ngang**

Do API server được thiết kế stateless, hệ thống có thể mở rộng bằng cách chạy nhiều instance song song phía sau một load balancer. Điều kiện để mở rộng theo chiều ngang đã được đảm bảo trong thiết kế:

* Xác thực: JWT không lưu trạng thái phía server — mọi instance đều xác thực được token của nhau.  
* Shared state: Rate limit counter, idempotency key, và cache đều nằm trên Redis dùng chung — không có state nào nằm trong bộ nhớ của từng instance.  
* WebSocket: Broadcast số vé còn lại được thực hiện qua Redis Pub/Sub — đảm bảo message được lan truyền đến tất cả instance, từ đó đến tất cả client đang kết nối.  
* Scheduled tasks: Tác vụ Spring Batch được bảo vệ bằng distributed lock (ShedLock) để đảm bảo chỉ một instance thực thi tại một thời điểm, tránh import CSV trùng lặp.

