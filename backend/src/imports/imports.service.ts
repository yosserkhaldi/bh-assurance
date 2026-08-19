import { BadRequestException, Injectable } from '@nestjs/common';
import { ContractStatus, Governorate, Prisma, VehicleType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  // ===================== IMPORT ÉTABLISSEMENTS =====================
  async importEstablishments(buffer: Buffer, userId: string) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const sheet = this.findDataSheet(workbook, ['backup', 'Etat des etablissements']);
      if (!sheet) throw new BadRequestException('Aucune feuille de donnees trouvee');

      const rows = this.extractRows(sheet);
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        const businessName = this.cleanString(row['ETABLISSEMENT'] ?? row['Etablissement']);
        if (!businessName) {
          skipped++;
          continue;
        }

        const rne = this.cleanString(row['IDENTIFIANT UNIQUE'] ?? row['N. Police'] ?? businessName);
        if (!rne) {
          skipped++;
          continue;
        }

        const address = this.cleanString(row['ADRESSE'] ?? row['Adresse'] ?? 'Non renseignee');
        const governorate = this.normalizeGovernorate(row['GOUVERNORAT'] ?? row['Gouvernorat']);
        const managerName = this.cleanString(row['Resp parc auto'] ?? row['Responsable'] ?? 'Non renseigne');
        const phone = this.normalizePhone(row['TEL'] ?? row['Tel'] ?? row['telephone']);
        const mobilePhone = this.normalizePhone(row['MOBILE'] ?? row['Mobile']);
        const email = this.normalizeEmail(row['E-MAIL'] ?? row['Email']);
        const uniqueIdentifier = this.cleanString(row['IDENTIFIANT UNIQUE']);
        const matriculeFiscal = this.cleanString(row['MF'] ?? row['Matricule fiscal']);

        const data = {
          businessName,
          rne: rne.toUpperCase().substring(0, 50),
          uniqueIdentifier: uniqueIdentifier?.substring(0, 50),
          address,
          governorate,
          managerName,
          phone,
          mobilePhone,
          email,
          matriculeFiscal,
        };

        const existing = await this.prisma.establishment.findFirst({ where: { rne: data.rne, deletedAt: null } });
        if (existing) {
          await this.prisma.establishment.update({
            where: { id: existing.id },
            data: { ...data, updatedById: userId } as Prisma.EstablishmentUncheckedUpdateInput,
          });
          this.events.emit({
            type: 'ESTABLISHMENT_UPDATED',
            entity: 'establishment',
            id: existing.id,
            userId,
            timestamp: new Date().toISOString(),
          });
          updated++;
        } else {
          const createdEstablishment = await this.prisma.establishment.create({ data: { ...data, createdById: userId } as Prisma.EstablishmentUncheckedCreateInput });
          this.events.emit({
            type: 'ESTABLISHMENT_CREATED',
            entity: 'establishment',
            id: createdEstablishment.id,
            userId,
            timestamp: new Date().toISOString(),
          });
          created++;
        }
      }

      return { created, updated, skipped, total: rows.length };
    } catch (error) {
      console.error('[IMPORT ESTABLISHMENTS ERROR]', error);
      throw error;
    }
  }

  // ===================== IMPORT BASE TARIFIAIRE =====================
  async importTarification(buffer: Buffer, userId: string) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new BadRequestException('Fichier Excel vide');

      const rows = this.extractRows(sheet);
      let contractsCreated = 0;
      let vehiclesCreated = 0;
      let skipped = 0;

      // Regroupement par numéro de contrat
      const groups = new Map<string, typeof rows>();
      for (const row of rows) {
        const number = this.cleanString(row['Contrat']);
        if (!number) {
          skipped++;
          continue;
        }
        if (!groups.has(number)) groups.set(number, []);
        groups.get(number)!.push(row);
      }

      for (const [number, vehicleRows] of groups) {
        const numberKey = number.toUpperCase();

        // Chercher ou créer un établissement par défaut
        let establishment = await this.prisma.establishment.findFirst({ where: { rne: numberKey, deletedAt: null } });
        if (!establishment) {
          establishment = await this.prisma.establishment.create({
            data: {
              businessName: `Client ${numberKey}`,
              rne: numberKey.substring(0, 50),
              address: 'A renseigner',
              governorate: 'TUNIS',
              managerName: 'A renseigner',
              phone: '00000000',
              email: 'a.renseigner@example.com',
              createdById: userId,
            },
          });
        }

        // Dates de validité du premier véhicule
        const firstRow = vehicleRows[0];
        const startDate = this.parseExcelDate(firstRow['Validité Du']);
        const endDate = this.parseExcelDate(firstRow['Validité Au']);
        const today = new Date();
        const fallbackEnd = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

        let contract = await this.prisma.contract.findFirst({ where: { number: numberKey, deletedAt: null } });
        if (!contract) {
          contract = await this.prisma.contract.create({
            data: {
              number: numberKey,
              type: 'FLEET',
              startDate: startDate ?? today,
              endDate: endDate ?? fallbackEnd,
              status: 'ACTIVE' as ContractStatus,
              establishmentId: establishment.id,
              createdById: userId,
            },
          });
          contractsCreated++;
        }

        const existingVehicles = await this.prisma.vehicle.findMany({
          where: { contractId: contract.id, deletedAt: null },
          select: { registrationNumber: true, chassisNumber: true },
        });
        const existingRegs = new Set(existingVehicles.map((v) => v.registrationNumber));
        const existingChassis = new Set(existingVehicles.map((v) => v.chassisNumber));

        for (const row of vehicleRows) {
          const registration = this.cleanString(row['Immat_Crypté']).toUpperCase().substring(0, 50);
          const chassis = this.cleanString(row['N° Série']).toUpperCase().substring(0, 100);
          if (!registration || !chassis) {
            skipped++;
            continue;
          }
          if (existingRegs.has(registration) || existingChassis.has(chassis)) {
            skipped++;
            continue;
          }

          const vehicleData = {
            registrationNumber: registration,
            make: this.cleanString(row['Marque']) || 'NON RENSEIGNE',
            model: this.cleanString(row['Type']) || '-',
            year: this.extractYear(row['DMC']) ?? new Date().getFullYear(),
            chassisNumber: chassis,
            type: this.mapUsageToType(row['Usage']),
            usage: this.cleanString(row['Usage']),
            power: this.parseIntSafe(row['Puissance']),
            displacement: this.parseIntSafe(row['CYLINDRE']),
            seats: this.parseIntSafe(row['NB_Places_Assises']),
            emptyWeight: this.parseDecimal(row['PVID']),
            totalWeight: this.parseDecimal(row['PTAC']),
            circulationDate: this.parseExcelDate(row['DMC']),
            categoryLabel: this.cleanString(row['Usage']),
            validityStart: this.parseExcelDate(row['Validité Du']),
            validityEnd: this.parseExcelDate(row['Validité Au']),
            intermediaryCode: 'BH Assurance',
            contractId: contract.id,
            createdById: userId,
          };

          try {
            await this.prisma.vehicle.create({ data: vehicleData });
            existingRegs.add(registration);
            existingChassis.add(chassis);
            vehiclesCreated++;
          } catch (e: any) {
            if (e.code === 'P2002') {
              skipped++;
            } else {
              throw e;
            }
          }
        }
      }

      if (vehiclesCreated > 0 || contractsCreated > 0) {
        this.events.emit({
          type: 'VEHICLE_IMPORTED',
          entity: 'vehicle',
          id: 'import-batch',
          userId,
          timestamp: new Date().toISOString(),
        });
      }
      return { contractsCreated, vehiclesCreated, skipped, groups: groups.size };
    } catch (error) {
      console.error('[IMPORT TARIFICATION ERROR]', error);
      throw error;
    }
  }

  // ===================== EXPORT SI =====================
  async exportSi(query: { lot?: string; contractId?: string; status?: ContractStatus }) {
    const where: Prisma.ContractWhereInput = { deletedAt: null };
    if (query.lot) where.lot = query.lot;
    if (query.status) where.status = query.status;
    if (query.contractId) where.id = query.contractId;

    const contracts = await this.prisma.contract.findMany({
      where,
      include: { establishment: true, vehicles: { where: { deletedAt: null } } },
      orderBy: { number: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Injection SI');
    sheet.columns = [
      { header: 'CODE_INTERMEDIAIRE', key: 'codeIntermediaire', width: 20 },
      { header: 'NUM_CONTRAT', key: 'numContrat', width: 20 },
      { header: 'CLASSE', key: 'classe', width: 12 },
      { header: 'VALIDITE_DU', key: 'validiteDu', width: 14 },
      { header: 'VALIDITE_AU', key: 'validiteAu', width: 14 },
      { header: 'REF_SOUSCRIPTEUR', key: 'refSouscripteur', width: 30 },
      { header: 'MF', key: 'mfSouscripteur', width: 20 },
      { header: 'email', key: 'emailSouscripteur', width: 30 },
      { header: 'tel', key: 'telSouscripteur', width: 14 },
      { header: 'ASSURERectifié', key: 'assure', width: 30 },
      { header: 'MF', key: 'mfAssure', width: 20 },
      { header: 'email', key: 'emailAssure', width: 30 },
      { header: 'tel', key: 'telAssure', width: 14 },
      { header: 'Adresse', key: 'adresse', width: 40 },
      { header: 'MARQUE_VEHICULE', key: 'marque', width: 18 },
      { header: 'TYPE_VEHICULE', key: 'type', width: 20 },
      { header: 'NUM_SERIE_TYPE', key: 'numSerie', width: 25 },
      { header: 'PUISSANCE', key: 'puissance', width: 12 },
      { header: 'CYLINDRE', key: 'cylindre', width: 12 },
      { header: 'IMMATRICULATION_VEHICULE', key: 'immatriculation', width: 24 },
      { header: 'LIB_CATEGORIE_TARIFAIRE', key: 'categorie', width: 28 },
      { header: 'remorque', key: 'remorque', width: 12 },
      { header: 'Nb_place_véhicule', key: 'places', width: 18 },
      { header: 'datemiseencirculation', key: 'dmc', width: 22 },
      { header: 'chargevide', key: 'chargeVide', width: 14 },
      { header: 'chargetotale', key: 'chargeTotale', width: 14 },
    ];

    for (const contract of contracts) {
      const e = contract.establishment;
      for (const vehicle of contract.vehicles) {
        sheet.addRow({
          codeIntermediaire: vehicle.intermediaryCode || 'BH Assurance',
          numContrat: contract.number,
          classe: contract.type,
          validiteDu: this.formatDate(vehicle.validityStart ?? contract.startDate),
          validiteAu: this.formatDate(vehicle.validityEnd ?? contract.endDate),
          refSouscripteur: e.businessName,
          mfSouscripteur: e.matriculeFiscal || '',
          emailSouscripteur: e.email,
          telSouscripteur: e.phone,
          assure: e.businessName,
          mfAssure: e.matriculeFiscal || '',
          emailAssure: e.email,
          telAssure: e.mobilePhone || e.phone,
          adresse: e.address,
          marque: vehicle.make,
          type: vehicle.model,
          numSerie: vehicle.chassisNumber,
          puissance: vehicle.power ?? '',
          cylindre: vehicle.displacement ?? '',
          immatriculation: vehicle.registrationNumber,
          categorie: vehicle.categoryLabel || vehicle.usage || '',
          remorque: vehicle.trailer || '',
          places: vehicle.seats ?? '',
          dmc: this.formatDate(vehicle.circulationDate),
          chargeVide: vehicle.emptyWeight?.toString() ?? '',
          chargeTotale: vehicle.totalWeight?.toString() ?? '',
        });
      }
    }

    sheet.getRow(1).font = { bold: true };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // ===================== HELPERS =====================
  private findDataSheet(workbook: ExcelJS.Workbook, preferredNames: string[]) {
    for (const name of preferredNames) {
      const sheet = workbook.getWorksheet(name);
      if (sheet) return sheet;
    }
    return workbook.worksheets[0];
  }

  private extractRows(sheet: ExcelJS.Worksheet) {
    const headers: string[] = [];
    const rows: Record<string, any>[] = [];

    sheet.eachRow((row, index) => {
      if (index === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = this.cleanString(String(cell.value ?? ''));
        });
      } else {
        const obj: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) obj[header] = cell.value;
        });
        rows.push(obj);
      }
    });

    return rows;
  }

  private cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(/\s+/g, ' ');
  }

  private normalizePhone(value: any): string {
    const cleaned = this.cleanString(value).replace(/\D/g, '');
    if (cleaned.length === 8) return cleaned;
    if (cleaned.length > 8) return cleaned.slice(-8);
    return '00000000';
  }

  private normalizeEmail(value: any): string {
    const email = this.cleanString(value).toLowerCase();
    if (email && email.includes('@')) return email;
    return 'a.renseigner@example.com';
  }

  private normalizeGovernorate(value: any): Governorate {
    const name = this.cleanString(value).toUpperCase().replace(/[\s'-]/g, '_');
    const mapping: Record<string, Governorate> = {
      TUNIS: 'TUNIS',
      TUNISIE: 'TUNIS',
      ARIANA: 'ARIANA',
      BEJA: 'BEJA',
      BEN_AROUS: 'BEN_AROUS',
      BENAROUS: 'BEN_AROUS',
      BIZERTE: 'BIZERTE',
      GABES: 'GABES',
      GAFSA: 'GAFSA',
      JENDOUBA: 'JENDOUBA',
      KAIROUAN: 'KAIROUAN',
      KASSERINE: 'KASSERINE',
      KEBILI: 'KEBILI',
      KEF: 'KEF',
      MAHDIA: 'MAHDIA',
      MANOUBA: 'MANOUBA',
      MEDENINE: 'MEDENINE',
      MONASTIR: 'MONASTIR',
      NABEUL: 'NABEUL',
      SFAX: 'SFAX',
      SIDI_BOUZID: 'SIDI_BOUZID',
      SILIANA: 'SILIANA',
      SOUSSE: 'SOUSSE',
      TATAOUINE: 'TATAOUINE',
      TOZEUR: 'TOZEUR',
      ZAGHOUAN: 'ZAGHOUAN',
    };
    return mapping[name] || 'TUNIS';
  }

  private parseExcelDate(value: any): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value;
    const num = Number(value);
    if (!isNaN(num) && num > 30000 && num < 100000) {
      // Date Excel serial (days since 1900-01-01, avec bug 1900)
      const epoch = new Date(1899, 11, 30);
      return new Date(epoch.getTime() + num * 24 * 60 * 60 * 1000);
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  private parseIntSafe(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : Math.round(num);
  }

  private parseDecimal(value: any): Prisma.Decimal | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : new Prisma.Decimal(num);
  }

  private extractYear(value: any): number | null {
    const d = this.parseExcelDate(value);
    if (!d) return null;
    const year = d.getFullYear();
    if (year < 1900 || year > new Date().getFullYear() + 1) return null;
    return year;
  }

  private mapUsageToType(usage: any): VehicleType {
    const u = this.cleanString(usage).toUpperCase();
    if (u.includes('MOTO')) return 'MOTORCYCLE';
    if (u.includes('CAMION') || u.includes('POIDS LOURD')) return 'TRUCK';
    if (u.includes('BUS') || u.includes('CAR')) return 'BUS';
    if (u.includes('VAN') || u.includes('UTILITAIRE')) return 'VAN';
    if (u.includes('SPECIAL')) return 'SPECIAL';
    return 'CAR';
  }

  private formatDate(value: Date | string | null): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
