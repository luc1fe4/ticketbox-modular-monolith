package com.ticketbox.module.concert.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConcertRepository extends JpaRepository<Concert, UUID> {

    Page<Concert> findByStatusIn(List<Concert.Status> statuses, Pageable pageable);

    Page<Concert> findByStatus(Concert.Status status, Pageable pageable);

    Optional<Concert> findByIdAndCreatedBy(UUID id, UUID createdBy);

    Page<Concert> findByCreatedByAndStatus(
            UUID createdBy,
            Concert.Status status,
            Pageable pageable);

    Optional<Concert> findByIdAndStatusIn(UUID id, List<Concert.Status> statuses);
}
