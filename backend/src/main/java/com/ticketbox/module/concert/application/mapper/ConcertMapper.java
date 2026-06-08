package com.ticketbox.module.concert.application.mapper;

import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.ConcertSummaryDto;
import com.ticketbox.module.concert.domain.Concert;

/**
 * Converts Concert entity → DTOs.
 *
 * Why do we need this?
 * - Entity (Concert.java) = how data is stored in the database
 * - DTO (ConcertSummaryDto) = how data is sent to the frontend
 * - They may have different fields, so we need a "translator"
 *
 * This is a utility class with only static methods (no instance needed).
 */
public class ConcertMapper {

    // Private constructor prevents anyone from doing: new ConcertMapper()
    private ConcertMapper() {
    }

    /**
     * Convert Concert entity → ConcertSummaryDto (for list endpoint).
     * Only picks the lightweight fields needed for browsing.
     */
    public static ConcertSummaryDto toSummaryDto(Concert concert) {
        return new ConcertSummaryDto(
                concert.getId(),
                concert.getTitle(),
                concert.getVenueName(),
                concert.getEventDate(),
                concert.getStatus().name(),    // enum → String: ON_SALE → "ON_SALE"
                concert.getPosterUrl()
        );
    }

    /**
     * Convert Concert entity → ConcertDetailDto (for detail endpoint).
     * Includes all public-facing fields including artistBio.
     */
    public static ConcertDetailDto toDetailDto(Concert concert) {
        return new ConcertDetailDto(
                concert.getId(),
                concert.getTitle(),
                concert.getDescription(),
                concert.getArtistBio(),
                concert.getVenueName(),
                concert.getVenueAddress(),
                concert.getEventDate(),
                concert.getDoorsOpenAt(),
                concert.getStatus().name(),    // enum → String
                concert.getSeatMapSvg(),
                concert.getPosterUrl(),
                concert.getCreatedAt()
        );
    }
}
