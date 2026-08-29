import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgentApiKeyGuard } from './agent-api-key.guard';
import { OnboardingService } from './onboarding.service';
import { OnboardUserDto } from './onboarding.dto';

@ApiTags('Onboarding')
@Controller('users/onboard')
@UseGuards(AgentApiKeyGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  onboard(@Body() dto: OnboardUserDto) {
    return this.onboarding.createUser(dto);
  }
}
