package com.ticketbox.module.ai.domain;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtistPdfJobRepository extends JpaRepository<ArtistPdfJob, UUID> {

    Optional<ArtistPdfJob> findFirstByConcertIdAndFileChecksumAndStatusInOrderByCreatedAtDesc(
            UUID concertId,
            String fileChecksum,
            Collection<ArtistPdfJob.Status> statuses);
}
