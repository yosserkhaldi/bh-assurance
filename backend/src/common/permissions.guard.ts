import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtUser } from './current-user.decorator';
import { Permission } from './permissions';
import { ROLE_PERMISSIONS } from './permissions.config';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<{ user: JwtUser }>().user;
    const userPermissions = ROLE_PERMISSIONS[user.role] ?? [];
    return required.some((permission) => userPermissions.includes(permission));
  }
}
