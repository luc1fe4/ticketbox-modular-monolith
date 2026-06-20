package com.ticketbox.module.admin.web;

import com.ticketbox.module.admin.application.GuestListJobLauncherService;
import com.ticketbox.module.admin.application.GuestListScheduledImporter;
import com.ticketbox.module.admin.application.GuestListService;
import com.ticketbox.module.admin.domain.BatchLog;
import com.ticketbox.module.admin.domain.BatchLogRepository;
import com.ticketbox.module.admin.domain.GuestList;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import com.ticketbox.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class GuestListController {

    private final GuestListService guestListService;
    private final GuestListJobLauncherService jobLauncherService;
    private final GuestListScheduledImporter scheduledImporter;
    private final BatchLogRepository batchLogRepository;

    @Value("${ticketbox.batch.guest-list-dir:data/guest-lists}")
    private String baseDirectoryPath;

    @PostMapping("/concerts/{concertId}/guest-lists/import")
    public ApiResponse<BatchLog> importGuestList(
            @PathVariable UUID concertId,
            @RequestParam("file") MultipartFile file
    ) {
        if (file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "File is empty");
        }

        Path importDir = Paths.get(baseDirectoryPath).resolve("import");
        try {
            if (!Files.exists(importDir)) {
                Files.createDirectories(importDir);
            }

            String originalFilename = file.getOriginalFilename();
            String prefix = originalFilename != null ? originalFilename : "upload.csv";
            String savedFilename = "manual_guestlist_" + concertId + "_" + System.currentTimeMillis() + "_" + prefix;
            Path savedPath = importDir.resolve(savedFilename);
            
            file.transferTo(savedPath.toFile());
            log.info("Saved manual upload to: {}", savedPath.toAbsolutePath());

            BatchLog result = jobLauncherService.runImportJob(savedPath.toFile(), concertId);
            return ApiResponse.success(result);
        } catch (IOException e) {
            log.error("Failed to save uploaded file", e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload file: " + e.getMessage());
        }
    }

    @GetMapping("/concerts/{concertId}/guest-lists")
    public ApiResponse<List<GuestList>> getGuestLists(@PathVariable UUID concertId) {
        return ApiResponse.success(guestListService.getGuestListByConcertId(concertId));
    }

    @GetMapping("/batch-logs")
    public ApiResponse<List<BatchLog>> getBatchLogs() {
        return ApiResponse.success(batchLogRepository.findAll());
    }

    @GetMapping("/batch-logs/{batchLogId}")
    public ApiResponse<BatchLog> getBatchLog(@PathVariable UUID batchLogId) {
        BatchLog logEntry = batchLogRepository.findById(batchLogId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Batch log not found"));
        return ApiResponse.success(logEntry);
    }

    @PostMapping("/batch-jobs/guest-list-import/run")
    public ApiResponse<String> runBatchJob() {
        scheduledImporter.scanAndImport();
        return ApiResponse.success("Scheduled import scanning triggered successfully");
    }
}
