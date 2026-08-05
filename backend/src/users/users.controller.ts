import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsEmail() @MaxLength(255) email!: string;
  @IsString() @MinLength(8) @MaxLength(72) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, { message: 'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractere special' }) password!: string;
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(100) firstName!: string;
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(100) lastName!: string;
  @IsEnum(UserRole) role!: UserRole;
}
class UpdateUserDto {
  @IsOptional() @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(100) lastName?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get() findAll(@Query() query: PaginationDto) { return this.service.findAll(query); }
  @Post() create(@Body() dto: CreateUserDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.remove(id); }
}
