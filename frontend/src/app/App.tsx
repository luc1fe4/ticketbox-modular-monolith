import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { MyTicketsPage } from '../pages/customer/MyTicketsPage';
import { SeatSelectionPage } from '../pages/customer/SeatSelectionPage';
import { BookingConfirmationPage } from '../pages/customer/BookingConfirmationPage';
import { ConcertDetailPage } from '../pages/public/ConcertDetailPage';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/concerts/:id" element={<ConcertDetailPage />} />
          <Route path="/concerts/:id/seats" element={<SeatSelectionPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
