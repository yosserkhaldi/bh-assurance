import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { PaginationDto } from '../common/pagination.dto';
import { Permission } from '../common/permissions';
import { Permissions } from '../common/permissions.decorator';
import { CreateEstablishmentDto, UpdateEstablishmentDto } from './establishments.dto';
import { EstablishmentsService } from './establishments.service';

@ApiTags('Etablissements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly service: EstablishmentsService) {}
  @Get() @Permissions(Permission.ESTABLISHMENTS_READ) findAll(@Query() query: PaginationDto) { return this.service.findAll(query); }
  @Get('for-contract') @Permissions(Permission.ESTABLISHMENTS_READ) findForContract() { return this.service.findForContract(); }
  @Get(':id') @Permissions(Permission.ESTABLISHMENTS_READ) findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }
  @Post() @Permissions(Permission.ESTABLISHMENTS_CREATE) create(@Body() dto: CreateEstablishmentDto, @CurrentUser() u: JwtUser) { return this.service.create(dto, u.sub); }
  @Patch(':id') @Permissions(Permission.ESTABLISHMENTS_UPDATE) update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEstablishmentDto, @CurrentUser() u: JwtUser) { return this.service.update(id, dto, u.sub); }
  @Delete(':id') @Permissions(Permission.ESTABLISHMENTS_DELETE) remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.remove(id, u.sub); }
}
