package com.ticketbox.module.concert.domain;

import com.ticketbox.shared.entity.BaseEntity;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity mapping the `ticket_types` table.
 * Defines a category/zone of tickets within a concert (e.g. VIP, General Admission).
 */
@Entity
@Table(name = "ticket_types")
public class TicketType extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "concert_id", nullable = false)
    private UUID concertId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * Price in VND – stored as NUMERIC(12,0), no decimals needed.
     */
    @Column(name = "price", nullable = false, precision = 12, scale = 0)
    private BigDecimal price;

    @Column(name = "total_quantity", nullable = false)
    private int totalQuantity;

    @Column(name = "available_qty", nullable = false)
    private int availableQty;

    @Column(name = "max_per_account", nullable = false)
    private int maxPerAccount = 4;

    @Column(name = "sale_start_at", nullable = false)
    private OffsetDateTime saleStartAt;

    @Column(name = "sale_end_at")
    private OffsetDateTime saleEndAt;

    @Column(name = "zone_color", length = 7)
    private String zoneColor;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getConcertId() { return concertId; }
    public void setConcertId(UUID concertId) { this.concertId = concertId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public int getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(int totalQuantity) { this.totalQuantity = totalQuantity; }

    public int getAvailableQty() { return availableQty; }
    public void setAvailableQty(int availableQty) { this.availableQty = availableQty; }

    public int getMaxPerAccount() { return maxPerAccount; }
    public void setMaxPerAccount(int maxPerAccount) { this.maxPerAccount = maxPerAccount; }

    public OffsetDateTime getSaleStartAt() { return saleStartAt; }
    public void setSaleStartAt(OffsetDateTime saleStartAt) { this.saleStartAt = saleStartAt; }

    public OffsetDateTime getSaleEndAt() { return saleEndAt; }
    public void setSaleEndAt(OffsetDateTime saleEndAt) { this.saleEndAt = saleEndAt; }

    public String getZoneColor() { return zoneColor; }
    public void setZoneColor(String zoneColor) { this.zoneColor = zoneColor; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
