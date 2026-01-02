import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CreateScheduleEventDto } from './dto/create-event.dto';
import type { UpdateScheduleEventDto } from './dto/update-event.dto';
import type { CreateScheduleLabelDto } from './dto/create-label.dto';
import type { UpdateScheduleLabelDto } from './dto/update-label.dto';
import { ScheduleService } from './schedule.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get('calendar')
  calendar(
    @Request() req,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.service.getCalendar(req.user.userId, fromDate, toDate);
  }

  @Get('schedule-labels')
  listLabels(@Request() req) {
    return this.service.listLabels(req.user.userId);
  }

  @Post('schedule-labels')
  createLabel(@Request() req, @Body() body: CreateScheduleLabelDto) {
    return this.service.createLabel(req.user.userId, body);
  }

  @Patch('schedule-labels/:id')
  updateLabel(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateScheduleLabelDto,
  ) {
    return this.service.updateLabel(req.user.userId, id, body);
  }

  @Delete('schedule-labels/:id')
  deleteLabel(@Request() req, @Param('id') id: string) {
    return this.service.deleteLabel(req.user.userId, id);
  }

  @Get('schedule-events')
  listEvents(
    @Request() req,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.listEvents(
      req.user.userId,
      new Date(from),
      new Date(to),
    );
  }

  @Post('schedule-events')
  createEvent(@Request() req, @Body() body: CreateScheduleEventDto) {
    return this.service.createEvent(req.user.userId, body);
  }

  @Patch('schedule-events/:id')
  updateEvent(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateScheduleEventDto,
  ) {
    return this.service.updateEvent(req.user.userId, id, body);
  }

  @Delete('schedule-events/:id')
  deleteEvent(@Request() req, @Param('id') id: string) {
    return this.service.deleteEvent(req.user.userId, id);
  }
}
