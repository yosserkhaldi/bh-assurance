import { Permission } from './permissions';
import { ROLE_PERMISSIONS } from './permissions.config';

describe('ROLE_PERMISSIONS', () => {
  it('allows every authenticated role to access the assistant', () => {
    expect(ROLE_PERMISSIONS.ADMIN).toContain(Permission.AGENT_ACCESS);
    expect(ROLE_PERMISSIONS.MANAGER).toContain(Permission.AGENT_ACCESS);
    expect(ROLE_PERMISSIONS.VIEWER).toContain(Permission.AGENT_ACCESS);
  });

  it('keeps user management exclusive to administrators', () => {
    const userPermissions = [
      Permission.USERS_READ,
      Permission.USERS_CREATE,
      Permission.USERS_UPDATE,
      Permission.USERS_DELETE,
    ];

    userPermissions.forEach((permission) => {
      expect(ROLE_PERMISSIONS.ADMIN).toContain(permission);
      expect(ROLE_PERMISSIONS.MANAGER).not.toContain(permission);
      expect(ROLE_PERMISSIONS.VIEWER).not.toContain(permission);
    });
  });

  it('keeps viewers read-only for business entities', () => {
    expect(ROLE_PERMISSIONS.VIEWER).toContain(Permission.ESTABLISHMENTS_READ);
    expect(ROLE_PERMISSIONS.VIEWER).toContain(Permission.CONTRACTS_READ);
    expect(ROLE_PERMISSIONS.VIEWER).toContain(Permission.VEHICLES_READ);
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain(Permission.ESTABLISHMENTS_CREATE);
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain(Permission.CONTRACTS_UPDATE);
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain(Permission.VEHICLES_DELETE);
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain(Permission.AUDIT_READ);
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain(Permission.REPORTS_EXPORT);
  });
});
