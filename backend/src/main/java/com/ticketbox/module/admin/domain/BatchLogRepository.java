package com.ticketbox.module.admin.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BatchLogRepository extends JpaRepository<BatchLog, UUID> {
}
