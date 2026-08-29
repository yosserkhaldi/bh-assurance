import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { Permissions } from '../common/permissions.decorator';
import { Permission } from '../common/permissions';
import { AgentChatService } from './agent-chat.service';
import { AgentChatDto } from './agent-chat.dto';

interface AuthRequest extends Request {
  user?: { id: string };
}

@ApiTags('Agent Chat')
@Controller('agent/chat')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.USERS_CREATE)
export class AgentChatController {
  constructor(private readonly agentChat: AgentChatService) {}

  @Post()
  chat(@Req() req: AuthRequest, @Body() dto: AgentChatDto) {
    const userId = req.user?.id || 'anonymous';
    return this.agentChat.chat(userId, dto.sessionId, dto.message);
  }
}
