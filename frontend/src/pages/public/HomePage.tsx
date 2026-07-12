import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Search } from 'lucide-react';
import { isRequestCanceled } from '../../api/client';
import { getConcerts, type ConcertSummary } from '../../api/concerts';
import { EventCard } from '../../components/EventCard';
import { fallbackConcertImage, RemoteImage } from '../../components/RemoteImage';

const statusFilters = ['All', 'On sale', 'Upcoming', 'Sold out'] as const;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [concerts, setConcerts] = useState<ConcertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selectedStatus = searchParams.get('status') ?? 'All';
  const searchQuery = searchParams.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    getConcerts(0, 60, controller.signal)
      .then((page) => {
        if (!active) return;
        setConcerts(page.content);
      })
      .catch((requestError: unknown) => {
        if (active && !isRequestCanceled(requestError)) {
          setError('We could not load concerts. Check that the backend is running and try again.');
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

  const sortedConcerts = useMemo(() => [...concerts].sort(compareConcerts), [concerts]);
  const featuredConcert = sortedConcerts.find((concert) => concert.status === 'ON_SALE') ?? sortedConcerts[0];

  const filteredConcerts = useMemo(
    () => sortedConcerts.filter((concert) => {
      if (selectedStatus === 'On sale') return concert.status === 'ON_SALE';
      if (selectedStatus === 'Upcoming') return concert.status === 'DRAFT';
      if (selectedStatus === 'Sold out') return concert.status === 'SOLD_OUT';
      return true;
    }).filter((concert) => {
      const query = searchQuery.trim().toLocaleLowerCase('vi-VN');
      if (!query) return true;
      return `${concert.title} ${concert.venueName}`.toLocaleLowerCase('vi-VN').includes(query);
    }),
    [searchQuery, selectedStatus, sortedConcerts],
  );

  const onSale = filteredConcerts.filter((concert) => concert.status === 'ON_SALE').slice(0, 6);
  const soldOut = filteredConcerts.filter((concert) => concert.status === 'SOLD_OUT').slice(0, 6);
  const openingSoon = filteredConcerts
    .filter((concert) => concert.status === 'DRAFT')
    .slice(0, 6);

  function chooseStatus(status: (typeof statusFilters)[number]) {
    const next = new URLSearchParams(searchParams);
    if (status === 'All') next.delete('status');
    else next.set('status', status);
    setSearchParams(next);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const query = searchInput.trim();
    if (query) next.set('q', query);
    else next.delete('q');
    setSearchParams(next);
    document.querySelector('#discover-concerts')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <section className="hero discover-hero">
        <RemoteImage className="hero-image" src={featuredConcert?.posterUrl ?? fallbackConcertImage} alt="" width="1800" height="1000" />
        <div className="hero-scrim" />
        <div className="hero-content page-width">
          <p className="eyebrow"><span /> TicketBox Discover</p>
          <h1>Find the right concert.<br /><em>Book with confidence.</em></h1>
          <p className="hero-copy">Concerts are grouped by buying intent, so you can quickly see what is selling now, what is coming soon, and what needs attention.</p>
          <div className="hero-actions">
            {featuredConcert ? <Link className="button button-primary" to={`/concerts/${featuredConcert.id}`}>View featured concert <span aria-hidden="true">↗</span></Link> : null}
            <a className="button button-secondary" href="#discover-concerts">Browse concerts</a>
          </div>
        </div>
      </section>

      <section className="market-search-wrap" aria-label="Search concerts">
        <form className="market-search page-width" onSubmit={submitSearch}>
          <label><span>Search</span><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Artist, concert or venue" /></label>
          <label><span>Location</span><input value="Vietnam" readOnly aria-label="Location" /></label>
          <button className="button button-primary" type="submit"><Search size={16} /> Search</button>
        </form>
      </section>

      <section className="event-section page-width" id="discover-concerts">
        <div className="section-heading discover-heading">
          <div><p className="eyebrow"><span /> Curated catalogue</p><h2>Concerts, organized for action.</h2></div>
          <p className="concert-count">{filteredConcerts.length} matching concerts</p>
        </div>
        <div className="category-row" aria-label="Concert status">
          {statusFilters.map((status) => (
            <button key={status} type="button" className={selectedStatus === status ? 'active' : ''} aria-pressed={selectedStatus === status} onClick={() => chooseStatus(status)}>{status}</button>
          ))}
        </div>

        {loading ? <LoadingGrid /> : null}
        {error ? <StatePanel title="The stage lights flickered." copy={error} action="Try again" onAction={() => setReloadKey((value) => value + 1)} /> : null}
        {!loading && !error ? (
          <div className="discover-groups">
            {(selectedStatus === 'All' || selectedStatus === 'On sale') ? <ConcertGroup title="Đang bán vé" subtitle="Ưu tiên các concert có thể mua ngay." icon={<CalendarDays size={18} />} concerts={onSale} emptyCopy="Chưa có concert đang bán phù hợp bộ lọc." /> : null}
            {(selectedStatus === 'All' || selectedStatus === 'Upcoming') ? <ConcertGroup title="Sắp mở bán" subtitle="Theo dõi trước khi cổng vé mở." icon={<CalendarDays size={18} />} concerts={openingSoon} emptyCopy="Chưa có concert sắp mở bán phù hợp bộ lọc." /> : null}
            {(selectedStatus === 'All' || selectedStatus === 'Sold out') ? <ConcertGroup title="Đã hết vé" subtitle="Các concert đã bán hết vé hiện tại." icon={<CalendarDays size={18} />} concerts={soldOut} emptyCopy="Chưa có concert hết vé phù hợp bộ lọc." /> : null}
          </div>
        ) : null}
      </section>
    </>
  );
}

function ConcertGroup({
  title,
  subtitle,
  icon,
  concerts,
  emptyCopy,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  concerts: ConcertSummary[];
  emptyCopy: string;
}) {
  return (
    <section className="discover-group">
      <div className="discover-group-head">
        <div className="discover-group-icon" aria-hidden="true">{icon}</div>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {concerts.length ? (
        <div className="event-grid discover-grid">
          {concerts.map((concert, index) => (
            <EventCard key={concert.id} priority={index < 2} event={{ id: concert.id, title: concert.title, venue: concert.venueName, eventDate: concert.eventDate, status: concert.status, image: concert.posterUrl }} />
          ))}
        </div>
      ) : emptyCopy ? (
        <div className="discover-empty">{emptyCopy}</div>
      ) : null}
    </section>
  );
}

function LoadingGrid() {
  return <div className="event-grid" aria-label="Loading concerts" aria-live="polite">{[1, 2, 3].map((item) => <div className="event-skeleton" key={item}><div /><span /><span /></div>)}</div>;
}

function StatePanel({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) {
  return <div className="state-panel" role="status"><span className="state-icon" aria-hidden="true">!</span><h3>{title}</h3><p>{copy}</p><button className="button button-secondary" type="button" onClick={onAction}>{action}</button></div>;
}

function compareConcerts(a: ConcertSummary, b: ConcertSummary) {
  const statusWeight = (status: ConcertSummary['status']) => {
    if (status === 'ON_SALE') return 0;
    if (status === 'DRAFT') return 1;
    if (status === 'SOLD_OUT') return 2;
    if (status === 'COMPLETED') return 3;
    return 4;
  };
  const byStatus = statusWeight(a.status) - statusWeight(b.status);
  if (byStatus !== 0) return byStatus;
  return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
}
