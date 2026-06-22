import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { isRequestCanceled } from '../../api/client';
import { getConcert, type ConcertDetail } from '../../api/concerts';
import { getMyTickets, type Ticket, type TicketStatus } from '../../api/tickets';
import { RemoteImage } from '../../components/RemoteImage';
import { eventDate } from '../../data/mockData';

type TicketFilter = 'all' | TicketStatus;
type TicketWithConcert = Ticket & { concert: ConcertDetail | null };

const tabs: Array<{ value: TicketFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'VALID', label: 'Valid' },
  { value: 'USED', label: 'Used' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'TRANSFERRED', label: 'Transferred' },
];

const issuedDate = new Intl.DateTimeFormat('en-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketWithConcert[]>([]);
  const [activeTab, setActiveTab] = useState<TicketFilter>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithConcert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    getMyTickets(controller.signal)
      .then(async (ticketList) => {
        const concertIds = [...new Set(ticketList.map((ticket) => ticket.concertId))];
        const concertResults = await Promise.allSettled(
          concertIds.map((concertId) => getConcert(concertId, controller.signal)),
        );
        if (!active) return;

        const concerts = new Map<string, ConcertDetail>();
        concertResults.forEach((result, index) => {
          if (result.status === 'fulfilled') concerts.set(concertIds[index], result.value);
        });

        const enrichedTickets = ticketList.map((ticket) => ({
          ...ticket,
          concert: concerts.get(ticket.concertId) ?? null,
        }));
        setTickets(enrichedTickets);
        setSelectedTicket((current) =>
          current ? enrichedTickets.find((ticket) => ticket.id === current.id) ?? null : null,
        );
      })
      .catch((requestError: unknown) => {
        if (active && !isRequestCanceled(requestError)) {
          setError('Your tickets could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const filteredTickets = useMemo(
    () => activeTab === 'all' ? tickets : tickets.filter((ticket) => ticket.status === activeTab),
    [activeTab, tickets],
  );

  if (loading) {
    return (
      <div className="tickets-page page-width">
        <div className="tickets-heading"><div><p className="eyebrow"><span /> Your live archive</p><h1>My Tickets</h1></div></div>
        <div className="ticket-list" aria-label="Loading tickets" aria-live="polite">
          {[1, 2].map((item) => <div className="event-skeleton" key={item}><div /><span /><span /></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tickets-page page-width">
        <div className="state-panel"><span className="state-icon">!</span><h3>Tickets unavailable</h3><p>{error}</p><button className="button button-primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button></div>
      </div>
    );
  }

  return (
    <div className="tickets-page page-width">
      <div className="tickets-heading">
        <div><p className="eyebrow"><span /> Your live archive</p><h1>My Tickets</h1><p>Everything you booked, all in one place.</p></div>
        <Link className="button button-secondary" to="/">Find more events ↗</Link>
      </div>

      <div className="ticket-tabs" role="tablist" aria-label="Ticket status">
        {tabs.map((tab) => (
          <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value} className={activeTab === tab.value ? 'active' : ''} onClick={() => setActiveTab(tab.value)}>
            {tab.label}
          </button>
        ))}
      </div>

      {filteredTickets.length > 0 ? (
        <div className="ticket-list">
          {filteredTickets.map((ticket) => (
            <TicketItem key={ticket.id} ticket={ticket} onOpen={() => setSelectedTicket(ticket)} />
          ))}
        </div>
      ) : (
        <div className="state-panel"><span className="state-icon">◇</span><h3>No tickets here yet.</h3><p>Your next unforgettable night is still out there.</p><Link className="button button-primary" to="/">Browse events</Link></div>
      )}

      {selectedTicket ? <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} /> : null}
    </div>
  );
}

function TicketItem({ ticket, onOpen }: { ticket: TicketWithConcert; onOpen: () => void }) {
  const statusClass = ticket.status.toLowerCase();
  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <article
      className={`ticket-item ticket-${statusClass}`}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${ticket.concertTitle}, ${ticket.ticketTypeName}`}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <RemoteImage src={ticket.concert?.posterUrl ?? undefined} alt="" width="420" height="300" loading="lazy" />
      <div className="ticket-copy">
        <div><span className={`ticket-status status-${statusClass}`}>{ticket.status}</span><span className="ticket-id">{ticket.id.slice(0, 8).toUpperCase()}</span></div>
        <h2>{ticket.concertTitle}</h2>
        {ticket.concert ? <p>{eventDate.format(new Date(ticket.concert.eventDate))} · {ticket.concert.venueName}</p> : null}
        <p>Issued {issuedDate.format(new Date(ticket.issuedAt))}</p>
        <strong>{ticket.ticketTypeName}</strong>
      </div>
      <div className="ticket-action">
        {ticket.status === 'VALID' ? (
          <QRCodeSVG
            className="ticket-qr ticket-qr-small"
            value={ticket.qrCode}
            size={72}
            level="M"
            marginSize={2}
            title={`QR code for ${ticket.concertTitle}`}
          />
        ) : null}
        <span className="ticket-open-label">View details <span aria-hidden="true">→</span></span>
      </div>
    </article>
  );
}

function TicketDetail({ ticket, onClose }: { ticket: TicketWithConcert; onClose: () => void }) {
  return (
    <div className="ticket-detail-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="ticket-detail-panel" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title">
        <button className="ticket-detail-close" type="button" onClick={onClose} aria-label="Close ticket details">×</button>
        <p className="eyebrow"><span /> E-ticket details</p>
        <h2 id="ticket-detail-title">{ticket.concertTitle}</h2>
        <dl className="ticket-detail-facts">
          <div><dt>Ticket ID</dt><dd>{ticket.id}</dd></div>
          <div><dt>Zone</dt><dd>{ticket.ticketTypeName}</dd></div>
          <div><dt>Status</dt><dd>{ticket.status}</dd></div>
          {ticket.concert ? <div><dt>Event date</dt><dd>{eventDate.format(new Date(ticket.concert.eventDate))}</dd></div> : null}
          {ticket.concert ? <div><dt>Venue</dt><dd>{ticket.concert.venueName}</dd></div> : null}
          <div><dt>Issued</dt><dd>{issuedDate.format(new Date(ticket.issuedAt))}</dd></div>
        </dl>
        {ticket.status === 'VALID' ? (
          <div className="ticket-qr-payload">
            <QRCodeSVG
              className="ticket-qr"
              value={ticket.qrCode}
              size={180}
              level="M"
              marginSize={3}
              title={`Ticket QR code for ${ticket.concertTitle}`}
            />
            <div>
              <span>Ticket QR code</span>
              <strong>Scan at the entrance</strong>
              <p>Keep this QR code private. Screenshots shared with others may allow unauthorized entry.</p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
