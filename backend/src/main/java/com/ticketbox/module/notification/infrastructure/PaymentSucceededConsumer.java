package com.ticketbox.module.notification.infrastructure;

import com.ticketbox.infrastructure.rabbitmq.RabbitMqNames;
import com.ticketbox.module.notification.application.CreatePaymentNotificationCommand;
import com.ticketbox.module.notification.application.NotificationService;
import com.ticketbox.shared.event.PaymentCompletedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PaymentSucceededConsumer {
    private final NotificationService notificationService;

    @RabbitListener(
            queues = RabbitMqNames.PAYMENT_SUCCEEDED_QUEUE
    )
    public void consume(PaymentCompletedEvent event) {
        notificationService.createPaymentSucceededNotification(
                new CreatePaymentNotificationCommand(
                        event.eventId(),
                        event.userId(),
                        event.orderId(),
                        event.amount(),
                        event.occurredAt()
                )
        );
    }
}
