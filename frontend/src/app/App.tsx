import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OperationsLayout } from '../components/layout/OperationsLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ToastProvider } from '../components/feedback/ToastProvider';
import { AuthProvider } from '../features/auth/AuthContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AdminConcertsPage } from '../pages/admin/AdminConcertsPage';
import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage';
import { AdminRoutePlaceholderPage } from '../pages/admin/AdminRoutePlaceholderPage';
import { AdminTicketTypesPage } from '../pages/admin/AdminTicketTypesPage';
import { BookingConfirmationPage } from '../pages/customer/BookingConfirmationPage';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { MyTicketsPage } from '../pages/customer/MyTicketsPage';
import { ProfilePage } from '../pages/customer/ProfilePage';
import { SeatSelectionPage } from '../pages/customer/SeatSelectionPage';
import { ConcertDetailPage } from '../pages/public/ConcertDetailPage';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { StaffOverviewPage } from '../pages/staff/StaffOverviewPage';

const protectedPage = (page: React.ReactNode) => <ProtectedRoute>{page}</ProtectedRoute>;

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/concerts/:id" element={<ConcertDetailPage />} />
            <Route path="/concerts/:id/seats" element={protectedPage(<SeatSelectionPage />)} />
            <Route path="/checkout" element={protectedPage(<CheckoutPage />)} />
            <Route path="/booking-confirmation" element={protectedPage(<BookingConfirmationPage />)} />
            <Route path="/my-tickets" element={protectedPage(<MyTicketsPage />)} />
            <Route path="/profile" element={protectedPage(<ProfilePage />)} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                <OperationsLayout mode="admin" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="concerts" element={<AdminConcertsPage />} />
            <Route path="ticket-types" element={<AdminTicketTypesPage />} />
            <Route path="guests" element={<AdminRoutePlaceholderPage title="Quản lý khách mời" description="Route dành cho nhập CSV và danh sách khách mời thuộc concert." />} />
            <Route path="batch-logs" element={<AdminRoutePlaceholderPage title="Batch jobs" description="Route theo dõi tiến trình nhập dữ liệu và log xử lý nền." />} />
            <Route path="revenue" element={<AdminRoutePlaceholderPage title="Báo cáo doanh thu" description="Không gian báo cáo dành cho ORGANIZER theo API /api/organizer/concerts." />} />
          </Route>
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['STAFF']}>
                <OperationsLayout mode="staff" />
              </ProtectedRoute>
            }
          >
            <Route index element={<StaffOverviewPage />} />
            <Route path="check-in" element={<AdminRoutePlaceholderPage title="Quét vé tại cổng" description="Route dành cho online scan và đồng bộ check-in ngoại tuyến." />} />
            <Route path="guests" element={<AdminRoutePlaceholderPage title="Tra cứu khách mời" description="Route dành cho staff tra cứu khách theo concert và số điện thoại." />} />
            <Route path="history" element={<AdminRoutePlaceholderPage title="Lịch sử check-in" description="Route hiển thị các lượt vào cổng theo concert." />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
