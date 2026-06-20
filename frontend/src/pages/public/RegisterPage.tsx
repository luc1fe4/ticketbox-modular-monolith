import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !password || !fullName || !phone) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    try {
      setLoading(true);
      await register(email, password, fullName, phone);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công. Email có thể đã được sử dụng.');
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
            Đăng ký tài khoản
          </h1>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
              Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-outline">👤</span>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                className="w-full rounded-xl border border-border bg-bg py-3.5 pl-12 pr-4 text-white placeholder:text-outline outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

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
              <span className="absolute inset-y-0 left-4 flex items-center text-outline">📞</span>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
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

            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-outline">🛡</span>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-xl border border-border bg-bg py-3.5 pl-12 pr-12 text-white placeholder:text-outline outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-white"
              >
                👁
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full rounded-xl bg-primary px-4 py-4 text-lg font-semibold text-white shadow-lg cursor-pointer shadow-primary/20 transition hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>

            <p className="pt-4 text-center text-sm font-medium text-white">
              Bạn đã có tài khoản?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary hover:text-primary-container">
                Đăng nhập ngay
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}