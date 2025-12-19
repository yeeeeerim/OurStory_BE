import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CreateDiaryDto } from './dto/create-diary.dto';
import type { UpdateDiaryDto } from './dto/update-diary.dto';
import { DiaryService } from './diary.service';

@Controller('diary')
@UseGuards(AuthGuard('jwt'))
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Post()
  create(@Request() req, @Body() body: CreateDiaryDto) {
    return this.diaryService.create(req.user.userId, body);
  }

  @Get()
  findAll(@Request() req) {
    return this.diaryService.list(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.diaryService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() body: UpdateDiaryDto) {
    return this.diaryService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.diaryService.remove(req.user.userId, id);
  }

  @Get(':id/comments')
  listComments(@Request() req, @Param('id') id: string) {
    return this.diaryService.listComments(req.user.userId, id);
  }

  @Post(':id/comments')
  addComment(@Request() req, @Param('id') id: string, @Body() body: { content: string }) {
    return this.diaryService.addComment(req.user.userId, id, body?.content ?? '');
  }

  @Delete('comments/:commentId')
  deleteComment(@Request() req, @Param('commentId') commentId: string) {
    return this.diaryService.deleteComment(req.user.userId, commentId);
  }
}
