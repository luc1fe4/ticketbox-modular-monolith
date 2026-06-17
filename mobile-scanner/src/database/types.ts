import type { CheckinDatasetResponse } from '../api/types';

export type LocalCheckinStatus = 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export type TicketSnapshot = {
  concertId: string;
  ticketId: string;
  qrCode: string;
  qrSecret: string;
  ticketTypeId: string;
  userId: string;
  downloadedAt: string;
};

export type LocalCheckinLog = {
  localId: string;
  concertId: string;
  qrCode: string;
  checkedAt: string;
  gate: string | null;
  notes: string | null;
  status: LocalCheckinStatus;
  syncResult: string | null;
  syncReason: string | null;
};

export type InsertLocalCheckinLogInput = {
  concertId: string;
  qrCode: string;
  checkedAt: string;
  gate?: string | null;
  notes?: string | null;
  status?: LocalCheckinStatus;
};

export type UpdateSyncResultInput = {
  localId: string;
  status: LocalCheckinStatus;
  syncResult: string;
  syncReason?: string | null;
};

export type LogStatusCounts = Record<LocalCheckinStatus, number>;

export type SaveDatasetInput = CheckinDatasetResponse;