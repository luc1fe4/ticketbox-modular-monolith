import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrder, type Order } from '../../api/orders';
import { isRequestCanceled } from '../../api/client';
import {
  PENDING_PAYMENT_STORAGE_KEY,
  type CheckoutState,
} from './CheckoutPage';

type PendingPayment = CheckoutState & { orderId: string };

function readPendingPayment(): PendingPayment | null {
  try {
    const value = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
    return value ? JSON.parse(value) as PendingPayment : null;
  } catch {
    return null;
  }
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Confirming your payment with TicketBox…');
  const [pendingPayment] = useState(readPendingPayment);
  const orderId = searchParams.get('vnp_TxnRef') ?? pendingPayment?.orderId;
  const providerReportedFailure = searchParams.has('vnp_ResponseCode') && searchParams.get('vnp_ResponseCode') !== '00';

  useEffect(() => {
    if (!orderId || !pendingPayment) return;
    const activeOrderId = orderId;
    if (providerReportedFailure) {
      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      navigate('/booking-confirmation?status=failed', {
        replace: true,
        state: { ...pendingPayment },
      });
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function confirmPayment() {
      for (let attempt = 0; attempt < 15 && active; attempt += 1) {
        try {
          const order = await getOrder(activeOrderId, controller.signal);
          if (!active) return;
          if (order.status === 'PAID') {
            finish(order, false);
            return;
          }
          if (['PAYMENT_FAILED', 'EXPIRED', 'CANCELLED'].includes(order.status)) {
            finish(order, true);
            return;
          }
          setMessage('Payment received. Waiting for the order confirmation…');
          await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        } catch (requestError) {
          if (active && !isRequestCanceled(requestError)) {
            setMessage('We could not confirm the payment yet. You can safely check your orders again.');
          }
          return;
        }
      }
      if (active) setMessage('Confirmation is taking longer than expected. Check your orders in a moment.');
    }

    function finish(order: Order, failed: boolean) {
      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      navigate(`/booking-confirmation${failed ? '?status=failed' : ''}`, {
        replace: true,
        state: { ...pendingPayment, order },
      });
    }

    void confirmPayment();
    return () => {
      active = false;
      controller.abort();
    };
  }, [navigate, orderId, pendingPayment, providerReportedFailure]);

  if (!orderId || !pendingPayment) {
    return (
      <section className="confirmation-page page-width">
        <div className="confirmation-mark failed">!</div>
        <p className="eyebrow"><span /> Payment result unavailable</p>
        <h1>We could not match this payment to an order.</h1>
        <p>Open your order history to check the latest payment status.</p>
        <Link className="button button-primary" to="/profile">View orders</Link>
      </section>
    );
  }

  return (
    <section className="confirmation-page page-width" aria-live="polite">
      <div className="payment-result-spinner" aria-hidden="true" />
      <p className="eyebrow"><span /> Payment processing</p>
      <h1>Hold tight—we’re confirming your order.</h1>
      <p>{message}</p>
      <Link className="text-link" to="/profile">View order history</Link>
    </section>
  );
}
