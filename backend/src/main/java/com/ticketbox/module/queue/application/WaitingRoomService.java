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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
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

            local people_ahead = rank + active
            local position = people_ahead + 1
            local estimated = math.max(tonumber(ARGV[6]), math.ceil((people_ahead + 1) / capacity) * tonumber(ARGV[6]))
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

    public QueueStatusResponse join(UUID concertId, UUID userId) {
        validateConcertOnSale(concertId);
        consumeRateLimit(userId, "join", JOIN_POLICY);

        String token = UUID.randomUUID().toString();
        redisTemplate.execute(
                JOIN_SCRIPT,
                List.of(queueKey(concertId), sequenceKey(concertId), sessionKey(concertId, userId), leftKey(concertId, userId)),
                userId.toString()
        );
        return status(concertId, userId, token);
    }

    public QueueStatusResponse status(UUID concertId, UUID userId) {
        validateConcertOnSale(concertId);
        consumeRateLimit(userId, "status", STATUS_POLICY);
        return status(concertId, userId, UUID.randomUUID().toString());
    }

    public QueueStatusResponse leave(UUID concertId, UUID userId) {
        redisTemplate.execute(
                LEAVE_SCRIPT,
                List.of(queueKey(concertId), activeKey(concertId), sessionKey(concertId, userId), leftKey(concertId, userId)),
                userId.toString(),
                Long.toString(RedisKeyConstants.TTL_QUEUE_LEFT_MARKER.toMillis())
        );
        eventPublisher.publishEvent(new com.ticketbox.shared.event.UserLeftQueueEvent(concertId, userId));
        return new QueueStatusResponse(QueueStatus.LEFT, null, null, null, null, null);
    }

    @Override
    public void validateAccess(UUID concertId, UUID userId, String queueAccessToken) {
        if (queueAccessToken == null || queueAccessToken.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Join the waiting room before creating an order.");
        }

        String storedToken = redisTemplate.opsForValue().get(sessionKey(concertId, userId));
        if (!queueAccessToken.equals(storedToken)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Your shopping session is not active or has expired.");
        }
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
            throw new AppException(ErrorCode.REDIS_UNAVAILABLE, "Waiting room is temporarily unavailable.");
        }

        QueueStatus status = QueueStatus.valueOf(String.valueOf(raw.get(0)));
        return new QueueStatusResponse(
                status,
                parseInteger(raw.get(1)),
                parseInteger(raw.get(2)),
                parseLong(raw.get(3)),
                blankToNull(raw.get(4)),
                parseExpiresAt(raw.get(5))
        );
    }

    private void validateConcertOnSale(UUID concertId) {
        ConcertView concert = concertOrderPort.findConcertById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Concert not found"));
        if (!"ON_SALE".equals(concert.status())) {
            throw new AppException(ErrorCode.CONCERT_NOT_ON_SALE, "Concert is not currently on sale");
        }
    }

    private void consumeRateLimit(UUID userId, String action, RateLimitProperties.Policy policy) {
        String key = RedisKeyConstants.RATE_LIMIT_USER + userId + ":queue:" + action;
        if (!rateLimiter.tryConsume(key, policy)) {
            throw new AppException(ErrorCode.RATE_LIMIT_EXCEEDED, "Too many queue requests. Please retry later.");
        }
    }

    private String queueKey(UUID concertId) {
        return RedisKeyConstants.QUEUE_CONCERT + concertId;
    }

    private String sequenceKey(UUID concertId) {
        return RedisKeyConstants.QUEUE_SEQUENCE + concertId;
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
