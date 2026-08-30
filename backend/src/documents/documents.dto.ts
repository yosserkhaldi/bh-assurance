import { GeneratedDocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class DocumentQueryDto {
  @IsOptional()
  @IsUUID()
  contractId?: string;
}

export class GenerateDocumentDto {
  @IsUUID()
  contractId!: string;

  @IsEnum(GeneratedDocumentType)
  type!: GeneratedDocumentType;

  @IsOptional()
  @IsUUID()
  amendmentId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
