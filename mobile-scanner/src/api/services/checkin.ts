import { requestJson } from '../client';
import type {
  CheckinDatasetResponse,
  ScanTicketRequestPayload,
  ScanTicketResponse,
  SyncCheckinRequestPayload,
  SyncCheckinResponse,
} from '../types';

export function getCheckinDataset(concertId: string, token?: string) {
  return requestJson<CheckinDatasetResponse>(`/staff/concerts/${concertId}/checkin-dataset`, {
    token,
  });
}

export function syncCheckinLogs(payload: SyncCheckinRequestPayload, token?: string) {
  return requestJson<SyncCheckinResponse>('/staff/checkins/sync', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function scanTicketOnline(payload: ScanTicketRequestPayload, token?: string) {
  return requestJson<ScanTicketResponse>('/staff/checkins/scan', {
    method: 'POST',
    token,
    body: payload,
  });
}
