import { Module } from '@nestjs/common';
import { CoupleService } from './couple.service';
import { CoupleController } from './couple.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CoupleController],
  providers: [CoupleService, PrismaService],
  exports: [CoupleService],
})
export class CoupleModule {}
