import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            authSession: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'jwt-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              return null;
            }),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
  });

  it('should reject invalid credentials with UnauthorizedException', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@bh-assurance.tn', password: 'WrongPassword123!' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'unknown@bh-assurance.tn' },
    });
  });

  it('should return accessToken and refreshToken for valid admin credentials', async () => {
    const passwordHash = await hash('Admin123!', 10);
    const user = {
      id: 'admin-id',
      email: 'admin@bh-assurance.tn',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    } as any;

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user);
    jest.spyOn(prisma.user, 'update').mockResolvedValue(user);
    jest.spyOn(prisma.authSession, 'create').mockResolvedValue({ id: 'session-id' } as any);

    const result = await service.login({ email: 'admin@bh-assurance.tn', password: 'Admin123!' });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toEqual({ id: user.id, email: user.email, role: user.role });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(prisma.authSession.create).toHaveBeenCalled();
  });
});
