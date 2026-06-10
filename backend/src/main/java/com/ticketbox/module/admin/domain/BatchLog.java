package com.ticketbox.module.admin.domain;

import com.ticketbox.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "batch_logs")
@Getter
@NoArgsConstructor
public class BatchLog extends BaseEntity {

    public enum Status {
        RUNNING, SUCCESS, PARTIAL, FAILED
    }

    @Column(name = "job_name", nullable = false, length = 100)
    private String jobName;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status;

    @Column(name = "total_rows", nullable = false)
    private int totalRows = 0;

    @Column(name = "success_rows", nullable = false)
    private int successRows = 0;

    @Column(name = "error_rows", nullable = false)
    private int errorRows = 0;

    @Column(name = "error_detail", columnDefinition = "TEXT")
    private String errorDetail;

    public void setJobName(String jobName) {
        this.jobName = jobName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setStartedAt(OffsetDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public void setSuccessRows(int successRows) {
        this.successRows = successRows;
    }

    public void setErrorRows(int errorRows) {
        this.errorRows = errorRows;
    }

    public void setErrorDetail(String errorDetail) {
        this.errorDetail = errorDetail;
    }
}
