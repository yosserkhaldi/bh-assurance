import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto, pageMeta } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEstablishmentDto, UpdateEstablishmentDto } from './establishments.dto';

@Injectable()
export class EstablishmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { businessName: { contains: query.search, mode: 'insensitive' as const } },
              { rne: { contains: query.search, mode: 'insensitive' as const } },
              { managerName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.establishment.findMany({
        where,
        include: { _count: { select: { contracts: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: query.order },
      }),
      this.prisma.establishment.count({ where }),
    ]);
    return { data, meta: pageMeta(total, query.page, query.limit) };
  }

  async findOne(id: string) {
    const item = await this.prisma.establishment.findFirst({
      where: { id, deletedAt: null },
      include: { contracts: { where: { deletedAt: null }, include: { _count: { select: { vehicles: true } } } } },
    });
    if (!item) throw new NotFoundException('Etablissement introuvable');
    return item;
  }

  create(dto: CreateEstablishmentDto, userId: string) {
    return this.prisma.establishment.create({
      data: { ...dto, rne: dto.rne.trim().toUpperCase(), email: dto.email.toLowerCase(), createdById: userId },
    });
  }

  async update(id: string, dto: UpdateEstablishmentDto, userId: string) {
    await this.findOne(id);
    return this.prisma.establishment.update({
      where: { id },
      data: { ...dto, email: dto.email?.toLowerCase(), updatedById: userId },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.$transaction([
      this.prisma.vehicle.updateMany({
        where: { contract: { establishmentId: id }, deletedAt: null },
        data: { deletedAt: new Date(), updatedById: userId },
      }),
      this.prisma.contract.updateMany({
        where: { establishmentId: id, deletedAt: null },
        data: { deletedAt: new Date(), updatedById: userId },
      }),
      this.prisma.establishment.update({
        where: { id },
        data: { deletedAt: new Date(), updatedById: userId },
      }),
    ]);
  }
}
