import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const initialTickets = [
  { id: 'hq1', name: 'Hội Quán 1', price: 1600000, soldOut: true },
  { id: 'hq2', name: 'Hội Quán 2', price: 1600000, soldOut: true },
  { id: 'ph1', name: 'Phố Hội 1', price: 2500000, soldOut: false },
  { id: 'ph2', name: 'Phố Hội 2', price: 2500000, soldOut: false },
  { id: 'dl1', name: 'Đèn Lồng 1', price: 3000000, soldOut: false },
  { id: 'dl2', name: 'Đèn Lồng 2', price: 3000000, soldOut: false },
  { id: 'nn1', name: 'Nghệ Nhân 1', price: 1200000, soldOut: false },
  { id: 'ds', name: 'Di Sản', price: 1000000, soldOut: false },
  { id: 'nn2', name: 'Nghệ Nhân 2', price: 1200000, soldOut: false },
];

export function SeatSelectionPage() {
  const [timeLeft, setTimeLeft] = useState(599);
  const [scale, setScale] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);

  const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nav = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  function zoom(factor: number) {
    setScale((value) => Math.max(0.5, Math.min(value * factor, 2)));
  }

  const handleZoneClick = (zoneId: string) => {
    setHighlightedZone(zoneId);
    if (ticketRefs.current[zoneId]) {
      ticketRefs.current[zoneId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const removeTicket = (id: string) => {
    setQuantities(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const removeAll = () => {
    setQuantities({});
  };

  const selectedTickets = Object.entries(quantities).map(([id, qty]) => {
    const ticket = initialTickets.find(t => t.id === id)!;
    return { ...ticket, qty };
  });

  const totalAmount = selectedTickets.reduce((sum, ticket) => sum + ticket.price * ticket.qty, 0);

  return (
    <main className="flex h-screen flex-col bg-bg text-on-surface font-body">
      {/* Non-sticky Header */}
      <header className="border-b border-border/50 bg-bg">
        <nav className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-4 md:px-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => nav(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-white bg-panel hover:bg-white/10 transition"
            >
              ←
            </button>
            <div className="font-display text-2xl font-bold text-white">NovaStage</div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-green-400">
            <span>⏱</span>
            <span className="text-xs font-bold uppercase tracking-wider">
              Thời gian: {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </nav>
      </header>

      <section className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Seat Map Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#080d1d] p-10">
          <div
            className="flex h-full w-full origin-center items-center justify-center transition-transform duration-300"
            style={{ transform: `scale(${scale})` }}
          >
            <SeatMap onZoneClick={handleZoneClick} highlightedZone={highlightedZone} />
          </div>

          <div className="absolute bottom-10 left-10 flex flex-col gap-2">
            <button
              onClick={() => zoom(1.2)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/70 backdrop-blur hover:bg-surface-bright"
            >
              +
            </button>
            <button
              onClick={() => zoom(0.8)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/70 backdrop-blur hover:bg-surface-bright"
            >
              -
            </button>
          </div>

          <Legend />
        </div>

        {/* Sidebar */}
        <aside className="flex w-full overflow-hidden border-l border-border bg-panel shadow-2xl md:w-[850px]">
          {/* Ticket List */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-border bg-card/20 p-6">
              <h1 className="mb-1 font-display text-2xl font-bold text-white">
                D&apos;Hoi - Hoiana Summer Fest
              </h1>
              <p className="text-sm text-textMuted">Thứ Sáu, 26/06/2026 • 17:30</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6 scroll-smooth">
              {initialTickets.map((ticket) => {
                const qty = quantities[ticket.id] || 0;
                const isHighlighted = highlightedZone === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    ref={el => ticketRefs.current[ticket.id] = el}
                    className={`space-y-4 rounded-xl border p-4 transition-all duration-500 ${isHighlighted ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(108,99,255,0.2)]' : 'border-border/50 bg-transparent'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white">{ticket.name}</h4>
                        <p className="font-bold text-textMuted">
                          {ticket.price.toLocaleString('vi-VN')} VND
                        </p>
                      </div>

                      {ticket.soldOut ? (
                        <span className="rounded bg-surface-bright px-4 py-1 text-xs font-bold text-textMuted">
                          Hết vé
                        </span>
                      ) : (
                        <div className="flex items-center gap-4 rounded-lg bg-bg p-1">
                          <button
                            onClick={() => updateQuantity(ticket.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-bright hover:bg-white/10"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-bold text-white">{qty}</span>
                          <button
                            onClick={() => updateQuantity(ticket.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary hover:bg-primary hover:text-white transition"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Tickets */}
          <div className="hidden w-[300px] flex-col border-l border-border bg-bg md:flex">
            <div className="flex items-center justify-between border-b border-border p-6">
              <span className="text-sm font-bold text-white">Vé đã chọn</span>
              <button onClick={removeAll} className="text-xs font-medium text-red-400 hover:text-red-300">
                Xoá tất cả
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedTickets.length === 0 ? (
                <p className="text-center text-sm text-textMuted mt-10">Chưa chọn vé nào</p>
              ) : (
                selectedTickets.map((ticket) => (
                  <div key={ticket.id} className="relative rounded-xl border border-border bg-panel p-4">
                    <button
                      onClick={() => removeTicket(ticket.id)}
                      className="absolute right-4 top-4 text-textMuted hover:text-red-400"
                    >
                      🗑
                    </button>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-textMuted">
                      {ticket.name}
                    </p>
                    <p className="mb-3 font-bold text-white">{ticket.price.toLocaleString('vi-VN')} VND</p>
                    <span className="rounded bg-card px-2 py-0.5 text-xs font-bold text-white">x{ticket.qty}</span>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border bg-card p-6">
              <p className="text-xs text-textMuted">Tạm tính</p>
              <p className="mb-4 font-display text-2xl font-bold text-green-400">
                {totalAmount.toLocaleString('vi-VN')} VND
              </p>
              <button
                disabled={selectedTickets.length === 0}
                className="w-full rounded-xl bg-primary px-6 py-4 font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 transition"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SeatMap({ onZoneClick, highlightedZone }: { onZoneClick: (id: string) => void, highlightedZone: string | null }) {
  return (
    <svg className="h-full w-full max-w-[800px]" viewBox="0 0 600 800">
      <path
        d="M150 50 L450 50 L500 120 L400 120 L400 180 L200 180 L200 120 L100 120 Z"
        fill="#0066FF"
      />
      <text x="300" y="100" fill="white" textAnchor="middle" className="font-display text-2xl font-bold pointer-events-none">
        SÂN KHẤU
      </text>

      <Zone id="dl1" x={110} y={200} w={180} h={120} fill="#EAB308" label="ĐÈN LỒNG 1" dark onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'dl1'} />
      <Zone id="dl2" x={310} y={200} w={180} h={120} fill="#EAB308" label="ĐÈN LỒNG 2" dark onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'dl2'} />
      <Zone id="ph1" x={110} y={340} w={180} h={150} fill="#F97316" label="PHỐ HỘI 1" dark onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'ph1'} />
      <Zone id="ph2" x={310} y={340} w={180} h={150} fill="#F97316" label="PHỐ HỘI 2" dark onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'ph2'} />
      <Zone id="hq1" x={110} y={510} w={180} h={60} fill="#7E22CE" label="HỘI QUÁN 1" onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'hq1'} />
      <Zone id="hq2" x={310} y={510} w={180} h={60} fill="#7E22CE" label="HỘI QUÁN 2" onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'hq2'} />
      <Zone id="nn1" x={110} y={590} w={120} h={80} fill="#22C55E" label="NGHỆ NHÂN 1" dark onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'nn1'} />
      <Zone id="ds" x={240} y={590} w={120} h={80} fill="#0D9488" label="DI SẢN" onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'ds'} />
      <Zone id="nn2" x={370} y={590} w={120} h={80} fill="#22C55E" label="NGHỆ NHÂN 2" dark onZoneClick={onZoneClick} isHighlighted={highlightedZone === 'nn2'} />

      <rect x="240" y="690" width="120" height="25" rx="2" fill="#0066FF" />
      <text x="300" y="708" fill="white" textAnchor="middle" className="text-xs font-bold pointer-events-none">
        FOH
      </text>
    </svg>
  );
}

function Zone({
  id,
  x,
  y,
  w,
  h,
  fill,
  label,
  dark,
  onZoneClick,
  isHighlighted
}: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  label: string;
  dark?: boolean;
  onZoneClick: (id: string) => void;
  isHighlighted: boolean;
}) {
  return (
    <g onClick={() => onZoneClick(id)} className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="4"
        fill={fill}
        stroke={isHighlighted ? "#fff" : "transparent"}
        strokeWidth={isHighlighted ? "4" : "0"}
        className="transition-all duration-300 hover:brightness-125 hover:stroke-white hover:stroke-2"
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 6}
        fill={dark ? '#000' : '#fff'}
        textAnchor="middle"
        className="font-display text-sm font-bold pointer-events-none"
      >
        {label}
      </text>
    </g>
  );
}

function Legend() {
  const items = [
    ['#0066FF', 'Sân Khấu / FOH'],
    ['#EAB308', 'Đèn Lồng'],
    ['#F97316', 'Phố Hội'],
    ['#7E22CE', 'Hội Quán'],
    ['#22C55E', 'Nghệ Nhân'],
    ['#0D9488', 'Di Sản'],
  ];

  return (
    <div className="absolute right-10 top-10 space-y-3 rounded-xl border border-border bg-card/70 p-4 backdrop-blur">
      {items.map(([color, label]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white">{label}</span>
        </div>
      ))}
    </div>
  );
}