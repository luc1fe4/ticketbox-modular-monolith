package com.ticketbox.module.ai.application;

import com.ticketbox.module.ai.domain.ArtistPdfJob;
import com.ticketbox.module.ai.domain.ArtistPdfJobRepository;
import com.ticketbox.module.concert.ConcertAiPort;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtistPdfJobService {

    private final ArtistPdfJobRepository artistPdfJobRepository;
    private final ArtistBioGenerator artistBioGenerator;
    private final ConcertAiPort concertAiPort;

    @Transactional
    public ArtistPdfJob createJob(UUID concertId, String fileUrl) {
        ArtistPdfJob job = new ArtistPdfJob();
        job.setConcertId(concertId);
        job.setFileUrl(fileUrl);
        job.setStatus(ArtistPdfJob.Status.PENDING);
        return artistPdfJobRepository.save(job);
    }

    public void startAsyncJob(UUID jobId) {
        CompletableFuture.runAsync(() -> runPdfJob(jobId));
    }

    public void runPdfJob(UUID jobId) {
        ArtistPdfJob job = artistPdfJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.error("AI Bio Job not found: {}", jobId);
            return;
        }

        job.setStatus(ArtistPdfJob.Status.PROCESSING);
        job.setStartedAt(OffsetDateTime.now());
        job = artistPdfJobRepository.save(job);

        try {
            log.info("Processing PDF job: {}. URL: {}", jobId, job.getFileUrl());
            byte[] pdfBytes = loadPdfBytes(job.getFileUrl());

            String text;
            try (PDDocument document = PDDocument.load(pdfBytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                text = stripper.getText(document);
            }

            String cleanedText = cleanExtractedText(text);
            if (cleanedText.isEmpty()) {
                throw new IllegalArgumentException("Extracted text is empty or PDF could not be read");
            }

            String bio = artistBioGenerator.generateBio(cleanedText);
            job.setResultBio(bio);
            job.setStatus(ArtistPdfJob.Status.DONE);
            log.info("PDF job finished successfully: {}", jobId);

        } catch (Exception e) {
            log.error("PDF job failed: " + jobId, e);
            job.setStatus(ArtistPdfJob.Status.FAILED);
            job.setErrorMessage(e.getMessage());
        } finally {
            job.setCompletedAt(OffsetDateTime.now());
            artistPdfJobRepository.save(job);
        }
    }

    @Transactional
    public void applyBio(UUID jobId) {
        ArtistPdfJob job = artistPdfJobRepository.findById(jobId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Job not found"));

        if (job.getStatus() != ArtistPdfJob.Status.DONE || job.getResultBio() == null) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, "Cannot apply bio from job status: " + job.getStatus());
        }

        log.info("Applying bio from job {} to concert {}", jobId, job.getConcertId());
        concertAiPort.updateArtistBio(job.getConcertId(), job.getResultBio());
    }

    @Transactional
    public void retryJob(UUID jobId) {
        ArtistPdfJob job = artistPdfJobRepository.findById(jobId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Job not found"));

        if (job.getStatus() != ArtistPdfJob.Status.FAILED && job.getStatus() != ArtistPdfJob.Status.PENDING) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, "Cannot retry job in status: " + job.getStatus());
        }

        job.setStatus(ArtistPdfJob.Status.PENDING);
        job.setResultBio(null);
        job.setErrorMessage(null);
        job.setStartedAt(null);
        job.setCompletedAt(null);
        artistPdfJobRepository.save(job);

        startAsyncJob(jobId);
    }

    private byte[] loadPdfBytes(String fileUrl) throws IOException {
        if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
            RestTemplate rest = new RestTemplate();
            return rest.getForObject(fileUrl, byte[].class);
        } else {
            Path path = Paths.get(fileUrl);
            return Files.readAllBytes(path);
        }
    }

    private String cleanExtractedText(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("\\r?\\n", "\n")
                   .replaceAll("[ \\t]+", " ")
                   .replaceAll("\\n+", "\n")
                   .trim();
    }
}
