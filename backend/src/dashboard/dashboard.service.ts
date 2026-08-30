import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GOVERNORATE_LABELS: Record<string, string> = {
  ARIANA: 'Ariana',
  BEJA: 'Beja',
  BEN_AROUS: 'Ben Arous',
  BIZERTE: 'Bizerte',
  GABES: 'Gabes',
  GAFSA: 'Gafsa',
  JENDOUBA: 'Jendouba',
  KAIROUAN: 'Kairouan',
  KASSERINE: 'Kasserine',
  KEBILI: 'Kebili',
  KEF: 'Le Kef',
  MAHDIA: 'Mahdia',
  MANOUBA: 'Manouba',
  MEDENINE: 'Medenine',
  MONASTIR: 'Monastir',
  NABEUL: 'Nabeul',
  SFAX: 'Sfax',
  SIDI_BOUZID: 'Sidi Bouzid',
  SILIANA: 'Siliana',
  SOUSSE: 'Sousse',
  TATAOUINE: 'Tataouine',
  TOZEUR: 'Tozeur',
  TUNIS: 'Tunis',
  ZAGHOUAN: 'Zaghouan',
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  CAR: 'Voiture',
  VAN: 'Fourgon',
  TRUCK: 'Camion',
  BUS: 'Bus',
  MOTORCYCLE: 'Moto',
  SPECIAL: 'Special',
  OTHER: 'Autre',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  EXPIRING_SOON: 'Expire bientot',
  EXPIRED: 'Expire',
  CANCELLED: 'Annule',
  RENEWED: 'Renouvele',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  FLEET: 'Flotte',
  INDIVIDUAL: 'Individuel',
  TEMPORARY: 'Temporaire',
  OTHER: 'Autre',
};

function statusLabel(status: string): string {
  return CONTRACT_STATUS_LABELS[status] ?? status;
}

function typeLabel(type: string): string {
  return CONTRACT_TYPE_LABELS[type] ?? type;
}

function humanizeGovernorate(value: string): string {
  return GOVERNORATE_LABELS[value] ?? value;
}

function humanizeVehicleType(value: string): string {
  return VEHICLE_TYPE_LABELS[value] ?? value;
}

function topNWithOthers<T extends { name: string; value: number }>(items: T[], top = 5, othersLabel = 'Autres'): T[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= top) return sorted;
  const topItems = sorted.slice(0, top);
  const othersValue = sorted.slice(top).reduce((sum, item) => sum + item.value, 0);
  if (othersValue > 0) {
    topItems.push({ name: othersLabel, value: othersValue } as T);
  }
  return topItems;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics() {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      establishments,
      contracts,
      vehicles,
      expiringSoon,
      expired,
      byStatus,
      byGovernorate,
      contractsByTypeRaw,
      vehiclesByTypeRaw,
      recentActivity,
    ] = await this.prisma.$transaction([
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
      this.prisma.contract.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true }, orderBy: { status: 'asc' } }),
      this.prisma.establishment.groupBy({ by: ['governorate'], where: { deletedAt: null }, _count: { _all: true }, orderBy: { governorate: 'asc' } }),
      this.prisma.contract.groupBy({ by: ['type'], where: { deletedAt: null }, _count: { _all: true }, orderBy: { type: 'asc' } }),
      this.prisma.vehicle.groupBy({ by: ['type'], where: { deletedAt: null }, _count: { _all: true }, orderBy: { type: 'asc' } }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const countValue = (count: any): number => {
      if (typeof count === 'number') return count;
      if (count && typeof count === 'object' && '_all' in count) return count._all as number;
      return 0;
    };

    const contractsByTypeChart = contractsByTypeRaw.map((c) => ({
      name: typeLabel(c.type),
      value: countValue(c._count),
    }));

    const byGovernorateChart = topNWithOthers(
      byGovernorate.map((g) => ({ name: humanizeGovernorate(g.governorate), value: countValue(g._count) })),
      5,
    );

    const vehiclesByTypeChart = topNWithOthers(
      vehiclesByTypeRaw.map((v) => ({ name: humanizeVehicleType(v.type), value: countValue(v._count) })),
      5,
    );

    const recentActivityFormatted = recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      description: log.description ?? undefined,
      createdAt: log.createdAt,
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}`.trim() : 'Système',
    }));

    const byStatusChart = byStatus.map((s) => ({ name: statusLabel(s.status), value: countValue(s._count) }));

    return {
      totals: { establishments, contracts, vehicles, expired },
      expiringSoon,
      byStatus: byStatusChart,
      byGovernorate: byGovernorateChart,
      contractsByType: contractsByTypeChart,
      vehiclesByType: vehiclesByTypeChart,
      recentActivity: recentActivityFormatted,
    };
  }
}
