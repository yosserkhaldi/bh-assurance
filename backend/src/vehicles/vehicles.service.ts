import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VehicleType } from '@prisma/client';
import ExcelJS from 'exceljs';
import { EventsService } from '../events/events.service';
import { pageMeta } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto, VehicleQueryDto } from './vehicles.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async findAll(query: VehicleQueryDto) {
    const where = {
      deletedAt: null,
      ...(query.contractId ? { contractId: query.contractId } : {}),
      ...(query.search ? { OR: [
        { registrationNumber: { contains: query.search, mode: 'insensitive' as const } },
        { chassisNumber: { contains: query.search, mode: 'insensitive' as const } },
        { make: { contains: query.search, mode: 'insensitive' as const } },
        { model: { contains: query.search, mode: 'insensitive' as const } },
      ] } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: { contract: { include: { establishment: true } } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: query.order },
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { data, meta: pageMeta(total, query.page, query.limit) };
  }

  async findOne(id: string) {
    const item = await this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, include: { contract: true } });
    if (!item) throw new NotFoundException('Vehicule introuvable');
    return item;
  }

  async findForDocument(contractId: string) {
    return this.prisma.vehicle.findMany({
      where: { contractId, deletedAt: null },
      select: { id: true, registrationNumber: true, make: true, model: true },
      orderBy: { registrationNumber: 'asc' },
    });
  }

  async create(dto: CreateVehicleDto, userId: string) {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...dto,
        registrationNumber: dto.registrationNumber.replace(/\s+/g, '').toUpperCase(),
        chassisNumber: dto.chassisNumber.replace(/\s+/g, '').toUpperCase(),
        emptyWeight: dto.emptyWeight ? new Prisma.Decimal(dto.emptyWeight) : null,
        totalWeight: dto.totalWeight ? new Prisma.Decimal(dto.totalWeight) : null,
        createdById: userId,
      },
    });
    this.events.emit({
      type: 'VEHICLE_CREATED',
      entity: 'vehicle',
      id: vehicle.id,
      contractId: vehicle.contractId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto, userId: string) {
    await this.findOne(id);
    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dto,
        emptyWeight: dto.emptyWeight ? new Prisma.Decimal(dto.emptyWeight) : undefined,
        totalWeight: dto.totalWeight ? new Prisma.Decimal(dto.totalWeight) : undefined,
        updatedById: userId,
      },
    });
    this.events.emit({
      type: 'VEHICLE_UPDATED',
      entity: 'vehicle',
      id: vehicle.id,
      contractId: vehicle.contractId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return vehicle;
  }

  async remove(id: string, userId: string) {
    const current = await this.findOne(id);
    const contractId = current.contractId;
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), updatedById: userId } });
    this.events.emit({
      type: 'VEHICLE_DELETED',
      entity: 'vehicle',
      id,
      contractId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return vehicle;
  }

  async importExcel(buffer: Buffer, contractId: string, userId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Fichier Excel vide');
    const rows: CreateVehicleDto[] = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      rows.push({
        registrationNumber: String(row.getCell(1).value ?? ''),
        make: String(row.getCell(2).value ?? ''),
        model: String(row.getCell(3).value ?? ''),
        year: Number(row.getCell(4).value),
        chassisNumber: String(row.getCell(5).value ?? ''),
        type: String(row.getCell(6).value ?? 'OTHER').toUpperCase() as VehicleType,
        usage: String(row.getCell(7).value ?? ''),
        power: Number(row.getCell(8).value) || undefined,
        displacement: Number(row.getCell(9).value) || undefined,
        seats: Number(row.getCell(10).value) || undefined,
        emptyWeight: String(row.getCell(11).value ?? '') || undefined,
        totalWeight: String(row.getCell(12).value ?? '') || undefined,
        circulationDate: String(row.getCell(13).value ?? '') || undefined,
        categoryLabel: String(row.getCell(14).value ?? '') || undefined,
        trailer: String(row.getCell(15).value ?? '') || undefined,
        validityStart: String(row.getCell(16).value ?? '') || undefined,
        validityEnd: String(row.getCell(17).value ?? '') || undefined,
        intermediaryCode: String(row.getCell(18).value ?? '') || undefined,
        contractId,
      });
    });
    if (!rows.length) throw new BadRequestException('Aucun vehicule a importer');
    const data = rows.map((row) => ({
      ...row,
      registrationNumber: row.registrationNumber.replace(/\s+/g, '').toUpperCase(),
      chassisNumber: row.chassisNumber.replace(/\s+/g, '').toUpperCase(),
      emptyWeight: row.emptyWeight ? new Prisma.Decimal(row.emptyWeight) : undefined,
      totalWeight: row.totalWeight ? new Prisma.Decimal(row.totalWeight) : undefined,
      createdById: userId,
    }));
    const result = await this.prisma.vehicle.createMany({ data, skipDuplicates: true });
    this.events.emit({
      type: 'VEHICLE_IMPORTED',
      entity: 'vehicle',
      id: contractId,
      contractId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return { imported: result.count, ignored: rows.length - result.count };
  }

  async exportExcel(query: VehicleQueryDto) {
    const result = await this.findAll({ ...query, page: 1, limit: 100 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vehicules');
    sheet.columns = [
      { header: 'Immatriculation', key: 'registrationNumber', width: 20 },
      { header: 'Marque', key: 'make', width: 18 },
      { header: 'Modele', key: 'model', width: 18 },
      { header: 'Annee', key: 'year', width: 10 },
      { header: 'Chassis', key: 'chassisNumber', width: 25 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Contrat', key: 'contract', width: 20 },
    ];
    result.data.forEach((v) => sheet.addRow({ ...v, contract: v.contract.number }));
    sheet.getRow(1).font = { bold: true };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
