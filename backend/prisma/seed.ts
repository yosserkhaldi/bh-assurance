import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bh-assurance.tn' },
    update: {},
    create: {
      email: 'admin@bh-assurance.tn',
      passwordHash: await hash('Admin123!', 12),
      firstName: 'Administrateur',
      lastName: 'BH Assurance',
      role: 'ADMIN',
    },
  });

  const examples = [
    {
      establishment: { businessName: 'Clinique El Amen', rne: 'RNE-DEMO-001', address: '12 avenue Habib Bourguiba, Tunis', governorate: 'TUNIS' as const, managerName: 'Amel Ben Salah', phone: '+216 71 100 101', email: 'contact@clinique-elamen.tn' },
      contract: { number: 'CTR-DEMO-001', type: 'FLEET' as const, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), status: 'ACTIVE' as const },
      vehicle: { registrationNumber: '101 TUN 1001', make: 'Peugeot', model: 'Partner', year: 2023, chassisNumber: 'DEMO-CHASSIS-001', type: 'VAN' as const },
    },
    {
      establishment: { businessName: 'Société Sahel Transport', rne: 'RNE-DEMO-002', address: '45 route de Monastir, Sousse', governorate: 'SOUSSE' as const, managerName: 'Mohamed Trabelsi', phone: '+216 73 200 202', email: 'contact@sahel-transport.tn' },
      contract: { number: 'CTR-DEMO-002', type: 'INDIVIDUAL' as const, startDate: new Date('2026-03-01'), endDate: new Date('2027-02-28'), status: 'ACTIVE' as const },
      vehicle: { registrationNumber: '202 TUN 2002', make: 'Renault', model: 'Clio', year: 2024, chassisNumber: 'DEMO-CHASSIS-002', type: 'CAR' as const },
    },
    {
      establishment: { businessName: 'Industries du Sud', rne: 'RNE-DEMO-003', address: '8 zone industrielle El Agareb, Sfax', governorate: 'SFAX' as const, managerName: 'Sarra Kammoun', phone: '+216 74 300 303', email: 'contact@industries-sud.tn' },
      contract: { number: 'CTR-DEMO-003', type: 'TEMPORARY' as const, startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30'), status: 'ACTIVE' as const },
      vehicle: { registrationNumber: '303 TUN 3003', make: 'Iveco', model: 'Daily', year: 2022, chassisNumber: 'DEMO-CHASSIS-003', type: 'TRUCK' as const },
    },
  ];

  for (const example of examples) {
    const establishment = await prisma.establishment.upsert({
      where: { rne: example.establishment.rne },
      update: example.establishment,
      create: { ...example.establishment, createdById: admin.id, updatedById: admin.id },
    });
    const contract = await prisma.contract.upsert({
      where: { number: example.contract.number },
      update: { ...example.contract, establishmentId: establishment.id },
      create: { ...example.contract, establishmentId: establishment.id, createdById: admin.id, updatedById: admin.id },
    });
    await prisma.vehicle.upsert({
      where: { registrationNumber: example.vehicle.registrationNumber },
      update: { ...example.vehicle, contractId: contract.id },
      create: { ...example.vehicle, contractId: contract.id, createdById: admin.id, updatedById: admin.id },
    });
  }
}

main().finally(() => prisma.$disconnect());
