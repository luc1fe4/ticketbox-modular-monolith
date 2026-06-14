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

    @Transactional
    public void createPaymentSucceededNotification(
            CreatePaymentNotificationCommand command
    ) {
        if (notificationRepository.existsByMessageId(
                command.messageId()
        )) {
            return;
        }

        String body = "Payment for order "
                + command.orderId()
                + " was successful. Amount: "
                + command.amount().toPlainString()
                + " VND.";

        Notification notification =
                Notification.createAppNotification(
                        command.messageId(),
                        command.userId(),
                        "PAYMENT_SUCCEEDED",
                        "Payment successful",
                        body,
                        OffsetDateTime.now()
                );

        notificationRepository.save(notification);
    }
}
