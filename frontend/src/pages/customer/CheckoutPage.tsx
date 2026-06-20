import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RemoteImage } from '../../components/RemoteImage';
import { api } from '../../api/client';
import { currency, events, type Zone, zones } from '../../data/mockData';
import type { CheckoutSelection } from './SeatSelectionPage';

export type CheckoutEvent = {
  id: string | number;
  title: string;
  venue: string;
  date: string;
  image: string | null;
};

type CheckoutState = {
  event?: CheckoutEvent;
  eventId?: number;
  selection?: CheckoutSelection[] | Array<Zone & { quantity: number }>;
};

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as CheckoutState;
  const mockEvent = events.find((item) => item.id === state.eventId) ?? events[0];
  const event: CheckoutEvent = state.event ?? {
    id: mockEvent.id,
    title: mockEvent.title,
    venue: mockEvent.venue,
    date: mockEvent.date,
    image: mockEvent.image,
  };
  const selection = state.selection ?? [{ ...zones[1], quantity: 1 }];
  const subtotal = selection.reduce((total, item) => total + item.price * item.quantity, 0);
  const fees = 75000;
  const [payment, setPayment] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitOrder(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setProcessing(true);
    try {
      const idempotencyKey = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      await api.post(
        '/api/orders',
        {
          concertId: event.id,
          items: selection.map((item) => ({ ticketTypeId: item.id, quantity: item.quantity })),
        },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      navigate('/booking-confirmation', { state: { event, selection } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Your order could not be completed.');
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
        <p>Your tickets are reserved for <strong>09:42</strong>.</p>
      </div>
      {error ? <div className="state-panel" role="alert"><p>{error}</p></div> : null}

      <form className="checkout-layout" onSubmit={submitOrder}>
        <div className="checkout-form">
          <FormSection number="01" title="Contact details">
            <div className="form-grid">
              <Field label="Full name" name="fullName" autoComplete="name" placeholder="Nguyễn Minh Quân…" />
              <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com…" />
              <Field label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="+84 901 234 567…" />
            </div>
          </FormSection>

          <FormSection number="02" title="Payment method">
            <div className="payment-options">
              {[
                ['card', 'Credit or debit card', 'Visa · Mastercard · JCB'],
                ['momo', 'MoMo wallet', 'Fast payment with your phone'],
                ['vnpay', 'VNPAY QR', 'Scan with your banking app'],
              ].map(([value, title, copy]) => (
                <label className={`payment-option ${payment === value ? 'selected' : ''}`} key={value}>
                  <input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} />
                  <span className={`payment-logo payment-${value}`}>{value === 'card' ? '••••' : value.toUpperCase()}</span>
                  <span><strong>{title}</strong><small>{copy}</small></span>
                </label>
              ))}
            </div>
            {payment === 'card' ? (
              <div className="card-fields">
                <Field label="Card number" name="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456…" />
                <div className="form-grid form-grid-two">
                  <Field label="Expiry date" name="expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY…" />
                  <Field label="Security code" name="cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC…" />
                </div>
              </div>
            ) : null}
          </FormSection>
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
            <div><span>Booking fee</span><strong>{currency.format(fees)}</strong></div>
          </div>
          <button className="promo-toggle" type="button" aria-expanded={promoOpen} onClick={() => setPromoOpen((value) => !value)}>
            Have a promo code? <span>{promoOpen ? '−' : '+'}</span>
          </button>
          {promoOpen ? (
            <div className="promo-field">
              <label className="sr-only" htmlFor="promo">Promo code</label>
              <input id="promo" name="promo" autoComplete="off" placeholder="Enter code…" />
              <button type="button">Apply</button>
            </div>
          ) : null}
          <div className="summary-total"><span>Total</span><strong>{currency.format(subtotal + fees)}</strong></div>
          <button className="button button-primary button-block" type="submit" disabled={processing}>
            {processing ? 'Processing…' : `Pay ${currency.format(subtotal + fees)}`}
          </button>
          <button className="failure-preview" type="button" onClick={() => navigate('/booking-confirmation?status=failed', { state: { event } })}>
            Preview payment failure
          </button>
          <p className="secure-note">By paying, you agree to TicketBox’s terms and refund policy.</p>
        </aside>
      </form>
    </div>
  );
}

function FormSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="form-section"><div className="form-section-title"><span>{number}</span><h2>{title}</h2></div>{children}</section>;
}

function Field({ label, name, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return <label className="field"><span>{label}</span><input required type={type} name={name} {...props} /></label>;
}
