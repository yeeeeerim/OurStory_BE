import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryController } from './diary.controller';
import { PrismaModule } from '../prisma.module';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [PrismaModule, PlacesModule],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}
