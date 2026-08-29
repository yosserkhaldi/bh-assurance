import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { Permissions } from '../common/permissions.decorator';
import { Permission } from '../common/permissions';
import { AgentChatService } from './agent-chat.service';
import { AgentChatDto } from './agent-chat.dto';

@ApiTags('Agent Chat')
@Controller('agent/chat')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.USERS_CREATE)
export class AgentChatController {
  constructor(private readonly agentChat: AgentChatService) {}

  @Post()
  chat(@Body() dto: AgentChatDto) {
    return this.agentChat.chat(dto.message);
  }
}
