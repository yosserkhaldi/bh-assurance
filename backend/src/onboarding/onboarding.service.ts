import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardUserDto } from './onboarding.dto';

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ALL = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

@Injectable()
export class OnboardingService implements OnModuleInit {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!process.env.AGENT_URL) {
      this.logger.warn('AGENT_URL environment variable is missing. The onboarding endpoint will create users but will not notify the email agent.');
    }
    if (!process.env.AGENT_API_KEY) {
      this.logger.warn('AGENT_API_KEY environment variable is missing. Requests to the email agent will be rejected.');
    }
  }

  async createUser(dto: OnboardUserDto) {
    const temporaryPassword = this.generateSecurePassword();
    const passwordHash = await hash(temporaryPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: 'ACTIVE',
        forcePasswordChange: true,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entity: 'User',
        entityId: user.id,
        description: `Created user via onboarding agent: ${user.email}`,
        metadata: { role: user.role },
      },
    });

    this.logger.log(`Onboarded user ${user.email} with role ${user.role}`);

    const agentWarning = await this.notifyAgent({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      temporaryPassword,
    });

    if (agentWarning) {
      return { user, temporaryPassword, warning: agentWarning };
    }

    return { user, temporaryPassword };
  }

  private async notifyAgent(payload: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    temporaryPassword: string;
  }): Promise<string | undefined> {
    const agentUrl = process.env.AGENT_URL;
    if (!agentUrl) {
      this.logger.warn('AGENT_URL not configured, skipping email agent notification');
      return undefined;
    }

    try {
      const response = await fetch(`${agentUrl}/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Api-Key': process.env.AGENT_API_KEY || '',
        },
        body: JSON.stringify({
          ...payload,
          frontendUrl: process.env.FRONTEND_URL,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Email agent returned ${response.status}: ${body}`);
        return 'Email non envoye';
      }

      this.logger.log(`Email agent notified for ${payload.email}`);
      return undefined;
    } catch (err) {
      this.logger.warn(`Email agent unreachable: ${(err as Error).message}`);
      return undefined;
    }
  }

  private generateSecurePassword(): string {
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);

    let password = '';
    password += LOWERCASE[array[0] % LOWERCASE.length];
    password += UPPERCASE[array[1] % UPPERCASE.length];
    password += DIGITS[array[2] % DIGITS.length];
    password += SYMBOLS[array[3] % SYMBOLS.length];

    for (let i = 4; i < 12; i++) {
      password += ALL[array[i] % ALL.length];
    }

    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}
