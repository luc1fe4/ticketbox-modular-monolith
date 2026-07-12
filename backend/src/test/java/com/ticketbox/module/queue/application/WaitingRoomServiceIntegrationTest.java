package com.ticketbox.module.queue.application;

import com.ticketbox.infrastructure.redis.TokenBucketRateLimiter;
import com.ticketbox.module.concert.ConcertOrderPort;
import com.ticketbox.module.concert.ConcertView;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.module.queue.web.dto.QueueStatusResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Testcontainers
class WaitingRoomServiceIntegrationTest {

    @Container
    private static final GenericContainer<?> redis = new GenericContainer<>("redis:7")
            .withExposedPorts(6379);

    private static final UUID CONCERT_ID = UUID.randomUUID();

    private StringRedisTemplate redisTemplate;
    private WaitingRoomService service;
    private ConcertOrderPort concertOrderPort;

    @BeforeEach
    void setUp() {
        LettuceConnectionFactory connectionFactory = new LettuceConnectionFactory(redis.getHost(), redis.getFirstMappedPort());
        connectionFactory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(connectionFactory);
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();

        concertOrderPort = mock(ConcertOrderPort.class);
        when(concertOrderPort.findConcertById(CONCERT_ID))
                .thenReturn(Optional.of(new ConcertView(CONCERT_ID, "Demo Concert", "ON_SALE", OffsetDateTime.now().plusDays(1), OffsetDateTime.now().minusDays(1), OffsetDateTime.now().plusDays(2))));

        org.springframework.context.ApplicationEventPublisher eventPublisher = mock(org.springframework.context.ApplicationEventPublisher.class);
        service = new WaitingRoomService(redisTemplate, concertOrderPort, new TokenBucketRateLimiter(redisTemplate), eventPublisher);
        ReflectionTestUtils.setField(service, "admissionCapacity", 1);
        ReflectionTestUtils.setField(service, "sessionTtl", Duration.ofMillis(450));
        ReflectionTestUtils.setField(service, "estimatedServiceSeconds", 30L);
    }

    @AfterEach
    void tearDown() {
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
    }

    @Test
    void join_IsIdempotentForSameUserAndAdmitsFirstBuyer() {
        UUID userId = UUID.randomUUID();

        QueueStatusResponse first = service.join(CONCERT_ID, userId);
        QueueStatusResponse second = service.join(CONCERT_ID, userId);

        assertEquals(QueueStatus.ADMITTED, first.status());
        assertEquals(QueueStatus.ADMITTED, second.status());
        assertNotNull(first.queueAccessToken());
        assertEquals(first.queueAccessToken(), second.queueAccessToken());
        assertDoesNotThrow(() -> service.validateAccess(CONCERT_ID, userId, first.queueAccessToken()));
    }

    @Test
    void status_WaitsBehindActiveSessionThenAdmitsAfterExpiry() throws InterruptedException {
        UUID firstUser = UUID.randomUUID();
        UUID secondUser = UUID.randomUUID();

        service.join(CONCERT_ID, firstUser);
        QueueStatusResponse waiting = service.join(CONCERT_ID, secondUser);

        assertEquals(QueueStatus.WAITING, waiting.status());
        assertEquals(1, waiting.position());
        assertEquals(0, waiting.peopleAhead());
        assertEquals(1L, waiting.queueSize());
        assertEquals(1L, waiting.activeShoppers());

        Thread.sleep(520);

        QueueStatusResponse admitted = service.status(CONCERT_ID, secondUser);
        assertEquals(QueueStatus.ADMITTED, admitted.status());
        assertNotNull(admitted.queueAccessToken());
    }

    @Test
    void finishShoppingSession_ImmediatelyPromotesNextQueuedUser() {
        UUID firstUser = UUID.randomUUID();
        UUID secondUser = UUID.randomUUID();

        service.join(CONCERT_ID, firstUser);
        QueueStatusResponse waiting = service.join(CONCERT_ID, secondUser);
        assertEquals(QueueStatus.WAITING, waiting.status());

        service.finishShoppingSession(CONCERT_ID, firstUser);

        QueueStatusResponse admitted = service.status(CONCERT_ID, secondUser);
        assertEquals(QueueStatus.ADMITTED, admitted.status());
        assertNotNull(admitted.queueAccessToken());
    }

    @Test
    void validateAccess_RejectsMissingInvalidAndExpiredToken() throws InterruptedException {
        UUID userId = UUID.randomUUID();
        QueueStatusResponse admitted = service.join(CONCERT_ID, userId);

        assertThrows(AppException.class, () -> service.validateAccess(CONCERT_ID, userId, null));
        assertThrows(AppException.class, () -> service.validateAccess(CONCERT_ID, userId, "bad-token"));

        Thread.sleep(520);

        assertThrows(AppException.class, () -> service.validateAccess(CONCERT_ID, userId, admitted.queueAccessToken()));
    }

    @Test
    void join_BeforeSaleStart_PlacesUserInWaitingRoomWithoutAdmission() {
        when(concertOrderPort.findConcertById(CONCERT_ID))
                .thenReturn(Optional.of(new ConcertView(
                        CONCERT_ID,
                        "Demo Concert",
                        "ON_SALE",
                        OffsetDateTime.now().plusDays(1),
                        OffsetDateTime.now().plusMinutes(30),
                        OffsetDateTime.now().plusDays(2)
                )));

        QueueStatusResponse waitingRoom = service.join(CONCERT_ID, UUID.randomUUID());

        assertEquals(QueueStatus.WAITING_ROOM, waitingRoom.status());
        assertNull(waitingRoom.position());
        assertNull(waitingRoom.queueAccessToken());
        assertEquals(1L, waitingRoom.waitingRoomCount());
        assertEquals(0L, waitingRoom.queueSize());
    }

    @Test
    void saleStart_SnapshotsWaitingRoomThenKeepsNextFanAtTheFrontOfQueue() {
        UUID firstUser = UUID.randomUUID();
        UUID secondUser = UUID.randomUUID();
        ConcertView beforeSale = new ConcertView(
                CONCERT_ID, "Demo Concert", "ON_SALE", OffsetDateTime.now().plusDays(1),
                OffsetDateTime.now().plusMinutes(30), OffsetDateTime.now().plusDays(2));
        when(concertOrderPort.findConcertById(CONCERT_ID)).thenReturn(Optional.of(beforeSale));

        service.join(CONCERT_ID, firstUser);
        service.join(CONCERT_ID, secondUser);

        ConcertView afterSale = new ConcertView(
                CONCERT_ID, "Demo Concert", "ON_SALE", OffsetDateTime.now().plusDays(1),
                OffsetDateTime.now().minusSeconds(1), OffsetDateTime.now().plusDays(2));
        when(concertOrderPort.findConcertById(CONCERT_ID)).thenReturn(Optional.of(afterSale));

        QueueStatusResponse firstStatus = service.status(CONCERT_ID, firstUser);
        QueueStatusResponse secondStatus = service.status(CONCERT_ID, secondUser);
        QueueStatusResponse queued = firstStatus.status() == QueueStatus.WAITING ? firstStatus : secondStatus;

        assertEquals(QueueStatus.WAITING, queued.status());
        assertEquals(1, queued.position());
        assertEquals(0, queued.peopleAhead());
        assertEquals(0L, queued.waitingRoomCount());
        assertEquals(1L, queued.queueSize());
        assertEquals(1L, queued.activeShoppers());
    }
}
