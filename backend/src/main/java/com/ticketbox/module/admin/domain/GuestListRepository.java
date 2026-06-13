package com.ticketbox.module.admin.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GuestListRepository extends JpaRepository<GuestList, UUID> {

    Optional<GuestList> findByConcertIdAndPhoneAndIsActiveTrue(UUID concertId, String phone);
}
