package com.ticketbox.module.ai.domain;

import com.ticketbox.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "artist_pdf_jobs")
@Getter
@NoArgsConstructor
public class ArtistPdfJob extends BaseEntity {

    public enum Status {
        PENDING, PROCESSING, DONE, FAILED
    }

    @Column(name = "concert_id", nullable = false)
    private UUID concertId;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "result_bio", columnDefinition = "TEXT")
    private String resultBio;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public void setConcertId(UUID concertId) {
        this.concertId = concertId;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public void setResultBio(String resultBio) {
        this.resultBio = resultBio;
    }

    public void setStartedAt(OffsetDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
