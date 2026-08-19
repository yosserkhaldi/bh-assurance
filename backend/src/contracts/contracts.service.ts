import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractQueryDto, CreateContractDto, RenewContractDto, UpdateContractDto } from './contracts.dto';
import { pageMeta } from '../common/pagination.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async findAll(query: ContractQueryDto) {
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.establishmentId ? { establishmentId: query.establishmentId } : {}),
      ...(query.search
        ? { OR: [
            { number: { contains: query.search, mode: 'insensitive' as const } },
            { establishment: { businessName: { contains: query.search, mode: 'insensitive' as const } } },
          ] }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: { establishment: true, _count: { select: { vehicles: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { endDate: query.order },
      }),
      this.prisma.contract.count({ where }),
    ]);
    return { data, meta: pageMeta(total, query.page, query.limit) };
  }

  async findOne(id: string) {
    const item = await this.prisma.contract.findFirst({
      where: { id, deletedAt: null },
      include: { establishment: true, vehicles: { where: { deletedAt: null } }, previousContract: true, renewedContract: true },
    });
    if (!item) throw new NotFoundException('Contrat introuvable');
    return item;
  }

  async create(dto: CreateContractDto, userId: string) {
    this.assertDates(dto.startDate, dto.endDate);
    await this.assertSingleActiveContract(dto.establishmentId);
    const contract = await this.prisma.contract.create({
      data: {
        ...dto,
        number: dto.number.trim().toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById: userId,
      },
    });
    this.events.emit({
      type: 'CONTRACT_CREATED',
      entity: 'contract',
      id: contract.id,
      establishmentId: contract.establishmentId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return contract;
  }

  async update(id: string, dto: UpdateContractDto, userId: string) {
    const current = await this.findOne(id);
    this.assertDates(dto.startDate ?? current.startDate.toISOString(), dto.endDate ?? current.endDate.toISOString());
    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        updatedById: userId,
      },
    });
    this.events.emit({
      type: 'CONTRACT_UPDATED',
      entity: 'contract',
      id: contract.id,
      establishmentId: contract.establishmentId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return contract;
  }

  async renew(id: string, dto: RenewContractDto, userId: string) {
    const previous = await this.findOne(id);
    if (dto.establishmentId !== previous.establishmentId) {
      throw new BadRequestException('Le renouvellement doit conserver le meme etablissement');
    }
    this.assertDates(dto.startDate, dto.endDate);
    return this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: { status: 'RENEWED', deletedAt: new Date(), updatedById: userId },
      });
      const contract = await tx.contract.create({
        data: {
          ...dto,
          number: dto.number.trim().toUpperCase(),
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          previousContractId: id,
          createdById: userId,
        },
      });
      this.events.emit({
        type: 'CONTRACT_RENEWED',
        entity: 'contract',
        id: contract.id,
        establishmentId: contract.establishmentId,
        userId,
        timestamp: new Date().toISOString(),
      });
      return contract;
    });
  }

  async remove(id: string, userId: string) {
    const current = await this.findOne(id);
    const establishmentId = current.establishmentId;
    const result = await this.prisma.$transaction([
      this.prisma.vehicle.updateMany({ where: { contractId: id, deletedAt: null }, data: { deletedAt: new Date(), updatedById: userId } }),
      this.prisma.contract.update({ where: { id }, data: { deletedAt: new Date(), updatedById: userId } }),
    ]);
    this.events.emit({
      type: 'CONTRACT_DELETED',
      entity: 'contract',
      id,
      establishmentId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  private assertDates(start: string, end: string) {
    if (new Date(start) >= new Date(end)) throw new BadRequestException('La date de fin doit etre posterieure a la date de debut');
  }

  private async assertSingleActiveContract(establishmentId: string, excludeContractId?: string) {
    const where: { establishmentId: string; deletedAt: null; id?: { not: string } } = {
      establishmentId,
      deletedAt: null,
    };
    if (excludeContractId) where.id = { not: excludeContractId };
    const existing = await this.prisma.contract.findFirst({ where });
    if (existing) {
      throw new BadRequestException('Cet etablissement possede deja un contrat actif');
    }
  }
}
