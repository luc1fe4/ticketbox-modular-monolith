# Java Modular Monolith Coding Convention & Skill Roadmap

Tài liệu này dùng cho đồ án Java/Spring Boot theo hướng **Modular Monolith**. Mục tiêu là giữ code dễ hiểu, dễ chia việc theo module nghiệp vụ, có thể kiểm tra ranh giới module, và đủ nghiêm túc để giải thích trong báo cáo đồ án.

## 1. Stack khuyến nghị

```text
Java 21
Spring Boot 3.x
Spring Web
Spring Security
Spring Data JPA + Hibernate
PostgreSQL
Flyway
Redis
RabbitMQ
Spring Modulith
JUnit 5
ArchUnit hoặc Spring Modulith verification
Spotless hoặc google-java-format
Checkstyle tùy mức độ nghiêm ngặt
```

Mapping nhanh nếu đã biết ASP.NET:

| ASP.NET / .NET | Java / Spring Boot |
| --- | --- |
| ASP.NET Core Web API | Spring Boot Web |
| Controller | `@RestController` |
| Service | `@Service` |
| EF Core Entity | JPA `@Entity` |
| DbContext / Repository | Spring Data JPA Repository |
| EF Migration | Flyway hoặc Liquibase |
| appsettings.json | application.yml |
| Middleware/Auth config | Spring Security |
| BackgroundService | Scheduled job / listener / worker |

## 2. Kiến trúc nên chọn

Khuyến nghị:

```text
DDD tactical patterns vừa đủ
+ Modular Monolith
+ Clean/Hexagonal Architecture ở mức thực dụng
+ Event-driven nội bộ giữa module khi cần giảm coupling
```

Không nên biến đồ án thành microservices nếu team nhỏ. Modular monolith phù hợp hơn vì:

- Deploy đơn giản: một backend app.
- Transaction database dễ kiểm soát hơn.
- Ít chi phí vận hành hơn microservices.
- Vẫn giữ ranh giới domain rõ để sau này có thể tách service nếu thật sự cần.

Nguyên tắc chính:

```text
Module là business capability, không phải layer kỹ thuật.
Module tự sở hữu domain, service, repository, DTO của nó.
Module khác không truy cập trực tiếp repository/entity nội bộ của module này.
Giao tiếp cross-module qua public API/facade hoặc domain event.
```

## 3. Package structure khuyến nghị

Nếu muốn theo Spring Modulith mặc định, package module nên nằm trực tiếp dưới package root:

```text
com.ticketbox
├── TicketBoxApplication.java
├── concert
├── ticket
├── payment
├── checkin
├── notification
├── auth
├── admin
├── ai
├── shared
└── infrastructure
```

Ví dụ chi tiết:

```text
com.ticketbox
├── concert
│   ├── web
│   ├── application
│   ├── domain
│   ├── infrastructure
│   └── package-info.java
├── ticket
│   ├── web
│   ├── application
│   ├── domain
│   ├── infrastructure
│   └── package-info.java
├── payment
│   ├── web
│   ├── application
│   ├── domain
│   ├── infrastructure
│   └── package-info.java
├── shared
│   ├── exception
│   ├── response
│   ├── validation
│   └── util
└── infrastructure
    ├── security
    ├── redis
    ├── rabbitmq
    ├── database
    └── batch
```

Ý nghĩa các package con trong module:

```text
web             REST controller, request/response DTO
application     use case, application service, transaction boundary
domain          entity, value object, domain service, domain event
infrastructure  repository implementation, external client, adapter
```

Có thể dùng tên `api` thay cho `web`, nhưng nên thống nhất toàn project.

## 4. Nếu muốn giữ `com.ticketbox.modules.*`

Spring Modulith mặc định detect module là các package trực tiếp dưới package root của app.

Nếu main class ở:

```text
com.ticketbox.TicketBoxApplication
```

thì các package trực tiếp như sau có thể được xem là application module:

```text
com.ticketbox.concert
com.ticketbox.ticket
com.ticketbox.payment
```

Nếu project muốn giữ cấu trúc:

```text
com.ticketbox.modules.concert
com.ticketbox.modules.ticket
com.ticketbox.modules.payment
```

thì có 2 cách.

### Cách 1: `@Modulithic(additionalPackages = ...)`

Có thể khai báo:

```java
package com.ticketbox;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;

@Modulithic(additionalPackages = "com.ticketbox.modules")
@SpringBootApplication
public class TicketBoxApplication {
}
```

Cách này đúng về API, nhưng cần hiểu rõ: `additionalPackages` là **bổ sung root package**, không nhất thiết thay thế package gốc. Nếu không kiểm tra cẩn thận, mô hình module có thể bị rối vì Spring Modulith vẫn nhìn thấy các package trực tiếp dưới `com.ticketbox`.

### Cách 2: explicitly annotated - khuyến nghị nếu giữ `modules`

Cấu hình:

```yaml
spring:
  modulith:
    detection-strategy: explicitly-annotated
```

Sau đó tạo `package-info.java` trong từng module:

```java
@org.springframework.modulith.ApplicationModule
package com.ticketbox.modules.concert;
```

```java
@org.springframework.modulith.ApplicationModule
package com.ticketbox.modules.ticket;
```

Cách này rõ hơn vì package nào annotate thì package đó là module.

## 5. Cấu trúc bên trong một module

Ví dụ module `ticket`:

```text
ticket
├── web
│   ├── TicketController.java
│   ├── PurchaseTicketRequest.java
│   └── PurchaseTicketResponse.java
├── application
│   ├── PurchaseTicketService.java
│   ├── PurchaseTicketCommand.java
│   └── TicketApplicationService.java
├── domain
│   ├── Ticket.java
│   ├── TicketType.java
│   ├── TicketStatus.java
│   ├── TicketRepository.java
│   ├── TicketTypeRepository.java
│   └── TicketPurchasedEvent.java
└── infrastructure
    ├── JpaTicketRepository.java
    └── TicketQrCodeGenerator.java
```

Với Spring Data JPA, repository interface có thể đặt trong `domain` nếu xem nó là port:

```java
public interface TicketRepository extends JpaRepository<Ticket, UUID> {
}
```

Nếu muốn Hexagonal nghiêm hơn, có thể tách:

```text
domain/TicketRepository.java                 interface thuần
infrastructure/JpaTicketRepository.java       Spring Data adapter
```

Với đồ án, không cần quá nặng Hexagonal nếu làm chậm team. Điều quan trọng là module boundary rõ và code dễ đọc.

## 6. Controller phải mỏng

Controller chỉ làm các việc:

- Nhận HTTP request.
- Validate DTO bằng Bean Validation.
- Gọi application service/use case.
- Trả response DTO.

Ví dụ:

```java
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
class TicketController {

    private final PurchaseTicketService purchaseTicketService;

    @PostMapping("/purchase")
    ResponseEntity<PurchaseTicketResponse> purchase(
            @Valid @RequestBody PurchaseTicketRequest request) {
        PurchaseTicketResponse response = purchaseTicketService.purchase(request.toCommand());
        return ResponseEntity.ok(response);
    }
}
```

Không nên viết business logic, SQL, transaction phức tạp, hoặc gọi nhiều repository trực tiếp trong controller.

## 7. Application service là transaction boundary

Application service điều phối use case và thường là nơi đặt `@Transactional`.

Ví dụ:

```java
@Service
@RequiredArgsConstructor
public class PurchaseTicketService {

    private final TicketTypeRepository ticketTypeRepository;
    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public PurchaseTicketResponse purchase(PurchaseTicketCommand command) {
        TicketType ticketType = ticketTypeRepository.findByIdForUpdate(command.ticketTypeId())
                .orElseThrow(() -> new TicketTypeNotFoundException(command.ticketTypeId()));

        ticketType.reserve(command.quantity());
        Order order = Order.create(command.userId(), ticketType, command.quantity());
        orderRepository.save(order);

        eventPublisher.publishEvent(new TicketPurchasedEvent(order.getId()));

        return PurchaseTicketResponse.from(order);
    }
}
```

Quy tắc:

```text
Controller không mở transaction.
Repository không chứa business rule.
Application service điều phối use case.
Domain entity giữ invariant quan trọng nếu phù hợp.
```

## 8. Repository chỉ truy cập database

Repository không nên chứa business workflow.

Ví dụ:

```java
public interface TicketTypeRepository extends JpaRepository<TicketType, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TicketType t where t.id = :id")
    Optional<TicketType> findByIdForUpdate(UUID id);
}
```

Với bài toán bán vé, row lock hoặc optimistic locking phải được thiết kế rõ. Không nên chỉ `SELECT` rồi `UPDATE` thiếu lock trong luồng tranh chấp vé.

## 9. DTO tách khỏi Entity

Không expose JPA Entity trực tiếp qua API.

Nên có:

```text
PurchaseTicketRequest
PurchaseTicketResponse
ConcertDetailResponse
PaymentWebhookRequest
```

Lý do:

- Tránh lộ field nội bộ.
- Tránh vòng lặp JSON do relationship JPA.
- Dễ version API.
- Dễ kiểm soát validation và format response.

## 10. Validation

Validate input ở request DTO bằng Bean Validation:

```java
public record PurchaseTicketRequest(
        @NotNull UUID ticketTypeId,
        @Min(1) int quantity,
        @NotBlank String idempotencyKey
) {
    PurchaseTicketCommand toCommand() {
        return new PurchaseTicketCommand(ticketTypeId, quantity, idempotencyKey);
    }
}
```

Business validation vẫn nằm trong service/domain:

```text
vé còn đủ không
user vượt max_per_account không
concert đã mở bán chưa
order hết hạn chưa
```

## 11. Exception handling

Dùng một global handler:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    ResponseEntity<ApiErrorResponse> handleBusiness(BusinessException exception) {
        return ResponseEntity.badRequest().body(ApiErrorResponse.from(exception));
    }
}
```

Nên có exception có ý nghĩa nghiệp vụ:

```text
ConcertNotFoundException
TicketTypeSoldOutException
TicketLimitExceededException
PaymentGatewayUnavailableException
DuplicateIdempotencyKeyException
```

Không nên throw `RuntimeException("error")` tràn lan.

## 12. Naming convention

Theo Google Java Style ở mức cơ bản:

```text
Class / record / enum: UpperCamelCase
Method / field / variable: lowerCamelCase
Constant: UPPER_SNAKE_CASE
Package: lowercase, không underscore
```

Ví dụ tốt:

```text
TicketController
PurchaseTicketService
TicketTypeRepository
PaymentGatewayClient
TicketPurchasedEvent
PurchaseTicketRequest
PurchaseTicketResponse
```

Không dùng prefix `I` cho interface:

```text
Sai: IBookingRepository
Đúng: BookingRepository
```

Boolean naming:

```text
isActive
isDeleted
hasPermission
canPurchase
shouldRetry
```

## 13. Database convention

Dùng PostgreSQL và snake_case:

```text
users
ticket_types
orders
order_items
payment_logs
checkin_logs
created_at
updated_at
ticket_type_id
concert_id
```

Khuyến nghị:

```text
Primary key: UUID nếu cần dễ merge/distributed, BIGSERIAL nếu muốn đơn giản.
Timestamp: TIMESTAMPTZ.
Money VND: NUMERIC(12, 0), không dùng double/float.
Enum: VARCHAR + check constraint hoặc mapping rõ trong application.
Foreign key: khai báo rõ.
Index: tạo theo query pattern, không index bừa mọi cột.
```

## 14. Flyway migration

Không dùng cho team/staging/production:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: create
      ddl-auto: update
```

Nên dùng:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
    locations: classpath:db/migration
```

Tên file migration:

```text
V1__baseline.sql
V2__create_users.sql
V3__create_concerts.sql
V4__create_ticket_inventory.sql
V5__add_payment_logs.sql
```

Quy tắc quan trọng:

```text
Migration đã chạy ở DB của team/staging thì không sửa lại.
Muốn đổi schema thì tạo migration mới.
Chỉ sửa migration cũ nếu DB local có thể xóa trắng và chạy lại từ đầu.
```

Ví dụ:

```sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

đặt trong:

```text
V6__add_phone_to_users.sql
```

## 15. Event-driven giữa module

Không nên để module này gọi sâu vào implementation của module khác.

Không nên:

```java
paymentRepository.save(...); // gọi trực tiếp repository của payment từ ticket module
notificationService.sendEmail(...); // ticket module phụ thuộc notification implementation
```

Nên dùng event cho side effect:

```java
eventPublisher.publishEvent(new TicketPurchasedEvent(orderId));
```

Module notification lắng nghe:

```java
@Component
@RequiredArgsConstructor
class TicketPurchasedListener {

    private final NotificationService notificationService;

    @ApplicationModuleListener
    void on(TicketPurchasedEvent event) {
        notificationService.sendTicketPurchasedNotification(event.orderId());
    }
}
```

Phân biệt:

```text
Spring application event / Spring Modulith event:
  Dùng cho giao tiếp nội bộ trong cùng backend modular monolith.

RabbitMQ:
  Dùng cho message queue ngoài process, retry, worker riêng, tích hợp async bền hơn.
```

Với đồ án TicketBox:

```text
Payment success -> publish domain event nội bộ.
Notification module nhận event -> có thể ghi notification DB hoặc publish RabbitMQ.
Notification worker consume RabbitMQ -> gửi email/app/Zalo/SMS.
```

## 16. Redis convention

Redis không thay thế database chính. Postgres vẫn là source of truth.

Dùng Redis cho:

```text
Cache danh sách/chi tiết concert.
Rate limit theo IP/user.
Idempotency key cho payment/order request.
Pub/Sub nếu cần broadcast realtime giữa nhiều backend instance.
```

Key naming:

```text
cache:concert:list
cache:concert:{concertId}
rate-limit:user:{userId}
rate-limit:ip:{ipAddress}
idempotency:payment:{key}
```

Luôn đặt TTL cho key tạm:

```text
concert list cache: 30-300 giây tùy yêu cầu
idempotency key: 24 giờ
rate limit bucket: theo thuật toán chọn
```

## 17. RabbitMQ convention

RabbitMQ dùng cho async workflow và retry.

Ví dụ naming:

```text
Exchange:
  ticketbox.events

Routing key:
  ticket.purchased
  concert.cancelled
  payment.succeeded

Queue:
  notification.ticket-purchased
  notification.concert-reminder

Dead-letter queue:
  notification.ticket-purchased.dlq
```

Không dùng RabbitMQ cho phần cần transaction database tức thời như trừ tồn kho vé. Tồn kho vé nên xử lý bằng transaction trong Postgres.

## 18. Security convention

Dùng JWT stateless cho API.

Role cơ bản:

```text
AUDIENCE
ORGANIZER
STAFF
ADMIN nếu cần tách riêng
```

Kiểm tra quyền ở 2 lớp:

```text
Frontend route guard: để UX tốt hơn.
Backend Spring Security: bắt buộc, là lớp bảo vệ thật.
```

Ví dụ endpoint:

```text
GET /api/concerts                  public hoặc audience
POST /api/admin/concerts           ORGANIZER
POST /api/checkin/scan             STAFF
GET /api/admin/revenue             ORGANIZER/ADMIN
```

## 19. Testing convention

Tối thiểu nên có:

```text
Unit test cho domain rule quan trọng.
Service test cho use case mua vé/thanh toán.
Repository test nếu query custom/lock quan trọng.
Architecture test kiểm tra module không phụ thuộc sai.
```

Spring Modulith verify:

```java
class ModularityTests {

    @Test
    void verifiesModularStructure() {
        ApplicationModules.of(TicketBoxApplication.class).verify();
    }
}
```

ArchUnit cũng có thể dùng để enforce:

```text
web không gọi repository trực tiếp
module ticket không import infrastructure nội bộ của payment
shared không phụ thuộc module nghiệp vụ
```

## 20. Formatting và static analysis

Nên dùng auto formatter để tránh tranh luận style.

Khuyến nghị:

```text
google-java-format hoặc Spotless Maven Plugin
Checkstyle nếu muốn kiểm tra nghiêm
EditorConfig cho indent/line ending
```

Quy tắc thực dụng:

```text
Format tự động trước khi commit.
Không mix style trong cùng codebase.
Không để import unused.
Không để method quá dài nếu có thể tách use case rõ hơn.
```

## 21. Git và migration khi làm nhóm

Quy tắc làm nhóm:

```text
Không sửa migration đã merge vào main nếu người khác có thể đã chạy.
Mỗi thay đổi schema tạo file V tiếp theo.
Pull code mới trước khi tạo migration để tránh trùng version.
Nếu trùng version, đổi số migration trước khi merge.
Không commit file chứa secret như .env thật, Neon password, JWT secret.
```

Nên có:

```text
.env.example
.env.local không commit
.env.staging.local không commit
```

## 22. Roadmap học để làm đồ án

Thứ tự học/làm khuyến nghị:

```text
1. Java cơ bản đủ dùng: class, record, enum, interface, exception, stream cơ bản.
2. Maven: pom.xml, dependency, lifecycle.
3. Spring Boot Web: controller, service, DTO, validation.
4. JPA/Hibernate: entity, relationship, repository, transaction.
5. Flyway: migration versioning, schema history.
6. Spring Security + JWT + RBAC.
7. Redis: cache, TTL, rate limit, idempotency key.
8. RabbitMQ: exchange, queue, routing key, consumer, retry, DLQ.
9. Spring Modulith: module boundary, event, verification.
10. Docker Compose: Postgres, Redis, RabbitMQ, backend, frontend.
11. Testing: unit, integration, architecture test.
```

## 23. Checklist code review cho module mới

Trước khi merge một module/use case, kiểm tra:

```text
Controller có mỏng không?
DTO có tách khỏi Entity không?
Validation input đã đủ chưa?
Transaction đặt ở application service chưa?
Repository có bị gọi từ module khác không?
Có migration Flyway tương ứng chưa?
Migration đã chạy được từ DB trắng chưa?
Exception có trả response rõ không?
Có test cho rule quan trọng chưa?
Có vi phạm module boundary không?
Có secret nào bị commit không?
```

## 24. Kết luận convention cho TicketBox

Convention nên chọn cho TicketBox:

```text
Spring Boot 3 + Java 21
Package-by-domain
Spring Modulith để kiểm tra module boundary
Application service làm transaction boundary
DTO riêng cho API
JPA/Hibernate cho ORM
Flyway SQL migration cho database history
Postgres là source of truth
Redis cho cache/rate limit/idempotency
RabbitMQ cho async notification và retry
Google Java Style + auto format
Architecture tests cho ranh giới module
```

Nếu ưu tiên Spring Modulith chuẩn nhất, nên dùng:

```text
com.ticketbox.concert
com.ticketbox.ticket
com.ticketbox.payment
```

Nếu muốn giữ:

```text
com.ticketbox.modules.concert
```

thì nên dùng:

```text
spring.modulith.detection-strategy=explicitly-annotated
```

và annotate từng module bằng `@ApplicationModule` trong `package-info.java`.
