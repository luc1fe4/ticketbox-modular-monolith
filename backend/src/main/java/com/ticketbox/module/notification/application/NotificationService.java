package com.ticketbox.module.notification.application;

import com.ticketbox.module.notification.domain.Notification;
import com.ticketbox.module.notification.domain.NotificationRepository;
import com.ticketbox.module.notification.web.dto.NotificationResponse;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Page<NotificationResponse> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserId(userId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional
    public NotificationResponse markAsRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Notification not found"));

        notification.markAsRead(OffsetDateTime.now());
        notificationRepository.save(notification);

        return NotificationResponse.from(notification);
    }

    /**
     * Creates an APP (in-app) notification for a successful payment AND a PENDING EMAIL notification.
     * Uses distinct messageIds to avoid unique-index conflicts on notifications.message_id.
     *
     * <p>APP  messageId = deterministic UUID from "PAYMENT_SUCCEEDED:APP:{eventId}"
     * <p>EMAIL messageId = deterministic UUID from "PAYMENT_SUCCEEDED:EMAIL:{eventId}"
     *
     * @return the saved EMAIL Notification (to be published to the email queue), or empty if already processed
     */
    @Transactional
    public Optional<Notification> createPaymentSucceededNotification(
            CreatePaymentNotificationCommand command
    ) {
        UUID appMessageId = UUID.nameUUIDFromBytes(
                ("PAYMENT_SUCCEEDED:APP:" + command.messageId()).getBytes()
        );
        UUID emailMessageId = UUID.nameUUIDFromBytes(
                ("PAYMENT_SUCCEEDED:EMAIL:" + command.messageId()).getBytes()
        );

        String body = "Payment for order "
                + command.orderId()
                + " was successful. Amount: "
                + command.amount().toPlainString()
                + " VND.";

        // APP notification (idempotent)
        if (!notificationRepository.existsByMessageId(appMessageId)) {
            Notification appNotification = Notification.createAppNotification(
                    appMessageId,
                    command.userId(),
                    "PAYMENT_SUCCEEDED",
                    "Payment successful",
                    body,
                    OffsetDateTime.now()
            );
            notificationRepository.save(appNotification);
        }

        // EMAIL notification (idempotent) – return the saved entity so caller can enqueue it
        if (notificationRepository.existsByMessageId(emailMessageId)) {
            return Optional.empty();
        }

        Notification emailNotification = Notification.createEmailNotification(
                emailMessageId,
                command.userId(),
                "PAYMENT_SUCCEEDED",
                "Payment successful – TicketBox",
                body
        );
        notificationRepository.save(emailNotification);
        return Optional.of(emailNotification);
    }

    /**
     * Marks an EMAIL notification as successfully sent.
     */
    @Transactional
    public void markEmailSent(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setStatus(Notification.Status.SENT);
            n.setSentAt(OffsetDateTime.now());
            notificationRepository.save(n);
        });
    }

    /**
     * Records a failed email delivery attempt.
     * Increments the attempt counter and stores the last error message.
     * If attempts reach 3, sets status to FAILED (message will land in DLQ).
     */
    @Transactional
    public void recordEmailAttemptFailed(UUID notificationId, String error) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            int newAttempts = n.getAttempts() + 1;
            n.setAttempts(newAttempts);
            n.setLastError(error);
            if (newAttempts >= 3) {
                n.setStatus(Notification.Status.FAILED);
            }
            notificationRepository.save(n);
        });
    }

    /**
     * Finds a notification by ID for email consumer processing.
     */
    public Optional<Notification> findNotificationById(UUID notificationId) {
        return notificationRepository.findById(notificationId);
    }
}
