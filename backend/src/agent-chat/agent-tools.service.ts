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

  async searchContracts(args?: { query?: string; establishmentName?: string; governorate?: string; status?: string; limit?: number }) {
    const where: any = { deletedAt: null };
    if (args?.status) where.status = args.status.toUpperCase();
    if (args?.governorate) {
      where.establishment = { governorate: args.governorate.toUpperCase() };
    }

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
        establishment: { select: { businessName: true, governorate: true } },
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
        governorate: c.establishment?.governorate || null,
      })),
    };
  }

  async searchVehicles(args?: { query?: string; makeOrModel?: string; registration?: string; contractNumber?: string; governorate?: string; limit?: number }) {
    const where: any = { deletedAt: null };
    if (args?.registration) where.registrationNumber = { contains: args.registration.replace(/\s+/g, ''), mode: 'insensitive' };
    if (args?.makeOrModel) {
      where.OR = [
        { make: { contains: args.makeOrModel, mode: 'insensitive' } },
        { model: { contains: args.makeOrModel, mode: 'insensitive' } },
      ];
    } else if (args?.query) {
      where.OR = [
        { make: { contains: args.query, mode: 'insensitive' } },
        { model: { contains: args.query, mode: 'insensitive' } },
        { registrationNumber: { contains: args.query.replace(/\s+/g, ''), mode: 'insensitive' } },
        { chassisNumber: { contains: args.query.replace(/\s+/g, ''), mode: 'insensitive' } },
      ];
    }
    if (args?.contractNumber || args?.governorate) {
      where.contract = {
        deletedAt: null,
        ...(args.contractNumber ? { number: { contains: args.contractNumber, mode: 'insensitive' } } : {}),
        ...(args.governorate ? { establishment: { governorate: args.governorate.toUpperCase() } } : {}),
      };
    }
    const vehicles = await this.prisma.vehicle.findMany({
      where,
      select: {
        registrationNumber: true, make: true, model: true, year: true, type: true,
        contract: { select: { number: true, establishment: { select: { businessName: true, governorate: true } } } },
      },
      orderBy: { registrationNumber: 'asc' },
      take: args?.limit ? Math.min(args.limit, 50) : 20,
    });
    return { count: vehicles.length, vehicles };
  }

  // ===================== LECTURE DÉTAILLÉE =====================

  async getContract(args: { number: string }) {
    const contract = await this.prisma.contract.findFirst({
      where: { number: { equals: args.number, mode: 'insensitive' }, deletedAt: null },
      select: {
        id: true,
        number: true,
        type: true,
        lot: true,
        status: true,
        startDate: true,
        endDate: true,
        establishment: { select: { businessName: true, rne: true } },
        vehicles: {
          where: { deletedAt: null },
          select: { registrationNumber: true, make: true, model: true, year: true, type: true },
          orderBy: { registrationNumber: 'asc' },
        },
        amendments: {
          where: { deletedAt: null },
          select: { id: true, type: true, description: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!contract) return { found: false as const };
    return {
      found: true as const,
      contract: {
        number: contract.number,
        type: contract.type,
        lot: contract.lot,
        status: contract.status,
        startDate: contract.startDate?.toISOString().split('T')[0],
        endDate: contract.endDate?.toISOString().split('T')[0],
        establishment: contract.establishment?.businessName || 'Inconnu',
        rne: contract.establishment?.rne,
        vehicles: contract.vehicles.map((v) => ({
          registration: v.registrationNumber,
          label: `${v.make} ${v.model} (${v.year})`,
          type: v.type,
        })),
        amendments: contract.amendments.map((a) => ({
          type: a.type,
          description: a.description,
          date: a.createdAt.toISOString().split('T')[0],
        })),
      },
    };
  }

  async getVehicle(args: { registration: string }) {
    const normalized = args.registration.replace(/\s+/g, '').toUpperCase();
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { registrationNumber: { equals: normalized } },
          { registrationNumber: { contains: normalized, mode: 'insensitive' } },
        ],
      },
      select: {
        registrationNumber: true,
        make: true,
        model: true,
        year: true,
        type: true,
        chassisNumber: true,
        usage: true,
        circulationDate: true,
        validityStart: true,
        validityEnd: true,
        contract: {
          select: {
            number: true,
            status: true,
            startDate: true,
            endDate: true,
            establishment: { select: { businessName: true } },
          },
        },
      },
    });
    if (!vehicle) return { found: false as const };
    return {
      found: true as const,
      vehicle: {
        registration: vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        type: vehicle.type,
        chassis: vehicle.chassisNumber,
        usage: vehicle.usage,
        circulationDate: vehicle.circulationDate?.toISOString().split('T')[0] || null,
        validityStart: vehicle.validityStart?.toISOString().split('T')[0] || null,
        validityEnd: vehicle.validityEnd?.toISOString().split('T')[0] || null,
        contract: vehicle.contract
          ? {
              number: vehicle.contract.number,
              status: vehicle.contract.status,
              startDate: vehicle.contract.startDate?.toISOString().split('T')[0],
              endDate: vehicle.contract.endDate?.toISOString().split('T')[0],
              establishment: vehicle.contract.establishment?.businessName || 'Inconnu',
            }
          : null,
      },
    };
  }

  // ===================== ÉCRITURE (avec confirmation préalable) =====================

  async addVehicle(args: {
    contractNumber: string;
    registrationNumber: string;
    make: string;
    model: string;
    year: number;
    chassisNumber?: string;
    type?: string;
    userId: string;
  }) {
    const contract = await this.prisma.contract.findFirst({
      where: { number: { equals: args.contractNumber, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, number: true, establishment: { select: { businessName: true } } },
    });
    if (!contract) return { error: `Aucun contrat actif trouve avec le numero ${args.contractNumber}.` };

    const registration = args.registrationNumber.replace(/\s+/g, '').toUpperCase();
    const existing = await this.prisma.vehicle.findFirst({ where: { registrationNumber: registration, deletedAt: null } });
    if (existing) return { error: `Le vehicule ${registration} existe deja (contrat en cours).` };

    const typeMap: Record<string, string> = { voiture: 'CAR', utilitaire: 'VAN', camion: 'TRUCK', bus: 'BUS', moto: 'MOTORCYCLE', special: 'SPECIAL', autre: 'OTHER' };
    const rawType = args.type?.toLowerCase() ?? '';
    const vehicleType = (typeMap[rawType] ?? (['CAR', 'VAN', 'TRUCK', 'BUS', 'MOTORCYCLE', 'SPECIAL', 'OTHER'].includes(rawType.toUpperCase()) ? rawType.toUpperCase() : 'OTHER')) as 'CAR' | 'VAN' | 'TRUCK' | 'BUS' | 'MOTORCYCLE' | 'SPECIAL' | 'OTHER';

    const year = Number(args.year);
    if (!Number.isInteger(year) || year < 1950 || year > 2100) return { error: `Annee invalide : ${args.year}.` };

    const vehicle = await this.prisma.vehicle.create({
      data: {
        registrationNumber: registration,
        make: args.make,
        model: args.model,
        year,
        chassisNumber: args.chassisNumber ? args.chassisNumber.replace(/\s+/g, '').toUpperCase() : `UNKNOWN-${registration}`,
        type: vehicleType,
        contractId: contract.id,
        createdById: args.userId,
      },
      select: { registrationNumber: true, make: true, model: true, year: true },
    });

    await this.prisma.contract.update({ where: { id: contract.id }, data: { updatedById: args.userId } });

    return {
      vehicle,
      contract: { number: contract.number, establishment: contract.establishment?.businessName || 'Inconnu' },
    };
  }
}
