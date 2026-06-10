package com.ticketbox.module.concert.application.mapper;

import com.ticketbox.module.concert.application.dto.TicketTypeDto;
import com.ticketbox.module.concert.application.dto.CreateTicketTypeRequest;
import com.ticketbox.module.concert.application.dto.UpdateTicketTypeRequest;
import com.ticketbox.module.concert.domain.TicketType;

import java.util.UUID;

public class TicketTypeMapper {

    private TicketTypeMapper() {}

    public static TicketTypeDto toDto(TicketType entity) {
        return new TicketTypeDto(
                entity.getId(),
                entity.getConcertId(),
                entity.getName(),
                entity.getPrice(),
                entity.getTotalQuantity(),
                entity.getAvailableQty(),
                entity.getMaxPerAccount(),
                entity.getSaleStartAt(),
                entity.getSaleEndAt(),
                entity.getZoneColor(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static TicketType toEntity(UUID concertId, CreateTicketTypeRequest request) {
        TicketType entity = new TicketType();
        entity.setConcertId(concertId);
        entity.setName(request.name());
        entity.setPrice(request.price());
        entity.setTotalQuantity(request.totalQuantity());
        entity.setAvailableQty(request.totalQuantity());
        entity.setMaxPerAccount(request.maxPerAccount());
        entity.setSaleStartAt(request.saleStartAt());
        entity.setSaleEndAt(request.saleEndAt());
        entity.setZoneColor(request.zoneColor());
        entity.setActive(true);
        return entity;
    }

    public static void updateEntity(TicketType entity, UpdateTicketTypeRequest request) {
        entity.setName(request.name());
        entity.setPrice(request.price());
        int difference = request.totalQuantity() - entity.getTotalQuantity();
        entity.setTotalQuantity(request.totalQuantity());
        entity.setAvailableQty(entity.getAvailableQty() + difference);
        entity.setMaxPerAccount(request.maxPerAccount());
        entity.setSaleStartAt(request.saleStartAt());
        entity.setSaleEndAt(request.saleEndAt());
        entity.setZoneColor(request.zoneColor());
    }
}
