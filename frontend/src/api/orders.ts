import { api } from './client';

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PAYMENT_FAILED';

export type OrderItem = {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type Order = {
  id: string;
  concertId: string;
  concertTitle: string;
  status: OrderStatus;
  totalAmount: number;
  paymentUrl: string | null;
  expiresAt: string;
  createdAt: string;
  items: OrderItem[];
};

export type PaymentProvider = 'MOCK' | 'VNPAY' | 'MOMO';

export type PaymentInitiation = {
  orderId: string;
  provider: PaymentProvider;
  providerRef: string;
  paymentUrl: string;
};

export function createOrder(
  concertId: string,
  items: Array<{ ticketTypeId: string; quantity: number }>,
  idempotencyKey: string,
  queueAccessToken?: string,
) {
  return api.post<unknown, Order>(
    '/api/orders',
    { concertId, items },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
        ...(queueAccessToken ? { 'Queue-Access-Token': queueAccessToken } : {}),
      },
    },
  );
}

export function getOrder(orderId: string, signal?: AbortSignal) {
  return api.get<unknown, Order>(`/api/orders/${encodeURIComponent(orderId)}`, { signal });
}

export function initiatePayment(orderId: string, provider: PaymentProvider) {
  return api.post<unknown, PaymentInitiation>(
    `/api/payments/${encodeURIComponent(orderId)}/initiate`,
    { provider },
  );
}

export function completeMockPayment(paymentUrl: string) {
  return api.post<unknown, void>(paymentUrl);
}

export function cancelOrder(orderId: string) {
  return api.delete<unknown, Order>(`/api/orders/${encodeURIComponent(orderId)}`);
}

export function retryOrderPayment(orderId: string) {
  return api.post<unknown, Order>(`/api/orders/${encodeURIComponent(orderId)}/retry-payment`);
}
