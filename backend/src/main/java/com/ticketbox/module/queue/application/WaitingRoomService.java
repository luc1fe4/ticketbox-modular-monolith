package com.ticketbox.module.queue.application;

import com.ticketbox.infrastructure.redis.RateLimitProperties;
import com.ticketbox.infrastructure.redis.TokenBucketRateLimiter;
import com.ticketbox.module.concert.ConcertOrderPort;
import com.ticketbox.module.concert.ConcertView;
import com.ticketbox.module.queue.QueueAccessPort;
import com.ticketbox.module.queue.web.dto.QueueStatusResponse;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import com.ticketbox.shared.util.RedisKeyConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaitingRoomService implements QueueAccessPort {

    private static final RateLimitProperties.Policy JOIN_POLICY =
            new RateLimitProperties.Policy(20, 10, Duration.ofSeconds(10));
    private static final RateLimitProperties.Policy STATUS_POLICY =
            new RateLimitProperties.Policy(60, 30, Duration.ofSeconds(10));

    private static final RedisScript<Long> JOIN_SCRIPT = RedisScript.of(
            """
            if redis.call('get', KEYS[3]) then
                return 0
            end

            redis.call('del', KEYS[4])

            if redis.call('zscore', KEYS[1], ARGV[1]) == false then
                local sequence = redis.call('incr', KEYS[2])
                redis.call('zadd', KEYS[1], sequence, ARGV[1])
            end

            return 1
            """,
            Long.class
    );

    private static final RedisScript<Long> JOIN_WAITING_ROOM_SCRIPT = RedisScript.of(
            """
            if redis.call('get', KEYS[3]) then
                return 0
            end

            redis.call('del', KEYS[4])

            if redis.call('zscore', KEYS[1], ARGV[1]) == false then
                local sequence = redis.call('incr', KEYS[2])
                redis.call('zadd', KEYS[1], sequence, ARGV[1])
            end

            return 1
            """,
            Long.class
    );

    private static final RedisScript<List> STATUS_SCRIPT = RedisScript.of(
            """
            redis.call('zremrangebyscore', KEYS[2], '-inf', ARGV[2])

            local existing_session = redis.call('get', KEYS[3])
            if existing_session then
                local ttl = redis.call('pttl', KEYS[3])
                local expires_at = tonumber(ARGV[2])
                if ttl > 0 then
                    expires_at = expires_at + ttl
                end
                return {'ADMITTED', '', '', '0', existing_session, tostring(expires_at)}
            end

            if redis.call('exists', KEYS[4]) == 1 then
                return {'LEFT', '', '', '', '', ''}
            end

            local rank = redis.call('zrank', KEYS[1], ARGV[1])
            if rank == false then
                return {'EXPIRED', '', '', '', '', ''}
            end

            local active = redis.call('zcard', KEYS[2])
            local capacity = tonumber(ARGV[4])
            local available = capacity - active

            if available > 0 and rank < available then
                redis.call('zrem', KEYS[1], ARGV[1])
                local expires_at = tonumber(ARGV[2]) + tonumber(ARGV[3])
                redis.call('zadd', KEYS[2], expires_at, ARGV[1])
                redis.call('psetex', KEYS[3], ARGV[3], ARGV[5])
                return {'ADMITTED', '', '', '0', ARGV[5], tostring(expires_at)}
            end

            -- A shopper who has already been admitted is consuming capacity, but is
            -- no longer in front of anyone in the queue. Keeping those two concepts
            -- separate means the next queued fan is correctly shown as position 1.
            local people_ahead = rank
            local position = people_ahead + 1
            local estimated = math.max(tonumber(ARGV[6]), math.ceil((active + people_ahead) / capacity) * tonumber(ARGV[6]))
            return {'WAITING', tostring(position), tostring(people_ahead), tostring(estimated), '', ''}
            """,
            List.class
    );

    private static final RedisScript<Long> LEAVE_SCRIPT = RedisScript.of(
            """
            redis.call('zrem', KEYS[1], ARGV[1])
            redis.call('zrem', KEYS[2], ARGV[1])
            redis.call('del', KEYS[3])
            redis.call('psetex', KEYS[4], ARGV[2], '1')
            return 1
            """,
            Long.class
    );

    private static final RedisScript<Long> FINISH_SESSION_SCRIPT = RedisScript.of(
            """
            redis.call('zrem', KEYS[1], ARGV[1])
            redis.call('zrem', KEYS[2], ARGV[1])
            redis.call('del', KEYS[3])
            return 1
            """,
            Long.class
    );

    private final StringRedisTemplate redisTemplate;
    private final ConcertOrderPort concertOrderPort;
    private final TokenBucketRateLimiter rateLimiter;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Value("${ticketbox.queue.admission-capacity:1}")
    private int admissionCapacity;

    @Value("${ticketbox.queue.shopping-session-ttl:PT10M}")
    private Duration sessionTtl;

    @Value("${ticketbox.queue.estimated-service-seconds:45}")
    private long estimatedServiceSeconds;

    @Value("${ticketbox.queue.waiting-room-open-before:PT1H}")
    private Duration waitingRoomOpenBefore = Duration.ofHours(1);

    public QueueStatusResponse join(UUID concertId, UUID userId) {
        ConcertView concert = validateConcertForWaitingRoom(concertId);
        consumeRateLimit(userId, "join", JOIN_POLICY);

        if (isBeforeSaleStart(concert)) {
            redisTemplate.execute(
                    JOIN_WAITING_ROOM_SCRIPT,
                    List.of(waitingRoomKey(concertId), waitingRoomSequenceKey(concertId), sessionKey(concertId, userId), leftKey(concertId, userId)),
                    userId.toString()
            );
            return waitingRoomStatus(concertId, userId);
        }

        ensureQueueDrawn(concertId);

        String token = UUID.randomUUID().toString();
        redisTemplate.execute(
                JOIN_SCRIPT,
                List.of(queueKey(concertId), sequenceKey(concertId), sessionKey(concertId, userId), leftKey(concertId, userId)),
                userId.toString()
        );
        return status(concertId, userId, token);
    }

    public QueueStatusResponse status(UUID concertId, UUID userId) {
        ConcertView concert = validateConcertForWaitingRoom(concertId);
        consumeRateLimit(userId, "status", STATUS_POLICY);
        if (isBeforeSaleStart(concert)) {
            return waitingRoomStatus(concertId, userId);
        }
        ensureQueueDrawn(concertId);
        return status(concertId, userId, UUID.randomUUID().toString());
    }

    public QueueStatusResponse leave(UUID concertId, UUID userId) {
        redisTemplate.execute(
                LEAVE_SCRIPT,
                List.of(queueKey(concertId), activeKey(concertId), sessionKey(concertId, userId), leftKey(concertId, userId)),
                userId.toString(),
                Long.toString(RedisKeyConstants.TTL_QUEUE_LEFT_MARKER.toMillis())
        );
        redisTemplate.opsForZSet().remove(waitingRoomKey(concertId), userId.toString());
        eventPublisher.publishEvent(new com.ticketbox.shared.event.UserLeftQueueEvent(concertId, userId));
        return new QueueStatusResponse(QueueStatus.LEFT, null, null, null, null, null, 0L, 0L, 0L);
    }

    /** Creates the randomized queue at sale time even if no browser happens to request a status then. */
    @Scheduled(fixedDelayString = "${ticketbox.queue.snapshot-check-interval-ms:1000}")
    public void createDueQueueSnapshots() {
        String prefix = RedisKeyConstants.WAITING_ROOM_CONCERT;
        Set<String> waitingRooms = redisTemplate.keys(prefix + "*");
        if (waitingRooms == null || waitingRooms.isEmpty()) return;

        OffsetDateTime now = OffsetDateTime.now();
        for (String key : waitingRooms) {
            try {
                UUID concertId = UUID.fromString(key.substring(prefix.length()));
                concertOrderPort.findConcertById(concertId)
                        .filter(concert -> "ON_SALE".equals(concert.status()))
                        .filter(concert -> concert.saleStartAt() != null && !concert.saleStartAt().isAfter(now))
                        .filter(concert -> concert.saleEndAt() == null || !concert.saleEndAt().isBefore(now))
                        .ifPresent(concert -> ensureQueueDrawn(concertId));
            } catch (RuntimeException exception) {
                log.warn("Could not create waiting-room queue snapshot for Redis key {}", key, exception);
            }
        }
    }

    @Override
    public void validateAccess(UUID concertId, UUID userId, String queueAccessToken) {
        if (queueAccessToken == null || queueAccessToken.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Vui lòng vào phòng chờ trước khi tạo đơn hàng");
        }

        String storedToken = redisTemplate.opsForValue().get(sessionKey(concertId, userId));
        if (!queueAccessToken.equals(storedToken)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Phiên mua vé của bạn không còn hoạt động hoặc đã hết hạn");
        }
    }

    @Override
    public void finishShoppingSession(UUID concertId, UUID userId) {
        redisTemplate.execute(
                FINISH_SESSION_SCRIPT,
                List.of(queueKey(concertId), activeKey(concertId), sessionKey(concertId, userId)),
                userId.toString()
        );
    }

    private QueueStatusResponse status(UUID concertId, UUID userId, String candidateToken) {
        List<?> raw = redisTemplate.execute(
                STATUS_SCRIPT,
                List.of(queueKey(concertId), activeKey(concertId), sessionKey(concertId, userId), leftKey(concertId, userId)),
                userId.toString(),
                Long.toString(Instant.now().toEpochMilli()),
                Long.toString(sessionTtl.toMillis()),
                Integer.toString(Math.max(1, admissionCapacity)),
                candidateToken,
                Long.toString(Math.max(1, estimatedServiceSeconds))
        );

        if (raw == null || raw.isEmpty()) {
            throw new AppException(ErrorCode.REDIS_UNAVAILABLE, "Phòng chờ tạm thời không khả dụng");
        }

        QueueStatus status = QueueStatus.valueOf(String.valueOf(raw.get(0)));
        return new QueueStatusResponse(
                status,
                parseInteger(raw.get(1)),
                parseInteger(raw.get(2)),
                parseLong(raw.get(3)),
                blankToNull(raw.get(4)),
                parseExpiresAt(raw.get(5)),
                0L,
                queueSize(concertId),
                activeShoppers(concertId)
        );
    }

    public boolean isStillWaiting(UUID concertId, UUID userId) {
        QueueStatus status = status(concertId, userId).status();
        return status == QueueStatus.WAITING_ROOM || status == QueueStatus.WAITING;
    }

    private QueueStatusResponse waitingRoomStatus(UUID concertId, UUID userId) {
        if (Boolean.TRUE.equals(redisTemplate.hasKey(leftKey(concertId, userId)))) {
            return new QueueStatusResponse(QueueStatus.LEFT, null, null, null, null, null, 0L, 0L, 0L);
        }
        Long rank = redisTemplate.opsForZSet().rank(waitingRoomKey(concertId), userId.toString());
        if (rank == null) {
            return new QueueStatusResponse(QueueStatus.EXPIRED, null, null, null, null, null, 0L, 0L, 0L);
        }
        return new QueueStatusResponse(QueueStatus.WAITING_ROOM, null, null, null, null, null, waitingRoomCount(concertId), 0L, 0L);
    }

    private ConcertView validateConcertForWaitingRoom(UUID concertId) {
        ConcertView concert = concertOrderPort.findConcertById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Không tìm thấy concert"));
        if (!"ON_SALE".equals(concert.status())) {
            throw new AppException(ErrorCode.CONCERT_NOT_ON_SALE, "Concert hiện không mở bán");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (concert.saleStartAt() == null || concert.saleStartAt().minus(waitingRoomOpenBefore).isAfter(now)) {
            throw new AppException(ErrorCode.SALE_NOT_OPEN, "Phòng chờ mở trước thời điểm bán vé một giờ");
        }
        if (concert.saleEndAt() != null && concert.saleEndAt().isBefore(now)) {
            throw new AppException(ErrorCode.SALE_NOT_OPEN, "Thời gian bán vé đã kết thúc");
        }
        return concert;
    }

    private boolean isBeforeSaleStart(ConcertView concert) {
        return concert.saleStartAt().isAfter(OffsetDateTime.now());
    }

    private void ensureQueueDrawn(UUID concertId) {
        String stateKey = drawStateKey(concertId);
        if ("READY".equals(redisTemplate.opsForValue().get(stateKey))) return;

        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(drawLockKey(concertId), "1", Duration.ofSeconds(10));
        if (Boolean.TRUE.equals(acquired)) {
            try {
                if ("READY".equals(redisTemplate.opsForValue().get(stateKey))) return;
                Set<String> entrants = redisTemplate.opsForZSet().range(waitingRoomKey(concertId), 0, -1);
                List<String> randomizedEntrants = entrants == null ? new ArrayList<>() : new ArrayList<>(entrants);
                Collections.shuffle(randomizedEntrants);

                redisTemplate.executePipelined(new org.springframework.data.redis.core.SessionCallback<Object>() {
                    @Override
                    public Object execute(org.springframework.data.redis.core.RedisOperations operations) {
                        operations.delete(queueKey(concertId));
                        for (int index = 0; index < randomizedEntrants.size(); index++) {
                            operations.opsForZSet().add(queueKey(concertId), randomizedEntrants.get(index), index + 1D);
                        }
                        operations.opsForValue().set(sequenceKey(concertId), Integer.toString(randomizedEntrants.size()));
                        operations.delete(waitingRoomKey(concertId));
                        operations.opsForValue().set(stateKey, "READY");
                        return null;
                    }
                });
            } finally {
                redisTemplate.delete(drawLockKey(concertId));
            }
            return;
        }

        for (int attempt = 0; attempt < 20; attempt++) {
            if ("READY".equals(redisTemplate.opsForValue().get(stateKey))) return;
            try {
                Thread.sleep(25);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        if (!"READY".equals(redisTemplate.opsForValue().get(stateKey))) {
            throw new AppException(ErrorCode.REDIS_UNAVAILABLE, "Phòng chờ đang chuẩn bị hàng đợi. Vui lòng thử lại");
        }
    }

    private void consumeRateLimit(UUID userId, String action, RateLimitProperties.Policy policy) {
        String key = RedisKeyConstants.RATE_LIMIT_USER + userId + ":queue:" + action;
        if (!rateLimiter.tryConsume(key, policy)) {
            throw new AppException(ErrorCode.RATE_LIMIT_EXCEEDED, "Bạn gửi quá nhiều yêu cầu vào hàng chờ. Vui lòng thử lại sau");
        }
    }

    private String queueKey(UUID concertId) {
        return RedisKeyConstants.QUEUE_CONCERT + concertId;
    }

    private String sequenceKey(UUID concertId) {
        return RedisKeyConstants.QUEUE_SEQUENCE + concertId;
    }

    private String waitingRoomKey(UUID concertId) {
        return RedisKeyConstants.WAITING_ROOM_CONCERT + concertId;
    }

    private String waitingRoomSequenceKey(UUID concertId) {
        return RedisKeyConstants.WAITING_ROOM_SEQUENCE + concertId;
    }

    private String drawStateKey(UUID concertId) {
        return RedisKeyConstants.QUEUE_DRAW_STATE + concertId;
    }

    private String drawLockKey(UUID concertId) {
        return RedisKeyConstants.QUEUE_DRAW_LOCK + concertId;
    }

    private String activeKey(UUID concertId) {
        return RedisKeyConstants.QUEUE_ACTIVE + concertId;
    }

    private String sessionKey(UUID concertId, UUID userId) {
        return RedisKeyConstants.QUEUE_SESSION + concertId + ":" + userId;
    }

    private String leftKey(UUID concertId, UUID userId) {
        return RedisKeyConstants.QUEUE_LEFT + concertId + ":" + userId;
    }

    private long waitingRoomCount(UUID concertId) {
        return zCard(waitingRoomKey(concertId));
    }

    private long queueSize(UUID concertId) {
        return zCard(queueKey(concertId));
    }

    private long activeShoppers(UUID concertId) {
        return zCard(activeKey(concertId));
    }

    private long zCard(String key) {
        Long value = redisTemplate.opsForZSet().zCard(key);
        return value == null ? 0L : value;
    }

    private Integer parseInteger(Object value) {
        String text = blankToNull(value);
        return text == null ? null : Integer.valueOf(text);
    }

    private Long parseLong(Object value) {
        String text = blankToNull(value);
        return text == null ? null : Long.valueOf(text);
    }

    private OffsetDateTime parseExpiresAt(Object value) {
        Long millis = parseLong(value);
        return millis == null ? null : OffsetDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneOffset.UTC);
    }

    private String blankToNull(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value);
        return text.isBlank() ? null : text;
    }
}
