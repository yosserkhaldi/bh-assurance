import { ContractAmendmentStatus, ContractAmendmentType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AmendmentQueryDto {
  @IsUUID()
  contractId!: string;
}

export class CreateAmendmentDto {
  @IsUUID()
  contractId!: string;

  @IsEnum(ContractAmendmentType)
  type!: ContractAmendmentType;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  vehicleIds?: string[];
}

export class UpdateAmendmentStatusDto {
  @IsEnum(ContractAmendmentStatus)
  status!: ContractAmendmentStatus;
}
