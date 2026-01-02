import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
