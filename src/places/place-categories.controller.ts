import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CreatePlaceCategoryDto } from './dto/create-place-category.dto';
import type { UpdatePlaceCategoryDto } from './dto/update-place-category.dto';
import { PlaceCategoriesService } from './place-categories.service';

@Controller('place-categories')
@UseGuards(AuthGuard('jwt'))
export class PlaceCategoriesController {
  constructor(private readonly service: PlaceCategoriesService) {}

  @Get()
  list(@Request() req) {
    return this.service.list(req.user.userId);
  }

  @Post()
  create(@Request() req, @Body() body: CreatePlaceCategoryDto) {
    return this.service.create(req.user.userId, body);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdatePlaceCategoryDto,
  ) {
    return this.service.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.userId, id);
  }
}
