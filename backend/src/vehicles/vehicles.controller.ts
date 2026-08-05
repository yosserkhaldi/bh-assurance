import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateVehicleDto, UpdateVehicleDto, VehicleQueryDto } from './vehicles.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}
  @Get() findAll(@Query() q: VehicleQueryDto) { return this.service.findAll(q); }
  @Get('export/excel')
  async export(@Query() q: VehicleQueryDto, @Res() res: Response) {
    const file = await this.service.exportExcel(q);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vehicules.xlsx');
    res.send(file);
  }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }
  @Post() @Roles('ADMIN', 'MANAGER') create(@Body() d: CreateVehicleDto, @CurrentUser() u: JwtUser) { return this.service.create(d, u.sub); }
  @Post('import/:contractId')
  @Roles('ADMIN', 'MANAGER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_000_000 } }))
  import(@Param('contractId', ParseUUIDPipe) contractId: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() u: JwtUser) {
    return this.service.importExcel(file.buffer, contractId, u.sub);
  }
  @Patch(':id') @Roles('ADMIN', 'MANAGER') update(@Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateVehicleDto, @CurrentUser() u: JwtUser) { return this.service.update(id, d, u.sub); }
  @Delete(':id') @Roles('ADMIN', 'MANAGER') remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) { return this.service.remove(id, u.sub); }
}
