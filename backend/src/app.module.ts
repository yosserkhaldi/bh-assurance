import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AdvancedModule } from './advanced/advanced.module';
import { AuditInterceptor } from './common/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { ContractsModule } from './contracts/contracts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EstablishmentsModule,
    ContractsModule,
    VehiclesModule,
    DashboardModule,
    AdvancedModule,
  ],
})
export class AppModule {}

