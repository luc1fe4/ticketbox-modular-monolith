import { useState } from 'react';
import { Link } from 'react-router-dom';
import { eventDate, mockTickets, type TicketStatus } from '../../data/mockData';

const tabs: Array<'all' | TicketStatus> = ['all', 'upcoming', 'used', 'expired'];

export function MyTicketsPage() {
  const [activeTab, setActiveTab] = useState<'all' | TicketStatus>('all');
  const tickets = activeTab === 'all' ? mockTickets : mockTickets.filter((ticket) => ticket.status === activeTab);

  return (
    <div className="tickets-page page-width">
      <div className="tickets-heading">
        <div><p className="eyebrow"><span /> Your live archive</p><h1>My Tickets</h1><p>Everything you booked, all in one place.</p></div>
        <Link className="button button-secondary" to="/">Find more events ↗</Link>
      </div>
      <div className="ticket-tabs" role="tablist" aria-label="Ticket status">
        {tabs.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {tickets.length > 0 ? (
        <div className="ticket-list">
          {tickets.map((ticket) => <TicketItem key={ticket.id} {...ticket} />)}
        </div>
      ) : (
        <div className="state-panel"><span className="state-icon">◇</span><h3>No {activeTab} tickets.</h3><p>Your next unforgettable night is still out there.</p><Link className="button button-primary" to="/">Browse events</Link></div>
      )}
    </div>
  );
}

function TicketItem({ id, event, zone, status }: (typeof mockTickets)[number]) {
  return (
    <article className={`ticket-item ticket-${status}`}>
      <img src={event.image} alt="" width="420" height="300" loading="lazy" />
      <div className="ticket-copy">
        <div><span className={`ticket-status status-${status}`}>{status}</span><span className="ticket-id">{id}</span></div>
        <h2>{event.title}</h2>
        <p>{eventDate.format(new Date(event.date))} · {event.time}</p>
        <p>{event.venue} · {event.city}</p>
        <strong>{zone}</strong>
      </div>
      <div className="ticket-action">
        {status === 'upcoming' ? <><div className="mini-qr"><i /><i /><i /></div><button type="button" className="text-link">Open ticket →</button></> : null}
        {status === 'used' ? <p>Checked in<br />26 Jun · 17:42</p> : null}
        {status === 'expired' ? <p>This event has ended.</p> : null}
      </div>
    </article>
  );
}
