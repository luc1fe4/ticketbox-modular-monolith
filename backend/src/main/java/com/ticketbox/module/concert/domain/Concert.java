package com.ticketbox.module.concert.domain;

import com.ticketbox.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "concerts")
@Getter
@NoArgsConstructor
public class Concert extends BaseEntity {

    public enum Status {
        DRAFT, ON_SALE, SOLD_OUT, CANCELLED, COMPLETED
    }

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

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setArtistBio(String artistBio) {
        this.artistBio = artistBio;
    }

    public void setVenueName(String venueName) {
        this.venueName = venueName;
    }

    public void setVenueAddress(String venueAddress) {
        this.venueAddress = venueAddress;
    }

    public void setEventDate(OffsetDateTime eventDate) {
        this.eventDate = eventDate;
    }

    public void setDoorsOpenAt(OffsetDateTime doorsOpenAt) {
        this.doorsOpenAt = doorsOpenAt;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public void setSeatMapSvg(String seatMapSvg) {
        this.seatMapSvg = seatMapSvg;
    }

    public void setPosterUrl(String posterUrl) {
        this.posterUrl = posterUrl;
    }

    public void setCreatedBy(UUID createdBy) {
        this.createdBy = createdBy;
    }
}
