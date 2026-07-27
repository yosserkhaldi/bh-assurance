import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ContractQueryDto, CreateContractDto, RenewContractDto, UpdateContractDto } from './contracts.dto';
import { ContractsService } from './contracts.service';

@ApiTags('Contrats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}
  @Get() findAll(@Query() q: ContractQueryDto) { return this.service.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @Roles('ADMIN', 'MANAGER') create(@Body() d: CreateContractDto, @CurrentUser() u: JwtUser) { return this.service.create(d, u.sub); }
  @Post(':id/renew') @Roles('ADMIN', 'MANAGER') renew(@Param('id') id: string, @Body() d: RenewContractDto, @CurrentUser() u: JwtUser) { return this.service.renew(id, d, u.sub); }
  @Patch(':id') @Roles('ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateContractDto, @CurrentUser() u: JwtUser) { return this.service.update(id, d, u.sub); }
  @Delete(':id') @Roles('ADMIN', 'MANAGER') remove(@Param('id') id: string, @CurrentUser() u: JwtUser) { return this.service.remove(id, u.sub); }
}
