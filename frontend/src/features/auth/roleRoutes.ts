import type { UserRole } from './AuthContext';

export const roleHome: Record<UserRole, string> = {
  AUDIENCE: '/',
  ORGANIZER: '/organizer',
  STAFF: '/staff',
  ADMIN: '/admin',
};

export const roleHomeLabel: Record<UserRole, string> = {
  AUDIENCE: 'Back to events',
  ORGANIZER: 'Organizer studio',
  STAFF: 'Gate operations',
  ADMIN: 'Administration',
};

export function getRoleHome(role?: UserRole | null) {
  return role ? roleHome[role] : '/';
}

export function getRoleHomeLabel(role?: UserRole | null) {
  return role ? roleHomeLabel[role] : 'TicketBox home';
}
