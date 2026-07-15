package com.ticketbox.module.payment.application.gateway;

import com.ticketbox.module.payment.domain.PaymentLog;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentGatewayResolver {
    private final Map<PaymentLog.Provider, PaymentGateway> gateways;

    public PaymentGatewayResolver(List<PaymentGateway> gatewayList) {
        this.gateways = new EnumMap<>(PaymentLog.Provider.class);
        for (PaymentGateway gateway : gatewayList) {
            this.gateways.put(gateway.provider(), gateway);
        }
    }

    public PaymentGateway resolve(PaymentLog.Provider provider) {
        PaymentGateway gateway = gateways.get(provider);
        if (gateway == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Nhà cung cấp thanh toán không được hỗ trợ: " + provider);
        }
        return gateway;
    }
}
