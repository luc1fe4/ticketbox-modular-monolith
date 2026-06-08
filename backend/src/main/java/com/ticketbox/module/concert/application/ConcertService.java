package com.ticketbox.module.concert.application;

import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.ConcertSummaryDto;
import com.ticketbox.module.concert.application.mapper.ConcertMapper;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.module.concert.infrastructure.ConcertRepository;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service layer for public concert operations.
 *
 * This is the "brain" of the concert module:
 * - Contains business logic (e.g., only show ON_SALE/SOLD_OUT concerts)
 * - Acts as the transaction boundary (@Transactional)
 * - Sits between Controller (HTTP) and Repository (Database)
 *
 * Flow: Controller → Service → Repository → Database
 */
@Service                            // Tells Spring: "manage this class as a bean"
@Transactional(readOnly = true)     // All methods use read-only DB transactions (better performance)
public class ConcertService {

    private final ConcertRepository concertRepository;

    /**
     * Constructor Injection.
     *
     * Spring sees that ConcertService needs a ConcertRepository,
     * finds the ConcertRepository bean, and passes it here automatically.
     * You never need to write: new ConcertRepository() — Spring does it for you!
     */
    public ConcertService(ConcertRepository concertRepository) {
        this.concertRepository = concertRepository;
    }

    /**
     * Get paginated list of public concerts.
     *
     * Business rule: Only show concerts with status ON_SALE or SOLD_OUT.
     * DRAFT concerts are not published yet, CANCELLED/COMPLETED are past events.
     *
     * @param pageable contains page number, page size, and sort order
     * @return a Page of ConcertSummaryDto (lightweight data for list view)
     */
    public Page<ConcertSummaryDto> getPublicConcerts(Pageable pageable) {
        List<Concert.Status> publicStatuses = List.of(
                Concert.Status.ON_SALE,
                Concert.Status.SOLD_OUT
        );

        // Step 1: Query database → Page<Concert> (entities)
        // Step 2: .map() converts each Concert → ConcertSummaryDto
        // ConcertMapper::toSummaryDto is a "method reference" — shorthand for:
        //   concert -> ConcertMapper.toSummaryDto(concert)
        return concertRepository.findByStatusIn(publicStatuses, pageable)
                .map(ConcertMapper::toSummaryDto);
    }

    /**
     * Get full concert detail by ID.
     *
     * @param concertId the UUID of the concert
     * @return ConcertDetailDto with all fields including artistBio
     * @throws AppException with RESOURCE_NOT_FOUND if concert doesn't exist
     */
    public ConcertDetailDto getConcertDetail(UUID concertId) {
        // findById returns Optional<Concert>:
        //   - If found: Optional containing the concert
        //   - If not found: empty Optional
        // orElseThrow: if empty, throw the exception (returns 404 to frontend)
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + concertId));

        return ConcertMapper.toDetailDto(concert);
    }
}
