import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VehicleType } from '@prisma/client';
import ExcelJS from 'exceljs';
import { pageMeta } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto, VehicleQueryDto } from './vehicles.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(dto: CreateVehicleDto, userId: string) {
    return this.prisma.vehicle.create({
      data: {
        ...dto,
        registrationNumber: dto.registrationNumber.replace(/\s+/g, '').toUpperCase(),
        chassisNumber: dto.chassisNumber.replace(/\s+/g, '').toUpperCase(),
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateVehicleDto, userId: string) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: { ...dto, updatedById: userId } });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), updatedById: userId } });
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
        contractId,
      });
    });
    if (!rows.length) throw new BadRequestException('Aucun vehicule a importer');
    const data = rows.map((row) => ({
      ...row,
      registrationNumber: row.registrationNumber.replace(/\s+/g, '').toUpperCase(),
      chassisNumber: row.chassisNumber.replace(/\s+/g, '').toUpperCase(),
      createdById: userId,
    }));
    const result = await this.prisma.vehicle.createMany({ data, skipDuplicates: true });
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
