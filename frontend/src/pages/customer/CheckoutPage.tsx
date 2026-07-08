import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../api/client';
import {
  completeMockPayment,
  createOrder,
  getOrder,
  initiatePayment,
  type Order,
  type PaymentProvider,
} from '../../api/orders';
import { clearStoredQueueAdmission, getStoredQueueAdmission } from '../../api/queue';
import { RemoteImage } from '../../components/RemoteImage';
import { useToast } from '../../components/feedback/toast-context';
import { currency } from '../../data/mockData';
import { useCountdown } from '../../hooks/useCountdown';
import type { CheckoutSelection } from './SeatSelectionPage';

export type CheckoutEvent = {
  id: string;
  title: string;
  venue: string;
  date: string;
  image: string | null;
};

export type CheckoutState = {
  event: CheckoutEvent;
  selection: CheckoutSelection[];
  queueAccessToken?: string;
  sessionExpiresAt?: string;
};

export const PENDING_PAYMENT_STORAGE_KEY = 'ticketbox.pending-payment';

const paymentOptions: Array<{
  value: PaymentProvider;
  title: string;
  copy: string;
  badge: string;
}> = [
  {
    value: 'MOCK',
    title: 'Demo payment',
    copy: 'Complete payment instantly in the local development environment.',
    badge: 'DEMO',
  },
  {
    value: 'VNPAY',
    title: 'VNPAY',
    copy: 'Continue securely to the VNPAY sandbox payment page.',
    badge: 'VNPAY',
  },
  {
    value: 'MOMO',
    title: 'MoMo',
    copy: 'Continue securely to the MoMo sandbox payment page.',
    badge: 'MoMo',
  },
];

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const state = location.state as CheckoutState | null;
  const event = state?.event;
  const selection = state?.selection ?? [];
  const storedAdmission = event ? getStoredQueueAdmission(event.id) : null;
  const queueAccessToken = state?.queueAccessToken ?? storedAdmission?.queueAccessToken;
  const [provider, setProvider] = useState<PaymentProvider>('MOCK');
  const [processing, setProcessing] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const creationStarted = useRef(false);
  const paymentWarningShown = useRef(false);
  const paymentExpiredShown = useRef(false);
  const paymentCountdown = useCountdown(createdOrder?.expiresAt, 180);
  const displayedTotal = createdOrder?.totalAmount ?? selection.reduce((total, item) => total + item.price * item.quantity, 0);

  useEffect(() => {
    if (!event || !selection.length || creationStarted.current) return;

    if (!queueAccessToken) {
      clearStoredQueueAdmission();
      setError('Your shopping session expired. Returning you to the waiting room.');
      window.setTimeout(() => navigate(`/concerts/${event.id}/waiting-room`, { replace: true }), 900);
      return;
    }

    let active = true;
    let timeoutId: number | undefined;
    creationStarted.current = true;

    timeoutId = window.setTimeout(() => {
      if (!active) return;
      setCreatingOrder(true);
      setError(null);

      createOrder(
        event.id,
        selection.map((item) => ({ ticketTypeId: item.id, quantity: item.quantity })),
        idempotencyKey.current,
        queueAccessToken,
      )
        .then((order) => {
          if (!active) return;
          setCreatedOrder(order);
        })
        .catch((requestError: unknown) => {
          if (!active) return;
          creationStarted.current = false;

          if (requestError instanceof ApiClientError && (requestError.status === 401 || requestError.status === 403)) {
            clearStoredQueueAdmission();
            setError('Your shopping session expired. Returning you to the waiting room.');
            window.setTimeout(() => navigate(`/concerts/${event.id}/waiting-room`, { replace: true }), 900);
            return;
          }

          if (requestError instanceof ApiClientError && requestError.status === 409) {
            setError('Ticket availability changed before your order was created. Return to ticket selection and review the latest inventory.');
            window.setTimeout(() => navigate(`/concerts/${event.id}/seats`, { replace: true }), 1200);
            return;
          }

          setError(requestError instanceof Error ? requestError.message : 'Your order could not be created.');
        })
        .finally(() => {
          if (active) setCreatingOrder(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [event, navigate, queueAccessToken, selection]);

  useEffect(() => {
    if (!paymentCountdown.isWarning || paymentCountdown.isExpired || paymentWarningShown.current) return;
    paymentWarningShown.current = true;
    toast.error('Less than 3 minutes left to complete payment.');
  }, [paymentCountdown.isExpired, paymentCountdown.isWarning, toast]);

  useEffect(() => {
    if (!paymentCountdown.isExpired || paymentExpiredShown.current) return;
    paymentExpiredShown.current = true;
    setProcessing(false);
    setError('Payment time expired. Please return to ticket selection and start a new order.');
    toast.error('Payment time expired.');
  }, [paymentCountdown.isExpired, toast]);

  if (!event || !selection.length) {
    return (
      <section className="checkout-missing page-width state-panel">
        <span className="state-icon" aria-hidden="true">!</span>
        <h1>No tickets selected</h1>
        <p>Choose your ticket zone and quantity before starting checkout.</p>
        <Link className="button button-primary" to="/">Browse concerts</Link>
      </section>
    );
  }

  async function waitForPaidOrder(orderId: string): Promise<Order> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const order = await getOrder(orderId);
      if (order.status === 'PAID') return order;
      if (['EXPIRED', 'CANCELLED', 'PAYMENT_FAILED'].includes(order.status)) return order;
      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }
    return getOrder(orderId);
  }

  async function submitPayment(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);

    if (!createdOrder) {
      setError('Your order is still being prepared. Please wait a moment.');
      return;
    }

    if (paymentCountdown.isExpired) {
      setError('Payment time expired. Please return to ticket selection and start a new order.');
      return;
    }

    setProcessing(true);

    try {
      const pendingPayment = { event, selection, orderId: createdOrder.id };
      sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(pendingPayment));

      const payment = await initiatePayment(createdOrder.id, provider);
      if (!payment.paymentUrl) {
        throw new Error('The payment gateway did not return a payment URL.');
      }

      if (provider === 'VNPAY' || provider === 'MOMO') {
        window.location.assign(payment.paymentUrl);
        return;
      }

      await completeMockPayment(payment.paymentUrl);
      const paidOrder = await waitForPaidOrder(createdOrder.id);
      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);

      if (paidOrder.status !== 'PAID') {
        navigate('/booking-confirmation?status=failed', {
          state: { event, selection, order: paidOrder },
        });
        return;
      }

      navigate('/booking-confirmation', {
        state: { event, selection, order: paidOrder },
      });
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError && requestError.status === 409
          ? 'Payment time expired or the order is no longer payable. Return to ticket selection and start a new order.'
          : requestError instanceof Error
            ? requestError.message
            : 'Your payment could not be completed.',
      );
      setProcessing(false);
    }
  }

  const paymentDisabled = processing || creatingOrder || !createdOrder || paymentCountdown.isExpired;

  return (
    <div className="checkout-page page-width">
      <div className="flow-topbar">
        <Link className="back-link" to={`/concerts/${event.id}/seats`}>{'<'} Change tickets</Link>
        <div className="flow-steps" aria-label="Booking progress">
          <span>1 <i>Tickets</i></span><b /><span className="active">2 <i>Checkout</i></span><b /><span>3 <i>Done</i></span>
        </div>
        <div className={`secure-label countdown-timer ${paymentCountdown.isExpired ? 'expired' : paymentCountdown.isWarning ? 'warning' : ''}`} role="status">
          <span>Payment time</span>
          <strong>{createdOrder ? paymentCountdown.formatted : '--:--'}</strong>
        </div>
      </div>

      <div className="checkout-heading">
        <p className="eyebrow"><span /> Almost yours</p>
        <h1>Complete your order.</h1>
        <p>Your order is created first, then the 15-minute payment timer starts from the backend expiry.</p>
      </div>

      {error ? <div className="checkout-error" role="alert"><p>{error}</p></div> : null}

      <form className="checkout-layout" onSubmit={submitPayment}>
        <div className="checkout-form">
          <section className="form-section">
            <div className="form-section-title"><span>01</span><h2>Payment method</h2></div>
            <div className={`payment-timer-card ${paymentCountdown.isExpired ? 'expired' : paymentCountdown.isWarning ? 'warning' : ''}`} role="status">
              <span>Payment time</span>
              <strong>{createdOrder ? paymentCountdown.formatted : creatingOrder ? 'Creating order...' : '--:--'}</strong>
              <p>
                {paymentCountdown.isExpired
                  ? 'This order can no longer be paid.'
                  : paymentCountdown.isWarning
                    ? 'Finish payment soon before this order expires.'
                    : 'You have 15 minutes after the backend creates your order.'}
              </p>
            </div>
            <div className="payment-options">
              {paymentOptions.map((option) => (
                <label className={`payment-option ${provider === option.value ? 'selected' : ''}`} key={option.value}>
                  <input
                    type="radio"
                    name="payment"
                    value={option.value}
                    checked={provider === option.value}
                    onChange={() => setProvider(option.value)}
                    disabled={paymentDisabled}
                  />
                  <span className={`payment-logo payment-${option.value.toLowerCase()}`}>{option.badge}</span>
                  <span><strong>{option.title}</strong><small>{option.copy}</small></span>
                </label>
              ))}
            </div>
            <p className="payment-explainer">
              TicketBox creates an awaiting-payment order first. The backend confirms the final inventory and total before opening the selected payment provider.
            </p>
          </section>
        </div>

        <aside className="order-summary">
          <div className="order-event">
            <RemoteImage src={event.image ?? undefined} alt="" width="240" height="180" />
            <div><span>Your event</span><h2>{event.title}</h2><p>{event.venue}</p></div>
          </div>
          <div className="summary-lines">
            {selection.map((item) => (
              <div key={item.id}><span>{item.quantity} x {item.name}</span><strong>{currency.format(item.price * item.quantity)}</strong></div>
            ))}
          </div>
          <div className={`hold-timer ${paymentCountdown.isExpired ? 'expired' : paymentCountdown.isWarning ? 'warning' : ''}`} role="status">
            <span>Payment time</span>
            <strong>{createdOrder ? paymentCountdown.formatted : '--:--'}</strong>
          </div>
          <div className="summary-total"><span>Estimated total</span><strong>{currency.format(displayedTotal)}</strong></div>
          <button className="button button-primary button-block" type="submit" disabled={paymentDisabled}>
            {creatingOrder
              ? 'Creating order...'
              : processing
                ? provider === 'MOCK'
                  ? 'Completing payment...'
                  : `Opening ${provider}...`
                : paymentCountdown.isExpired
                  ? 'Payment time expired'
                  : `Continue with ${provider === 'MOCK' ? 'demo payment' : provider}`}
          </button>
          {paymentCountdown.isExpired ? (
            <Link className="text-link checkout-restart-link" to={`/concerts/${event.id}/seats`}>Return to ticket selection</Link>
          ) : null}
          <p className="secure-note">The backend calculates the authoritative total and payment expiry.</p>
        </aside>
      </form>
    </div>
  );
}
