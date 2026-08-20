import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GeneratedDocumentType } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateDocumentDto } from './documents.dto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(contractId: string) {
    return this.prisma.generatedDocument.findMany({
      where: { contractId },
      include: { generatedBy: { select: { id: true, firstName: true, lastName: true } }, amendment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generate(dto: GenerateDocumentDto, userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId, deletedAt: null },
      include: { establishment: true, vehicles: { where: { deletedAt: null } } },
    });
    if (!contract) throw new NotFoundException('Contrat introuvable');

    let amendment = null;
    if (dto.amendmentId) {
      amendment = await this.prisma.contractAmendment.findFirst({
        where: { id: dto.amendmentId, contractId: dto.contractId, deletedAt: null },
      });
      if (!amendment) throw new NotFoundException('Avenant introuvable');
    }

    let vehicle = null;
    if (dto.vehicleId) {
      vehicle = contract.vehicles.find((v) => v.id === dto.vehicleId);
      if (!vehicle) throw new NotFoundException('Vehicule introuvable dans ce contrat');
    }

    const timestamp = Date.now();
    const fileName = `${dto.contractId}_${dto.type}_${timestamp}.pdf`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const buffer = await this.buildPdf(dto.type, { contract, amendment, vehicle });
    await fs.writeFile(filePath, buffer);

    return this.prisma.generatedDocument.create({
      data: {
        type: dto.type,
        contractId: dto.contractId,
        amendmentId: dto.amendmentId ?? null,
        fileName,
        filePath,
        generatedById: userId,
      },
      include: { generatedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async findFilePath(id: string) {
    const doc = await this.prisma.generatedDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable');
    return doc.filePath;
  }

  async remove(id: string) {
    const doc = await this.prisma.generatedDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable');
    try {
      await fs.unlink(doc.filePath);
    } catch {
      // ignorer si le fichier est deja absent
    }
    return this.prisma.generatedDocument.delete({ where: { id } });
  }

  private buildPdf(
    type: GeneratedDocumentType,
    context: { contract: any; amendment: any; vehicle: any },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      switch (type) {
        case GeneratedDocumentType.ATTESTATION:
          this.renderAttestation(doc, context);
          break;
        case GeneratedDocumentType.GREEN_CARD:
          this.renderGreenCard(doc, context);
          break;
        case GeneratedDocumentType.AMENDMENT:
          this.renderAmendment(doc, context);
          break;
        case GeneratedDocumentType.CONTRACT_SUMMARY:
          this.renderContractSummary(doc, context);
          break;
        default:
          reject(new BadRequestException('Type de document non supporte'));
          return;
      }

      doc.end();
    });
  }

  private renderHeader(doc: any, title: string) {
    doc.fontSize(20).text('BH Assurance', 50, 50);
    doc.fontSize(14).text(title, 50, 80);
    doc.moveDown(2);
  }

  private renderFooter(doc: any) {
    doc.moveDown(2);
    doc.fontSize(9).text(`Genere le ${new Date().toLocaleString('fr-FR')}`);
  }

  private renderAttestation(doc: any, context: { contract: any; vehicle: any }) {
    const { contract, vehicle } = context;
    this.renderHeader(doc, 'Attestation d\'assurance');
    doc.fontSize(12).text(`Contrat : ${contract.number}`);
    doc.text(`Raison sociale : ${contract.establishment.businessName}`);
    if (vehicle) {
      doc.text(`Vehicule : ${vehicle.registrationNumber}`);
      doc.text(`Marque / Modele : ${vehicle.make} ${vehicle.model}`);
    }
    doc.text(`Date de debut : ${contract.startDate.toLocaleDateString('fr-FR')}`);
    doc.text(`Date de fin : ${contract.endDate.toLocaleDateString('fr-FR')}`);
    doc.text(`Date de generation : ${new Date().toLocaleDateString('fr-FR')}`);
    this.renderFooter(doc);
  }

  private renderGreenCard(doc: any, context: { contract: any; vehicle: any }) {
    const { contract, vehicle } = context;
    this.renderHeader(doc, 'Carte verte');
    doc.fontSize(12).text(`Contrat : ${contract.number}`);
    if (vehicle) {
      doc.text(`Immatriculation : ${vehicle.registrationNumber}`);
      doc.text(`Marque : ${vehicle.make}`);
      doc.text(`Modele : ${vehicle.model}`);
    }
    doc.text(`Valable du ${contract.startDate.toLocaleDateString('fr-FR')} au ${contract.endDate.toLocaleDateString('fr-FR')}`);
    this.renderFooter(doc);
  }

  private renderAmendment(doc: any, context: { contract: any; amendment: any }) {
    const { contract, amendment } = context;
    this.renderHeader(doc, 'Avenant au contrat');
    if (!amendment) {
      doc.text('Aucun avenant specifie.');
      return;
    }
    doc.fontSize(12).text(`Reference avenant : ${amendment.id.slice(0, 8)}`);
    doc.text(`Contrat : ${contract.number}`);
    doc.text(`Type : ${amendment.type}`);
    doc.text(`Description : ${amendment.description ?? 'N/A'}`);
    doc.text(`Date d'effet : ${amendment.effectiveDate ? amendment.effectiveDate.toLocaleDateString('fr-FR') : 'N/A'}`);
    this.renderFooter(doc);
  }

  private renderContractSummary(doc: any, context: { contract: any }) {
    const { contract } = context;
    this.renderHeader(doc, 'Recapitulatif du contrat');
    doc.fontSize(12).text(`Contrat : ${contract.number}`);
    doc.text(`Type : ${contract.type}`);
    doc.text(`Statut : ${contract.status}`);
    doc.text(`Etablissement : ${contract.establishment.businessName}`);
    doc.text(`Adresse : ${contract.establishment.address}`);
    doc.text(`Gouvernorat : ${contract.establishment.governorate}`);
    doc.text(`Responsable : ${contract.establishment.managerName}`);
    doc.text(`Telephone : ${contract.establishment.phone}`);
    doc.text(`Email : ${contract.establishment.email}`);
    doc.moveDown();
    doc.fontSize(14).text('Vehicules assures');
    doc.moveDown();
    doc.fontSize(12);
    if (contract.vehicles.length === 0) {
      doc.text('Aucun vehicule.');
    } else {
      contract.vehicles.forEach((v: any, i: number) => {
        doc.text(`${i + 1}. ${v.registrationNumber} - ${v.make} ${v.model} (${v.year})`);
      });
    }
    this.renderFooter(doc);
  }
}
