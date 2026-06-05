package com.ticketbox.module.admin.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity mapping the `guest_lists` table.
 * Stores complimentary or VIP guest entries imported for a concert.
 */
@Entity
@Table(name = "guest_lists")
public class GuestList {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "concert_id", nullable = false)
    private UUID concertId;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "sponsor_name", length = 255)
    private String sponsorName;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "imported_at", nullable = false, updatable = false)
    private OffsetDateTime importedAt;

    @Column(name = "batch_file", length = 255)
    private String batchFile;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getConcertId() { return concertId; }
    public void setConcertId(UUID concertId) { this.concertId = concertId; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSponsorName() { return sponsorName; }
    public void setSponsorName(String sponsorName) { this.sponsorName = sponsorName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public OffsetDateTime getImportedAt() { return importedAt; }

    public String getBatchFile() { return batchFile; }
    public void setBatchFile(String batchFile) { this.batchFile = batchFile; }
}
