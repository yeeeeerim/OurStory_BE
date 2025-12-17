import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import type { UpdateNotificationsDto } from './dto/update-notifications.dto';
import type { UpdateThemeDto } from './dto/update-theme.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

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

  @Patch('theme')
  updateTheme(@Request() req, @Body() body: UpdateThemeDto) {
    return this.settingsService.updateThemeColor(req.user.userId, body.themeColor);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    return this.settingsService.updateProfile(req.user.userId, body);
  }
}
