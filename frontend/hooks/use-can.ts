'use client';

import { useMemo } from 'react';
import { useAuth } from './use-auth';
import { getRolePermissions, Permission } from '@/lib/permissions';

export function useCan() {
  const { user } = useAuth();
  const permissions = useMemo(() => getRolePermissions(user?.role), [user?.role]);

  const can = (permission: Permission) => permissions.includes(permission);
  const canAny = (...required: Permission[]) => required.some((p) => permissions.includes(p));

  return { can, canAny, permissions };
}
