import { Module } from '@nestjs/common';
import { AgentChatController } from './agent-chat.controller';
import { AgentChatService } from './agent-chat.service';
import { AgentToolsService } from './agent-tools.service';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule],
  controllers: [AgentChatController],
  providers: [AgentChatService, AgentToolsService],
})
export class AgentChatModule {}
