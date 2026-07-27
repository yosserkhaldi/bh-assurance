import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'ADMIN' | 'MANAGER' | 'VIEWER'>) =>
  SetMetadata(ROLES_KEY, roles);
