import { ContractStatus, ContractType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class ContractQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @IsOptional() @IsUUID() establishmentId?: string;
  @IsOptional() @IsString() lot?: string;
}
export class CreateContractDto {
  @IsString() @IsNotEmpty() @MaxLength(100) @Matches(/^[A-Z0-9][A-Z0-9\/_-]{2,99}$/i, { message: 'Le numero de contrat est invalide' }) number!: string;
  @IsEnum(ContractType) type!: ContractType;
  @IsOptional() @IsString() @MaxLength(20) lot?: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @IsUUID() establishmentId!: string;
}
export class UpdateContractDto {
  @IsOptional() @IsEnum(ContractType) type?: ContractType;
  @IsOptional() @IsString() @MaxLength(20) lot?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
}
export class RenewContractDto extends CreateContractDto {}
