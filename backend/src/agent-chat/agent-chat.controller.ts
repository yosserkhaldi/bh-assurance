import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { Permissions } from '../common/permissions.decorator';
import { Permission } from '../common/permissions';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { AgentChatService } from './agent-chat.service';
import { AgentChatDto } from './agent-chat.dto';

@ApiTags('Agent Chat')
@Controller('agent/chat')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.USERS_CREATE)
export class AgentChatController {
  constructor(private readonly agentChat: AgentChatService) {}

  @Post()
  chat(@CurrentUser() user: JwtUser, @Body() dto: AgentChatDto) {
    return this.agentChat.chat(user.sub, dto.sessionId, dto.message);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: JwtUser) {
    return this.agentChat.listSessions(user.sub);
  }

  @Delete('sessions/:sessionId')
  deleteSession(@CurrentUser() user: JwtUser, @Param('sessionId') sessionId: string) {
    return this.agentChat.deleteSession(user.sub, sessionId);
  }
}
