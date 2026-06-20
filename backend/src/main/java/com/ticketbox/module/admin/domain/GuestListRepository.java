package com.ticketbox.module.admin.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface GuestListRepository extends JpaRepository<GuestList, UUID> {

    Optional<GuestList> findByConcertIdAndPhoneAndIsActiveTrue(UUID concertId, String phone);

    Page<GuestList> findByConcertId(UUID concertId, Pageable pageable);
  
    Optional<GuestList> findByConcertIdAndPhone(UUID concertId, String phone);

    java.util.List<GuestList> findAllByConcertId(UUID concertId);
}
