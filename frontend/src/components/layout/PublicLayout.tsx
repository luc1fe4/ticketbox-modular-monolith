import { type FormEvent, useEffect, useState } from 'react';
import { ChevronDown, LogOut, Search } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getUnreadNotificationCount } from '../../api/notifications';
import { useAuth } from '../../features/auth/AuthContext';
import { getRoleHome, getRoleHomeLabel } from '../../features/auth/roleRoutes';

export function Logo({ to = '/', label = 'TicketBox home' }: { to?: string; label?: string }) {
  return (
    <Link className="logo" to={to} aria-label={label}>
      <span className="logo-mark" aria-hidden="true">T</span>
      <span>ticket<span>box</span></span>
    </Link>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function NotificationLabel({ count }: { count: number }) {
  return (
    <span className="notification-link-label">
      Notifications
      {count > 0 ? <span className="notification-badge" aria-label={`${count} unread notifications`}>{count > 99 ? '99+' : count}</span> : null}
    </span>
  );
}

export function PublicLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [headerSearch, setHeaderSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const isBookingFlow =
    /^\/concerts\/[^/]+\/(waiting-room|seats)$/.test(location.pathname) ||
    ['/checkout', '/booking-confirmation', '/payment/result'].includes(location.pathname);

  const homePath = getRoleHome(user?.role);
  const homeLabel = getRoleHomeLabel(user?.role);
  const canBrowseCatalogue = !user || user.role === 'AUDIENCE';
  const isAudience = user?.role === 'AUDIENCE';

  function logOut() {
    setMenuOpen(false);
    setMobileOpen(false);
    setUnreadNotifications(0);
    logout();
    navigate('/');
  }

  function submitHeaderSearch(event: FormEvent) {
    event.preventDefault();
    const query = headerSearch.trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/');
    setHeaderSearch('');
  }

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const controller = new AbortController();
    getUnreadNotificationCount(controller.signal)
      .then((result) => setUnreadNotifications(result.count))
      .catch(() => setUnreadNotifications(0));

    return () => controller.abort();
  }, [user?.id]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {!isBookingFlow ? (
        <header className="site-header">
          <div className="header-inner">
            <Logo to={homePath} label={homeLabel} />
            <nav className="desktop-nav" aria-label="Primary navigation">
              {canBrowseCatalogue ? <NavLink to="/">Discover</NavLink> : null}
              {isAudience ? <NavLink to="/my-tickets">My Tickets</NavLink> : null}
              {isAudience ? <NavLink to="/notifications"><NotificationLabel count={unreadNotifications} /></NavLink> : null}
              {user?.role === 'ADMIN' ? <NavLink to="/admin">Administration</NavLink> : null}
              {user?.role === 'ORGANIZER' ? <NavLink to="/organizer">Organizer studio</NavLink> : null}
              {user?.role === 'STAFF' ? <NavLink to="/staff">Gate operations</NavLink> : null}
            </nav>
            <div className="header-actions">
              <form className="header-search" onSubmit={submitHeaderSearch}>
                <span className="sr-only">Search events</span>
                <Search aria-hidden="true" size={16} />
                <input value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} type="search" name="event-search" autoComplete="off" placeholder="Search artists, events..." />
              </form>
              {user ? (
                <div className="account-wrap">
                  <button
                    className="avatar-button"
                    type="button"
                    aria-label="Open account menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((value) => !value)}
                  >
                    <span>{initials(user.fullName)}</span>
                    <span className="account-name">{user.fullName}</span>
                    <ChevronDown aria-hidden="true" size={15} />
                  </button>
                  {menuOpen ? (
                    <div className="account-menu">
                      <div><strong>{user.fullName}</strong><span>{user.email}</span><span>{user.role}</span></div>
                      {isAudience ? <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile & history</Link> : null}
                      {isAudience ? <Link to="/notifications" onClick={() => setMenuOpen(false)}><NotificationLabel count={unreadNotifications} /></Link> : null}
                      {isAudience ? <Link to="/my-tickets" onClick={() => setMenuOpen(false)}>My Tickets</Link> : null}
                      {user.role === 'ADMIN' ? <Link to="/admin" onClick={() => setMenuOpen(false)}>Administration</Link> : null}
                      {user.role === 'ORGANIZER' ? <Link to="/organizer" onClick={() => setMenuOpen(false)}>Organizer studio</Link> : null}
                      {user.role === 'STAFF' ? <Link to="/staff" onClick={() => setMenuOpen(false)}>Gate operations</Link> : null}
                      <button type="button" className="account-menu-danger" onClick={logOut}><LogOut size={15} aria-hidden="true" /> Log out</button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="auth-cta-group">
                  <Link className="button button-primary" to="/login">Sign in</Link>
                  <Link className="button button-secondary" to="/register">Create account</Link>
                </div>
              )}
              <button
                className="mobile-menu-button"
                type="button"
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((value) => !value)}
              >
                <span /><span />
              </button>
            </div>
          </div>
          {mobileOpen ? (
            <nav className="mobile-nav" aria-label="Mobile navigation">
              {canBrowseCatalogue ? <NavLink to="/" onClick={() => setMobileOpen(false)}>Discover</NavLink> : null}
              {isAudience ? <NavLink to="/profile" onClick={() => setMobileOpen(false)}>Profile</NavLink> : null}
              {isAudience ? <NavLink to="/notifications" onClick={() => setMobileOpen(false)}><NotificationLabel count={unreadNotifications} /></NavLink> : null}
              {isAudience ? <NavLink to="/my-tickets" onClick={() => setMobileOpen(false)}>My Tickets</NavLink> : null}
              {user?.role === 'ADMIN' ? <NavLink to="/admin" onClick={() => setMobileOpen(false)}>Administration</NavLink> : null}
              {user?.role === 'ORGANIZER' ? <NavLink to="/organizer" onClick={() => setMobileOpen(false)}>Organizer studio</NavLink> : null}
              {user?.role === 'STAFF' ? <NavLink to="/staff" onClick={() => setMobileOpen(false)}>Gate operations</NavLink> : null}
              {user ? (
                <button type="button" onClick={logOut}>Log out</button>
              ) : (
                <>
                  <NavLink to="/login" onClick={() => setMobileOpen(false)}>Sign in</NavLink>
                  <NavLink to="/register" onClick={() => setMobileOpen(false)}>Create account</NavLink>
                </>
              )}
            </nav>
          ) : null}
        </header>
      ) : null}
      <main id="main-content"><Outlet /></main>
      {!isBookingFlow ? <Footer homePath={homePath} homeLabel={homeLabel} /> : null}
    </div>
  );
}

function Footer({ homePath, homeLabel }: { homePath: string; homeLabel: string }) {
  return (
    <footer className="site-footer">
      <div className="footer-grid page-width">
        <div className="footer-brand">
          <Logo to={homePath} label={homeLabel} />
          <p>Unforgettable nights, one ticket away.</p>
          <div className="social-row" aria-label="Social media">
            <a href="#instagram" aria-label="Instagram">ig</a>
            <a href="#facebook" aria-label="Facebook">f</a>
            <a href="#tiktok" aria-label="TikTok">♪</a>
          </div>
        </div>
        <FooterColumn title="Explore" items={['Concerts', 'Artists', 'Venues', 'Gift cards']} />
        <FooterColumn title="Support" items={['Help center', 'Contact us', 'Refund policy', 'Accessibility']} />
        <div>
          <p className="footer-title">Stay in the loop</p>
          <p className="footer-copy">Fresh drops and early access, delivered occasionally.</p>
          <form className="newsletter" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="newsletter-email">Email address</label>
            <input id="newsletter-email" type="email" name="email" autoComplete="email" spellCheck={false} placeholder="you@example.com..." />
            <button type="submit" aria-label="Subscribe">→</button>
          </form>
        </div>
      </div>
      <div className="footer-bottom page-width"><span>© 2026 TicketBox Vietnam</span><span>Privacy · Terms · Cookies</span></div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="footer-title">{title}</p>
      <ul className="footer-links">
        {items.map((item) => <li key={item}><a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}>{item}</a></li>)}
      </ul>
    </div>
  );
}
