package com.ticketbox.module.concert.domain;

import com.ticketbox.shared.entity.BaseEntity;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity mapping the `concerts` table.
 * Represents a concert event with all its metadata.
 */
@Entity
@Table(name = "concerts")
public class Concert extends BaseEntity {

    public enum Status {
        DRAFT, ON_SALE, SOLD_OUT, CANCELLED, COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "artist_bio", columnDefinition = "TEXT")
    private String artistBio;

    @Column(name = "venue_name", nullable = false, length = 500)
    private String venueName;

    @Column(name = "venue_address", nullable = false, columnDefinition = "TEXT")
    private String venueAddress;

    @Column(name = "event_date", nullable = false)
    private OffsetDateTime eventDate;

    @Column(name = "doors_open_at")
    private OffsetDateTime doorsOpenAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.DRAFT;

    @Column(name = "seat_map_svg", columnDefinition = "TEXT")
    private String seatMapSvg;

    @Column(name = "poster_url", length = 500)
    private String posterUrl;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getArtistBio() { return artistBio; }
    public void setArtistBio(String artistBio) { this.artistBio = artistBio; }

    public String getVenueName() { return venueName; }
    public void setVenueName(String venueName) { this.venueName = venueName; }

    public String getVenueAddress() { return venueAddress; }
    public void setVenueAddress(String venueAddress) { this.venueAddress = venueAddress; }

    public OffsetDateTime getEventDate() { return eventDate; }
    public void setEventDate(OffsetDateTime eventDate) { this.eventDate = eventDate; }

    public OffsetDateTime getDoorsOpenAt() { return doorsOpenAt; }
    public void setDoorsOpenAt(OffsetDateTime doorsOpenAt) { this.doorsOpenAt = doorsOpenAt; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public String getSeatMapSvg() { return seatMapSvg; }
    public void setSeatMapSvg(String seatMapSvg) { this.seatMapSvg = seatMapSvg; }

    public String getPosterUrl() { return posterUrl; }
    public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
}
