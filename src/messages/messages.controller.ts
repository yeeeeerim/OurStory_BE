import {
  Controller,
  Put,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('couple/:coupleId/messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Put('me')
  updateMyMessage(
    @Request() req,
    @Param('coupleId') coupleId: string,
    @Body('content') content: string,
  ) {
    return this.messagesService.updateMyMessage(
      req.user.userId,
      coupleId,
      content,
    );
  }

  @Get('history')
  getMessageHistory(
    @Request() req,
    @Param('coupleId') coupleId: string,
    @Query('scope') scope: 'received' | 'sent' = 'received',
    @Query('page') page: string = '1',
    @Query('size') size: string = '20',
  ) {
    return this.messagesService.getMessageHistory(
      req.user.userId,
      coupleId,
      scope,
      parseInt(page),
      parseInt(size),
    );
  }
}
