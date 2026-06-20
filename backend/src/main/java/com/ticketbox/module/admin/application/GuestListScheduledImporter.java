package com.ticketbox.module.admin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
@Slf4j
public class GuestListScheduledImporter {

    private final GuestListJobLauncherService jobLauncherService;

    @Value("${ticketbox.batch.guest-list-dir:data/guest-lists}")
    private String baseDirectoryPath;

    private static final Pattern FILENAME_PATTERN = Pattern.compile("^guestlist_([0-9a-fA-F-]{36})(_.*)?\\.csv$");

    @Scheduled(fixedDelayString = "${ticketbox.batch.guest-list-delay-ms:15000}")
    public void scanAndImport() {
        Path importDir = Paths.get(baseDirectoryPath).resolve("import");
        if (!Files.exists(importDir)) {
            try {
                Files.createDirectories(importDir);
                log.info("Created import directory at: {}", importDir.toAbsolutePath());
            } catch (IOException e) {
                log.error("Failed to create import directory: " + importDir.toAbsolutePath(), e);
                return;
            }
        }

        try (Stream<Path> files = Files.list(importDir)) {
            files.filter(path -> path.toString().toLowerCase().endsWith(".csv"))
                 .forEach(path -> {
                     File file = path.toFile();
                     if (file.isFile() && file.canRead()) {
                         UUID concertId = extractConcertIdFromFilename(file.getName());
                         log.info("Found CSV file to import: {}. Extracted Concert ID: {}", file.getName(), concertId);
                         jobLauncherService.runImportJob(file, concertId);
                     }
                 });
        } catch (IOException e) {
            log.error("Error scanning import directory: " + importDir.toAbsolutePath(), e);
        }
    }

    private UUID extractConcertIdFromFilename(String filename) {
        Matcher matcher = FILENAME_PATTERN.matcher(filename);
        if (matcher.matches()) {
            try {
                return UUID.fromString(matcher.group(1));
            } catch (IllegalArgumentException e) {
                log.warn("Filename matched pattern but UUID was invalid: {}", matcher.group(1));
            }
        }
        return null;
    }
}
