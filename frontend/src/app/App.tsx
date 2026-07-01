import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OperationsLayout } from '../components/layout/OperationsLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ToastProvider } from '../components/feedback/ToastProvider';
import { AuthProvider } from '../features/auth/AuthContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AdminConcertsPage } from '../pages/admin/AdminConcertsPage';
import { AdminArtistBioPage } from '../pages/admin/AdminArtistBioPage';
import { AdminGuestImportsPage } from '../pages/admin/AdminGuestImportsPage';
import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage';
import { AdminRoutePlaceholderPage } from '../pages/admin/AdminRoutePlaceholderPage';
import { AdminTicketTypesPage } from '../pages/admin/AdminTicketTypesPage';
import { BookingConfirmationPage } from '../pages/customer/BookingConfirmationPage';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { MyTicketsPage } from '../pages/customer/MyTicketsPage';
import { PaymentResultPage } from '../pages/customer/PaymentResultPage';
import { ProfilePage } from '../pages/customer/ProfilePage';
import { SeatSelectionPage } from '../pages/customer/SeatSelectionPage';
import { ConcertDetailPage } from '../pages/public/ConcertDetailPage';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { StaffOverviewPage } from '../pages/staff/StaffOverviewPage';
import { OrganizerOverviewPage } from '../pages/organizer/OrganizerOverviewPage';
import { OrganizerRevenuePage } from '../pages/organizer/OrganizerRevenuePage';

const audiencePage = (page: React.ReactNode) => (
  <ProtectedRoute allowedRoles={['AUDIENCE']}>{page}</ProtectedRoute>
);

const authenticatedPage = (page: React.ReactNode) => <ProtectedRoute>{page}</ProtectedRoute>;

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/concerts/:id" element={<ConcertDetailPage />} />
            <Route path="/concerts/:id/seats" element={audiencePage(<SeatSelectionPage />)} />
            <Route path="/checkout" element={audiencePage(<CheckoutPage />)} />
            <Route path="/booking-confirmation" element={audiencePage(<BookingConfirmationPage />)} />
            <Route path="/payment/result" element={audiencePage(<PaymentResultPage />)} />
            <Route path="/my-tickets" element={audiencePage(<MyTicketsPage />)} />
            <Route path="/profile" element={authenticatedPage(<ProfilePage />)} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <OperationsLayout mode="admin" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="concerts" element={<AdminConcertsPage />} />
            <Route path="artist-bio" element={<AdminArtistBioPage />} />
            <Route path="ticket-types" element={<AdminTicketTypesPage />} />
            <Route path="guests" element={<AdminGuestImportsPage />} />
            <Route path="batch-logs" element={<Navigate to="/admin/guests" replace />} />
          </Route>
          <Route
            path="/organizer"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER']}>
                <OperationsLayout mode="organizer" />
              </ProtectedRoute>
            }
          >
            <Route index element={<OrganizerOverviewPage />} />
            <Route path="concerts" element={<AdminConcertsPage apiScope="organizer" />} />
            <Route path="ticket-types" element={<AdminTicketTypesPage apiScope="organizer" />} />
            <Route path="guests" element={<AdminGuestImportsPage apiScope="organizer" uploadMode="scheduled" />} />
            <Route path="artist-bio" element={<AdminArtistBioPage apiScope="organizer" />} />
            <Route path="revenue" element={<OrganizerRevenuePage />} />
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
