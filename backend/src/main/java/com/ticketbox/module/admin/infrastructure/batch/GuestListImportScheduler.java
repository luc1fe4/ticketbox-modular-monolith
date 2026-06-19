package com.ticketbox.module.admin.infrastructure.batch;

import com.ticketbox.module.admin.application.GuestListImportService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class GuestListImportScheduler {

    private final GuestListFileStorage fileStorage;
    private final GuestListImportService importService;

    public GuestListImportScheduler(
            GuestListFileStorage fileStorage,
            GuestListImportService importService) {
        this.fileStorage = fileStorage;
        this.importService = importService;
    }

    @Scheduled(cron = "${ticketbox.guest-list.cron:0 */5 * * * *}")
    @SchedulerLock(
            name = "guestListImportScheduler",
            lockAtLeastFor = "PT5S",
            lockAtMostFor = "PT10M")
    public void importAvailableFiles() {
        try (Stream<Path> concertDirectories = Files.list(fileStorage.incomingRoot())) {
            concertDirectories.filter(Files::isDirectory).forEach(this::processConcertDirectory);
        } catch (IOException ex) {
            log.error("Could not scan guest-list incoming directory", ex);
        }
    }

    private void processConcertDirectory(Path directory) {
        UUID concertId;
        try {
            concertId = UUID.fromString(directory.getFileName().toString());
        } catch (IllegalArgumentException ex) {
            log.warn("Ignoring guest-list directory with invalid concert id: {}", directory);
            return;
        }

        Instant now = Instant.now();
        try (Stream<Path> files = Files.list(directory)) {
            files.filter(path -> fileStorage.isStableCsv(path, now))
                    .forEach(path -> claimAndSubmit(concertId, path));
        } catch (IOException ex) {
            log.error("Could not scan guest-list directory {}", directory, ex);
        }
    }

    private void claimAndSubmit(UUID concertId, Path path) {
        try {
            String originalName = path.getFileName().toString();
            Path claimed = fileStorage.claimScheduledFile(concertId, path);
            importService.submitScheduled(concertId, claimed, originalName);
        } catch (Exception ex) {
            log.error("Could not claim guest-list file {}", path, ex);
        }
    }
}
