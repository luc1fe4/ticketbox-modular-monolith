package com.ticketbox.module.concert.application.mapper;

import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.ConcertSummaryDto;
import com.ticketbox.module.concert.application.dto.CreateConcertRequest;
import com.ticketbox.module.concert.application.dto.UpdateConcertRequest;
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
                concert.getCreatedBy(),
                concert.getCreatedAt(),
                concert.getUpdatedAt()
        );
    }

    public static Concert toEntity(CreateConcertRequest request) {
        Concert concert = new Concert();
        concert.setTitle(request.title());
        concert.setDescription(request.description());
        concert.setVenueName(request.venueName());
        concert.setVenueAddress(request.venueAddress());
        concert.setEventDate(request.eventDate());
        concert.setDoorsOpenAt(request.doorsOpenAt());
        concert.setSeatMapSvg(request.seatMapSvg());
        concert.setPosterUrl(request.posterUrl());
        concert.setCreatedBy(request.createdBy());
        return concert;
    }

    public static void updateEntity(Concert concert, UpdateConcertRequest request) {
        concert.setTitle(request.title());
        concert.setDescription(request.description());
        concert.setVenueName(request.venueName());
        concert.setVenueAddress(request.venueAddress());
        concert.setEventDate(request.eventDate());
        concert.setDoorsOpenAt(request.doorsOpenAt());
        concert.setSeatMapSvg(request.seatMapSvg());
        concert.setPosterUrl(request.posterUrl());
    }
}
