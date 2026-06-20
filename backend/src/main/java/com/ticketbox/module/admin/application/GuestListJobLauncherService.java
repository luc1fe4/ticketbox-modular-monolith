package com.ticketbox.module.admin.application;

import com.ticketbox.module.admin.domain.BatchLog;
import com.ticketbox.module.admin.domain.BatchLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GuestListJobLauncherService {

    private final JobLauncher jobLauncher;
    private final Job importGuestListJob;
    private final BatchLogRepository batchLogRepository;

    @Transactional
    public BatchLog createInitialLog(String fileName) {
        BatchLog batchLog = new BatchLog();
        batchLog.setJobName("GUEST_LIST_IMPORT");
        batchLog.setFileName(fileName);
        batchLog.setStartedAt(OffsetDateTime.now());
        batchLog.setStatus(BatchLog.Status.RUNNING);
        return batchLogRepository.save(batchLog);
    }

    public BatchLog runImportJob(File csvFile, UUID concertId) {
        String fileName = csvFile.getName();
        BatchLog batchLog = createInitialLog(fileName);
        UUID logId = batchLog.getId();

        try {
            JobParameters parameters = new JobParametersBuilder()
                    .addString("filePath", csvFile.getAbsolutePath())
                    .addString("concertId", concertId != null ? concertId.toString() : "")
                    .addString("fileName", fileName)
                    .addString("batchLogId", logId.toString())
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();

            log.info("Launching guest list batch job for file: {}. Log ID: {}", fileName, logId);
            JobExecution execution = jobLauncher.run(importGuestListJob, parameters);
            log.info("Batch job execution finished with status: {}", execution.getStatus());

            // Reload completed log to return final status
            batchLog = batchLogRepository.findById(logId).orElse(batchLog);

            // Handle file movement based on status
            handleFileMovement(csvFile, batchLog.getStatus());

        } catch (Exception e) {
            log.error("Failed to run batch job for file: " + fileName, e);
            batchLog = batchLogRepository.findById(logId).orElse(batchLog);
            batchLog.setStatus(BatchLog.Status.FAILED);
            batchLog.setCompletedAt(OffsetDateTime.now());
            batchLog.setErrorDetail("Exception during batch execution: " + e.getMessage());
            batchLog = batchLogRepository.save(batchLog);

            // Move failed file to error directory
            handleFileMovement(csvFile, BatchLog.Status.FAILED);
        }

        return batchLog;
    }

    private void handleFileMovement(File csvFile, BatchLog.Status status) {
        String parentDir = csvFile.getParent();
        String targetFolderName = (status == BatchLog.Status.SUCCESS) ? "processed" : "error";
        Path targetDir = Paths.get(parentDir).resolve(targetFolderName);

        try {
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            Path targetPath = targetDir.resolve(csvFile.getName());
            Files.move(csvFile.toPath(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Moved file {} to {}", csvFile.getName(), targetPath.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to move file " + csvFile.getName() + " to " + targetFolderName + " directory", e);
        }
    }
}
