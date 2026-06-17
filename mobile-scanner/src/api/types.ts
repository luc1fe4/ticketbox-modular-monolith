// API
export type ApiFieldError = {
  field?: string;
  message: string;
};

export type ApiResponse<T> = {
  success?: boolean;
  code?: number;
  message: string;
  data: T;
  errors?: ApiFieldError[] | null;
};

// Auth
export type StaffUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'AUDIENCE' | 'ORGANIZER' | 'STAFF' | 'ADMIN';
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: StaffUser;
};

// Check-in
export type TicketDatasetEntry = {
  ticketId: string;
  qrCode: string;
  qrSecret: string;
  ticketTypeId: string;
  userId: string;
};

export type CheckinDatasetResponse = {
  concertId: string;
  generatedAt: string;
  totalCount: number;
  tickets: TicketDatasetEntry[];
};

export type OfflineCheckinLogPayload = {
  qrCode: string;
  checkedAt: string;
  gate?: string | null;
  notes?: string | null;
};

// Sync
export type SyncCheckinRequestPayload = {
  concertId: string;
  deviceId: string;
  logs: OfflineCheckinLogPayload[];
};

export type SyncResultEntry = {
  qrCode: string;
  result: 'ACCEPTED' | 'SKIPPED' | 'INVALID' | string;
  reason: string;
};

export type SyncCheckinResponse = {
  total: number;
  accepted: number;
  skipped: number;
  invalid: number;
  results: SyncResultEntry[];
};

export type ScanTicketRequestPayload = {
  qrCode: string;
  concertId: string;
  deviceId: string;
  gate?: string | null;
};

export type ScanTicketResponse = {
  ticketId: string | null;
  concertId: string;
  status: string;
  message: string;
  checkAt: string;
};
