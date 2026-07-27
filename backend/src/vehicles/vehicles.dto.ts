import { VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class VehicleQueryDto extends PaginationDto {
  @IsOptional() @IsUUID() contractId?: string;
}
export class CreateVehicleDto {
  @IsString() @MaxLength(50) registrationNumber!: string;
  @IsString() @MaxLength(100) make!: string;
  @IsString() @MaxLength(100) model!: string;
  @Type(() => Number) @IsInt() @Min(1900) @Max(new Date().getFullYear() + 1) year!: number;
  @IsString() @MaxLength(100) chassisNumber!: string;
  @IsEnum(VehicleType) type!: VehicleType;
  @IsUUID() contractId!: string;
}
export class UpdateVehicleDto {
  @IsOptional() @IsString() @MaxLength(100) make?: string;
  @IsOptional() @IsString() @MaxLength(100) model?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(new Date().getFullYear() + 1) year?: number;
  @IsOptional() @IsEnum(VehicleType) type?: VehicleType;
  @IsOptional() @IsUUID() contractId?: string;
}
