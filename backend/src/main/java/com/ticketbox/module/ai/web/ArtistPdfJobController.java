package com.ticketbox.module.ai.web;

import com.ticketbox.module.ai.application.ArtistPdfJobService;
import com.ticketbox.module.ai.domain.ArtistPdfJob;
import com.ticketbox.module.ai.domain.ArtistPdfJobRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import com.ticketbox.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class ArtistPdfJobController {

    private final ArtistPdfJobService artistPdfJobService;
    private final ArtistPdfJobRepository artistPdfJobRepository;

    @Value("${ticketbox.ai.pdf-dir:data/artist-pdfs}")
    private String pdfDirectoryPath;

    public record InitiateBioJobRequest(String fileUrl) {}

    @PostMapping(value = "/concerts/{concertId}/artist-bio-jobs", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ArtistPdfJob> uploadPdfJob(
            @PathVariable UUID concertId,
            @RequestParam("file") MultipartFile file
    ) {
        if (file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "File is empty");
        }

        Path pdfDir = Paths.get(pdfDirectoryPath);
        try {
            if (!Files.exists(pdfDir)) {
                Files.createDirectories(pdfDir);
            }

            String originalFilename = file.getOriginalFilename();
            String prefix = originalFilename != null ? originalFilename : "upload.pdf";
            String savedFilename = "artist_bio_" + concertId + "_" + System.currentTimeMillis() + "_" + prefix;
            Path savedPath = pdfDir.resolve(savedFilename);
            
            file.transferTo(savedPath.toFile());
            log.info("Saved artist bio PDF upload to: {}", savedPath.toAbsolutePath());

            // Run job
            ArtistPdfJob job = artistPdfJobService.createJob(concertId, savedPath.toAbsolutePath().toString());
            artistPdfJobService.startAsyncJob(job.getId());
            return ApiResponse.success(job);
        } catch (IOException e) {
            log.error("Failed to save uploaded PDF file", e);
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload file: " + e.getMessage());
        }
    }

    @PostMapping(value = "/concerts/{concertId}/artist-bio-jobs", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ArtistPdfJob> initiatePdfJobFromUrl(
            @PathVariable UUID concertId,
            @RequestBody InitiateBioJobRequest request
    ) {
        if (request.fileUrl() == null || request.fileUrl().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "File URL is required");
        }

        ArtistPdfJob job = artistPdfJobService.createJob(concertId, request.fileUrl().trim());
        artistPdfJobService.startAsyncJob(job.getId());
        return ApiResponse.success(job);
    }

    @GetMapping("/artist-bio-jobs/{jobId}")
    public ApiResponse<ArtistPdfJob> getJob(@PathVariable UUID jobId) {
        ArtistPdfJob job = artistPdfJobRepository.findById(jobId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "AI Bio Job not found"));
        return ApiResponse.success(job);
    }

    @PostMapping("/artist-bio-jobs/{jobId}/apply")
    public ApiResponse<String> applyJob(@PathVariable UUID jobId) {
        artistPdfJobService.applyBio(jobId);
        return ApiResponse.success("Artist bio applied to concert successfully");
    }

    @PostMapping("/artist-bio-jobs/{jobId}/retry")
    public ApiResponse<String> retryJob(@PathVariable UUID jobId) {
        artistPdfJobService.retryJob(jobId);
        return ApiResponse.success("AI Bio Job retry initiated successfully");
    }
}
