import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AuthProvider } from '../features/auth/AuthContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { BookingConfirmationPage } from '../pages/customer/BookingConfirmationPage';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { MyTicketsPage } from '../pages/customer/MyTicketsPage';
import { ProfilePage } from '../pages/customer/ProfilePage';
import { SeatSelectionPage } from '../pages/customer/SeatSelectionPage';
import { ConcertDetailPage } from '../pages/public/ConcertDetailPage';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';

const protectedPage = (page: React.ReactNode) => <ProtectedRoute>{page}</ProtectedRoute>;

export function App() {
  return (
    <AuthProvider>
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
              <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER', 'STAFF']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
