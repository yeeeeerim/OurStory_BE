import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CreatePlaceLogDto } from './dto/create-place-log.dto';
import { PlaceLogsService } from './place-logs.service';

@Controller('place-logs')
@UseGuards(AuthGuard('jwt'))
export class PlaceLogsController {
  constructor(private readonly service: PlaceLogsService) {}

  @Get()
  list(
    @Request() req,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.service.list(
      req.user.userId,
      Number(page || '1'),
      Number(size || '20'),
    );
  }

  @Get('marker/:placeMarkerId')
  listByMarker(@Request() req, @Param('placeMarkerId') placeMarkerId: string) {
    return this.service.listByMarker(req.user.userId, placeMarkerId);
  }

  @Post()
  create(@Request() req, @Body() body: CreatePlaceLogDto) {
    return this.service.create(req.user.userId, body);
  }
}
