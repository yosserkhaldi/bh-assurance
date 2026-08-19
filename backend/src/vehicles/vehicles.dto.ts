import { VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class VehicleQueryDto extends PaginationDto {
  @IsOptional() @IsUUID() contractId?: string;
}
export class CreateVehicleDto {
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9 -]{2,49}$/i, { message: "L'immatriculation est invalide" }) registrationNumber!: string;
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(100) make!: string;
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(100) model!: string;
  @Type(() => Number) @IsInt() @Min(1900) @Max(new Date().getFullYear() + 1) year!: number;
  @IsString() @Matches(/^[A-HJ-NPR-Z0-9-]{6,100}$/i, { message: 'Le numero de chassis est invalide' }) chassisNumber!: string;
  @IsEnum(VehicleType) type!: VehicleType;
  @IsOptional() @IsString() @MaxLength(100) usage?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999) power?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999) displacement?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) seats?: number;
  @IsOptional() @IsString() @MaxLength(50) emptyWeight?: string;
  @IsOptional() @IsString() @MaxLength(50) totalWeight?: string;
  @IsOptional() @IsDateString() circulationDate?: string;
  @IsOptional() @IsString() @MaxLength(100) categoryLabel?: string;
  @IsOptional() @IsString() @MaxLength(50) trailer?: string;
  @IsOptional() @IsDateString() validityStart?: string;
  @IsOptional() @IsDateString() validityEnd?: string;
  @IsOptional() @IsString() @MaxLength(50) intermediaryCode?: string;
  @IsUUID() contractId!: string;
}
export class UpdateVehicleDto {
  @IsOptional() @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(100) make?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(100) model?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(new Date().getFullYear() + 1) year?: number;
  @IsOptional() @IsEnum(VehicleType) type?: VehicleType;
  @IsOptional() @IsString() @MaxLength(100) usage?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999) power?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999) displacement?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) seats?: number;
  @IsOptional() @IsString() @MaxLength(50) emptyWeight?: string;
  @IsOptional() @IsString() @MaxLength(50) totalWeight?: string;
  @IsOptional() @IsDateString() circulationDate?: string;
  @IsOptional() @IsString() @MaxLength(100) categoryLabel?: string;
  @IsOptional() @IsString() @MaxLength(50) trailer?: string;
  @IsOptional() @IsDateString() validityStart?: string;
  @IsOptional() @IsDateString() validityEnd?: string;
  @IsOptional() @IsString() @MaxLength(50) intermediaryCode?: string;
  @IsOptional() @IsUUID() contractId?: string;
}
