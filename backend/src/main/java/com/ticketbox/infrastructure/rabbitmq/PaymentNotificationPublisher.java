package com.ticketbox.infrastructure.rabbitmq;

import com.ticketbox.shared.event.PaymentCompletedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PaymentNotificationPublisher {
    private final RabbitTemplate rabbitTemplate;

    public void publish(PaymentCompletedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitMqNames.EVENTS_EXCHANGE,
                RabbitMqNames.PAYMENT_SUCCEEDED_ROUTING_KEY,
                event,
                message -> {
                    message.getMessageProperties().setMessageId(
                            event.eventId().toString()
                    );
                    return message;
                }
        );
    }
}
