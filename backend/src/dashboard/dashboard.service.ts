import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics() {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [establishments, contracts, vehicles, expiringSoon, expired, byStatus, byGovernorate] =
      await this.prisma.$transaction([
        this.prisma.establishment.count({ where: { deletedAt: null } }),
        this.prisma.contract.count({ where: { deletedAt: null } }),
        this.prisma.vehicle.count({ where: { deletedAt: null } }),
        this.prisma.contract.findMany({
          where: { deletedAt: null, endDate: { gte: now, lte: soon }, status: { notIn: ['CANCELLED', 'RENEWED'] } },
          include: { establishment: true },
          orderBy: { endDate: 'asc' },
          take: 10,
        }),
        this.prisma.contract.count({ where: { deletedAt: null, endDate: { lt: now } } }),
        this.prisma.contract.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true, orderBy: { status: 'asc' } }),
        this.prisma.establishment.groupBy({ by: ['governorate'], where: { deletedAt: null }, _count: true, orderBy: { governorate: 'asc' } }),
      ]);
    return { totals: { establishments, contracts, vehicles, expired }, expiringSoon, byStatus, byGovernorate };
  }
}
