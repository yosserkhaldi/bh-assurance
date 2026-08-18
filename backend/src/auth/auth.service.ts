import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || user.status !== 'ACTIVE' || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(rawToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; role: any }>(
        rawToken,
        { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') },
      );
      const sessions = await this.prisma.authSession.findMany({
        where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      });
      const session = await this.findMatchingSession(rawToken, sessions);
      if (!session) throw new UnauthorizedException();
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      return this.issueTokens(payload.sub, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  async logout(userId: string, refreshToken: string) {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null },
    });
    const session = await this.findMatchingSession(refreshToken, sessions);
    if (session) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Deconnexion effectuee' };
  }

  private async issueTokens(userId: string, email: string, role: any) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
    });
    await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash: await hash(refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, user: { id: userId, email, role } };
  }

  private async findMatchingSession(
    token: string,
    sessions: Array<{ id: string; refreshTokenHash: string }>,
  ) {
    for (const session of sessions) {
      if (await compare(token, session.refreshTokenHash)) return session;
    }
    return null;
  }
}
