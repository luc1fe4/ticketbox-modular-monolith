package com.ticketbox.module.payment.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity mapping the `payment_logs` table.
 * Immutable audit trail of every payment lifecycle event (webhook, success, failure, etc.).
 */
@Entity
@Table(name = "payment_logs")
public class PaymentLog {

    public enum Provider {
        VNPAY, MOMO, MOCK
    }

    public enum EventType {
        INITIATED, WEBHOOK_RECEIVED, SUCCESS, FAILED, TIMEOUT, REFUNDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private Provider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Column(name = "provider_ref", length = 255)
    private String providerRef;

    /**
     * Raw JSON payload from the payment provider stored as jsonb.
     */
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;

    @Column(name = "amount", precision = 12, scale = 0)
    private BigDecimal amount;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public Provider getProvider() { return provider; }
    public void setProvider(Provider provider) { this.provider = provider; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }

    public String getProviderRef() { return providerRef; }
    public void setProviderRef(String providerRef) { this.providerRef = providerRef; }

    public String getRawPayload() { return rawPayload; }
    public void setRawPayload(String rawPayload) { this.rawPayload = rawPayload; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
