package com.ticketbox.infrastructure.redis;

import com.ticketbox.shared.exception.DuplicateIdempotencyKeyException;
import com.ticketbox.shared.util.RedisKeyConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IdempotencyService {
    private final StringRedisTemplate redisTemplate;

    public void checkAndStore(String key){
        String redisKey = RedisKeyConstants.IDEMPOTENCY_ORDER + key;

        Boolean isNew = redisTemplate.opsForValue()
                .setIfAbsent(redisKey, "processed", RedisKeyConstants.TTL_IDEMPOTENCY);

        if(Boolean.FALSE.equals(isNew)) {
            throw new DuplicateIdempotencyKeyException(key);
        }
    }
}
