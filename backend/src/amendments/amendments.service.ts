import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractAmendmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAmendmentDto, UpdateAmendmentStatusDto } from './amendments.dto';

@Injectable()
export class AmendmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(contractId: string) {
    return this.prisma.contractAmendment.findMany({
      where: { contractId, deletedAt: null, status: { not: ContractAmendmentStatus.CANCELLED } },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, documents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.contractAmendment.findFirst({
      where: { id, deletedAt: null },
      include: { contract: true, createdBy: { select: { id: true, firstName: true, lastName: true } }, documents: true },
    });
    if (!item) throw new NotFoundException('Avenant introuvable');
    return item;
  }

  async create(dto: CreateAmendmentDto, userId: string) {
    await this.assertContractExists(dto.contractId);
    return this.prisma.contractAmendment.create({
      data: {
        contractId: dto.contractId,
        type: dto.type,
        description: dto.description,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        vehicleIds: dto.vehicleIds ? (dto.vehicleIds as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
        createdById: userId,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateAmendmentStatusDto, userId: string) {
    await this.findOne(id);
    if (dto.status !== ContractAmendmentStatus.ACTIVE && dto.status !== ContractAmendmentStatus.CANCELLED) {
      throw new BadRequestException('Statut non autorise');
    }
    return this.prisma.contractAmendment.update({
      where: { id },
      data: { status: dto.status, updatedById: userId },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.contractAmendment.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: userId },
    });
  }

  private async assertContractExists(contractId: string) {
    const contract = await this.prisma.contract.findFirst({ where: { id: contractId, deletedAt: null } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
  }
}
