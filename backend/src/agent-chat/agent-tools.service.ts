import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(args?: { role?: string; status?: string; query?: string; limit?: number }) {
    const where: any = { deletedAt: null };
    if (args?.role) where.role = args.role.toUpperCase();
    if (args?.status) where.status = args.status.toUpperCase();
    if (args?.query) {
      where.OR = [
        { firstName: { contains: args.query, mode: 'insensitive' } },
        { lastName: { contains: args.query, mode: 'insensitive' } },
        { email: { contains: args.query, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      take: args?.limit ? Math.min(args.limit, 50) : 20,
    });

    return {
      count: users.length,
      users: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim() || 'Non renseigne',
        email: u.email,
        role: u.role,
        status: u.status,
      })),
    };
  }

  async searchEstablishments(args?: { query?: string; limit?: number }) {
    const where: any = { deletedAt: null };
    if (args?.query) {
      where.OR = [
        { businessName: { contains: args.query, mode: 'insensitive' } },
        { managerName: { contains: args.query, mode: 'insensitive' } },
        { email: { contains: args.query, mode: 'insensitive' } },
        { matriculeFiscal: { contains: args.query, mode: 'insensitive' } },
        { rne: { contains: args.query, mode: 'insensitive' } },
      ];
    }

    const establishments = await this.prisma.establishment.findMany({
      where,
      select: { id: true, businessName: true, email: true, phone: true, matriculeFiscal: true, rne: true },
      orderBy: { businessName: 'asc' },
      take: args?.limit ? Math.min(args.limit, 50) : 20,
    });

    return {
      count: establishments.length,
      establishments: establishments.map((e) => ({
        id: e.id,
        name: e.businessName,
        email: e.email,
        phone: e.phone,
        matriculeFiscal: e.matriculeFiscal,
        rne: e.rne,
      })),
    };
  }

  async searchContracts(args?: { query?: string; establishmentName?: string; status?: string; limit?: number }) {
    const where: any = { deletedAt: null };
    if (args?.status) where.status = args.status.toUpperCase();

    let establishmentIds: string[] | undefined;
    if (args?.establishmentName) {
      const establishments = await this.prisma.establishment.findMany({
        where: {
          deletedAt: null,
          businessName: { contains: args.establishmentName, mode: 'insensitive' },
        },
        select: { id: true },
      });
      establishmentIds = establishments.map((e) => e.id);
      if (establishmentIds.length === 0) {
        return { count: 0, contracts: [] };
      }
      where.establishmentId = { in: establishmentIds };
    }

    if (args?.query) {
      const vehicles = await this.prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          OR: [
            { registrationNumber: { contains: args.query, mode: 'insensitive' } },
            { chassisNumber: { contains: args.query, mode: 'insensitive' } },
            { make: { contains: args.query, mode: 'insensitive' } },
            { model: { contains: args.query, mode: 'insensitive' } },
          ],
        },
        select: { contractId: true },
      });
      const contractIdsFromVehicles = vehicles.map((v) => v.contractId).filter(Boolean);
      where.OR = [
        { number: { contains: args.query, mode: 'insensitive' } },
        { id: { in: contractIdsFromVehicles } },
      ];
    }

    const contracts = await this.prisma.contract.findMany({
      where,
      select: {
        id: true,
        number: true,
        status: true,
        startDate: true,
        endDate: true,
        establishment: { select: { businessName: true } },
      },
      orderBy: { endDate: 'asc' },
      take: args?.limit ? Math.min(args.limit, 50) : 20,
    });

    return {
      count: contracts.length,
      contracts: contracts.map((c) => ({
        id: c.id,
        number: c.number,
        status: c.status,
        startDate: c.startDate?.toISOString().split('T')[0],
        endDate: c.endDate?.toISOString().split('T')[0],
        establishment: c.establishment?.businessName || 'Inconnu',
      })),
    };
  }
}
