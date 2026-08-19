import { Permission } from './permissions';

export const ROLE_PERMISSIONS: Record<'ADMIN' | 'MANAGER' | 'VIEWER', Permission[]> = {
  ADMIN: Object.values(Permission),
  MANAGER: Object.values(Permission).filter(
    (p) =>
      !p.startsWith('USERS_') &&
      p !== Permission.AUDIT_READ &&
      p !== Permission.REPORTS_EXPORT,
  ),
  VIEWER: Object.values(Permission).filter((p) => p.endsWith('_READ') || p === Permission.NOTIFICATIONS_READ),
};
