import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/layout/PublicLayout';
import { events } from '../../data/mockData';

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => navigate('/'), 500);
  }

  return (
    <AuthLayout quote="Some nights become part of who you are." credit="TicketBox Selects · Saigon">
      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow"><span /> Welcome back</p>
          <h1>Your next night out <em>starts here.</em></h1>
          <p>Sign in to access your tickets and saved events.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" spellCheck={false} placeholder="you@example.com…" required /></label>
          <label className="field"><span>Password</span><span className="password-field"><input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Your password…" required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          <div className="form-meta"><label><input type="checkbox" name="remember" /> Remember me</label><a href="#forgot-password">Forgot password?</a></div>
          <button className="button button-primary button-block" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
          <button className="google-button" type="button"><span>G</span> Continue with Google</button>
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
        <img src={events[2].image} alt="" width="1200" height="1500" fetchPriority="high" />
        <div className="auth-visual-overlay" />
        <div className="auth-logo"><Logo /></div>
        <blockquote>“{quote}”<cite>{credit}</cite></blockquote>
      </section>
      <section className="auth-content">{children}</section>
    </main>
  );
}
