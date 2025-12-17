import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import type { UpdateNotificationsDto } from './dto/update-notifications.dto';

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@Request() req) {
    return this.settingsService.getSettings(req.user.userId);
  }

  @Patch('notifications')
  updateNotifications(@Request() req, @Body() body: UpdateNotificationsDto) {
    return this.settingsService.updateNotificationSettings(
      req.user.userId,
      body,
    );
  }
}
