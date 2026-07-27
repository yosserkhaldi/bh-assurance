import { ContractStatus, ContractType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class ContractQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @IsOptional() @IsUUID() establishmentId?: string;
}
export class CreateContractDto {
  @IsString() @MaxLength(100) number!: string;
  @IsEnum(ContractType) type!: ContractType;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @IsUUID() establishmentId!: string;
}
export class UpdateContractDto {
  @IsOptional() @IsEnum(ContractType) type?: ContractType;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
}
export class RenewContractDto extends CreateContractDto {}
