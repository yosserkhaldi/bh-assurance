import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AgentApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AgentApiKeyGuard.name);
  private warned = false;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const expected = process.env.AGENT_API_KEY;

    if (!expected) {
      if (!this.warned) {
        this.logger.warn('AGENT_API_KEY is not configured. Onboarding endpoint is disabled.');
        this.warned = true;
      }
      throw new UnauthorizedException('Agent API key not configured');
    }

    const provided = request.headers['x-agent-api-key'];
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid agent API key');
    }

    return true;
  }
}
