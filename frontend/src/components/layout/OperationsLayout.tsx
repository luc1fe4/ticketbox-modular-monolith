import { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileClock,
  LogOut,
  Menu,
  ScanLine,
  Settings,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, type UserSummary } from '../../features/auth/AuthContext';
import { Logo } from './PublicLayout';

type NavigationItem = {
  to: string;
  label: string;
  icon: typeof BarChart3;
  end?: boolean;
};

const adminNavigation: NavigationItem[] = [
  { to: '/admin', label: 'Tổng quan', icon: BarChart3, end: true },
  { to: '/admin/concerts', label: 'Concert', icon: CalendarDays },
  { to: '/admin/ticket-types', label: 'Hạng vé', icon: Ticket },
  { to: '/admin/guests', label: 'Khách mời', icon: Users },
  { to: '/admin/batch-logs', label: 'Batch jobs', icon: FileClock },
  { to: '/admin/revenue', label: 'Doanh thu', icon: CircleDollarSign },
];

const staffNavigation: NavigationItem[] = [
  { to: '/staff', label: 'Ca làm việc', icon: ClipboardCheck, end: true },
  { to: '/staff/check-in', label: 'Quét vé', icon: ScanLine },
  { to: '/staff/guests', label: 'Tra cứu khách', icon: Users },
  { to: '/staff/history', label: 'Lịch sử vào cổng', icon: FileClock },
];

function roleLabel(role: UserSummary['role']) {
  if (role === 'ADMIN') return 'Quản trị viên';
  if (role === 'ORGANIZER') return 'Nhà tổ chức';
  return 'Nhân viên cổng';
}

export function OperationsLayout({ mode }: { mode: 'admin' | 'staff' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigation = mode === 'admin' ? adminNavigation : staffNavigation;

  function logOut() {
    logout();
    navigate('/');
  }

  return (
    <div className="operations-shell">
      <aside
        className={`operations-sidebar ${mobileOpen ? 'is-open' : ''}`}
        aria-label={mode === 'admin' ? 'Điều hướng quản trị' : 'Điều hướng nhân viên'}
      >
        <div className="operations-brand">
          <Logo />
          <span>{mode === 'admin' ? 'Control room' : 'Gate desk'}</span>
        </div>

        <nav className="operations-nav">
          <p>Không gian làm việc</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="operations-sidebar-footer">
          <Link to="/">
            <ArrowLeft aria-hidden="true" size={17} />
            Trở về TicketBox
          </Link>
          <button type="button" onClick={logOut}>
            <LogOut aria-hidden="true" size={17} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          className="operations-scrim"
          type="button"
          aria-label="Đóng điều hướng"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="operations-main">
        <header className="operations-topbar">
          <button
            className="operations-menu-button"
            type="button"
            aria-label={mobileOpen ? 'Đóng điều hướng' : 'Mở điều hướng'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="operations-context">
            <span>{mode === 'admin' ? 'Quản lý vận hành' : 'Vận hành tại cổng'}</span>
            <strong>TicketBox Vietnam</strong>
          </div>
          <div className="operations-account">
            <button
              type="button"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((value) => !value)}
            >
              <span className="operations-avatar">
                {user?.fullName.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{user?.fullName}</strong>
                <small>{user ? roleLabel(user.role) : ''}</small>
              </span>
              <ChevronDown aria-hidden="true" size={16} />
            </button>
            {accountOpen ? (
              <div className="operations-account-menu">
                <Link to="/profile" onClick={() => setAccountOpen(false)}>
                  <Settings aria-hidden="true" size={16} />
                  Hồ sơ cá nhân
                </Link>
                <button type="button" onClick={logOut}>
                  <LogOut aria-hidden="true" size={16} />
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="operations-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
