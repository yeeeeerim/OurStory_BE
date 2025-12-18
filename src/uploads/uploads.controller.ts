import { BadRequestException, Body, Controller, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // Ensure file.buffer is available (memory storage) for our local write.
      storage: (require('multer') as typeof import('multer')).memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(@Request() req, @Body() body: { type?: string }, @UploadedFile() file?: any) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const type = body.type;
    return this.uploadsService.save(req.user.userId, type, file);
  }
}
