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

export type BatchLogStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
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

export function importGuestList(concertId: string, file: File) {
  const data = new FormData();
  data.append('file', file);
  return apiMultipartCommand<GuestListImportResponse>(
    'post',
    `/api/admin/concerts/${encodeURIComponent(concertId)}/guest-lists/import`,
    data,
  );
}

export function getBatchLogs(filters: BatchLogFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(filters.page ?? 0),
    size: String(filters.size ?? 20),
  });
  if (filters.concertId) params.set('concertId', filters.concertId);
  if (filters.status) params.set('status', filters.status);
  if (filters.source) params.set('source', filters.source);
  return apiGet<Page<BatchLog>>(`/api/admin/batch-logs?${params}`, signal);
}

export function getBatchLog(batchLogId: string, signal?: AbortSignal) {
  return apiGet<BatchLog>(
    `/api/admin/batch-logs/${encodeURIComponent(batchLogId)}`,
    signal,
  );
}

export function submitArtistBioJob(concertId: string, file: File) {
  const data = new FormData();
  data.append('file', file);
  return apiMultipartCommand<ArtistBioJobSubmission>(
    'post',
    `/api/admin/concerts/${encodeURIComponent(concertId)}/artist-bio-jobs`,
    data,
  );
}

export function getArtistBioJobs(filters: ArtistBioJobFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(filters.page ?? 0),
    size: String(filters.size ?? 20),
  });
  if (filters.concertId) params.set('concertId', filters.concertId);
  if (filters.status) params.set('status', filters.status);
  return apiGet<Page<ArtistBioJob>>(`/api/admin/artist-bio-jobs?${params}`, signal);
}

export function getArtistBioJob(jobId: string, signal?: AbortSignal) {
  return apiGet<ArtistBioJob>(
    `/api/admin/artist-bio-jobs/${encodeURIComponent(jobId)}`,
    signal,
  );
}

export function retryArtistBioJob(jobId: string) {
  return apiCommand<ArtistBioJobSubmission>(
    'post',
    `/api/admin/artist-bio-jobs/${encodeURIComponent(jobId)}/retry`,
  );
}

export function applyArtistBioJob(jobId: string, overwrite = false) {
  const params = new URLSearchParams({ overwrite: String(overwrite) });
  return apiCommand<ArtistBioJob>(
    'post',
    `/api/admin/artist-bio-jobs/${encodeURIComponent(jobId)}/apply?${params}`,
  );
}
