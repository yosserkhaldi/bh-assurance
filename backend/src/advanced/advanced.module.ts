import { Module } from '@nestjs/common';
import { AdvancedController } from './advanced.controller';
import { AdvancedService } from './advanced.service';

@Module({ controllers: [AdvancedController], providers: [AdvancedService] })
export class AdvancedModule {}
