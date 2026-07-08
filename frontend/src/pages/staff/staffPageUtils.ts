import type { StaffConcert } from '../../api/admin';

export const staffDateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function staffConcertLabel(concert: StaffConcert) {
  return `${concert.title} - ${staffDateTime.format(new Date(concert.eventDate))}`;
}

export function selectInitialConcert(concerts: StaffConcert[], preferredId: string | null) {
  if (preferredId && concerts.some((concert) => concert.id === preferredId)) {
    return preferredId;
  }
  return concerts[0]?.id ?? '';
}

export function getOrCreateStaffDeviceId() {
  const key = 'ticketbox.staffWebDeviceId';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = `staff-web-${crypto.randomUUID()}`;
  localStorage.setItem(key, next);
  return next;
}
