import { Controller, Get, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ContractStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ImportsService } from './imports.service';

@ApiTags('Imports / Export SI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Post('establishments')
  @Roles('ADMIN', 'MANAGER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10_000_000 } }))
  importEstablishments(@UploadedFile() file: Express.Multer.File, @CurrentUser() u: JwtUser) {
    return this.service.importEstablishments(file.buffer, u.sub);
  }

  @Post('tarification')
  @Roles('ADMIN', 'MANAGER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50_000_000 } }))
  importTarification(@UploadedFile() file: Express.Multer.File, @CurrentUser() u: JwtUser) {
    return this.service.importTarification(file.buffer, u.sub);
  }

  @Get('export-si')
  @Roles('ADMIN', 'MANAGER')
  async exportSi(
    @Query('lot') lot?: string,
    @Query('contractId') contractId?: string,
    @Query('status') status?: ContractStatus,
    @Res() res?: Response,
  ) {
    const file = await this.service.exportSi({ lot, contractId, status });
    res!.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res!.setHeader('Content-Disposition', 'attachment; filename=template_injection_SI.xlsx');
    res!.send(file);
  }
}
