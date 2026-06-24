import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-route-loading" role="status" aria-live="polite">
        <div className="route-spinner" aria-hidden="true" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="route-forbidden page-width">
        <div className="state-panel" role="alert">
          <span className="state-icon" aria-hidden="true">!</span>
          <h1>Access limited</h1>
          <p>
            This area is reserved for {allowedRoles.join(' / ')} accounts. You are signed in as {user.role}.
          </p>
          <div className="forbidden-actions">
            <Link className="button button-primary" to="/">Back to events</Link>
            <Link className="button button-secondary" to="/profile">View profile</Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};
