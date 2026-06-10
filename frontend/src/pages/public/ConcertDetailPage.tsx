import { useLocation, useNavigate } from "react-router-dom";

const timeline = [
  { label: 'Gate Open', time: '17:00', icon: '✓' },
  { label: 'Opening Act', time: '19:00 — Special Guest', icon: '♬' },
  { label: 'Main Performance', time: '20:30 — Coldplay', icon: '☆', active: true },
];

const recommendations = [
  ['Concert', 'The Eras Tour: Taylor Swift', 'Sân vận động Mỹ Đình, Hà Nội', 'Từ 2.000.000 VND'],
  ['Concert', 'After Hours: The Weeknd', 'SECC, TP.HCM', 'Từ 1.800.000 VND'],
  ['K-Pop', 'Born Pink: BLACKPINK', 'SVĐ Quân Khu 7, TP.HCM', 'Từ 3.500.000 VND'],
  ['Concert', 'Justice Tour: Justin Bieber', 'Phú Thọ Indoor Stadium, TP.HCM', 'Từ 1.500.000 VND'],
];

export function ConcertDetailPage() {
  const nav = useNavigate();
  const location = useLocation();

  return (
    <>
      <section className="bg-gradient-to-br from-card via-bg to-[#171326] px-5 py-14 md:px-16">
        <div className="mx-auto grid max-w-[1440px] gap-10 md:grid-cols-[400px_1fr]">
          <div className="aspect-[3/4] rounded-2xl border border-border bg-card shadow-2xl" />

          <div className="flex flex-col justify-center">
            <span className="mb-4 w-fit rounded-md bg-green-500/20 px-3 py-1 text-xs font-bold uppercase text-green-400">
              Đang mở bán
            </span>

            <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl">
              Music of the Spheres: Coldplay — World Tour 2026
            </h1>

            <div className="mt-8 space-y-5">
              <Info icon="📅" title="11 tháng 7, 2026" desc="Từ 19:00" />
              <Info
                icon="📍"
                title="Indoor_Nhà Thi đấu Phú Thọ - 1 Lữ Gia, Phường Phú Thọ, TP.HCM"
                desc="Phu Tho Indoor Stadium – 1 Lu Gia Street, Phu Tho Ward, Ho Chi Minh City"
              />
              <Info
                icon="💳"
                title="Giá vé"
                desc="Từ 1.500.000 VND đến 15.000.000 VND"
              />
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => nav(`${location.pathname}/seats`)}
                className="rounded-xl bg-primary px-12 py-4 font-display text-xl font-bold text-white shadow-lg shadow-primary/20">
                Mua vé ngay
              </button>
              <button className="rounded-xl border border-border bg-card px-5">f</button>
              <button className="rounded-xl border border-border bg-card px-5">🔗</button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] space-y-20 px-5 py-12 md:px-16">
        <SectionTitle title="Lịch sự kiện và sơ đồ chỗ ngồi" />

        <section className="grid gap-12 lg:grid-cols-2">
          <div>
            <h3 className="mb-6 font-display text-xl font-semibold text-textMuted">Dòng thời gian</h3>
            <div className="space-y-4">
              {timeline.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-xl border p-6 ${item.active ? 'border-primary bg-card' : 'border-border bg-panel'
                    }`}
                >
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-textMuted">{item.label}</p>
                    <p className="text-xl font-bold">{item.time}</p>
                  </div>
                  <span className="text-2xl text-primary">{item.icon}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-6 flex justify-between">
              <h3 className="font-display text-xl font-semibold text-textMuted">Sơ đồ chỗ ngồi</h3>
              <button className="text-sm font-bold text-primary">⌕ Phóng to</button>
            </div>

            <div className="flex aspect-video items-center justify-center rounded-2xl border border-border bg-card">
              <div className="text-center">
                <div className="mb-3 text-6xl text-primary/40">🏟</div>
                <p className="font-display text-lg font-bold">Bản đồ tương tác</p>
                <p className="text-sm text-textMuted">
                  Nhấp để mở chế độ xem thời gian thực và chọn vị trí ghế.
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionTitle title="Về sự kiện" />

        <section className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="mb-4 font-display text-2xl font-bold">Mô tả sự kiện</h3>
            <p className="leading-7 text-textMuted">
              Sau thành công rực rỡ của tour diễn vòng quanh thế giới, Coldplay chính thức mang
              “Music of the Spheres” đến Việt Nam vào năm 2026. Đây hứa hẹn sẽ là một trong những
              sự kiện âm nhạc bùng nổ nhất lịch sử.
            </p>
            <p className="mt-4 leading-7 text-textMuted">
              Khán giả sẽ được đắm chìm trong không gian vũ trụ huyền ảo, cùng Chris Martin và các
              thành viên ban nhạc trình diễn những bản hit bất hủ.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <Feature icon="♻" title="Sự kiện Xanh" />
              <Feature icon="♿" title="Hỗ trợ đặc biệt" />
            </div>
          </div>

          <div className="h-fit rounded-2xl border border-border bg-panel p-6">
            <h3 className="mb-3 font-display text-xl font-bold">Nghệ sĩ: Coldplay</h3>
            <p className="text-sm leading-6 text-textMuted">
              Ban nhạc rock huyền thoại đến từ London, thành lập năm 1996. Coldplay đã bán được hơn
              100 triệu album trên toàn thế giới.
            </p>
            <button className="mt-4 text-sm font-bold text-primary">Xem đầy đủ tiểu sử →</button>
          </div>
        </section>

        <SectionTitle title="Nhà tổ chức" />

        <section className="flex flex-col items-center gap-8 rounded-2xl border border-border bg-card p-8 md:flex-row">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white font-display text-2xl font-black text-bg">
            NOVA<br />PRO
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold">Nova Entertainment & Promotions</h3>
            <p className="mt-3 max-w-3xl text-textMuted">
              Đơn vị dẫn đầu trong lĩnh vực tổ chức các sự kiện giải trí và concert quốc tế tại Việt
              Nam.
            </p>
          </div>
        </section>

        <div className="flex items-end justify-between">
          <SectionTitle title="Có thể bạn sẽ thích" />
          <button className="font-bold text-primary">Xem tất cả</button>
        </div>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {recommendations.map(([tag, title, place, price]) => (
            <article key={title} className="overflow-hidden rounded-xl border border-border bg-panel">
              <div className="aspect-[3/4] bg-card p-3">
                <span className="rounded bg-bg/80 px-2 py-1 text-[10px] font-bold uppercase">
                  {tag}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-bold">{title}</h4>
                <p className="mt-1 text-xs text-textMuted">{place}</p>
                <p className="mt-2 font-bold text-primary">{price}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

function Info({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-card text-primary">{icon}</div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-textMuted">{desc}</p>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="border-l-4 border-primary pl-6 font-display text-3xl font-bold">{title}</h2>
  );
}

function Feature({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 text-3xl text-primary">{icon}</div>
      <h4 className="mb-2 font-bold">{title}</h4>
      <p className="text-sm text-textMuted">
        Khu vực và dịch vụ hỗ trợ được thiết kế để nâng cao trải nghiệm người dùng.
      </p>
    </div>
  );
}

