package com.ticketbox.module.concert.infrastructure;

import com.ticketbox.module.concert.domain.Concert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConcertRepository extends JpaRepository<Concert, UUID> {

    Page<Concert> findByStatusIn(List<Concert.Status> statuses, Pageable pageable);

    Page<Concert> findByStatus(Concert.Status status, Pageable pageable);
}
