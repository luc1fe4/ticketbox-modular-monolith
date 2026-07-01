import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../features/auth/AuthContext';

const adminRoles = new Set<UserRole>(['ADMIN', 'ORGANIZER']);

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="TicketBox home">
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

export function PublicLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const canOpenAdmin = user ? adminRoles.has(user.role) : false;

  function logOut() {
    setMenuOpen(false);
    setMobileOpen(false);
    logout();
    navigate('/');
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            <NavLink to="/">Discover</NavLink>
            <a href="/#events">Events</a>
            {user?.role === 'AUDIENCE' ? <NavLink to="/my-tickets">My Tickets</NavLink> : null}
            {canOpenAdmin ? <NavLink to="/admin">Administration</NavLink> : null}
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
                    {user.role === 'AUDIENCE' ? (
                      <Link to="/my-tickets" onClick={() => setMenuOpen(false)}>My Tickets</Link>
                    ) : null}
                    {canOpenAdmin ? (
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
            <NavLink to="/" onClick={() => setMobileOpen(false)}>Discover</NavLink>
            <a href="/#events" onClick={() => setMobileOpen(false)}>Events</a>
            {user ? <NavLink to="/profile" onClick={() => setMobileOpen(false)}>Profile</NavLink> : null}
            {user?.role === 'AUDIENCE' ? <NavLink to="/my-tickets" onClick={() => setMobileOpen(false)}>My Tickets</NavLink> : null}
            {canOpenAdmin ? <NavLink to="/admin" onClick={() => setMobileOpen(false)}>Administration</NavLink> : null}
            {user ? <button type="button" onClick={logOut}>Log out</button> : null}
          </nav>
        ) : null}
      </header>
      <main id="main-content"><Outlet /></main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid page-width">
        <div className="footer-brand">
          <Logo />
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
