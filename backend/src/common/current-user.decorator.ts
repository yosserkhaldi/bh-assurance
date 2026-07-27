import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  sub: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): JwtUser =>
    context.switchToHttp().getRequest<{ user: JwtUser }>().user,
);
