package com.ticketbox.module.concert.application.dto;

import java.util.List;
import java.util.UUID;

public record ConcertSeatMapDto(
        UUID concertId,
        String seatMapSvg,
        List<SeatMapZoneDto> zones
) {}
