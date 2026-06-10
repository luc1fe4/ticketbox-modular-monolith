import { useNavigate } from 'react-router-dom';

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

const events = [
  {
    id: 1,
    tag: 'THỂ THAO',
    tagColor: 'bg-blue-500',
    place: 'Thành phố Hà Nội, 25 tháng 10, 2026',
    title: 'VPBank Hanoi International Marathon 2026',
  },
  {
    id: 2,
    tag: 'NHẠC SỐNG',
    tagColor: 'bg-pink-500',
    place: 'Hồ Chí Minh, 11 tháng 7, 2026',
    title: 'SAO CONCERT - Trạm SAO 2',
  },
  {
    id: 3,
    tag: 'NHẠC SỐNG',
    tagColor: 'bg-pink-500',
    place: 'Đà Nẵng, 26 tháng 6, 2026',
    title: "D'Hoi - Hoiana Summer Fest",
  },
  {
    id: 4,
    tag: 'NHẠC SỐNG',
    tagColor: 'bg-pink-500',
    place: 'Hồ Chí Minh, 13 tháng 6, 2026',
    title: 'RAVOLUTION MUSIC FESTIVAL - RAVO 10 YEARS',
  },
];

export function HomePage() {
  const nav = useNavigate();
  return (
    <>
      <section className="relative h-[420px] border-t border-border">
        <button className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white/80">
          ‹
        </button>

        <button className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white/80">
          ›
        </button>

        <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-2">
          <span className="h-1.5 w-6 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        </div>
      </section>

      <section className="px-4 pb-24">
        <h1 className="mb-6 font-display text-2xl font-bold">Sự kiện</h1>

        <div className="mb-16 flex gap-3 overflow-x-auto pb-2">
          {categories.map((item, index) => (
            <button
              key={item}
              className={`whitespace-nowrap rounded-full border px-6 py-2 text-sm font-semibold ${index === 0
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white/5 text-textMuted'
                }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Upcoming Events</h2>
          <button className="text-sm font-semibold text-primary">View All</button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {events.map((event) => (
            <article key={event.title}
              onClick={() => nav(`/concerts/${event.id}`)}
              className="group cursor-pointer">
              <div className="mb-4 h-36 rounded-xl border border-border bg-[#0b1020] p-3 transition group-hover:border-primary">
                <span className={`rounded px-2 py-1 text-[10px] font-bold ${event.tagColor}`}>
                  {event.tag}
                </span>
              </div>

              <p className="mb-2 text-xs font-semibold text-textMuted">{event.place}</p>
              <h3 className="font-display text-base font-bold leading-snug text-white">
                {event.title}
              </h3>
            </article>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <button className="w-40 rounded-lg border border-border bg-white/5 px-8 py-3 font-bold text-white hover:border-primary">
            Xem thêm
          </button>
        </div>
      </section>
    </>
  );
}

