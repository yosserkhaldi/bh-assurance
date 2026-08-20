import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { Permissions } from '../common/permissions.decorator';
import { AmendmentQueryDto, CreateAmendmentDto, UpdateAmendmentStatusDto } from './amendments.dto';
import { AmendmentsService } from './amendments.service';

@ApiTags('Avenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('amendments')
export class AmendmentsController {
  constructor(private readonly service: AmendmentsService) {}

  @Get()
  @Permissions(Permission.CONTRACTS_READ)
  findAll(@Query() q: AmendmentQueryDto) {
    return this.service.findAll(q.contractId);
  }

  @Get(':id')
  @Permissions(Permission.CONTRACTS_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions(Permission.CONTRACTS_CREATE)
  create(@Body() d: CreateAmendmentDto, @CurrentUser() u: JwtUser) {
    return this.service.create(d, u.sub);
  }

  @Patch(':id/status')
  @Permissions(Permission.CONTRACTS_UPDATE)
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateAmendmentStatusDto, @CurrentUser() u: JwtUser) {
    return this.service.updateStatus(id, d, u.sub);
  }

  @Delete(':id')
  @Permissions(Permission.CONTRACTS_DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.service.remove(id, u.sub);
  }
}
