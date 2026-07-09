import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const homePath = getRoleHome(user?.role);
  const homeLabel = getRoleHomeLabel(user?.role);

  function logOut() {
    setMenuOpen(false);
    setMobileOpen(false);
    setUnreadNotifications(0);
    logout();
    navigate('/');
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
      <header className="site-header">
        <div className="header-inner">
          <Logo to={homePath} label={homeLabel} />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {user?.role !== 'STAFF' ? <NavLink to="/">Discover</NavLink> : null}
            {user?.role !== 'STAFF' ? <a href="/#events">Events</a> : null}
            {user?.role === 'AUDIENCE' ? <NavLink to="/my-tickets">My Tickets</NavLink> : null}
            {user ? <NavLink to="/notifications"><NotificationLabel count={unreadNotifications} /></NavLink> : null}
            {user?.role === 'ADMIN' ? <NavLink to="/admin">Administration</NavLink> : null}
            {user?.role === 'ORGANIZER' ? <NavLink to="/organizer">Organizer studio</NavLink> : null}
            {user?.role === 'STAFF' ? <NavLink to="/staff">Gate operations</NavLink> : null}
          </nav>
          <div className="header-actions">
            <label className="header-search">
              <span className="sr-only">Search events</span>
              <span aria-hidden="true">⌕</span>
              <input type="search" name="event-search" autoComplete="off" placeholder="Search artists, events..." />
            </label>
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
                  <span aria-hidden="true">⌄</span>
                </button>
                {menuOpen ? (
                  <div className="account-menu">
                    <div><strong>{user.fullName}</strong><span>{user.email}</span><span>{user.role}</span></div>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile & history</Link>
                    <Link to="/notifications" onClick={() => setMenuOpen(false)}><NotificationLabel count={unreadNotifications} /></Link>
                    {user.role === 'AUDIENCE' ? (
                      <Link to="/my-tickets" onClick={() => setMenuOpen(false)}>My Tickets</Link>
                    ) : null}
                    {user.role === 'ADMIN' ? (
                      <Link to="/admin" onClick={() => setMenuOpen(false)}>Administration</Link>
                    ) : null}
                    {user.role === 'ORGANIZER' ? (
                      <Link to="/organizer" onClick={() => setMenuOpen(false)}>Organizer studio</Link>
                    ) : null}
                    {user.role === 'STAFF' ? (
                      <Link to="/staff" onClick={() => setMenuOpen(false)}>Gate operations</Link>
                    ) : null}
                    <button type="button" onClick={logOut}>Log out</button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="account-wrap">
                <Link className="text-link" to="/login">Sign in</Link>
                <Link className="button button-primary" to="/register">Join TicketBox</Link>
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
            {user?.role !== 'STAFF' ? <NavLink to="/" onClick={() => setMobileOpen(false)}>Discover</NavLink> : null}
            {user?.role !== 'STAFF' ? <a href="/#events" onClick={() => setMobileOpen(false)}>Events</a> : null}
            {user ? <NavLink to="/profile" onClick={() => setMobileOpen(false)}>Profile</NavLink> : null}
            {user ? <NavLink to="/notifications" onClick={() => setMobileOpen(false)}><NotificationLabel count={unreadNotifications} /></NavLink> : null}
            {user?.role === 'AUDIENCE' ? <NavLink to="/my-tickets" onClick={() => setMobileOpen(false)}>My Tickets</NavLink> : null}
            {user?.role === 'ADMIN' ? <NavLink to="/admin" onClick={() => setMobileOpen(false)}>Administration</NavLink> : null}
            {user?.role === 'ORGANIZER' ? <NavLink to="/organizer" onClick={() => setMobileOpen(false)}>Organizer studio</NavLink> : null}
            {user?.role === 'STAFF' ? <NavLink to="/staff" onClick={() => setMobileOpen(false)}>Gate operations</NavLink> : null}
            {user ? <button type="button" onClick={logOut}>Log out</button> : null}
          </nav>
        ) : null}
      </header>
      <main id="main-content"><Outlet /></main>
      <Footer homePath={homePath} homeLabel={homeLabel} />
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
        <FooterColumn title="Explore" items={['Events', 'Artists', 'Venues', 'Gift cards']} />
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
