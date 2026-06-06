package com.ticketbox.module.ticket.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity mapping the `tickets` table.
 * Represents an individual issued ticket with a scannable QR code.
 */
@Entity
@Table(name = "tickets")
public class Ticket {

    public enum Status {
        VALID, USED, CANCELLED, TRANSFERRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "order_item_id", nullable = false)
    private UUID orderItemId;

    @Column(name = "ticket_type_id", nullable = false)
    private UUID ticketTypeId;

    @Column(name = "concert_id", nullable = false)
    private UUID concertId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "qr_code", nullable = false, unique = true, length = 500)
    private String qrCode;

    @Column(name = "qr_secret", nullable = false, length = 255)
    private String qrSecret;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.VALID;

    @CreationTimestamp
    @Column(name = "issued_at", nullable = false, updatable = false)
    private OffsetDateTime issuedAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getOrderItemId() { return orderItemId; }
    public void setOrderItemId(UUID orderItemId) { this.orderItemId = orderItemId; }

    public UUID getTicketTypeId() { return ticketTypeId; }
    public void setTicketTypeId(UUID ticketTypeId) { this.ticketTypeId = ticketTypeId; }

    public UUID getConcertId() { return concertId; }
    public void setConcertId(UUID concertId) { this.concertId = concertId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }

    public String getQrSecret() { return qrSecret; }
    public void setQrSecret(String qrSecret) { this.qrSecret = qrSecret; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public OffsetDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(OffsetDateTime issuedAt) { this.issuedAt = issuedAt; }

    public OffsetDateTime getUsedAt() { return usedAt; }
    public void setUsedAt(OffsetDateTime usedAt) { this.usedAt = usedAt; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
