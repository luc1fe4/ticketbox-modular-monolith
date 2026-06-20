import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './LoginPage';

export function RegisterPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => navigate('/'), 500);
  }

  return (
    <AuthLayout quote="The crowd was loud. The memory is louder." credit="TicketBox Selects · Hanoi">
      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow"><span /> Join the crowd</p>
          <h1>Make room for <em>more memories.</em></h1>
          <p>Create an account to save events and keep every ticket close.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="form-grid form-grid-two">
            <label className="field"><span>First name</span><input name="givenName" autoComplete="given-name" placeholder="Minh…" required /></label>
            <label className="field"><span>Last name</span><input name="familyName" autoComplete="family-name" placeholder="Quân…" required /></label>
          </div>
          <label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" spellCheck={false} placeholder="you@example.com…" required /></label>
          <label className="field"><span>Password</span><input type="password" name="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters…" required /></label>
          <label className="terms-check"><input type="checkbox" required /><span>I agree to the <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</span></label>
          <button className="button button-primary button-block" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
