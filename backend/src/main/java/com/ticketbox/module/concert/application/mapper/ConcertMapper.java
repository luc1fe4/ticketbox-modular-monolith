package com.ticketbox.module.concert.application.mapper;

import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.ConcertSummaryDto;
import com.ticketbox.module.concert.domain.Concert;

public class ConcertMapper {

    private ConcertMapper() {
    }

    public static ConcertSummaryDto toSummaryDto(Concert concert) {
        return new ConcertSummaryDto(
                concert.getId(),
                concert.getTitle(),
                concert.getVenueName(),
                concert.getEventDate(),
                concert.getStatus().name(),
                concert.getPosterUrl()
        );
    }

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
                concert.getStatus().name(),
                concert.getSeatMapSvg(),
                concert.getPosterUrl(),
                concert.getCreatedAt()
        );
    }
}
