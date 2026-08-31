import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { Permissions } from '../common/permissions.decorator';
import { ContractQueryDto, CreateContractDto, RenewContractDto, ToRenewQueryDto, UpdateContractDto } from './contracts.dto';
import { ContractsService } from './contracts.service';

@ApiTags('Contrats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}
  @Get() @Permissions(Permission.CONTRACTS_READ) findAll(@Query() q: ContractQueryDto) { return this.service.findAll(q); }
  @Get('for-document') @Permissions(Permission.CONTRACTS_READ) findForDocument() { return this.service.findForDocument(); }
  @Get('to-renew') @Permissions(Permission.CONTRACTS_READ) findToRenew(@Query() q: ToRenewQueryDto) { return this.service.findToRenew(q.days ?? 30); }
  @Get(':id') @Permissions(Permission.CONTRACTS_READ) findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }
  @Post() @Permissions(Permission.CONTRACTS_CREATE) create(@Body() d: CreateContractDto, @CurrentUser() u: JwtUser) { return this.service.create(d, u.sub); }
  @Post(':id/renew') @Permissions(Permission.CONTRACTS_RENEW) renew(@Param('id', ParseUUIDPipe) id: string, @Body() d: RenewContractDto, @CurrentUser() u: JwtUser) { return this.service.renew(id, d, u.sub); }
  @Patch(':id') @Permissions(Permission.CONTRACTS_UPDATE) update(@Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateContractDto, @CurrentUser() u: JwtUser) { return this.service.update(id, d, u.sub); }
  @Delete(':id') @Permissions(Permission.CONTRACTS_DELETE) remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.remove(id, u.sub); }
}
