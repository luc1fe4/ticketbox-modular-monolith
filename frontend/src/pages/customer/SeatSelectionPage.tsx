import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiClientError, isRequestCanceled } from '../../api/client';
import { getConcert, type ConcertDetail, type TicketType } from '../../api/concerts';
import { clearStoredQueueAdmission, getStoredQueueAdmission } from '../../api/queue';
import { releaseTicket, reserveTicket } from '../../api/reservations';
import { ConcertSeatMap } from '../../components/ConcertSeatMap';
import { useToast } from '../../components/feedback/toast-context';
import { currency, eventDate } from '../../data/mockData';
import { useTicketAvailability } from '../../features/concert/useTicketAvailability';
import { useCountdown } from '../../hooks/useCountdown';

export type CheckoutSelection = TicketType & { quantity: number };

type ZoneLoadingAction = 'reserve' | 'release';

export function SeatSelectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [heldQuantities, setHeldQuantities] = useState<Record<string, number>>({});
  const [zoneLoading, setZoneLoading] = useState<Record<string, ZoneLoadingAction>>({});
  const [concertLoading, setConcertLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selectionWarningShown = useRef(false);
  const queueAdmission = id ? getStoredQueueAdmission(id) : null;
  const selectionCountdown = useCountdown(queueAdmission?.sessionExpiresAt, 120);
  const {
    ticketTypes,
    loading: availabilityLoading,
    updatesDelayed,
    initialLoadFailed,
    lastUpdatedAt,
    refresh,
  } = useTicketAvailability(id, reloadKey);

  useEffect(() => {
    if (!selectionCountdown.isWarning || selectionCountdown.isExpired || selectionWarningShown.current) return;
    selectionWarningShown.current = true;
    toast.error('Less than 2 minutes left to choose tickets.');
  }, [selectionCountdown.isExpired, selectionCountdown.isWarning, toast]);

  useEffect(() => {
    if (!id || !selectionCountdown.isExpired) return;
    returnToWaitingRoom('Your ticket selection time expired.');
  }, [id, selectionCountdown.isExpired]);

  useEffect(() => {
    if (!id) return;
    const admission = getStoredQueueAdmission(id);
    if (!admission) {
      navigate(`/concerts/${id}/waiting-room`, { replace: true });
      return;
    }

    const expiresInMs = new Date(admission.sessionExpiresAt).getTime() - Date.now();
    const timeoutId = window.setTimeout(() => {
      clearStoredQueueAdmission();
      setHeldQuantities({});
      navigate(`/concerts/${id}/waiting-room`, { replace: true });
    }, Math.max(0, expiresInMs));

    return () => window.clearTimeout(timeoutId);
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let active = true;
    setConcertLoading(true);
    setError(null);
    getConcert(id, controller.signal)
      .then((detail) => {
        if (!active) return;
        setConcert(detail);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active && !isRequestCanceled(requestError)) setError('The concert and seat map could not be loaded.');
      })
      .finally(() => {
        if (active) setConcertLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (ticketTypes.length === 0) {
      setSelectedZone(null);
      return;
    }

    setSelectedZone((current) => {
      const currentType = ticketTypes.find((item) => item.id === current);
      return currentType && (currentType.availableQty > 0 || (heldQuantities[currentType.id] ?? 0) > 0)
        ? current
        : ticketTypes.find((item) => item.availableQty > 0)?.id ?? null;
    });
  }, [heldQuantities, ticketTypes]);

  useEffect(() => {
    const adjustedTypes = ticketTypes.filter(
      (ticketType) => (heldQuantities[ticketType.id] ?? 0) > ticketType.maxPerAccount,
    );

    if (adjustedTypes.length === 0) return;

    setHeldQuantities((current) => {
      const next = { ...current };
      for (const ticketType of adjustedTypes) {
        next[ticketType.id] = ticketType.maxPerAccount;
      }
      return next;
    });
    setInventoryNotice(
      `${adjustedTypes.map((item) => item.name).join(', ')} hold limit changed. Your held tickets were adjusted.`,
    );
  }, [heldQuantities, ticketTypes]);

  const selection = useMemo<CheckoutSelection[]>(
    () => ticketTypes
      .filter((item) => (heldQuantities[item.id] ?? 0) > 0)
      .map((item) => ({ ...item, quantity: heldQuantities[item.id] })),
    [heldQuantities, ticketTypes],
  );
  const soldOutTicketTypeIds = useMemo(
    () => new Set(ticketTypes.filter((item) => item.availableQty === 0 && (heldQuantities[item.id] ?? 0) === 0).map((item) => item.id)),
    [heldQuantities, ticketTypes],
  );
  const ticketCount = selection.reduce((total, item) => total + item.quantity, 0);
  const subtotal = selection.reduce((total, item) => total + item.price * item.quantity, 0);

  function returnToWaitingRoom(message: string) {
    clearStoredQueueAdmission();
    setHeldQuantities({});
    toast.error(message);
    if (id) navigate(`/concerts/${id}/waiting-room`, { replace: true });
  }

  function showReserveFailure(requestError: unknown) {
    if (requestError instanceof ApiClientError) {
      if (requestError.status === 401 || requestError.status === 403) {
        returnToWaitingRoom('Your shopping session expired. Please rejoin the waiting room.');
        return;
      }

      if (requestError.status === 409) {
        setInventoryNotice('This ticket type just sold out or no longer has enough tickets.');
        toast.error('This ticket type just sold out or no longer has enough tickets.');
        refresh();
        return;
      }

      if (requestError.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
        return;
      }
    }

    toast.error(requestError instanceof Error ? requestError.message : 'Ticket hold could not be updated.');
  }

  async function updateQuantity(ticketType: TicketType, delta: 1 | -1) {
    if (!id) return;
    const admission = getStoredQueueAdmission(id);
    if (!admission) {
      returnToWaitingRoom('Your shopping session expired. Please rejoin the waiting room.');
      return;
    }

    const currentQuantity = heldQuantities[ticketType.id] ?? 0;
    if (delta > 0 && currentQuantity >= ticketType.maxPerAccount) return;
    if (delta > 0 && ticketType.availableQty <= 0) {
      setInventoryNotice('This ticket type just sold out or no longer has enough tickets.');
      toast.error('This ticket type just sold out or no longer has enough tickets.');
      refresh();
      return;
    }
    if (delta < 0 && currentQuantity <= 0) return;

    setSelectedZone(ticketType.id);
    setZoneLoading((current) => ({ ...current, [ticketType.id]: delta > 0 ? 'reserve' : 'release' }));

    try {
      if (delta > 0) {
        await reserveTicket(id, ticketType.id, 1, admission.queueAccessToken);
        setHeldQuantities((current) => ({ ...current, [ticketType.id]: (current[ticketType.id] ?? 0) + 1 }));
      } else {
        await releaseTicket(id, ticketType.id, 1, admission.queueAccessToken);
        setHeldQuantities((current) => {
          const nextQuantity = Math.max(0, (current[ticketType.id] ?? 0) - 1);
          return { ...current, [ticketType.id]: nextQuantity };
        });
      }
      refresh();
    } catch (requestError) {
      showReserveFailure(requestError);
    } finally {
      setZoneLoading((current) => {
        const next = { ...current };
        delete next[ticketType.id];
        return next;
      });
    }
  }

  function continueToCheckout() {
    if (!concert || selectionCountdown.isExpired) return;
    navigate('/checkout', {
      state: {
        event: { id: concert.id, title: concert.title, venue: concert.venueName, date: concert.eventDate, image: concert.posterUrl },
        selection,
        queueAccessToken: queueAdmission?.queueAccessToken,
        sessionExpiresAt: queueAdmission?.sessionExpiresAt,
      },
    });
  }

  if (concertLoading || availabilityLoading) return <div className="selection-loading page-width"><div className="event-skeleton"><div /><span /><span /></div></div>;
  if (error || initialLoadFailed || !concert) {
    return <div className="selection-error page-width state-panel"><span className="state-icon">!</span><h1>Seat map unavailable</h1><p>{error ?? (initialLoadFailed ? 'Ticket availability could not be loaded.' : 'Concert information was not found.')}</p><button className="button button-primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button><Link className="text-link" to="/">Return to concerts</Link></div>;
  }

  return (
    <div className="selection-page page-width">
      <div className="flow-topbar">
        <Link className="back-link" to={`/concerts/${concert.id}`}>{'<'} Event details</Link>
        <div className="flow-steps" aria-label="Booking progress"><span className="active">1 <i>Tickets</i></span><b /><span>2 <i>Checkout</i></span><b /><span>3 <i>Done</i></span></div>
        <div className={`timer countdown-timer ${selectionCountdown.isExpired ? 'expired' : selectionCountdown.isWarning ? 'warning' : updatesDelayed ? 'delayed' : ''}`} role="status" title={lastUpdatedAt ? `Inventory updated ${lastUpdatedAt.toLocaleTimeString()}` : undefined}>
          <span>Ticket selection time</span>
          <strong>{queueAdmission ? selectionCountdown.formatted : '--:--'}</strong>
        </div>
      </div>
      <header className="selection-header">
        <div><p className="eyebrow"><span /> Choose your experience</p><h1>{concert.title}</h1><p>{eventDate.format(new Date(concert.eventDate))} / {concert.venueName}</p></div>
      </header>
      <div className="selection-layout">
        <section className="zone-map-panel" aria-labelledby="zone-map-title">
          <div className="panel-heading"><div><span>Interactive SVG</span><h2 id="zone-map-title">Select a zone</h2></div><div className="map-legend"><i /> Available <i /> Selected <i /> Sold out</div></div>
          <ConcertSeatMap svg={concert.seatMapSvg} selectedTicketTypeId={selectedZone} disabledTicketTypeIds={soldOutTicketTypeIds} onZoneSelect={setSelectedZone} />
          <p className="map-note">Select a zone on the map or from the ticket list.</p>
        </section>
        <aside className="ticket-picker">
          <div className="panel-heading"><div><span>Live availability</span><h2>Choose tickets</h2></div></div>
          {inventoryNotice ? (
            <div className="inventory-notice" role="status">
              <p>{inventoryNotice}</p>
              <button type="button" onClick={() => setInventoryNotice(null)} aria-label="Dismiss availability update">x</button>
            </div>
          ) : null}
          <div className="zone-list">
            {ticketTypes.map((ticketType) => {
              const quantity = heldQuantities[ticketType.id] ?? 0;
              const loadingAction = zoneLoading[ticketType.id];
              const soldOut = ticketType.availableQty === 0;
              const canReserveMore = quantity < ticketType.maxPerAccount && ticketType.availableQty > 0;
              return (
                <div className={`zone-item ${selectedZone === ticketType.id ? 'focused' : ''} ${loadingAction ? 'zone-item-loading' : ''}`} key={ticketType.id}>
                  <button className="zone-focus" type="button" onClick={() => setSelectedZone(ticketType.id)} disabled={soldOut && quantity === 0}>
                    <i style={{ background: ticketType.zoneColor }} />
                    <span><strong>{ticketType.name}</strong><small>{quantity > 0 ? `${quantity} held for checkout` : `Maximum ${ticketType.maxPerAccount} per account`}</small></span>
                  </button>
                  <div className="zone-price"><strong>{currency.format(ticketType.price)}</strong><small>{soldOut ? 'Sold out' : `${ticketType.availableQty} available`}</small></div>
                  <div className="quantity-control" aria-busy={loadingAction ? 'true' : undefined}>
                    <button type="button" aria-label={`Remove one ${ticketType.name} ticket`} disabled={quantity === 0 || Boolean(loadingAction)} onClick={() => void updateQuantity(ticketType, -1)}>-</button>
                    <span aria-live="polite">{quantity}</span>
                    <button type="button" aria-label={`Add one ${ticketType.name} ticket`} disabled={!canReserveMore || Boolean(loadingAction)} onClick={() => void updateQuantity(ticketType, 1)}>+</button>
                  </div>
                  {loadingAction ? <span className="zone-hold-status" role="status">{loadingAction === 'reserve' ? 'Holding...' : 'Releasing...'}</span> : null}
                </div>
              );
            })}
          </div>
          <div className="selection-summary">
            <div><span>{ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}</span><strong>{currency.format(subtotal)}</strong></div>
            <div className={`hold-timer ${selectionCountdown.isExpired ? 'expired' : selectionCountdown.isWarning ? 'warning' : ''}`} role="status">
              <span>Ticket selection time</span>
              <strong>{queueAdmission ? selectionCountdown.formatted : '--:--'}</strong>
            </div>
            {selectionCountdown.isWarning && !selectionCountdown.isExpired ? (
              <p className="timer-warning-copy">Your 10-minute shopping session is almost over.</p>
            ) : null}
            {selection.length ? (
              <ul className="held-ticket-list" aria-label="Held tickets">
                {selection.map((item) => <li key={item.id}><span>{item.name}</span><strong>{item.quantity} held</strong></li>)}
              </ul>
            ) : null}
            <p>Only tickets successfully held by the backend appear here. This timer comes from your waiting-room session.</p>
            <button className="button button-primary button-block" type="button" disabled={!ticketCount || !queueAdmission || selectionCountdown.isExpired} onClick={continueToCheckout}>Continue to checkout <span aria-hidden="true">-&gt;</span></button>
          </div>
        </aside>
      </div>
    </div>
  );
}
