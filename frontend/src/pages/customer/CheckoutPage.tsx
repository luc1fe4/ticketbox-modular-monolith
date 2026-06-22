import { useRef, useState } from 'react';
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
import { RemoteImage } from '../../components/RemoteImage';
import { currency } from '../../data/mockData';
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
];

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;
  const [provider, setProvider] = useState<PaymentProvider>('MOCK');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const createdOrder = useRef<Order | null>(null);

  if (!state?.event || !state.selection?.length) {
    return (
      <section className="checkout-missing page-width state-panel">
        <span className="state-icon" aria-hidden="true">!</span>
        <h1>No tickets selected</h1>
        <p>Choose your ticket zone and quantity before starting checkout.</p>
        <Link className="button button-primary" to="/">Browse concerts</Link>
      </section>
    );
  }

  const { event, selection } = state;
  const displayedTotal = selection.reduce((total, item) => total + item.price * item.quantity, 0);

  async function waitForPaidOrder(orderId: string): Promise<Order> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const order = await getOrder(orderId);
      if (order.status === 'PAID') return order;
      if (['EXPIRED', 'CANCELLED', 'PAYMENT_FAILED'].includes(order.status)) return order;
      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }
    return getOrder(orderId);
  }

  async function submitOrder(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setProcessing(true);

    try {
      const order = createdOrder.current ?? await createOrder(
          event.id,
          selection.map((item) => ({ ticketTypeId: item.id, quantity: item.quantity })),
          idempotencyKey.current,
        );
      createdOrder.current = order;
      const pendingPayment = { event, selection, orderId: order.id };
      sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(pendingPayment));

      const payment = await initiatePayment(order.id, provider);
      if (!payment.paymentUrl) {
        throw new Error('The payment gateway did not return a payment URL.');
      }

      if (provider === 'VNPAY') {
        window.location.assign(payment.paymentUrl);
        return;
      }

      await completeMockPayment(payment.paymentUrl);
      const paidOrder = await waitForPaidOrder(order.id);
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
          ? 'Ticket availability changed before your order was created. Return to ticket selection and review the latest inventory.'
          : requestError instanceof Error
            ? requestError.message
            : 'Your order could not be completed.',
      );
      setProcessing(false);
    }
  }

  return (
    <div className="checkout-page page-width">
      <div className="flow-topbar">
        <Link className="back-link" to={`/concerts/${event.id}/seats`}>← Change tickets</Link>
        <div className="flow-steps" aria-label="Booking progress">
          <span>1 <i>Tickets</i></span><b /><span className="active">2 <i>Checkout</i></span><b /><span>3 <i>Done</i></span>
        </div>
        <div className="secure-label">◇ Secure checkout</div>
      </div>

      <div className="checkout-heading">
        <p className="eyebrow"><span /> Almost yours</p>
        <h1>Complete your order.</h1>
        <p>Your tickets are confirmed and temporarily held when the order is created.</p>
      </div>

      {error ? <div className="checkout-error" role="alert"><p>{error}</p></div> : null}

      <form className="checkout-layout" onSubmit={submitOrder}>
        <div className="checkout-form">
          <section className="form-section">
            <div className="form-section-title"><span>01</span><h2>Payment method</h2></div>
            <div className="payment-options">
              {paymentOptions.map((option) => (
                <label className={`payment-option ${provider === option.value ? 'selected' : ''}`} key={option.value}>
                  <input
                    type="radio"
                    name="payment"
                    value={option.value}
                    checked={provider === option.value}
                    onChange={() => setProvider(option.value)}
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
              <div key={item.id}><span>{item.quantity} × {item.name}</span><strong>{currency.format(item.price * item.quantity)}</strong></div>
            ))}
          </div>
          <div className="summary-total"><span>Estimated total</span><strong>{currency.format(displayedTotal)}</strong></div>
          <button className="button button-primary button-block" type="submit" disabled={processing}>
            {processing
              ? provider === 'VNPAY' ? 'Opening VNPAY…' : 'Completing payment…'
              : `Continue with ${provider === 'MOCK' ? 'demo payment' : 'VNPAY'}`}
          </button>
          <p className="secure-note">The backend calculates the authoritative total from current ticket prices.</p>
        </aside>
      </form>
    </div>
  );
}
