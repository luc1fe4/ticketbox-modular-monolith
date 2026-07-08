import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../features/auth/AuthContext';
import { AuthLayout } from './LoginPage';

const roleHome: Record<UserRole, string> = {
  AUDIENCE: '/',
  ORGANIZER: '/organizer',
  STAFF: '/staff',
  ADMIN: '/admin',
};

export function RegisterPage() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate(roleHome[user.role], { replace: true });
    }
  }, [loading, navigate, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    const confirmation = String(data.get('confirmPassword'));
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(
        String(data.get('email')),
        password,
        String(data.get('fullName')),
        String(data.get('phone')),
      );
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Your account could not be created.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout quote="The crowd was loud. The memory is louder." credit="TicketBox Selects · Hanoi">
      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow"><span /> Join the crowd</p>
          <h1>Make room for <em>more memories.</em></h1>
          <p>Create an account to book events and keep every ticket close.</p>
        </div>
        {error ? <div className="state-panel auth-error" role="alert"><p>{error}</p></div> : null}
        <form className="auth-form" onSubmit={submit}>
          <label className="field"><span>Full name</span><input name="fullName" autoComplete="name" placeholder="Minh Quan..." required /></label>
          <div className="form-grid form-grid-two">
            <label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" spellCheck={false} placeholder="you@example.com..." required /></label>
            <label className="field"><span>Phone number</span><input type="tel" name="phone" autoComplete="tel" placeholder="0901234567" required /></label>
          </div>
          <div className="form-grid form-grid-two">
            <label className="field"><span>Password</span><input type="password" name="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters..." required /></label>
            <label className="field"><span>Confirm password</span><input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} placeholder="Repeat password..." required /></label>
          </div>
          <label className="terms-check"><input type="checkbox" required /><span>I agree to the <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</span></label>
          <button className="button button-primary button-block" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
