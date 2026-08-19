import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdvancedService {
  constructor(private readonly prisma: PrismaService) {}

  async search(term: string) {
    const q = term?.trim();
    if (!q) return { establishments: [], contracts: [], vehicles: [] };

    if (q.length >= 3) {
      const [establishmentIds, contractIds, vehicleIds] = await this.prisma.$transaction([
        this.prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "establishments"
          WHERE "deleted_at" IS NULL
            AND similarity("business_name", ${q}) > 0.1
          ORDER BY similarity("business_name", ${q}) DESC
          LIMIT 8
        `,
        this.prisma.$queryRaw<{ id: string }[]>`
          SELECT c.id FROM "contracts" c
          WHERE c."deleted_at" IS NULL
            AND similarity(c."number", ${q}) > 0.1
          ORDER BY similarity(c."number", ${q}) DESC
          LIMIT 8
        `,
        this.prisma.$queryRaw<{ id: string }[]>`
          SELECT v.id FROM "vehicles" v
          WHERE v."deleted_at" IS NULL
            AND (
              similarity(v."registration_number", ${q}) > 0.1
              OR similarity(v."chassis_number", ${q}) > 0.1
            )
          ORDER BY GREATEST(similarity(v."registration_number", ${q}), similarity(v."chassis_number", ${q})) DESC
          LIMIT 8
        `,
      ]);

      const [establishments, contracts, vehicles] = await this.prisma.$transaction([
        this.prisma.establishment.findMany({
          where: { id: { in: establishmentIds.map((e) => e.id) } },
        }),
        this.prisma.contract.findMany({
          where: { id: { in: contractIds.map((c) => c.id) } },
          include: { establishment: true },
        }),
        this.prisma.vehicle.findMany({
          where: { id: { in: vehicleIds.map((v) => v.id) } },
          include: { contract: true },
        }),
      ]);

      return { establishments, contracts, vehicles };
    }

    const contains = { contains: q, mode: 'insensitive' as const };
    const [establishments, contracts, vehicles] = await this.prisma.$transaction([
      this.prisma.establishment.findMany({ where: { deletedAt: null, OR: [{ businessName: contains }, { rne: contains }] }, take: 8 }),
      this.prisma.contract.findMany({ where: { deletedAt: null, number: contains }, include: { establishment: true }, take: 8 }),
      this.prisma.vehicle.findMany({ where: { deletedAt: null, OR: [{ registrationNumber: contains }, { chassisNumber: contains }] }, include: { contract: true }, take: 8 }),
    ]);
    return { establishments, contracts, vehicles };
  }

  notifications(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
  }

  async generateContractNotifications(userId: string) {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 86400000);
    const contracts = await this.prisma.contract.findMany({
      where: { deletedAt: null, endDate: { gte: now, lte: soon }, status: { notIn: ['CANCELLED', 'RENEWED'] } },
      include: { establishment: true },
    });
    await this.prisma.notification.createMany({
      data: contracts.map((contract) => ({
        userId,
        title: `Contrat ${contract.number} proche de l'echeance`,
        message: `${contract.establishment.businessName} - echeance le ${contract.endDate.toLocaleDateString('fr-TN')}`,
        type: 'CONTRACT_EXPIRING',
      })),
    });
    return { generated: contracts.length };
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  }

  logs(page = 1) {
    return this.prisma.auditLog.findMany({
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
    });
  }

  log(userId: string, action: any, entity: string, entityId?: string) {
    return this.prisma.auditLog.create({ data: { userId, action, entity, entityId } });
  }

  async contractsPdf(): Promise<Buffer> {
    const contracts = await this.prisma.contract.findMany({
      where: { deletedAt: null },
      include: { establishment: true, _count: { select: { vehicles: true } } },
      orderBy: { endDate: 'asc' },
    });
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.fontSize(18).text('BH Assurance - Portefeuille des contrats');
      doc.moveDown().fontSize(9).fillColor('#334155');
      contracts.forEach((c) => {
        doc.text(`${c.number} | ${c.establishment.businessName} | ${c.status} | ${c.endDate.toLocaleDateString('fr-TN')} | ${c._count.vehicles} vehicule(s)`);
        doc.moveDown(0.5);
      });
      doc.end();
    });
  }
}
