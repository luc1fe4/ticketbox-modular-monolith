import { apiCommand, apiGet, apiMultipartCommand } from './client';
import type { ConcertDetail, ConcertStatus, Page, TicketType } from './concerts';

export type ConcertMutation = {
  title: string;
  description: string | null;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  doorsOpenAt: string | null;
  seatMapSvg: string | null;
};

export type TicketTypeMutation = {
  name: string;
  price: number;
  totalQuantity: number;
  maxPerAccount: number;
  saleStartAt: string;
  saleEndAt: string | null;
  zoneColor: string;
};

export type StaffConcert = {
  id: string;
  title: string;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  doorsOpenAt: string | null;
  status: Exclude<ConcertStatus, 'DRAFT'>;
  posterUrl: string | null;
};

export function getAdminConcerts(
  page = 0,
  size = 20,
  status?: ConcertStatus,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);
  return apiGet<Page<ConcertDetail>>(`/api/admin/concerts?${params}`, signal);
}

export function createConcert(payload: ConcertMutation) {
  return apiCommand<ConcertDetail>('post', '/api/admin/concerts', payload);
}

export function updateConcert(concertId: string, payload: ConcertMutation) {
  return apiCommand<ConcertDetail>(
    'put',
    `/api/admin/concerts/${encodeURIComponent(concertId)}`,
    payload,
  );
}

export function updateConcertStatus(concertId: string, status: ConcertStatus) {
  return apiCommand<ConcertDetail>(
    'patch',
    `/api/admin/concerts/${encodeURIComponent(concertId)}/status`,
    { status },
  );
}

export function deleteConcert(concertId: string) {
  return apiCommand<void>('delete', `/api/admin/concerts/${encodeURIComponent(concertId)}`);
}

export function uploadConcertPoster(concertId: string, file: File) {
  const data = new FormData();
  data.append('file', file);
  return apiMultipartCommand<ConcertDetail>(
    'put',
    `/api/admin/concerts/${encodeURIComponent(concertId)}/poster`,
    data,
  );
}

export function removeConcertPoster(concertId: string) {
  return apiCommand<ConcertDetail>(
    'delete',
    `/api/admin/concerts/${encodeURIComponent(concertId)}/poster`,
  );
}

export function getAdminTicketTypes(concertId: string, signal?: AbortSignal) {
  return apiGet<TicketType[]>(
    `/api/admin/concerts/${encodeURIComponent(concertId)}/ticket-types`,
    signal,
  );
}

export function createTicketType(
  concertId: string,
  payload: TicketTypeMutation,
) {
  return apiCommand<TicketType>(
    'post',
    `/api/admin/concerts/${encodeURIComponent(concertId)}/ticket-types`,
    payload,
  );
}

export function updateTicketType(
  ticketTypeId: string,
  payload: TicketTypeMutation,
) {
  return apiCommand<TicketType>(
    'put',
    `/api/admin/ticket-types/${encodeURIComponent(ticketTypeId)}`,
    payload,
  );
}

export function updateTicketTypeStatus(
  ticketTypeId: string,
  isActive: boolean,
) {
  return apiCommand<TicketType>(
    'patch',
    `/api/admin/ticket-types/${encodeURIComponent(ticketTypeId)}/status`,
    { isActive },
  );
}

export function deleteTicketType(ticketTypeId: string) {
  return apiCommand<void>('delete', `/api/admin/ticket-types/${encodeURIComponent(ticketTypeId)}`);
}

export function getStaffConcerts(
  status: StaffConcert['status'] = 'ON_SALE',
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ status, page: '0', size: '20' });
  return apiGet<Page<StaffConcert>>(`/api/staff/concerts?${params}`, signal);
}
