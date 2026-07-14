export type EventStatus = 'available' | 'selling-fast' | 'sold-out';
export type TicketStatus = 'upcoming' | 'used' | 'expired';

export type EventItem = {
  id: number;
  title: string;
  artist: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: number;
  status: EventStatus;
  image: string;
  accent: string;
};

export type Zone = {
  id: string;
  name: string;
  note: string;
  price: number;
  remaining: number;
  color: string;
};

export const events: EventItem[] = [
  {
    id: 1,
    title: 'The Dreamer — Live in Saigon',
    artist: 'Vũ.',
    category: 'Live Music',
    date: '2026-07-11',
    time: '19:30',
    venue: 'Thiskyhall Sala',
    city: 'TP. Hồ Chí Minh',
    price: 890000,
    status: 'selling-fast',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=85',
    accent: '#ff775f',
  },
  {
    id: 2,
    title: 'D’Hội — Hoiana Summer Fest',
    artist: 'Various Artists',
    category: 'Festival',
    date: '2026-06-26',
    time: '17:30',
    venue: 'Hoiana Resort & Golf',
    city: 'Đà Nẵng',
    price: 1000000,
    status: 'available',
    image:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1400&q=85',
    accent: '#8d7dff',
  },
  {
    id: 3,
    title: 'Ravolution — Neon Dynasty',
    artist: 'Ravolution',
    category: 'Electronic',
    date: '2026-08-15',
    time: '16:00',
    venue: 'Vạn Phúc City',
    city: 'TP. Hồ Chí Minh',
    price: 1250000,
    status: 'selling-fast',
    image:
      'https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=1400&q=85',
    accent: '#5ee4b4',
  },
  {
    id: 4,
    title: 'The Cassette — Hà Nội Nights',
    artist: 'Ngọt · Cá Hồi Hoang',
    category: 'Indie',
    date: '2026-09-05',
    time: '20:00',
    venue: 'Cung Văn hóa Hữu nghị',
    city: 'Hà Nội',
    price: 650000,
    status: 'sold-out',
    image:
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1400&q=85',
    accent: '#ffca6b',
  },
  {
    id: 5,
    title: 'Moonlit — An Acoustic Evening',
    artist: 'Hà Anh Tuấn',
    category: 'Acoustic',
    date: '2026-10-17',
    time: '19:00',
    venue: 'Nhà hát Hòa Bình',
    city: 'TP. Hồ Chí Minh',
    price: 1500000,
    status: 'available',
    image:
      'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=1400&q=85',
    accent: '#73b9ff',
  },
  {
    id: 6,
    title: 'Sóng 26 — The New Wave',
    artist: 'The New Generation',
    category: 'Pop',
    date: '2026-11-21',
    time: '19:30',
    venue: 'Mỹ Đình Indoor Athletics',
    city: 'Hà Nội',
    price: 790000,
    status: 'available',
    image:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=85',
    accent: '#f177ff',
  },
];

export const zones: Zone[] = [
  { id: 'diamond', name: 'Diamond', note: 'Gần sân khấu · Đứng', price: 3200000, remaining: 8, color: '#ff775f' },
  { id: 'platinum', name: 'Platinum', note: 'Góc nhìn tốt nhất · Đứng', price: 2400000, remaining: 21, color: '#a797ff' },
  { id: 'gold', name: 'Gold', note: 'Góc nhìn trung tâm', price: 1600000, remaining: 46, color: '#f8c96c' },
  { id: 'silver', name: 'Silver', note: 'Khán đài', price: 890000, remaining: 0, color: '#81c9dc' },
];

export const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export const eventDate = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function getEvent(id?: string) {
  return events.find((event) => event.id === Number(id)) ?? events[0];
}

export const mockTickets = [
  { id: 'TBX-260711-8K2P', event: events[0], zone: 'Gold · G14', status: 'upcoming' as TicketStatus },
  { id: 'TBX-260626-4M9A', event: events[1], zone: 'Phố Hội · P08', status: 'used' as TicketStatus },
  { id: 'TBX-251221-7C3Q', event: events[3], zone: 'Balcony · B21', status: 'expired' as TicketStatus },
];
