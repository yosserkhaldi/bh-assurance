import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.query?.token;
    if (token && !request.headers.authorization) {
      request.headers.authorization = `Bearer ${token}`;
    }
    return request;
  }
}
