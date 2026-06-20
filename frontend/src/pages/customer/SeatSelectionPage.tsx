import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getConcert,
  getConcertTicketTypes,
  type ConcertDetail,
  type TicketType,
} from '../../api/concerts';
import { ConcertSeatMap } from '../../components/ConcertSeatMap';
import { currency, eventDate } from '../../data/mockData';

export type CheckoutSelection = TicketType & { quantity: number };

export function SeatSelectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      getConcert(id, controller.signal),
      getConcertTicketTypes(id, controller.signal),
    ])
      .then(([detail, types]) => {
        const activeTypes = types.filter((item) => item.isActive);
        setConcert(detail);
        setTicketTypes(activeTypes);
        setSelectedZone(activeTypes.find((item) => item.availableQty > 0)?.id ?? null);
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError('The seat map and ticket inventory could not be loaded.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const selection = useMemo<CheckoutSelection[]>(
    () =>
      ticketTypes
        .filter((ticketType) => (quantities[ticketType.id] ?? 0) > 0)
        .map((ticketType) => ({ ...ticketType, quantity: quantities[ticketType.id] })),
    [quantities, ticketTypes],
  );
  const soldOutTicketTypeIds = useMemo(
    () => new Set(ticketTypes.filter((item) => item.availableQty === 0).map((item) => item.id)),
    [ticketTypes],
  );
  const ticketCount = selection.reduce((total, item) => total + item.quantity, 0);
  const subtotal = selection.reduce((total, item) => total + item.price * item.quantity, 0);

  function updateQuantity(ticketType: TicketType, delta: number) {
    setQuantities((current) => {
      const currentQuantity = current[ticketType.id] ?? 0;
      const maximum = Math.min(ticketType.maxPerAccount, ticketType.availableQty);
      return {
        ...current,
        [ticketType.id]: Math.max(0, Math.min(maximum, currentQuantity + delta)),
      };
    });
  }

  if (loading) {
    return <div className="selection-loading page-width"><div className="event-skeleton"><div /><span /><span /></div></div>;
  }

  if (error || !concert) {
    return (
      <div className="selection-error page-width state-panel">
        <span className="state-icon">!</span>
        <h1>Seat map unavailable</h1>
        <p>{error ?? 'Concert information was not found.'}</p>
        <button className="button button-primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button>
        <Link className="text-link" to="/">Return to concerts</Link>
      </div>
    );
  }

  const currentConcert = concert;

  function continueToCheckout() {
    navigate('/checkout', {
      state: {
        event: {
          id: currentConcert.id,
          title: currentConcert.title,
          venue: currentConcert.venueName,
          date: currentConcert.eventDate,
          image: currentConcert.posterUrl,
        },
        selection,
      },
    });
  }

  return (
    <div className="selection-page page-width">
      <div className="flow-topbar">
        <Link className="back-link" to={`/concerts/${currentConcert.id}`}>← Event details</Link>
        <div className="flow-steps" aria-label="Booking progress">
          <span className="active">1 <i>Tickets</i></span><b /><span>2 <i>Checkout</i></span><b /><span>3 <i>Done</i></span>
        </div>
        <div className="timer"><span aria-hidden="true">◷</span> Live inventory</div>
      </div>

      <header className="selection-header">
        <div>
          <p className="eyebrow"><span /> Choose your experience</p>
          <h1>{currentConcert.title}</h1>
          <p>{eventDate.format(new Date(currentConcert.eventDate))} · {currentConcert.venueName}</p>
        </div>
      </header>

      <div className="selection-layout">
        <section className="zone-map-panel" aria-labelledby="zone-map-title">
          <div className="panel-heading">
            <div><span>Interactive SVG</span><h2 id="zone-map-title">Select a zone</h2></div>
            <div className="map-legend"><i /> Available <i /> Selected <i /> Sold out</div>
          </div>
          <ConcertSeatMap
            svg={currentConcert.seatMapSvg}
            selectedTicketTypeId={selectedZone}
            disabledTicketTypeIds={soldOutTicketTypeIds}
            onZoneSelect={setSelectedZone}
          />
          <p className="map-note">Select a zone on the map or from the ticket list.</p>
        </section>

        <aside className="ticket-picker">
          <div className="panel-heading"><div><span>Live availability</span><h2>Choose tickets</h2></div></div>
          <div className="zone-list">
            {ticketTypes.map((ticketType) => {
              const quantity = quantities[ticketType.id] ?? 0;
              const soldOut = ticketType.availableQty === 0;
              return (
                <div className={`zone-item ${selectedZone === ticketType.id ? 'focused' : ''}`} key={ticketType.id}>
                  <button
                    className="zone-focus"
                    type="button"
                    onClick={() => setSelectedZone(ticketType.id)}
                    disabled={soldOut}
                  >
                    <i style={{ background: ticketType.zoneColor }} />
                    <span>
                      <strong>{ticketType.name}</strong>
                      <small>Maximum {ticketType.maxPerAccount} per account</small>
                    </span>
                  </button>
                  <div className="zone-price">
                    <strong>{currency.format(ticketType.price)}</strong>
                    {!soldOut && ticketType.availableQty < 20 ? <small>Only {ticketType.availableQty} left</small> : null}
                    {soldOut ? <small>Sold out</small> : <small>{ticketType.availableQty} available</small>}
                  </div>
                  <div className="quantity-control">
                    <button type="button" aria-label={`Remove one ${ticketType.name} ticket`} disabled={quantity === 0} onClick={() => updateQuantity(ticketType, -1)}>−</button>
                    <span aria-live="polite">{quantity}</span>
                    <button type="button" aria-label={`Add one ${ticketType.name} ticket`} disabled={soldOut || quantity >= Math.min(ticketType.maxPerAccount, ticketType.availableQty)} onClick={() => updateQuantity(ticketType, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="selection-summary">
            <div><span>{ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}</span><strong>{currency.format(subtotal)}</strong></div>
            <p>Availability is loaded from the TicketBox API. Fees are shown at checkout.</p>
            <button className="button button-primary button-block" type="button" disabled={ticketCount === 0} onClick={continueToCheckout}>
              Continue to checkout <span aria-hidden="true">→</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
