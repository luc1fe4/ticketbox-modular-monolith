import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

interface ConcertSummary {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  eventDate: string;
  status: 'DRAFT' | 'ON_SALE' | 'SOLD_OUT' | 'POSTPONED' | 'CANCELLED' | 'COMPLETED';
}

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

const categories = [
  'Tất cả',
  'Nhạc sống',
  'Fan Meeting',
  'Merchandise',
  'Sân khấu & Nghệ thuật',
  'Thể thao',
  'Hội thảo & Cộng đồng',
  'Khoá học',
];

export function HomePage() {
  const [concerts, setConcerts] = useState<ConcertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConcerts();
  }, []);

  const fetchConcerts = async () => {
    try {
      setLoading(true);
      const data = await api.get<any, PageResponse<ConcertSummary>>('/api/concerts');
      if (data && data.content) {
        setConcerts(data.content);
      }
    } catch (err) {
      console.error('Failed to load concerts', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ConcertSummary['status']) => {
    switch (status) {
      case 'ON_SALE':
        return <span className="rounded bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-1 text-[10px] font-bold">ON SALE</span>;
      case 'SOLD_OUT':
        return <span className="rounded bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1 text-[10px] font-bold">SOLD OUT</span>;
      default:
        return <span className="rounded bg-gray-500/10 border border-gray-500/20 text-gray-400 px-2 py-1 text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <>
      <section className="relative h-[420px] border-t border-border bg-[radial-gradient(circle_at_50%_120%,rgba(108,99,255,0.15),transparent)] flex items-center justify-center">
        <div className="text-center px-4 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white mb-4">
            Trải nghiệm Âm nhạc Đỉnh cao cùng <span className="text-primary">NovaStage</span>
          </h1>
          <p className="text-textMuted text-base sm:text-lg mb-8">
            Tìm kiếm và đặt vé các sự kiện âm nhạc, đại nhạc hội lớn nhất trên toàn quốc nhanh chóng, an toàn và dễ dàng.
          </p>
        </div>

        <button className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white/80 hover:bg-white/20 transition cursor-pointer">
          ‹
        </button>

        <button className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white/80 hover:bg-white/20 transition cursor-pointer">
          ›
        </button>
      </section>

      <section className="px-4 sm:px-8 pb-24 max-w-7xl mx-auto">
        <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
          {categories.map((item, index) => (
            <button
              key={item}
              className={`whitespace-nowrap rounded-full border px-6 py-2 text-sm font-semibold transition cursor-pointer ${
                index === 0
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white/5 text-textMuted hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-white">Sự kiện nổi bật</h2>
          <button className="text-sm font-semibold text-primary hover:text-primary-container transition">Tất cả</button>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-4 h-48 rounded-2xl bg-white/5 border border-border/50" />
                <div className="h-4 w-3/4 rounded bg-white/10 mb-2" />
                <div className="h-6 w-full rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : concerts.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-border/50 bg-card/40 text-textMuted">
            Chưa có sự kiện nào đang được bán vé. Quay lại sau bạn nhé!
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {concerts.map((concert) => (
              <article
                key={concert.id}
                onClick={() => navigate(`/concerts/${concert.id}`)}
                className="group cursor-pointer bg-card/40 rounded-2xl border border-border hover:border-primary/50 transition overflow-hidden shadow-lg hover:shadow-primary/5 flex flex-col h-full"
              >
                <div className="relative h-48 bg-bg flex items-center justify-center overflow-hidden border-b border-border/50">
                  {concert.imageUrl ? (
                    <img
                      src={concert.imageUrl}
                      alt={concert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-textMuted font-mono">
                      <span className="text-4xl mb-2">🎵</span>
                      <span>NovaStage Event</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 z-10">
                    {getStatusBadge(concert.status)}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-textMuted mb-2">
                      {new Date(concert.eventDate).toLocaleDateString('vi-VN')} - {new Date(concert.eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h3 className="font-display text-base font-bold leading-snug text-white group-hover:text-primary transition line-clamp-2">
                      {concert.title}
                    </h3>
                    <p className="text-xs text-textMuted mt-1">Nghệ sĩ: {concert.artist || 'Đang cập nhật'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
