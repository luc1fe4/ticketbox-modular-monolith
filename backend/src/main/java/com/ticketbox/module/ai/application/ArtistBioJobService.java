package com.ticketbox.module.ai.application;

import com.ticketbox.module.ai.domain.ArtistPdfJob;
import com.ticketbox.module.ai.domain.ArtistPdfJobRepository;
import com.ticketbox.module.ai.infrastructure.ArtistPdfFileStorage;
import com.ticketbox.module.ai.infrastructure.StoredArtistPdf;
import com.ticketbox.module.ai.web.dto.ArtistBioJobResponse;
import com.ticketbox.module.concert.ConcertArtistBioPort;
import com.ticketbox.module.concert.ConcertReportingPort;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ArtistBioJobService {

    private static final List<ArtistPdfJob.Status> DEDUPLICATED_STATUSES =
            List.of(
                    ArtistPdfJob.Status.PENDING,
                    ArtistPdfJob.Status.PROCESSING,
                    ArtistPdfJob.Status.DONE);

    private final ArtistPdfJobRepository jobRepository;
    private final ArtistPdfFileStorage fileStorage;
    private final ConcertArtistBioPort concertPort;
    private final ConcertReportingPort concertReportingPort;
    private final ApplicationEventPublisher eventPublisher;

    public ArtistBioJobService(
            ArtistPdfJobRepository jobRepository,
            ArtistPdfFileStorage fileStorage,
            ConcertArtistBioPort concertPort,
            ConcertReportingPort concertReportingPort,
            ApplicationEventPublisher eventPublisher) {
        this.jobRepository = jobRepository;
        this.fileStorage = fileStorage;
        this.concertPort = concertPort;
        this.concertReportingPort = concertReportingPort;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public Page<ArtistBioJobResponse> list(
            UUID requesterId,
            boolean admin,
            UUID concertId,
            ArtistPdfJob.Status status,
            Pageable pageable) {
        Specification<ArtistPdfJob> specification = Specification.where(null);

        if (concertId != null) {
            concertPort.requireAccessibleConcert(concertId, requesterId, admin);
            specification = specification.and(
                    (root, query, builder) -> builder.equal(root.get("concertId"), concertId));
        } else if (!admin) {
            List<UUID> ownedConcertIds = concertReportingPort.findConcertIdsOwnedBy(requesterId);
            specification = specification.and((root, query, builder) ->
                    ownedConcertIds.isEmpty()
                            ? builder.disjunction()
                            : root.get("concertId").in(ownedConcertIds));
        }

        if (status != null) {
            specification = specification.and(
                    (root, query, builder) -> builder.equal(root.get("status"), status));
        }

        return jobRepository.findAll(specification, pageable).map(ArtistBioJobResponse::from);
    }

    @Transactional
    public ArtistPdfJob submit(
            UUID concertId,
            MultipartFile file,
            UUID requesterId,
            boolean admin) {
        concertPort.requireAccessibleConcert(concertId, requesterId, admin);

        StoredArtistPdf stored = fileStorage.store(concertId, file);
        try {
            ArtistPdfJob duplicate = jobRepository
                    .findFirstByConcertIdAndFileChecksumAndStatusInOrderByCreatedAtDesc(
                            concertId,
                            stored.checksum(),
                            DEDUPLICATED_STATUSES)
                    .orElse(null);
            if (duplicate != null) {
                fileStorage.deleteQuietly(stored.path());
                return duplicate;
            }

            ArtistPdfJob job = new ArtistPdfJob(
                    concertId,
                    stored.path().toString(),
                    stored.originalFileName(),
                    requesterId,
                    stored.checksum());
            ArtistPdfJob saved = jobRepository.save(job);
            eventPublisher.publishEvent(new ArtistBioJobSubmittedEvent(saved.getId()));
            return saved;
        } catch (RuntimeException ex) {
            fileStorage.deleteQuietly(stored.path());
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public ArtistBioJobResponse get(
            UUID jobId,
            UUID requesterId,
            boolean admin) {
        ArtistPdfJob job = requireJob(jobId);
        concertPort.requireAccessibleConcert(job.getConcertId(), requesterId, admin);
        return ArtistBioJobResponse.from(job);
    }

    @Transactional
    public ArtistPdfJob retry(
            UUID jobId,
            UUID requesterId,
            boolean admin) {
        ArtistPdfJob job = requireJob(jobId);
        concertPort.requireAccessibleConcert(job.getConcertId(), requesterId, admin);
        if (job.getStatus() != ArtistPdfJob.Status.FAILED) {
            throw new AppException(
                    ErrorCode.ARTIST_BIO_JOB_NOT_READY,
                    "Only failed artist bio jobs can be retried");
        }
        Path storedPath = fileStorage.requireStoredPath(job.getFileUrl());
        if (!java.nio.file.Files.isRegularFile(storedPath)) {
            throw new AppException(
                    ErrorCode.RESOURCE_NOT_FOUND,
                    "Stored artist PDF was not found");
        }
        job.resetForRetry();
        ArtistPdfJob saved = jobRepository.save(job);
        eventPublisher.publishEvent(new ArtistBioJobSubmittedEvent(saved.getId()));
        return saved;
    }

    @Transactional
    public ArtistBioJobResponse apply(
            UUID jobId,
            UUID requesterId,
            boolean admin,
            boolean overwrite) {
        ArtistPdfJob job = requireJob(jobId);
        if (job.getStatus() != ArtistPdfJob.Status.DONE
                || job.getResultBio() == null
                || job.getResultBio().isBlank()) {
            throw new AppException(
                    ErrorCode.ARTIST_BIO_JOB_NOT_READY,
                    "Artist bio job must be DONE before it can be applied");
        }
        concertPort.applyArtistBio(
                job.getConcertId(),
                job.getResultBio(),
                requesterId,
                admin,
                overwrite);
        job.markApplied(requesterId);
        return ArtistBioJobResponse.from(jobRepository.save(job));
    }

    private ArtistPdfJob requireJob(UUID jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new AppException(
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "Artist bio job not found"));
    }
}
