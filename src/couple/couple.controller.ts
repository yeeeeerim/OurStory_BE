import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  UseGuards,
  Request,
  Put,
  Param,
} from '@nestjs/common';
import { CoupleService } from './couple.service';
import { AuthGuard } from '@nestjs/passport';
import type { AnniversaryDto } from './dto/anniversary.dto';

@Controller('couple')
@UseGuards(AuthGuard('jwt'))
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Post()
  create(@Request() req) {
    return this.coupleService.createCouple(req.user.userId);
  }

  @Post('join')
  join(@Request() req, @Body('code') code: string) {
    return this.coupleService.joinCouple(req.user.userId, code);
  }

  @Post('cancel')
  cancelPending(@Request() req) {
    return this.coupleService.cancelPending(req.user.userId);
  }

  @Delete()
  leave(@Request() req) {
    return this.coupleService.leaveCouple(req.user.userId);
  }

  @Get('status')
  getStatus(@Request() req) {
    return this.coupleService.getStatus(req.user.userId);
  }

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.coupleService.getDashboard(req.user.userId);
  }

  @Get('anniversaries')
  getAnniversaries(@Request() req) {
    return this.coupleService.getAnniversaries(req.user.userId);
  }

  @Post('anniversaries')
  createAnniversary(@Request() req, @Body() body: AnniversaryDto) {
    return this.coupleService.createAnniversary(req.user.userId, body);
  }

  @Put('anniversaries/:id')
  updateAnniversary(
    @Request() req,
    @Param('id') id: string,
    @Body() body: Partial<AnniversaryDto>,
  ) {
    return this.coupleService.updateAnniversary(req.user.userId, id, body);
  }

  @Delete('anniversaries/:id')
  deleteAnniversary(@Request() req, @Param('id') id: string) {
    return this.coupleService.deleteAnniversary(req.user.userId, id);
  }
}
