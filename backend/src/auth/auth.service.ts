import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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
    if (!user || user.deletedAt || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    const pendingActivation = user.status === 'INACTIVE' && user.forcePasswordChange;
    if (user.status !== 'ACTIVE' && !pendingActivation) {
      throw new UnauthorizedException('Compte inactif. Contactez votre administrateur.');
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
    const dbUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { forcePasswordChange: true } });
    return { accessToken, refreshToken, user: { id: userId, email, role, requiresPasswordChange: dbUser?.forcePasswordChange ?? false } };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    if (!complexity.test(newPassword) || newPassword.length < 8) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule, un chiffre et un caractere special');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(newPassword, 12), forcePasswordChange: false, status: 'ACTIVE' },
    });

    // Notifier tous les administrateurs qu'un employé a changé son mot de passe
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE', id: { not: userId } },
      select: { id: true },
    });

    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'Mot de passe modifie',
          message: `${user.firstName} ${user.lastName} (${user.email}) a change son mot de passe.`,
          type: 'INFO' as const,
        })),
      });
    }

    return { message: 'Mot de passe modifie avec succes' };
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
