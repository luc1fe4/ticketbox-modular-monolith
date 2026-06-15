package com.ticketbox.infrastructure.web;

import com.ticketbox.infrastructure.redis.RateLimitProperties;
import com.ticketbox.infrastructure.redis.TokenBucketRateLimiter;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import com.ticketbox.shared.util.RedisKeyConstants;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Locale;


@RequiredArgsConstructor
public class PurchasePaymentRateLimitInterceptor implements HandlerInterceptor {
    private final TokenBucketRateLimiter rateLimiter;
    private final RateLimitProperties properties;

    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
    {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        Bucket bucket = resolveBucket(request.getRequestURI());
        if (bucket == null) {
            return true;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        String redisKey;
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication
                instanceof AnonymousAuthenticationToken)) {
            redisKey = RedisKeyConstants.RATE_LIMIT_USER
                    + authentication.getName()
                    + ":"
                    + bucket.name().toLowerCase(Locale.ROOT);
        } else {
            redisKey = RedisKeyConstants.RATE_LIMIT_IP
                    + request.getRemoteAddr()
                    + ":"
                    + bucket.name().toLowerCase(Locale.ROOT);
        }

        RateLimitProperties.Policy policy =
                bucket == Bucket.PURCHASE
                        ? properties.purchase()
                        : properties.payment();

        if (!rateLimiter.tryConsume(redisKey, policy)) {
            throw new AppException(
                    ErrorCode.RATE_LIMIT_EXCEEDED,
                    "Too many requests. Please retry later."
            );
        }

        return true;
    }

    private Bucket resolveBucket(String uri) {
        if ("/api/orders".equals(uri)) {
            return Bucket.PURCHASE;
        }

        if (uri.startsWith("/api/mock-payments/")
                || uri.startsWith("/api/payments/")) {
            return Bucket.PAYMENT;
        }

        return null;
    }

    private enum Bucket {
        PURCHASE,
        PAYMENT
    }
}
