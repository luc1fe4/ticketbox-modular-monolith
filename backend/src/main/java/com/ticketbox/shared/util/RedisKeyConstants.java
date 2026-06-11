package com.ticketbox.shared.util;

import java.time.Duration;

public class RedisKeyConstants {
    private RedisKeyConstants() {}

    public static final String CACHE_CONCERT_LIST = "cache:concert:list";
    public static final String CACHE_CONCERT_DETAIL = "cache:concert:";
    public static final String CACHE_AVAILABILITY = "cache:availability:";
    public static final String IDEMPOTENCY_ORDER = "idempotency:order:";

    public static final Duration TTL_CONCERT_LIST = Duration.ofSeconds(60);
    public static final Duration TTL_CONCERT_DETAIL = Duration.ofSeconds(120);
    public static final Duration TTL_AVAILABILITY = Duration.ofSeconds(10);
    public static final Duration TTL_IDEMPOTENCY = Duration.ofHours(24);
}
