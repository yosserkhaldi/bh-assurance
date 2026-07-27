import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { JwtUser } from './current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      ip?: string;
      user?: JwtUser;
    }>();
    const action = this.actionFor(request.method);
    if (!action || !request.user || request.path.includes('/audit-logs')) return next.handle();

    return next.handle().pipe(
      tap((result: any) => {
        const entity = request.path.split('/').filter(Boolean)[1] ?? 'unknown';
        const entityId = result?.id ?? result?.[result.length - 1]?.id;
        void this.prisma.auditLog.create({
          data: {
            userId: request.user!.sub,
            action,
            entity,
            entityId: entityId ? String(entityId) : undefined,
            ipAddress: request.ip,
          },
        });
      }),
    );
  }

  private actionFor(method: string): AuditAction | null {
    if (method === 'POST') return 'CREATE';
    if (method === 'PATCH' || method === 'PUT') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    return null;
  }
}
