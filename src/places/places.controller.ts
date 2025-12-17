import { Controller, Get, Post, Query, Body, UseGuards, Request } from '@nestjs/common';
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

  @Post('select')
  select(@Request() req, @Body() body: SelectPlaceDto) {
    return this.placesService.select(req.user.userId, body.placeId);
  }
}

