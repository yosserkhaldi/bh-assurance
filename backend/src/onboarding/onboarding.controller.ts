import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/permissions.guard';
import { Permissions } from '../common/permissions.decorator';
import { Permission } from '../common/permissions';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import { OnboardUserDto } from './onboarding.dto';

@ApiTags('Onboarding')
@Controller('users/onboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.USERS_CREATE)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  onboard(@Body() dto: OnboardUserDto, @CurrentUser() user: JwtUser) {
    return this.onboarding.createUser(dto, user.sub);
  }
}
