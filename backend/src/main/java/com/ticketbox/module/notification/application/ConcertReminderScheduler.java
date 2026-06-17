package com.ticketbox.module.notification.application;

import com.ticketbox.module.auth.UserContactPort;
import com.ticketbox.module.auth.UserContactView;
import com.ticketbox.module.concert.ConcertReminderPort;
import com.ticketbox.module.concert.ConcertReminderView;
import com.ticketbox.module.notification.domain.Notification;
import com.ticketbox.module.notification.domain.NotificationRepository;
import com.ticketbox.module.notification.infrastructure.EmailNotificationPublisher;
import com.ticketbox.module.ticket.TicketReminderRecipientPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Scheduled job that sends 24-hour concert reminders to ticket holders.
 *
 * <p>Every {@code ticketbox.notifications.reminder.fixed-delay-ms} milliseconds (default 5 min),
 * the scheduler finds concerts whose {@code eventDate} falls in the window
 * {@code [now+23h, now+25h]} and sends an APP notification + queues an EMAIL for each
 * user holding a VALID ticket.
 *
 * <p><b>Idempotency</b>: deterministic messageIds prevent duplicate notifications if the
 * scheduler runs concurrently or the service restarts:
 * <ul>
 *   <li>APP  – {@code CONCERT_REMINDER:APP:{concertId}:{userId}}</li>
 *   <li>EMAIL – {@code CONCERT_REMINDER:EMAIL:{concertId}:{userId}}</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConcertReminderScheduler {

    private final ConcertReminderPort concertReminderPort;
    private final TicketReminderRecipientPort ticketReminderRecipientPort;
    private final UserContactPort userContactPort;
    private final NotificationRepository notificationRepository;
    private final EmailNotificationPublisher emailNotificationPublisher;

    @Scheduled(fixedDelayString = "${ticketbox.notifications.reminder.fixed-delay-ms:300000}")
    public void sendReminders() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime from = now.plusHours(23);
        OffsetDateTime to   = now.plusHours(25);

        List<ConcertReminderView> concerts = concertReminderPort.findConcertsStartingBetween(from, to);
        if (concerts.isEmpty()) {
            return;
        }

        log.info("ConcertReminderScheduler: found {} concerts in window [{}, {}]", concerts.size(), from, to);

        for (ConcertReminderView concert : concerts) {
            List<UUID> userIds = ticketReminderRecipientPort.findDistinctUserIdsByConcertId(concert.id());

            for (UUID userId : userIds) {
                try {
                    processReminder(concert, userId);
                } catch (Exception ex) {
                    // Don't let one user failure block the rest
                    log.error("ConcertReminderScheduler: failed for concertId={} userId={} – {}",
                            concert.id(), userId, ex.getMessage(), ex);
                }
            }
        }
    }

    @Transactional
    protected void processReminder(ConcertReminderView concert, UUID userId) {
        UUID appMessageId = UUID.nameUUIDFromBytes(
                ("CONCERT_REMINDER:APP:" + concert.id() + ":" + userId).getBytes()
        );
        UUID emailMessageId = UUID.nameUUIDFromBytes(
                ("CONCERT_REMINDER:EMAIL:" + concert.id() + ":" + userId).getBytes()
        );

        String subject = "Reminder: " + concert.title() + " starts tomorrow";
        String body = buildReminderBody(concert);

        // APP notification (idempotent)
        if (!notificationRepository.existsByMessageId(appMessageId)) {
            Notification appNotification = Notification.createAppNotification(
                    appMessageId,
                    userId,
                    "CONCERT_REMINDER",
                    subject,
                    body,
                    OffsetDateTime.now()
            );
            notificationRepository.save(appNotification);
        }

        // EMAIL notification (idempotent) – only publish if newly created
        if (!notificationRepository.existsByMessageId(emailMessageId)) {
            Notification emailNotification = Notification.createEmailNotification(
                    emailMessageId,
                    userId,
                    "CONCERT_REMINDER",
                    subject,
                    body
            );
            notificationRepository.save(emailNotification);
            emailNotificationPublisher.publishEmailNotification(emailNotification.getId());
        }
    }

    private String buildReminderBody(ConcertReminderView concert) {
        return "Hi,\n\n"
                + "This is a reminder that \"" + concert.title() + "\" is happening tomorrow!\n\n"
                + "Venue: " + concert.venueName() + "\n"
                + "Address: " + concert.venueAddress() + "\n"
                + "Date: " + concert.eventDate() + "\n\n"
                + "Please remember to bring your QR code / ticket for entry.\n\n"
                + "See you there!\n"
                + "– The TicketBox Team";
    }
}
