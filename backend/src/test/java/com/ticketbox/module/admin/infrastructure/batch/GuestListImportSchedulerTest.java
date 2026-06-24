package com.ticketbox.module.admin.infrastructure.batch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.ticketbox.module.admin.application.GuestListImportService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GuestListImportSchedulerTest {

    @Mock private GuestListImportService importService;

    @TempDir Path temporaryDirectory;

    @Test
    void importAvailableFiles_ClaimsStableExternalCsvBeforeSubmitting() throws Exception {
        UUID concertId = UUID.randomUUID();
        GuestListImportProperties properties = new GuestListImportProperties();
        properties.setRootDir(temporaryDirectory.toString());
        properties.setStableAge(Duration.ofSeconds(30));
        GuestListFileStorage storage = new GuestListFileStorage(properties);
        storage.initialize();

        Path concertDirectory = storage.incomingRoot().resolve(concertId.toString());
        Files.createDirectories(concertDirectory);
        Path incoming = concertDirectory.resolve("sponsor-guests.csv");
        Files.writeString(incoming, "phone,full_name,category,sponsor_name,notes\n");
        Files.setLastModifiedTime(incoming, FileTime.from(Instant.now().minusSeconds(60)));

        GuestListImportScheduler scheduler = new GuestListImportScheduler(storage, importService);
        scheduler.importAvailableFiles();

        assertThat(incoming).doesNotExist();
        Path processingDirectory = temporaryDirectory
                .resolve("processing")
                .resolve(concertId.toString());
        Path claimed;
        try (var files = Files.list(processingDirectory)) {
            claimed = files.findFirst().orElseThrow();
        }
        assertThat(claimed.getFileName().toString()).endsWith("-sponsor-guests.csv");
        verify(importService).submitScheduled(
                eq(concertId),
                eq(claimed),
                eq("sponsor-guests.csv"),
                eq(incoming));
    }
}
