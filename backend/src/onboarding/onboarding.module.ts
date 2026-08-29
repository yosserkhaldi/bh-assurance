import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { AgentApiKeyGuard } from './agent-api-key.guard';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, AgentApiKeyGuard],
})
export class OnboardingModule {}
