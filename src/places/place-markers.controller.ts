import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CreatePlaceMarkerDto } from './dto/create-place-marker.dto';
import type { SavePlaceMarkerDto } from './dto/save-place-marker.dto';
import type { UpdatePlaceMarkerDto } from './dto/update-place-marker.dto';
import { PlaceMarkersService } from './place-markers.service';

@Controller('place-markers')
@UseGuards(AuthGuard('jwt'))
export class PlaceMarkersController {
  constructor(private readonly service: PlaceMarkersService) {}

  @Get()
  list(@Request() req, @Query('bounds') bounds?: string) {
    return this.service.list(req.user.userId, bounds);
  }

  @Post()
  upsert(@Request() req, @Body() body: CreatePlaceMarkerDto) {
    return this.service.upsert(req.user.userId, body);
  }

  @Post('by-google')
  saveByGoogle(@Request() req, @Body() body: SavePlaceMarkerDto) {
    return this.service.saveByGoogle(req.user.userId, body);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() body: UpdatePlaceMarkerDto) {
    return this.service.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string, @Query('force') force?: string) {
    return this.service.remove(req.user.userId, id, force === 'true');
  }
}
