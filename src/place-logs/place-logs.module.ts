import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlacesService } from '../places/places.service';
import { PlaceLogsController } from './place-logs.controller';
import { PlaceLogsService } from './place-logs.service';

@Module({
  controllers: [PlaceLogsController],
  providers: [PlaceLogsService, PrismaService, PlacesService],
})
export class PlaceLogsModule {}

