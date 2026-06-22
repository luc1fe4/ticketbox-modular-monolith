import { apiGet } from './client';

export type ConcertStatus = 'DRAFT' | 'ON_SALE' | 'SOLD_OUT' | 'CANCELLED' | 'COMPLETED';

export type ConcertSummary = {
  id: string;
  title: string;
  venueName: string;
  eventDate: string;
  status: ConcertStatus;
  posterUrl: string | null;
};

export type ConcertDetail = ConcertSummary & {
  description: string | null;
  artistBio: string | null;
  venueAddress: string;
  doorsOpenAt: string | null;
  seatMapSvg: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketType = {
  id: string;
  concertId: string;
  name: string;
  price: number;
  totalQuantity: number;
  availableQty: number;
  maxPerAccount: number;
  saleStartAt: string;
  saleEndAt: string;
  zoneColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Page<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export function getConcerts(page = 0, size = 12, signal?: AbortSignal) {
  return apiGet<Page<ConcertSummary>>(`/api/concerts?page=${page}&size=${size}`, signal);
}

export function getConcert(id: string, signal?: AbortSignal) {
  return apiGet<ConcertDetail>(`/api/concerts/${encodeURIComponent(id)}`, signal);
}

export function getConcertTicketTypes(concertId: string, signal?: AbortSignal) {
  return apiGet<TicketType[]>(
    `/api/concerts/${encodeURIComponent(concertId)}/ticket-types`,
    signal,
  );
}
