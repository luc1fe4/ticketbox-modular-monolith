import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(false);

    if (!email || !password) {
      setError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Email hoặc mật khẩu không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b1020] text-on-surface font-body">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(108,99,255,0.15)_0%,transparent_40%),radial-gradient(circle_at_80%_70%,rgba(108,99,255,0.1)_0%,transparent_40%)]" />

      <header className="relative z-20 flex items-center justify-between p-6 lg:px-10">
        <div
          onClick={() => navigate('/')}
          className="font-display text-3xl font-bold tracking-tighter cursor-pointer"
        >
          <span className="text-primary">Nova</span>
          <span className="text-white">Stage</span>
        </div>
      </header>

      <section className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card/95 p-10 shadow-2xl backdrop-blur lg:p-14">
          <h1 className="mb-8 text-center font-display text-3xl font-semibold text-white">
            Đăng nhập
          </h1>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-outline">✉</span>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email"
                className="w-full rounded-xl border border-border bg-bg py-3.5 pl-12 pr-4 text-white placeholder:text-outline outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-outline">🔒</span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full rounded-xl border border-border bg-bg py-3.5 pl-12 pr-12 text-white placeholder:text-outline outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-white"
              >
                👁
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center text-white">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-5 w-5 rounded border-border bg-bg text-primary focus:ring-primary"
                />
                <span className="ml-2">Tự động đăng nhập</span>
              </label>

              <a href="#" className="font-medium text-primary hover:text-primary/80">
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-4 text-lg font-semibold text-white shadow-lg cursor-pointer shadow-primary/20 transition hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-outline">Hoặc đăng nhập với</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                className="flex w-full max-w-sm items-center justify-center gap-3 rounded-lg border cursor-pointer border-gray-200 bg-white px-5 py-3 font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 12-4.52z" fill="#EA4335" />
                </svg>
                <span className="text-sm font-semibold tracking-wide">Tiếp tục với Google</span>
              </button>
            </div>

            <p className="pt-4 text-center text-sm font-medium text-white">
              Bạn chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary hover:text-primary-container">
                Đăng ký ngay
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}