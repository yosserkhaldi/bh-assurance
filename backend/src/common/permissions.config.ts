import { Permission } from './permissions';

export const ROLE_PERMISSIONS: Record<'ADMIN' | 'MANAGER' | 'VIEWER', Permission[]> = {
  ADMIN: Object.values(Permission),
  MANAGER: Object.values(Permission).filter(
    (p) =>
      !p.startsWith('USERS_') &&
      p !== Permission.AUDIT_READ &&
      p !== Permission.REPORTS_EXPORT,
  ),
  VIEWER: [
    Permission.AGENT_ACCESS,
    Permission.ESTABLISHMENTS_READ,
    Permission.CONTRACTS_READ,
    Permission.VEHICLES_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.DOCUMENTS_READ,
  ],
};
