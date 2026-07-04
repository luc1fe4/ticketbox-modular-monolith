package com.ticketbox.module.ticket.application;

import com.ticketbox.module.auth.domain.User;
import com.ticketbox.module.auth.domain.UserRepository;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.module.concert.domain.ConcertRepository;
import com.ticketbox.module.concert.domain.TicketType;
import com.ticketbox.module.concert.domain.TicketTypeRepository;
import com.ticketbox.module.ticket.domain.Order;
import com.ticketbox.module.ticket.domain.OrderItemRepository;
import com.ticketbox.module.ticket.domain.OrderRepository;
import com.ticketbox.module.ticket.web.dto.CreateOrderRequest;
import com.ticketbox.module.ticket.web.dto.OrderItemRequest;
import com.ticketbox.module.queue.application.WaitingRoomService;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
        "spring.task.scheduling.enabled=false",
        "spring.rabbitmq.listener.simple.auto-startup=false",
        "spring.batch.jdbc.initialize-schema=always",
        "ticketbox.queue.admission-capacity=100"
        }
)
@ActiveProfiles("test")
@Testcontainers
class OrderConcurrencyIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    @Container
    static RabbitMQContainer rabbit = new RabbitMQContainer("rabbitmq:3-management-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getFirstMappedPort());
        registry.add("spring.rabbitmq.host", rabbit::getHost);
        registry.add("spring.rabbitmq.port", rabbit::getAmqpPort);
        registry.add("spring.rabbitmq.username", rabbit::getAdminUsername);
        registry.add("spring.rabbitmq.password", rabbit::getAdminPassword);
    }

    @Autowired
    private OrderService orderService;

    @Autowired
    private WaitingRoomService waitingRoomService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConcertRepository concertRepository;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Test
    @DisplayName("Inventory 10: only 10 of 50 concurrent buyers succeed")
    void concurrentBuyersCannotOversellTheLastTickets() throws Exception {
        int initialInventory = 10;
        int buyerCount = 50;
        PurchaseFixture fixture = createFixture(initialInventory, initialInventory);
        List<User> buyers = createAudienceUsers(buyerCount);

        List<AttemptResult> results = runConcurrently(
                buyerCount,
                worker -> attemptOrder(
                        fixture,
                        buyers.get(worker).getId(),
                        1,
                        "oversell-" + UUID.randomUUID()
                )
        );

        long successfulOrders = results.stream().filter(AttemptResult::success).count();
        long soldOutAttempts = results.stream()
                .filter(result -> result.errorCode() == ErrorCode.TICKET_SOLD_OUT)
                .count();
        TicketType reloadedType = ticketTypeRepository.findById(fixture.ticketType().getId()).orElseThrow();
        int storedQuantity = activeQuantity(fixture.ticketType().getId());

        printResult(
                "OVERSELL PROTECTION",
                "Initial inventory", initialInventory,
                "Concurrent buyers", buyerCount,
                "Successful orders", successfulOrders,
                "Sold-out requests", soldOutAttempts,
                "Stored order quantity", storedQuantity,
                "Remaining inventory", reloadedType.getAvailableQty()
        );

        assertThat(successfulOrders).isEqualTo(initialInventory);
        assertThat(soldOutAttempts).isEqualTo(buyerCount - initialInventory);
        assertThat(reloadedType.getAvailableQty()).isZero();
        assertThat(storedQuantity).isEqualTo(initialInventory);
        assertThat(reloadedType.getAvailableQty() + storedQuantity).isEqualTo(initialInventory);
    }

    @Test
    @DisplayName("One account cannot exceed max_per_account under concurrent requests")
    void concurrentRequestsFromOneAccountCannotExceedMaxPerAccount() throws Exception {
        int maxPerAccount = 2;
        int requestCount = 20;
        PurchaseFixture fixture = createFixture(100, maxPerAccount);
        User buyer = createAudienceUsers(1).getFirst();

        List<AttemptResult> results = runConcurrently(
                requestCount,
                worker -> attemptOrder(
                        fixture,
                        buyer.getId(),
                        maxPerAccount,
                        "account-limit-" + worker + "-" + UUID.randomUUID()
                )
        );

        TicketType reloadedType = ticketTypeRepository.findById(fixture.ticketType().getId()).orElseThrow();
        int userQuantity = orderItemRepository.sumQuantityByUserIdAndTicketTypeId(
                buyer.getId(),
                fixture.ticketType().getId(),
                List.of(Order.Status.AWAITING_PAYMENT, Order.Status.PAID)
        );
        long successfulOrders = results.stream().filter(AttemptResult::success).count();
        long rejectedByBusyLock = results.stream()
                .filter(result -> result.errorCode() == ErrorCode.INVALID_REQUEST)
                .count();
        long rejectedByLimit = results.stream()
                .filter(result -> result.errorCode() == ErrorCode.TICKET_LIMIT_EXCEEDED)
                .count();

        printResult(
                "MAX PER ACCOUNT",
                "Configured limit", maxPerAccount,
                "Concurrent requests", requestCount,
                "Quantity per request", maxPerAccount,
                "Successful orders", successfulOrders,
                "Rejected by active lock", rejectedByBusyLock,
                "Rejected by account limit", rejectedByLimit,
                "Final user quantity", userQuantity,
                "Remaining inventory", reloadedType.getAvailableQty()
        );

        assertThat(successfulOrders).isEqualTo(1);
        assertThat(userQuantity).isEqualTo(maxPerAccount);
        assertThat(reloadedType.getAvailableQty()).isEqualTo(100 - maxPerAccount);
        assertThat(results)
                .allSatisfy(result -> {
                    if (!result.success()) {
                        assertThat(result.errorCode())
                                .isIn(ErrorCode.INVALID_REQUEST, ErrorCode.TICKET_LIMIT_EXCEEDED);
                    }
                });
    }

    @Test
    @DisplayName("Concurrent requests sharing one idempotency key create one order")
    void concurrentDuplicateIdempotencyKeysCreateOnlyOneOrder() throws Exception {
        int requestCount = 20;
        PurchaseFixture fixture = createFixture(20, 20);
        User buyer = createAudienceUsers(1).getFirst();
        String sharedKey = "duplicate-" + UUID.randomUUID();

        List<AttemptResult> results = runConcurrently(
                requestCount,
                worker -> attemptOrder(fixture, buyer.getId(), 1, sharedKey)
        );

        TicketType reloadedType = ticketTypeRepository.findById(fixture.ticketType().getId()).orElseThrow();
        List<Order> userOrders = orderRepository.findByUserIdOrderByCreatedAtDesc(buyer.getId());
        int storedQuantity = orderItemRepository.sumQuantityByUserIdAndTicketTypeId(
                buyer.getId(),
                fixture.ticketType().getId(),
                List.of(Order.Status.AWAITING_PAYMENT, Order.Status.PAID)
        );
        long successfulOrders = results.stream().filter(AttemptResult::success).count();
        long duplicateRequests = results.stream()
                .filter(result -> result.errorCode() == ErrorCode.DUPLICATE_IDEMPOTENCY_KEY)
                .count();

        printResult(
                "IDEMPOTENCY",
                "Concurrent requests", requestCount,
                "Shared idempotency key", sharedKey,
                "Successful requests", successfulOrders,
                "Duplicate requests rejected", duplicateRequests,
                "Orders stored", userOrders.size(),
                "Stored ticket quantity", storedQuantity,
                "Remaining inventory", reloadedType.getAvailableQty()
        );

        assertThat(successfulOrders).isEqualTo(1);
        assertThat(userOrders).hasSize(1);
        assertThat(storedQuantity).isEqualTo(1);
        assertThat(reloadedType.getAvailableQty()).isEqualTo(19);
        assertThat(results)
                .allSatisfy(result -> {
                    if (!result.success()) {
                        assertThat(result.errorCode()).isEqualTo(ErrorCode.DUPLICATE_IDEMPOTENCY_KEY);
                    }
                });
    }

    private AttemptResult attemptOrder(
            PurchaseFixture fixture,
            UUID userId,
            int quantity,
            String idempotencyKey
    ) {
        CreateOrderRequest request = new CreateOrderRequest(
                fixture.concert().getId(),
                List.of(new OrderItemRequest(fixture.ticketType().getId(), quantity))
        );

        try {
            String queueAccessToken = waitingRoomService.join(fixture.concert().getId(), userId).queueAccessToken();
            orderService.createOrder(request, userId, idempotencyKey, queueAccessToken);
            return AttemptResult.succeeded();
        } catch (AppException exception) {
            return AttemptResult.failed(exception.getErrorCode());
        }
    }

    private PurchaseFixture createFixture(int inventory, int maxPerAccount) {
        User organizer = createUser("organizer", User.Role.ORGANIZER);

        Concert concert = new Concert();
        concert.setTitle("Concurrency proof " + UUID.randomUUID());
        concert.setVenueName("Test venue");
        concert.setVenueAddress("Test address");
        concert.setEventDate(OffsetDateTime.now().plusDays(30));
        concert.setDoorsOpenAt(OffsetDateTime.now().plusDays(30).minusHours(1));
        concert.setStatus(Concert.Status.ON_SALE);
        concert.setCreatedBy(organizer.getId());
        concert = concertRepository.saveAndFlush(concert);

        TicketType ticketType = new TicketType();
        ticketType.setConcertId(concert.getId());
        ticketType.setName("Concurrency zone");
        ticketType.setPrice(BigDecimal.valueOf(1_000_000));
        ticketType.setTotalQuantity(inventory);
        ticketType.setAvailableQty(inventory);
        ticketType.setMaxPerAccount(maxPerAccount);
        ticketType.setSaleStartAt(OffsetDateTime.now().minusHours(1));
        ticketType.setSaleEndAt(OffsetDateTime.now().plusDays(1));
        ticketType.setZoneColor("#123456");
        ticketType.setActive(true);
        ticketType = ticketTypeRepository.saveAndFlush(ticketType);

        return new PurchaseFixture(concert, ticketType);
    }

    private List<User> createAudienceUsers(int count) {
        List<User> users = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            users.add(createUser("buyer-" + i, User.Role.AUDIENCE));
        }
        return users;
    }

    private User createUser(String prefix, User.Role role) {
        User user = new User();
        user.setEmail(prefix + "-" + UUID.randomUUID() + "@ticketbox.test");
        user.setFullName("Concurrency Test User");
        user.setPasswordHash("not-used");
        user.setRole(role);
        user.setActive(true);
        return userRepository.saveAndFlush(user);
    }

    private int activeQuantity(UUID ticketTypeId) {
        return orderItemRepository.findAll().stream()
                .filter(item -> item.getTicketTypeId().equals(ticketTypeId))
                .mapToInt(item -> item.getQuantity())
                .sum();
    }

    private List<AttemptResult> runConcurrently(
            int workerCount,
            IntFunction<AttemptResult> action
    ) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(workerCount);
        CountDownLatch ready = new CountDownLatch(workerCount);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<AttemptResult>> futures = new ArrayList<>(workerCount);

        try {
            for (int worker = 0; worker < workerCount; worker++) {
                int workerIndex = worker;
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("Timed out waiting for concurrent start");
                    }
                    return action.apply(workerIndex);
                }));
            }

            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<AttemptResult> results = new ArrayList<>(workerCount);
            for (Future<AttemptResult> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            start.countDown();
            executor.shutdownNow();
            assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    private void printResult(String scenario, Object... values) {
        StringBuilder output = new StringBuilder()
                .append(System.lineSeparator())
                .append("========== ")
                .append(scenario)
                .append(" ==========")
                .append(System.lineSeparator());

        for (int index = 0; index < values.length; index += 2) {
            output.append("- ")
                    .append(values[index])
                    .append(": ")
                    .append(values[index + 1])
                    .append(System.lineSeparator());
        }

        output.append("================================")
                .append(System.lineSeparator());
        System.out.print(output);
    }

    private record PurchaseFixture(Concert concert, TicketType ticketType) {
    }

    private record AttemptResult(boolean success, ErrorCode errorCode) {
        static AttemptResult succeeded() {
            return new AttemptResult(true, null);
        }

        static AttemptResult failed(ErrorCode errorCode) {
            return new AttemptResult(false, errorCode);
        }
    }
}
