import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { currency, eventDate, getEvent, zones } from '../../data/mockData';

export function SeatSelectionPage() {
  const { id } = useParams();
  const event = getEvent(id);
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState(zones[1].id);
  const [quantities, setQuantities] = useState<Record<string, number>>({ platinum: 1 });

  const selection = useMemo(
    () =>
      zones
        .filter((zone) => (quantities[zone.id] ?? 0) > 0)
        .map((zone) => ({ ...zone, quantity: quantities[zone.id] })),
    [quantities],
  );
  const ticketCount = selection.reduce((total, item) => total + item.quantity, 0);
  const subtotal = selection.reduce((total, item) => total + item.price * item.quantity, 0);

  function updateQuantity(zoneId: string, delta: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(4, (current[zoneId] ?? 0) + delta));
      return { ...current, [zoneId]: next };
    });
  }

  function continueToCheckout() {
    navigate('/checkout', { state: { eventId: event.id, selection } });
  }

  return (
    <div className="selection-page page-width">
      <div className="flow-topbar">
        <Link className="back-link" to={`/concerts/${event.id}`}>← Event details</Link>
        <div className="flow-steps" aria-label="Booking progress">
          <span className="active">1 <i>Tickets</i></span><b /><span>2 <i>Checkout</i></span><b /><span>3 <i>Done</i></span>
        </div>
        <div className="timer"><span aria-hidden="true">◷</span> 09:42</div>
      </div>

      <header className="selection-header">
        <div>
          <p className="eyebrow"><span /> Choose your experience</p>
          <h1>{event.title}</h1>
          <p>{eventDate.format(new Date(event.date))} · {event.time} · {event.venue}</p>
        </div>
      </header>

      <div className="selection-layout">
        <section className="zone-map-panel" aria-labelledby="zone-map-title">
          <div className="panel-heading">
            <div><span>Interactive map</span><h2 id="zone-map-title">Select a zone</h2></div>
            <div className="map-legend"><i /> Available <i /> Selected <i /> Sold out</div>
          </div>
          <div className="stage-map">
            <div className="stage"><span>STAGE</span><small>THE DREAMER</small></div>
            <div className="catwalk" />
            {zones.map((zone, index) => (
              <button
                key={zone.id}
                type="button"
                disabled={zone.remaining === 0}
                aria-label={`${zone.name}, ${zone.remaining === 0 ? 'sold out' : currency.format(zone.price)}`}
                aria-pressed={selectedZone === zone.id}
                className={`map-zone zone-${index + 1} ${selectedZone === zone.id ? 'selected' : ''}`}
                style={{ '--zone-color': zone.color } as React.CSSProperties}
                onClick={() => setSelectedZone(zone.id)}
              >
                <strong>{zone.name}</strong>
                <span>{zone.remaining === 0 ? 'Sold out' : currency.format(zone.price)}</span>
              </button>
            ))}
            <div className="map-console">FOH</div>
          </div>
          <p className="map-note">Map is indicative. Exact viewing experience may vary.</p>
        </section>

        <aside className="ticket-picker">
          <div className="panel-heading"><div><span>Admission</span><h2>Choose tickets</h2></div></div>
          <div className="zone-list">
            {zones.map((zone) => {
              const quantity = quantities[zone.id] ?? 0;
              return (
                <div className={`zone-item ${selectedZone === zone.id ? 'focused' : ''}`} key={zone.id}>
                  <button
                    className="zone-focus"
                    type="button"
                    onClick={() => setSelectedZone(zone.id)}
                    disabled={zone.remaining === 0}
                  >
                    <i style={{ background: zone.color }} />
                    <span><strong>{zone.name}</strong><small>{zone.note}</small></span>
                  </button>
                  <div className="zone-price">
                    <strong>{currency.format(zone.price)}</strong>
                    {zone.remaining > 0 && zone.remaining < 10 ? <small>Only {zone.remaining} left</small> : null}
                    {zone.remaining === 0 ? <small>Sold out</small> : null}
                  </div>
                  <div className="quantity-control">
                    <button type="button" aria-label={`Remove one ${zone.name} ticket`} disabled={quantity === 0} onClick={() => updateQuantity(zone.id, -1)}>−</button>
                    <span aria-live="polite">{quantity}</span>
                    <button type="button" aria-label={`Add one ${zone.name} ticket`} disabled={zone.remaining === 0 || quantity === 4} onClick={() => updateQuantity(zone.id, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="selection-summary">
            <div><span>{ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}</span><strong>{currency.format(subtotal)}</strong></div>
            <p>Fees are shown at checkout.</p>
            <button className="button button-primary button-block" type="button" disabled={ticketCount === 0} onClick={continueToCheckout}>
              Continue to checkout <span aria-hidden="true">→</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
