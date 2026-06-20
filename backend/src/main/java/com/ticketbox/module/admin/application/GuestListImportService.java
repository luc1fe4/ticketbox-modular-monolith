package com.ticketbox.module.admin.application;

import com.ticketbox.module.admin.domain.BatchLog;
import com.ticketbox.module.admin.domain.BatchLogRepository;
import com.ticketbox.module.admin.infrastructure.batch.GuestListFileStorage;
import com.ticketbox.module.admin.infrastructure.batch.GuestListImportProperties;
import com.ticketbox.module.admin.infrastructure.batch.GuestListJobRunner;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import java.io.IOException;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class GuestListImportService {

    private static final List<BatchLog.Status> DEDUPLICATED_STATUSES =
            List.of(BatchLog.Status.RUNNING, BatchLog.Status.SUCCESS, BatchLog.Status.PARTIAL);

    private final BatchLogRepository batchLogRepository;
    private final GuestListFileStorage fileStorage;
    private final GuestListImportProperties properties;
    private final GuestListJobRunner jobRunner;
    private final GuestListAccessService accessService;

    public GuestListImportService(
            BatchLogRepository batchLogRepository,
            GuestListFileStorage fileStorage,
            GuestListImportProperties properties,
            GuestListJobRunner jobRunner,
            GuestListAccessService accessService) {
        this.batchLogRepository = batchLogRepository;
        this.fileStorage = fileStorage;
        this.properties = properties;
        this.jobRunner = jobRunner;
        this.accessService = accessService;
    }

    public BatchLog submitUpload(
            UUID concertId,
            MultipartFile file,
            UUID userId,
            boolean admin) {
        accessService.requireAccess(concertId, userId, admin);
        validateUpload(file);

        Path stored = null;
        try {
            stored = fileStorage.storeUpload(concertId, file);
            return submit(
                    concertId,
                    stored,
                    safeOriginalName(file.getOriginalFilename()),
                    BatchLog.Source.UPLOAD);
        } catch (IOException ex) {
            if (stored != null) {
                fileStorage.deleteQuietly(stored);
            }
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Could not store CSV file");
        }
    }

    public BatchLog submitScheduled(UUID concertId, Path claimedFile, String originalFileName) {
        try {
            if (fileStorage.size(claimedFile) > properties.getMaxFileSize().toBytes()) {
                return rejectScheduled(
                        concertId,
                        claimedFile,
                        originalFileName,
                        "CSV exceeds configured maximum file size");
            }
            return submit(
                    concertId,
                    claimedFile,
                    safeOriginalName(originalFileName),
                    BatchLog.Source.SCHEDULED);
        } catch (IOException ex) {
            return rejectScheduled(
                    concertId,
                    claimedFile,
                    originalFileName,
                    "Could not inspect CSV file: " + ex.getMessage());
        }
    }

    private BatchLog submit(
            UUID concertId,
            Path file,
            String fileName,
            BatchLog.Source source) throws IOException {
        String checksum = fileStorage.checksum(file);
        Optional<BatchLog> existing = findDuplicate(concertId, checksum);
        if (existing.isPresent()) {
            if (source == BatchLog.Source.UPLOAD) {
                fileStorage.deleteQuietly(file);
                return existing.get();
            }
            return skipScheduled(concertId, file, fileName, checksum, existing.get());
        }

        BatchLog log = new BatchLog();
        log.setJobName("GUEST_LIST_IMPORT");
        log.setConcertId(concertId);
        log.setSource(source);
        log.setChecksum(checksum);
        log.setFileName(fileName);
        log.setFilePath(file.toString());
        log.setStartedAt(OffsetDateTime.now());
        log.setStatus(BatchLog.Status.RUNNING);

        try {
            log = batchLogRepository.saveAndFlush(log);
        } catch (DataIntegrityViolationException race) {
            BatchLog duplicate = findDuplicate(concertId, checksum).orElseThrow(() -> race);
            if (source == BatchLog.Source.UPLOAD) {
                fileStorage.deleteQuietly(file);
                return duplicate;
            }
            return skipScheduled(concertId, file, fileName, checksum, duplicate);
        }

        jobRunner.launch(log);
        return log;
    }

    private BatchLog skipScheduled(
            UUID concertId,
            Path file,
            String fileName,
            String checksum,
            BatchLog original) throws IOException {
        Path archived = fileStorage.archive(file, concertId, false);
        BatchLog skipped = new BatchLog();
        skipped.setJobName("GUEST_LIST_IMPORT");
        skipped.setConcertId(concertId);
        skipped.setSource(BatchLog.Source.SCHEDULED);
        skipped.setChecksum(checksum);
        skipped.setFileName(fileName);
        skipped.setFilePath(archived.toString());
        skipped.setStartedAt(OffsetDateTime.now());
        skipped.setCompletedAt(OffsetDateTime.now());
        skipped.setStatus(BatchLog.Status.SKIPPED);
        skipped.setErrorDetail("Duplicate of batch " + original.getId());
        return batchLogRepository.save(skipped);
    }

    private BatchLog rejectScheduled(
            UUID concertId,
            Path file,
            String fileName,
            String reason) {
        BatchLog failed = new BatchLog();
        failed.setJobName("GUEST_LIST_IMPORT");
        failed.setConcertId(concertId);
        failed.setSource(BatchLog.Source.SCHEDULED);
        failed.setFileName(safeOriginalName(fileName));
        failed.setStartedAt(OffsetDateTime.now());
        failed.setCompletedAt(OffsetDateTime.now());
        failed.setStatus(BatchLog.Status.FAILED);
        failed.setErrorDetail(reason);
        try {
            failed.setFilePath(fileStorage.quarantine(file, concertId).toString());
        } catch (IOException ex) {
            failed.setFilePath(file.toString());
            failed.setErrorDetail(reason + "; File move failed: " + ex.getMessage());
        }
        return batchLogRepository.save(failed);
    }

    private Optional<BatchLog> findDuplicate(UUID concertId, String checksum) {
        return batchLogRepository
                .findFirstByConcertIdAndChecksumAndStatusInOrderByCompletedAtDesc(
                        concertId,
                        checksum,
                        DEDUPLICATED_STATUSES);
    }

    private void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "CSV file is required");
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase(Locale.ROOT).endsWith(".csv")) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Only .csv files are accepted");
        }
        if (file.getSize() > properties.getMaxFileSize().toBytes()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "CSV exceeds maximum file size");
        }
    }

    private String safeOriginalName(String name) {
        if (name == null || name.isBlank()) {
            return "guest-list.csv";
        }
        String normalized = name.replace('\\', '/');
        String fileName = normalized.substring(normalized.lastIndexOf('/') + 1);
        String sanitized = fileName.replaceAll("[^A-Za-z0-9._-]", "_");
        return sanitized.isBlank() ? "guest-list.csv" : sanitized;
    }
}
