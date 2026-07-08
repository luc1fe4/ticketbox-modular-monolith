import { apiCommand, apiGet, apiMultipartCommand } from './client';
import type { ConcertDetail, ConcertStatus, Page, TicketType } from './concerts';
import type { Order, OrderStatus } from './orders';
import type { Ticket } from './tickets';

export type ManagementApiScope = 'admin' | 'organizer';

function managementBase(scope: ManagementApiScope) {
  return scope === 'organizer' ? '/api/organizer/manage' : '/api/admin';
}

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

export type StaffScanTicketRequest = {
  qrCode: string;
  concertId: string;
  deviceId: string;
  gate?: string;
};

export type StaffScanTicketResponse = {
  ticketId: string | null;
  concertId: string;
  status: 'SUCCESS' | 'FAILED';
  message: string;
  checkAt: string;
};

export type StaffGuestLookup = {
  found: boolean;
  guestId: string | null;
  concertId: string | null;
  phone: string | null;
  fullName: string | null;
  category: string | null;
  sponsorName: string | null;
  notes: string | null;
};

export type StaffCheckinHistory = {
  id: string;
  ticketId: string;
  concertId: string;
  staffId: string;
  deviceId: string;
  checkedAt: string;
  syncAt: string | null;
  offline: boolean;
  gate: string | null;
  notes: string | null;
  qrCode: string | null;
  ticketStatus: string | null;
};

export type BatchLogStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
export type BatchLogSource = 'UPLOAD' | 'SCHEDULED';

export type BatchLog = {
  id: string;
  jobName: string;
  concertId: string | null;
  source: BatchLogSource | null;
  fileName: string | null;
  checksum: string | null;
  status: BatchLogStatus;
  startedAt: string;
  completedAt: string | null;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errorDetail: string | null;
  filePath: string | null;
  errorReportPath: string | null;
};

export type GuestListImportResponse = {
  batchLogId: string;
  status: BatchLogStatus;
  statusUrl: string;
};

export type BatchLogFilters = {
  concertId?: string;
  status?: BatchLogStatus;
  source?: BatchLogSource;
  page?: number;
  size?: number;
};

export type ArtistBioJobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export type ArtistBioJob = {
  id: string;
  concertId: string;
  originalFileName: string;
  status: ArtistBioJobStatus;
  provider: string | null;
  model: string | null;
  extractedCharCount: number | null;
  resultBio: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  appliedAt: string | null;
  appliedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ArtistBioJobSubmission = {
  jobId: string;
  status: ArtistBioJobStatus;
  statusUrl: string;
};

export type ArtistBioJobFilters = {
  concertId?: string;
  status?: ArtistBioJobStatus;
  page?: number;
  size?: number;
};

export function getAdminConcerts(
  page = 0,
  size = 20,
  status?: ConcertStatus,
  signal?: AbortSignal,
  scope: ManagementApiScope = 'admin',
) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);
  return apiGet<Page<ConcertDetail>>(`${managementBase(scope)}/concerts?${params}`, signal);
}

export function createConcert(payload: ConcertMutation, scope: ManagementApiScope = 'admin') {
  return apiCommand<ConcertDetail>('post', `${managementBase(scope)}/concerts`, payload);
}

export function updateConcert(concertId: string, payload: ConcertMutation, scope: ManagementApiScope = 'admin') {
  return apiCommand<ConcertDetail>(
    'put',
    `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}`,
    payload,
  );
}

export function updateConcertStatus(concertId: string, status: ConcertStatus, scope: ManagementApiScope = 'admin') {
  return apiCommand<ConcertDetail>(
    'patch',
    `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/status`,
    { status },
  );
}

export function deleteConcert(concertId: string, scope: ManagementApiScope = 'admin') {
  return apiCommand<void>('delete', `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}`);
}

export function uploadConcertPoster(concertId: string, file: File, scope: ManagementApiScope = 'admin') {
  const data = new FormData();
  data.append('file', file);
  return apiMultipartCommand<ConcertDetail>(
    'put',
    `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/poster`,
    data,
  );
}

export function removeConcertPoster(concertId: string, scope: ManagementApiScope = 'admin') {
  return apiCommand<ConcertDetail>(
    'delete',
    `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/poster`,
  );
}

export function getAdminTicketTypes(concertId: string, signal?: AbortSignal, scope: ManagementApiScope = 'admin') {
  return apiGet<TicketType[]>(
    `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/ticket-types`,
    signal,
  );
}

export function createTicketType(
  concertId: string,
  payload: TicketTypeMutation,
  scope: ManagementApiScope = 'admin',
) {
  return apiCommand<TicketType>(
    'post',
    `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/ticket-types`,
    payload,
  );
}

export function updateTicketType(
  ticketTypeId: string,
  payload: TicketTypeMutation,
  scope: ManagementApiScope = 'admin',
) {
  return apiCommand<TicketType>(
    'put',
    `${managementBase(scope)}/ticket-types/${encodeURIComponent(ticketTypeId)}`,
    payload,
  );
}

export function updateTicketTypeStatus(
  ticketTypeId: string,
  isActive: boolean,
  scope: ManagementApiScope = 'admin',
) {
  return apiCommand<TicketType>(
    'patch',
    `${managementBase(scope)}/ticket-types/${encodeURIComponent(ticketTypeId)}/status`,
    { isActive },
  );
}

export function deleteTicketType(ticketTypeId: string, scope: ManagementApiScope = 'admin') {
  return apiCommand<void>('delete', `${managementBase(scope)}/ticket-types/${encodeURIComponent(ticketTypeId)}`);
}

export function getStaffConcerts(
  status: StaffConcert['status'] = 'ON_SALE',
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ status, page: '0', size: '20' });
  return apiGet<Page<StaffConcert>>(`/api/staff/concerts?${params}`, signal);
}

export function scanStaffTicket(payload: StaffScanTicketRequest) {
  return apiCommand<StaffScanTicketResponse>('post', '/api/staff/checkins/scan', payload);
}

export function lookupStaffGuest(concertId: string, phone: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ concert_id: concertId, phone });
  return apiGet<StaffGuestLookup>(`/api/staff/guestlist?${params}`, signal);
}

export function getStaffGuestList(concertId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ concert_id: concertId });
  return apiGet<StaffGuestLookup[]>(`/api/staff/guestlist/list?${params}`, signal);
}

export function getStaffCheckinHistory(
  concertId: string,
  page = 0,
  size = 20,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiGet<Page<StaffCheckinHistory>>(
    `/api/staff/concerts/${encodeURIComponent(concertId)}/checkins?${params}`,
    signal,
  );
}

export function importGuestList(
  concertId: string,
  file: File,
  scope: ManagementApiScope = 'admin',
  scheduled = false,
) {
  const data = new FormData();
  data.append('file', file);
  const path = scheduled
    ? `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/guest-lists/schedule`
    : `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/guest-lists/import`;
  return apiMultipartCommand<GuestListImportResponse>(
    'post',
    path,
    data,
  );
}

export function getBatchLogs(
  filters: BatchLogFilters = {},
  signal?: AbortSignal,
  scope: ManagementApiScope = 'admin',
) {
  const params = new URLSearchParams({
    page: String(filters.page ?? 0),
    size: String(filters.size ?? 20),
  });
  if (filters.concertId) params.set('concertId', filters.concertId);
  if (filters.status) params.set('status', filters.status);
  if (filters.source) params.set('source', filters.source);
  return apiGet<Page<BatchLog>>(`${managementBase(scope)}/batch-logs?${params}`, signal);
}

export function getBatchLog(
  batchLogId: string,
  signal?: AbortSignal,
  scope: ManagementApiScope = 'admin',
) {
  return apiGet<BatchLog>(
    `${managementBase(scope)}/batch-logs/${encodeURIComponent(batchLogId)}`,
    signal,
  );
}

export function submitArtistBioJob(concertId: string, file: File, scope: ManagementApiScope = 'admin') {
  const data = new FormData();
  data.append('file', file);
  return apiMultipartCommand<ArtistBioJobSubmission>(
    'post',
    `${managementBase(scope)}/concerts/${encodeURIComponent(concertId)}/artist-bio-jobs`,
    data,
  );
}

export function getArtistBioJobs(filters: ArtistBioJobFilters = {}, signal?: AbortSignal, scope: ManagementApiScope = 'admin') {
  const params = new URLSearchParams({
    page: String(filters.page ?? 0),
    size: String(filters.size ?? 20),
  });
  if (filters.concertId) params.set('concertId', filters.concertId);
  if (filters.status) params.set('status', filters.status);
  return apiGet<Page<ArtistBioJob>>(`${managementBase(scope)}/artist-bio-jobs?${params}`, signal);
}

export function getArtistBioJob(jobId: string, signal?: AbortSignal, scope: ManagementApiScope = 'admin') {
  return apiGet<ArtistBioJob>(
    `${managementBase(scope)}/artist-bio-jobs/${encodeURIComponent(jobId)}`,
    signal,
  );
}

export function retryArtistBioJob(jobId: string, scope: ManagementApiScope = 'admin') {
  return apiCommand<ArtistBioJobSubmission>(
    'post',
    `${managementBase(scope)}/artist-bio-jobs/${encodeURIComponent(jobId)}/retry`,
  );
}

export function applyArtistBioJob(jobId: string, overwrite = false, scope: ManagementApiScope = 'admin') {
  const params = new URLSearchParams({ overwrite: String(overwrite) });
  return apiCommand<ArtistBioJob>(
    'post',
    `${managementBase(scope)}/artist-bio-jobs/${encodeURIComponent(jobId)}/apply?${params}`,
  );
}

// ---- Admin Order & Ticket Management ----

export function getAdminOrders(params?: { concertId?: string; status?: OrderStatus }) {
  const query = new URLSearchParams();
  if (params?.concertId) query.set('concertId', params.concertId);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return apiGet<Order[]>(`/api/admin/orders${qs ? `?${qs}` : ''}`);
}

export function getAdminOrderDetail(orderId: string) {
  return apiGet<Order>(`/api/admin/orders/${encodeURIComponent(orderId)}`);
}

export function getAdminConcertTickets(concertId: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiGet<Ticket[]>(`/api/admin/concerts/${encodeURIComponent(concertId)}/tickets${qs}`);
}

export function updateAdminTicketStatus(ticketId: string, status: string) {
  return apiCommand<Ticket>('patch', `/api/admin/tickets/${encodeURIComponent(ticketId)}/status`, { status });
}
