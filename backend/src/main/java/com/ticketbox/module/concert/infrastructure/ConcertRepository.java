package com.ticketbox.module.concert.infrastructure;

import com.ticketbox.module.concert.domain.Concert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for Concert entity.
 *
 * You don't need to write SQL! Spring reads the method name
 * and auto-generates the query:
 *   findByStatusIn → SELECT * FROM concerts WHERE status IN (...)
 */
@Repository
public interface ConcertRepository extends JpaRepository<Concert, UUID> {

    /**
     * Find concerts whose status is in the given list, with pagination.
     *
     * Example: findByStatusIn([ON_SALE, SOLD_OUT], pageable)
     * → SELECT * FROM concerts WHERE status IN ('ON_SALE','SOLD_OUT')
     *   ORDER BY ... LIMIT ... OFFSET ...
     */
    Page<Concert> findByStatusIn(List<Concert.Status> statuses, Pageable pageable);
}
