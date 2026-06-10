import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg text-textMain font-body flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  // Using a mock state to simulate not being logged in
  const isLoggedIn = false;

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-bg/95 px-4 backdrop-blur-md">
      <Link to="/" className="font-display text-2xl font-bold">NovaStage</Link>

      <div className="hidden h-12 w-[660px] items-center rounded-full border border-border bg-white/5 md:flex">
        <button className="h-full w-32 border-r border-border text-sm text-textMuted hover:text-white transition">
          Tất cả địa điểm⌄
        </button>
        <input
          className="flex-1 bg-transparent px-6 text-sm font-semibold text-white outline-none placeholder:text-textMuted"
          placeholder="Tìm kiếm nghệ sĩ, sự kiện..."
        />
        <button className="px-6 text-xl text-textMuted hover:text-white transition">⌕</button>
      </div>

      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <div className="hidden items-center gap-3 rounded-full border border-border bg-white/5 px-3 py-2 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold">
              QT
            </div>
            <span className="text-sm font-semibold">Quân Trần Trọng</span>
            <span className="text-xl text-textMuted cursor-pointer hover:text-white transition">≡</span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-textMuted hover:text-white transition">
              Đăng nhập
            </Link>
            <Link to="/register" className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition hover:brightness-110">
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-panel px-4 py-16 mt-auto">
      <div className="grid gap-10 md:grid-cols-4">
        <div>
          <h2 className="mb-5 font-display text-2xl font-bold">NovaStage</h2>
          <p className="max-w-xs text-sm leading-6 text-textMuted">
            Nền tảng bán vé trực tuyến hàng đầu Việt Nam. NovaStage - Mua vé dễ dàng,
            nâng tầm trải nghiệm.
          </p>
        </div>

        <FooterColumn
          title="NovaStage xin chào!"
          items={['Về chúng tôi', 'Quy chế hoạt động', 'Chính sách bảo mật thông tin', 'Phương thức thanh toán', 'Điều khoản sử dụng']}
        />

        <FooterColumn
          title="Dịch vụ và Ưu đãi"
          items={['Dành cho Khách hàng', 'Khuyến mại', 'Đối tác của chúng tôi']}
        />

        <FooterColumn
          title="Liên hệ và Hỗ trợ"
          items={['Liên hệ chúng tôi', 'Câu hỏi thường gặp', 'Hướng dẫn sử dụng', 'Danh sách phản ánh/ góp ý']}
        />
      </div>

      <div className="mt-16 flex justify-between border-t border-border pt-8 text-xs text-textMuted">
        <span>© 2024 NovaStage. All rights reserved.</span>
        <span>Terms of Service &nbsp;&nbsp; Privacy Policy &nbsp;&nbsp; Cookie Settings</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-5 text-sm font-bold text-white">{title}</h3>
      <ul className="space-y-4 text-sm text-textMuted">
        {items.map((item) => (
          <li key={item} className="cursor-pointer hover:text-white transition">{item}</li>
        ))}
      </ul>
    </div>
  );
}
