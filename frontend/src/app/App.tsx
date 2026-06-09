import { useState } from 'react';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { CheckinPage } from '../pages/CheckinPage';
import { ConcertListPage } from '../pages/ConcertListPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { apiBaseUrl } from '../api/client';

type PageKey = 'home' | 'login' | 'concerts' | 'admin' | 'checkin';

const pages: Array<{ key: PageKey; label: string; component: () => JSX.Element }> = [
  { key: 'home', label: 'Home', component: HomePage },
  { key: 'login', label: 'Login', component: LoginPage },
  { key: 'concerts', label: 'Concerts', component: ConcertListPage },
  { key: 'admin', label: 'Admin', component: AdminDashboardPage },
  { key: 'checkin', label: 'Check-in', component: CheckinPage },
];

export function App() {
  const [activePageKey, setActivePageKey] = useState<PageKey>('home');
  const activePage = pages.find((page) => page.key === activePageKey) ?? pages[0];
  const ActiveComponent = activePage.component;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="TicketBox navigation">
        <div className="brand">
          <span className="brand-mark">TB</span>
          <div>
            <p className="brand-name">TicketBox</p>
            <p className="brand-caption">Dev skeleton</p>
          </div>
        </div>

        <nav className="nav-list">
          {pages.map((page) => (
            <button
              className={page.key === activePage.key ? 'nav-item active' : 'nav-item'}
              key={page.key}
              onClick={() => setActivePageKey(page.key)}
              type="button"
              aria-current={page.key === activePage.key ? 'page' : undefined}
            >
              {page.label}
            </button>
          ))}
        </nav>

        <div className="env-panel">
          <span>API</span>
          <strong>{apiBaseUrl}</strong>
        </div>
      </aside>

      <section className="content-area">
        <ActiveComponent />
      </section>
    </main>
  );
}
