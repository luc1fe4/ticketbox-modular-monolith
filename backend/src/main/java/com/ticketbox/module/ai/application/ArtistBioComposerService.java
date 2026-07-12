package com.ticketbox.module.ai.application;

import com.ticketbox.module.ai.domain.ArtistPdfJob;
import com.ticketbox.module.ai.domain.ArtistPdfJobRepository;
import com.ticketbox.module.concert.ConcertArtistBioPort;
import com.ticketbox.module.concert.ConcertArtistBioView;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates a new reviewable draft from several completed source drafts. */
@Service
public class ArtistBioComposerService {

    private static final int DESIRED_BIO_WORDS = 140;

    private final ArtistPdfJobRepository jobRepository;
    private final ConcertArtistBioPort concertPort;
    private final ArtistBioGeneratorResolver generatorResolver;
    private final ArtistBioTextCleaner textCleaner;

    public ArtistBioComposerService(
            ArtistPdfJobRepository jobRepository,
            ConcertArtistBioPort concertPort,
            ArtistBioGeneratorResolver generatorResolver,
            ArtistBioTextCleaner textCleaner) {
        this.jobRepository = jobRepository;
        this.concertPort = concertPort;
        this.generatorResolver = generatorResolver;
        this.textCleaner = textCleaner;
    }

    @Transactional
    public ArtistPdfJob compose(
            UUID concertId,
            List<UUID> sourceJobIds,
            UUID requesterId,
            boolean admin) {
        ConcertArtistBioView concert = concertPort.requireAccessibleConcert(concertId, requesterId, admin);
        List<UUID> uniqueIds = sourceJobIds.stream().distinct().toList();
        if (uniqueIds.size() < 2) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Select at least two completed drafts to combine");
        }

        Map<UUID, ArtistPdfJob> jobsById = new LinkedHashMap<>();
        jobRepository.findAllById(uniqueIds).forEach(job -> jobsById.put(job.getId(), job));
        if (jobsById.size() != uniqueIds.size()) {
            throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, "One or more selected AI drafts were not found");
        }

        List<ArtistPdfJob> sources = uniqueIds.stream().map(jobsById::get).toList();
        for (ArtistPdfJob source : sources) {
            if (!concertId.equals(source.getConcertId())) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "All selected drafts must belong to the same concert");
            }
            if (source.getStatus() != ArtistPdfJob.Status.DONE
                    || source.getResultBio() == null
                    || source.getResultBio().isBlank()) {
                throw new AppException(ErrorCode.ARTIST_BIO_JOB_NOT_READY, "All selected AI drafts must be complete");
            }
        }

        String sourceText = sources.stream()
                .map(source -> "Nguồn: " + source.getOriginalFileName() + "\n" + source.getResultBio())
                .reduce((left, right) -> left + "\n\n" + right)
                .orElseThrow();
        ArtistBioGenerator generator = generatorResolver.resolve();
        ArtistBioGenerationResult generated = generator.generate(new ArtistBioGenerationRequest(
                concert.title(), sourceText, "Vietnamese", DESIRED_BIO_WORDS));
        String bio = textCleaner.sanitizeGeneratedBio(generated.bio());
        if (bio.isBlank()) {
            throw new AppException(ErrorCode.AI_PROVIDER_UNAVAILABLE, "AI provider returned no usable artist biography");
        }
        bio = ensureAllSourcesAreRepresented(bio, sources);

        ArtistPdfJob composed = new ArtistPdfJob(
                concertId,
                sources.getFirst().getFileUrl(),
                "Tổng hợp " + sources.size() + " tài liệu nguồn",
                requesterId,
                checksum(uniqueIds));
        composed.startProcessing();
        composed.complete(bio, generated.provider(), generated.model(), sourceText.length());
        return jobRepository.save(composed);
    }

    private String ensureAllSourcesAreRepresented(String generatedBio, List<ArtistPdfJob> sources) {
        String normalizedBio = generatedBio.toLowerCase(Locale.ROOT);
        List<String> missingSentences = sources.stream()
                .map(ArtistPdfJob::getResultBio)
                .map(this::firstUsefulSentence)
                .filter(sentence -> !sentence.isBlank())
                .filter(sentence -> !normalizedBio.contains(sentence.toLowerCase(Locale.ROOT)))
                .toList();
        if (missingSentences.isEmpty()) {
            return generatedBio;
        }
        StringBuilder merged = new StringBuilder(generatedBio.trim())
                .append("\n\nĐiểm bổ sung từ các hồ sơ đã chọn:");
        for (String sentence : missingSentences) {
            merged.append("\n- ").append(sentence);
        }
        return textCleaner.sanitizeGeneratedBio(merged.toString());
    }

    private String firstUsefulSentence(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        String firstSentence = Pattern.compile("(?<=[.!?。])\\s+")
                .splitAsStream(normalized)
                .findFirst()
                .orElse(normalized);
        return firstSentence.substring(0, Math.min(firstSentence.length(), 260)).trim();
    }

    private String checksum(List<UUID> sourceJobIds) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(sourceJobIds.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(64);
            for (byte value : digest) {
                result.append(String.format("%02x", value));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
