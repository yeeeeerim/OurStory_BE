import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlaceCategoriesController } from './place-categories.controller';
import { PlaceCategoriesService } from './place-categories.service';
import { PlaceMarkersController } from './place-markers.controller';
import { PlaceMarkersService } from './place-markers.service';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  controllers: [PlacesController, PlaceCategoriesController, PlaceMarkersController],
  providers: [PlacesService, PlaceCategoriesService, PlaceMarkersService, PrismaService],
})
export class PlacesModule {}
