import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlacesService } from './places.service';
import type { SelectPlaceDto } from './dto/select-place.dto';

@Controller('places')
@UseGuards(AuthGuard('jwt'))
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  search(@Request() req, @Query('q') q: string) {
    return this.placesService.search(req.user.userId, q);
  }

  @Get('nearby')
  nearby(@Request() req, @Query('lat') lat: string, @Query('lng') lng: string) {
    return this.placesService.nearby(req.user.userId, Number(lat), Number(lng));
  }

  @Post('select')
  select(@Request() req, @Body() body: SelectPlaceDto) {
    return this.placesService.select(req.user.userId, body.placeId);
  }
}
