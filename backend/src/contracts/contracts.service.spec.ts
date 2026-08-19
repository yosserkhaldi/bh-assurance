import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: {
            contract: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: EventsService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ContractsService);
    prisma = module.get(PrismaService);
  });

  it('should not create a second active contract for the same establishment', async () => {
    const existingContract = {
      id: 'existing-contract-id',
      number: 'CNT-001',
      establishmentId: 'establishment-id',
    } as any;

    jest.spyOn(prisma.contract, 'findFirst').mockResolvedValue(existingContract);

    await expect(
      service.create(
        {
          number: 'CNT-002',
          type: 'FLEET',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          establishmentId: 'establishment-id',
        },
        'user-id',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.contract.findFirst).toHaveBeenCalledWith({
      where: {
        establishmentId: 'establishment-id',
        deletedAt: null,
      },
    });
    expect(prisma.contract.create).not.toHaveBeenCalled();
  });
});
