package com.ticketbox.module.ai.domain;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ArtistPdfJobRepository extends JpaRepository<ArtistPdfJob, UUID>, JpaSpecificationExecutor<ArtistPdfJob> {

    Optional<ArtistPdfJob> findFirstByConcertIdAndFileChecksumAndStatusInOrderByCreatedAtDesc(
            UUID concertId,
            String fileChecksum,
            Collection<ArtistPdfJob.Status> statuses);
}
