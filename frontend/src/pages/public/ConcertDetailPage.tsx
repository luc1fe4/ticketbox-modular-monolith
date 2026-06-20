import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

interface ConcertDetail {
  id: string;
  title: string;
  artist: string;
  artistBio: string;
  description: string;
  eventDate: string;
  doorsOpenAt: string;
  venueName: string;
  imageUrl: string;
  status: 'DRAFT' | 'ON_SALE' | 'SOLD_OUT' | 'POSTPONED' | 'CANCELLED' | 'COMPLETED';
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
}

export function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchConcertDetail();
    }
  }, [id]);

  const fetchConcertDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const [concertData, ticketTypesData] = await Promise.all([
        api.get<any, ConcertDetail>(`/api/concerts/${id}`),
        api.get<any, TicketType[]>(`/api/concerts/${id}/ticket-types`),
      ]);

      setConcert(concertData);
      setTicketTypes(ticketTypesData || []);
    } catch (err: any) {
      console.error('Failed to fetch concert details', err);
      setError(err.message || 'Không thể tải thông tin sự kiện. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ConcertDetail['status']) => {
    switch (status) {
      case 'ON_SALE':
        return <span className="mb-4 w-fit rounded-md bg-green-500/20 px-3 py-1 text-xs font-bold uppercase text-green-400">Đang mở bán</span>;
      case 'SOLD_OUT':
        return <span className="mb-4 w-fit rounded-md bg-red-500/20 px-3 py-1 text-xs font-bold uppercase text-red-400">Hết vé</span>;
      case 'CANCELLED':
        return <span className="mb-4 w-fit rounded-md bg-gray-500/20 px-3 py-1 text-xs font-bold uppercase text-gray-400">Đã hủy</span>;
      default:
        return <span className="mb-4 w-fit rounded-md bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase text-blue-400">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1020] py-12 px-4 flex justify-center items-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !concert) {
    return (
      <div className="min-h-screen bg-[#0b1020] text-white py-12 px-4 flex flex-col justify-center items-center">
        <h2 className="text-xl font-bold mb-4">{error || 'Không tìm thấy sự kiện'}</h2>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 rounded-full bg-primary font-semibold text-white hover:brightness-110"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-card via-bg to-[#171326] px-5 py-14 md:px-16 text-white">
        <div className="mx-auto grid max-w-[1440px] gap-10 md:grid-cols-[400px_1fr]">
          <div className="aspect-[3/4] rounded-2xl border border-border bg-bg shadow-2xl flex items-center justify-center overflow-hidden">
            {concert.imageUrl ? (
              <img src={concert.imageUrl} alt={concert.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-6xl">🎵</div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            {getStatusBadge(concert.status)}

            <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight md:text-5xl text-white">
              {concert.title}
            </h1>

            <div className="mt-8 space-y-5">
              <Info
                icon="📅"
                title={new Date(concert.eventDate).toLocaleDateString('vi-VN')}
                desc={`Mở cửa từ: ${new Date(concert.doorsOpenAt || concert.eventDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
              />
              <Info
                icon="📍"
                title={concert.venueName || 'Địa điểm chưa cập nhật'}
                desc="Vui lòng kiểm tra kỹ sơ đồ và địa chỉ trên vé của bạn"
              />
              <Info
                icon="💳"
                title="Giá vé"
                desc={
                  ticketTypes.length > 0
                    ? `Từ ${Math.min(...ticketTypes.map((t) => t.price)).toLocaleString()} VND đến ${Math.max(...ticketTypes.map((t) => t.price)).toLocaleString()} VND`
                    : 'Đang cập nhật giá vé'
                }
              />
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => navigate(`/concerts/${concert.id}/seats`)}
                disabled={concert.status !== 'ON_SALE'}
                className="rounded-xl bg-primary px-12 py-4 font-display text-xl font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Mua vé ngay
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] space-y-20 px-5 py-12 md:px-16 text-white">
        <section className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle title="Hạng vé & Giá vé" />
            <div className="space-y-4 mt-6">
              {ticketTypes.length === 0 ? (
                <p className="text-textMuted">Hiện tại chưa có hạng vé nào được mở bán.</p>
              ) : (
                ticketTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-panel p-6"
                  >
                    <div>
                      <p className="text-lg font-bold text-white">{type.name}</p>
                      <p className="text-xs text-textMuted mt-1">
                        Còn lại: {type.available} / {type.capacity} vé
                      </p>
                    </div>
                    <span className="text-xl font-bold text-primary">{type.price.toLocaleString()} VND</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <SectionTitle title="Sơ đồ chỗ ngồi" />
            <div className="mt-6 flex aspect-video items-center justify-center rounded-2xl border border-border bg-card">
              <div className="text-center">
                <div className="mb-3 text-6xl text-primary/40">🏟</div>
                <p className="font-display text-lg font-bold">Bản đồ tương tác</p>
                <p className="text-sm text-textMuted">
                  Nhấp vào nút "Mua vé ngay" để mở bản đồ SVG tương tác thời gian thực và chọn vị trí ghế của bạn.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionTitle title="Mô tả sự kiện" />
            <p className="mt-6 leading-7 text-textMuted whitespace-pre-line">{concert.description || 'Chưa có mô tả.'}</p>
          </div>

          <div className="h-fit rounded-2xl border border-border bg-panel p-6">
            <h3 className="mb-3 font-display text-xl font-bold">Nghệ sĩ: {concert.artist}</h3>
            <p className="text-sm leading-6 text-textMuted whitespace-pre-line">
              {concert.artistBio || 'Tiểu sử nghệ sĩ đang được cập nhật.'}
            </p>
          </div>
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
    <h2 className="border-l-4 border-primary pl-6 font-display text-2xl font-bold">{title}</h2>
  );
}
