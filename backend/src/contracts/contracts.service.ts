import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractQueryDto, CreateContractDto, RenewContractDto, UpdateContractDto } from './contracts.dto';
import { pageMeta } from '../common/pagination.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(dto: CreateContractDto, userId: string) {
    this.assertDates(dto.startDate, dto.endDate);
    return this.prisma.contract.create({
      data: {
        ...dto,
        number: dto.number.trim().toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateContractDto, userId: string) {
    const current = await this.findOne(id);
    this.assertDates(dto.startDate ?? current.startDate.toISOString(), dto.endDate ?? current.endDate.toISOString());
    return this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        updatedById: userId,
      },
    });
  }

  async renew(id: string, dto: RenewContractDto, userId: string) {
    const previous = await this.findOne(id);
    if (dto.establishmentId !== previous.establishmentId) {
      throw new BadRequestException('Le renouvellement doit conserver le meme etablissement');
    }
    this.assertDates(dto.startDate, dto.endDate);
    return this.prisma.$transaction(async (tx) => {
      await tx.contract.update({ where: { id }, data: { status: 'RENEWED', updatedById: userId } });
      return tx.contract.create({
        data: {
          ...dto,
          number: dto.number.trim().toUpperCase(),
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          previousContractId: id,
          createdById: userId,
        },
      });
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.$transaction([
      this.prisma.vehicle.updateMany({ where: { contractId: id, deletedAt: null }, data: { deletedAt: new Date(), updatedById: userId } }),
      this.prisma.contract.update({ where: { id }, data: { deletedAt: new Date(), updatedById: userId } }),
    ]);
  }

  private assertDates(start: string, end: string) {
    if (new Date(start) >= new Date(end)) throw new BadRequestException('La date de fin doit etre posterieure a la date de debut');
  }
}
