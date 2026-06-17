package com.ticketbox.module.notification.infrastructure;

import com.ticketbox.infrastructure.rabbitmq.EmailNotificationMessage;
import com.ticketbox.infrastructure.rabbitmq.RabbitMqNames;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Publishes an {@link EmailNotificationMessage} to the {@code notification.email} queue.
 *
 * <p>Uses the message ID (= notificationId) as the AMQP messageId property
 * so RabbitMQ can deduplicate at-least-once deliveries when a broker plugin is active.
 */
@Component
@RequiredArgsConstructor
public class EmailNotificationPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishEmailNotification(UUID notificationId) {
        rabbitTemplate.convertAndSend(
                RabbitMqNames.EVENTS_EXCHANGE,
                RabbitMqNames.NOTIFICATION_EMAIL_ROUTING_KEY,
                new EmailNotificationMessage(notificationId),
                message -> {
                    message.getMessageProperties().setMessageId(notificationId.toString());
                    return message;
                }
        );
    }
}
