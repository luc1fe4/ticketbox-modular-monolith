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

@Service
@Transactional(readOnly = true)
public class ConcertService {

    private final ConcertRepository concertRepository;

    public ConcertService(ConcertRepository concertRepository) {
        this.concertRepository = concertRepository;
    }

    public Page<ConcertSummaryDto> getPublicConcerts(Pageable pageable) {
        List<Concert.Status> publicStatuses = List.of(
                Concert.Status.ON_SALE,
                Concert.Status.SOLD_OUT
        );

        return concertRepository.findByStatusIn(publicStatuses, pageable)
                .map(ConcertMapper::toSummaryDto);
    }

    public ConcertDetailDto getConcertDetail(UUID concertId) {
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Concert not found with id: " + concertId));

        return ConcertMapper.toDetailDto(concert);
    }
}
