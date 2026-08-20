import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Permission } from '../common/permissions';
import { Permissions } from '../common/permissions.decorator';
import { DocumentQueryDto, GenerateDocumentDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @Permissions(Permission.DOCUMENTS_READ)
  findAll(@Query() q: DocumentQueryDto) {
    return this.service.findAll(q.contractId);
  }

  @Post('generate')
  @Permissions(Permission.DOCUMENTS_GENERATE)
  generate(@Body() d: GenerateDocumentDto, @CurrentUser() u: JwtUser) {
    return this.service.generate(d, u.sub);
  }

  @Get(':id/download')
  @Permissions(Permission.DOCUMENTS_READ)
  async download(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const filePath = await this.service.findFilePath(id);
    const stream = createReadStream(filePath);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${id}.pdf"` });
    return new StreamableFile(stream);
  }

  @Delete(':id')
  @Permissions(Permission.CONTRACTS_DELETE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
