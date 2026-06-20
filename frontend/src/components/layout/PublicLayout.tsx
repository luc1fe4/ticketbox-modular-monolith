import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="TicketBox home">
      <span className="logo-mark" aria-hidden="true">
        T
      </span>
      <span>
        ticket<span>box</span>
      </span>
    </Link>
  );
}

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  function logOut() {
    setMenuOpen(false);
    navigate('/login');
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Primary navigation">
            <NavLink to="/">Discover</NavLink>
            <a href="/#events">Events</a>
            <NavLink to="/my-tickets">My Tickets</NavLink>
          </nav>
          <div className="header-actions">
            <label className="header-search">
              <span className="sr-only">Search events</span>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                name="event-search"
                autoComplete="off"
                placeholder="Search artists, events…"
              />
            </label>
            <div className="account-wrap">
              <button
                className="avatar-button"
                type="button"
                aria-label="Open account menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <span>MQ</span>
                <span className="account-name">Minh Quân</span>
                <span aria-hidden="true">⌄</span>
              </button>
              {menuOpen ? (
                <div className="account-menu">
                  <div>
                    <strong>Minh Quân</strong>
                    <span>minhquan@example.com</span>
                  </div>
                  <Link to="/my-tickets" onClick={() => setMenuOpen(false)}>
                    My Tickets
                  </Link>
                  <button type="button" onClick={logOut}>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
            <button
              className="mobile-menu-button"
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
        {mobileOpen ? (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <NavLink to="/" onClick={() => setMobileOpen(false)}>
              Discover
            </NavLink>
            <a href="/#events" onClick={() => setMobileOpen(false)}>
              Events
            </a>
            <NavLink to="/my-tickets" onClick={() => setMobileOpen(false)}>
              My Tickets
            </NavLink>
          </nav>
        ) : null}
      </header>
      <main id="main-content">
        <Outlet />
      </main>
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
            <a href="#instagram" aria-label="Instagram">
              ig
            </a>
            <a href="#facebook" aria-label="Facebook">
              f
            </a>
            <a href="#tiktok" aria-label="TikTok">
              ♪
            </a>
          </div>
        </div>
        <FooterColumn title="Explore" items={['Events', 'Artists', 'Venues', 'Gift cards']} />
        <FooterColumn title="Support" items={['Help center', 'Contact us', 'Refund policy', 'Accessibility']} />
        <div>
          <p className="footer-title">Stay in the loop</p>
          <p className="footer-copy">Fresh drops and early access, delivered occasionally.</p>
          <form className="newsletter" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com…"
            />
            <button type="submit" aria-label="Subscribe">
              →
            </button>
          </form>
        </div>
      </div>
      <div className="footer-bottom page-width">
        <span>© 2026 TicketBox Vietnam</span>
        <span>Privacy · Terms · Cookies</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="footer-title">{title}</p>
      <ul className="footer-links">
        {items.map((item) => (
          <li key={item}>
            <a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}>{item}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
