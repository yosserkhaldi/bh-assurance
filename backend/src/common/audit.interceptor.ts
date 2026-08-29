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
      params?: Record<string, string>;
      body?: Record<string, unknown>;
    }>();
    const action = this.actionFor(request.method);
    if (!action || !request.user || request.path.includes('/audit-logs')) return next.handle();

    return next.handle().pipe(
      tap((result: any) => {
        const rawEntity = request.path.split('/').filter(Boolean)[1] ?? 'unknown';
        const entity = this.formatEntity(rawEntity);
        const resultId = result?.id ?? result?.[result.length - 1]?.id;
        const paramId = request.params?.id;
        const entityId = resultId ?? paramId;
        const description = this.buildDescription(action, entity, entityId, request.body);

        void this.prisma.auditLog.create({
          data: {
            userId: request.user!.sub,
            action,
            entity,
            entityId: entityId ? String(entityId) : undefined,
            description,
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

  private formatEntity(raw: string): string {
    const map: Record<string, string> = {
      establishments: 'Etablissement',
      contracts: 'Contrat',
      vehicles: 'Vehicule',
      users: 'Utilisateur',
      amendments: 'Avenant',
      documents: 'Document',
      events: 'Evenement',
      imports: 'Import',
      reports: 'Rapport',
      notifications: 'Notification',
      search: 'Recherche',
      dashboard: 'TableauDeBord',
    };
    return map[raw.toLowerCase()] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private buildDescription(
    action: AuditAction,
    entity: string,
    entityId?: string,
    body?: Record<string, unknown>,
  ): string {
    if (action === 'DELETE') return `Suppression ${entity}${entityId ? ` ${entityId}` : ''}`;
    if (action === 'UPDATE') return `Modification ${entity}${entityId ? ` ${entityId}` : ''}`;
    if (action === 'CREATE' && body && typeof body === 'object') {
      const name =
        ('businessName' in body && body.businessName) ||
        ('number' in body && body.number) ||
        ('email' in body && body.email) ||
        undefined;
      if (name) return `Creation ${entity}: ${name}`;
    }
    return `Creation ${entity}`;
  }
}
