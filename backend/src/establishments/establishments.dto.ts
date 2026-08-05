import { Governorate } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateEstablishmentDto {
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(200) businessName!: string;
  @IsString() @Matches(/^\d{7}[A-Z]$/i, { message: 'Le RNE doit contenir 7 chiffres suivis d une lettre (exemple : 0001238L)' }) rne!: string;
  @IsOptional() @IsString() @MaxLength(50) uniqueIdentifier?: string;
  @IsString() @IsNotEmpty() @MinLength(5) @MaxLength(500) address!: string;
  @IsEnum(Governorate) governorate!: Governorate;
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(200) managerName!: string;
  @IsString() @Matches(/^\d{8}$/, { message: 'Le telephone doit contenir exactement 8 chiffres' }) phone!: string;
  @IsOptional() @IsString() @Matches(/^\d{8}$/, { message: 'Le mobile doit contenir exactement 8 chiffres' }) mobilePhone?: string;
  @IsEmail() @MaxLength(255) email!: string;
  @IsOptional() @IsString() @MaxLength(50) matriculeFiscal?: string;
}

export class UpdateEstablishmentDto {
  @IsOptional() @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(200) businessName?: string;
  @IsOptional() @IsString() @MaxLength(50) uniqueIdentifier?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MinLength(5) @MaxLength(500) address?: string;
  @IsOptional() @IsEnum(Governorate) governorate?: Governorate;
  @IsOptional() @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(200) managerName?: string;
  @IsOptional() @IsString() @Matches(/^\d{8}$/, { message: 'Le telephone doit contenir exactement 8 chiffres' }) phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{8}$/, { message: 'Le mobile doit contenir exactement 8 chiffres' }) mobilePhone?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) matriculeFiscal?: string;
}
