package com.ticketbox.module.checkin.domain;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity mapping the `checkin_logs` table.
 * Records each check-in event at a concert gate, including offline scans.
 */
@Entity
@Table(name = "checkin_logs")
public class CheckinLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "ticket_id", nullable = false, unique = true)
    private UUID ticketId;

    @Column(name = "concert_id", nullable = false)
    private UUID concertId;

    @Column(name = "staff_id")
    private UUID staffId;

    @Column(name = "device_id", length = 255)
    private String deviceId;

    @Column(name = "checked_at", nullable = false)
    private OffsetDateTime checkedAt;

    @Column(name = "sync_at")
    private OffsetDateTime syncAt;

    @Column(name = "is_offline", nullable = false)
    private boolean isOffline = false;

    @Column(name = "gate", length = 50)
    private String gate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTicketId() { return ticketId; }
    public void setTicketId(UUID ticketId) { this.ticketId = ticketId; }

    public UUID getConcertId() { return concertId; }
    public void setConcertId(UUID concertId) { this.concertId = concertId; }

    public UUID getStaffId() { return staffId; }
    public void setStaffId(UUID staffId) { this.staffId = staffId; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public OffsetDateTime getCheckedAt() { return checkedAt; }
    public void setCheckedAt(OffsetDateTime checkedAt) { this.checkedAt = checkedAt; }

    public OffsetDateTime getSyncAt() { return syncAt; }
    public void setSyncAt(OffsetDateTime syncAt) { this.syncAt = syncAt; }

    public boolean isOffline() { return isOffline; }
    public void setOffline(boolean offline) { isOffline = offline; }

    public String getGate() { return gate; }
    public void setGate(String gate) { this.gate = gate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
