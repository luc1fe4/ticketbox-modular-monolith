package com.ticketbox.module.checkin.domain;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CheckinLogRepository extends JpaRepository<CheckinLog, UUID> {
    boolean existsByTicketId(UUID ticketId);
}
