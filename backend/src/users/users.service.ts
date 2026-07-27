import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { hash } from 'bcrypt';
import { PaginationDto, pageMeta } from '../common/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationDto) {
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { lastName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: query.order },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: pageMeta(total, query.page, query.limit) };
  }

  async create(input: {
    email: string; password: string; firstName: string; lastName: string; role: UserRole;
  }) {
    const { password, ...profile } = input;
    return this.prisma.user.create({
      data: { ...profile, email: input.email.toLowerCase(), passwordHash: await hash(password, 12) },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });
  }

  async update(id: string, input: Partial<{ firstName: string; lastName: string; role: UserRole; status: UserStatus }>) {
    await this.exists(id);
    return this.prisma.user.update({
      where: { id },
      data: input,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });
  }

  async remove(id: string) {
    await this.exists(id);
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
  }

  private async exists(id: string) {
    if (!(await this.prisma.user.findFirst({ where: { id, deletedAt: null } }))) {
      throw new NotFoundException('Utilisateur introuvable');
    }
  }
}


