import { Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AdvancedService } from './advanced.service';

@ApiTags('Fonctionnalites avancees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AdvancedController {
  constructor(private readonly service: AdvancedService) {}
  @Get('search') search(@Query('q') q: string) { return this.service.search(q); }
  @Get('notifications') notifications(@CurrentUser() u: JwtUser) { return this.service.notifications(u.sub); }
  @Post('notifications/generate') generate(@CurrentUser() u: JwtUser) { return this.service.generateContractNotifications(u.sub); }
  @Patch('notifications/:id/read') read(@Param('id') id: string, @CurrentUser() u: JwtUser) { return this.service.markRead(id, u.sub); }
  @Get('audit-logs') @Roles('ADMIN') logs(@Query('page') page?: string) { return this.service.logs(Number(page || 1)); }
  @Get('reports/contracts.pdf')
  async pdf(@CurrentUser() u: JwtUser, @Res() res: Response) {
    const file = await this.service.contractsPdf();
    await this.service.log(u.sub, 'EXPORT', 'Contract');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contrats.pdf');
    res.send(file);
  }
}
