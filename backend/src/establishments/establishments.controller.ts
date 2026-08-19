import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { PaginationDto } from '../common/pagination.dto';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateEstablishmentDto, UpdateEstablishmentDto } from './establishments.dto';
import { EstablishmentsService } from './establishments.service';

@ApiTags('Etablissements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly service: EstablishmentsService) {}
  @Get() findAll(@Query() query: PaginationDto) { return this.service.findAll(query); }
  @Get('for-contract') findForContract() { return this.service.findForContract(); }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }
  @Post() @Roles('ADMIN', 'MANAGER') create(@Body() dto: CreateEstablishmentDto, @CurrentUser() u: JwtUser) { return this.service.create(dto, u.sub); }
  @Patch(':id') @Roles('ADMIN', 'MANAGER') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEstablishmentDto, @CurrentUser() u: JwtUser) { return this.service.update(id, dto, u.sub); }
  @Delete(':id') @Roles('ADMIN', 'MANAGER') remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.remove(id, u.sub); }
}
