import { Governorate } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEstablishmentDto {
  @IsString() @MaxLength(200) businessName!: string;
  @IsString() @MaxLength(50) rne!: string;
  @IsString() @MaxLength(500) address!: string;
  @IsEnum(Governorate) governorate!: Governorate;
  @IsString() @MaxLength(200) managerName!: string;
  @IsString() @MaxLength(30) phone!: string;
  @IsEmail() email!: string;
}

export class UpdateEstablishmentDto {
  @IsOptional() @IsString() @MaxLength(200) businessName?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsEnum(Governorate) governorate?: Governorate;
  @IsOptional() @IsString() @MaxLength(200) managerName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
}
