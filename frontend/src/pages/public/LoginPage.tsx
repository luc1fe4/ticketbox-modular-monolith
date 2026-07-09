import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/layout/PublicLayout';
import { events } from '../../data/mockData';
import { useAuth } from '../../features/auth/AuthContext';
import { getRoleHome } from '../../features/auth/roleRoutes';

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate(getRoleHome(user.role), { replace: true });
    }
  }, [loading, navigate, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(String(data.get('email')), String(data.get('password')));
      const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(requestedPath ?? getRoleHome(loggedInUser.role), { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Email or password is incorrect.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout quote="Some nights become part of who you are." credit="TicketBox Selects · Saigon">
      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow"><span /> Welcome back</p>
          <h1>Your next night out <em>starts here.</em></h1>
          <p>Sign in to access your tickets, orders, and saved profile.</p>
        </div>
        {error ? <div className="state-panel auth-error" role="alert"><p>{error}</p></div> : null}
        <form className="auth-form" onSubmit={submit}>
          <label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" spellCheck={false} placeholder="you@example.com..." required /></label>
          <label className="field"><span>Password</span><span className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Your password..." required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          <div className="form-meta"><label><input type="checkbox" name="remember" /> Remember me</label><a href="#forgot-password">Forgot password?</a></div>
          <button className="button button-primary button-block" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button>
          <button className="google-button" type="button" disabled aria-disabled="true"><span>G</span> Google sign-in unavailable</button>
        </form>
        <p className="auth-switch">New to TicketBox? <Link to="/register">Create an account</Link></p>
      </div>
    </AuthLayout>
  );
}

export function AuthLayout({ children, quote, credit }: { children: React.ReactNode; quote: string; credit: string }) {
  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <img src={events[2].image} alt="" width="1200" height="1500" />
        <div className="auth-visual-overlay" />
        <div className="auth-logo"><Logo /></div>
        <blockquote>“{quote}”<cite>{credit}</cite></blockquote>
      </section>
      <section className="auth-content">{children}</section>
    </main>
  );
}
