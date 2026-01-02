import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryController } from './diary.controller';
import { PrismaModule } from '../prisma.module';
import { PlacesModule } from '../places/places.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PrismaModule, PlacesModule, PushModule],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}
