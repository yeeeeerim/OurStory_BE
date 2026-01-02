import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(AuthGuard('jwt'))
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('config')
  getConfig() {
    return this.pushService.getConfig();
  }

  @Get('subscriptions')
  listSubscriptions(@Request() req) {
    return this.pushService.listSubscriptions(req.user.userId);
  }

  @Post('subscriptions')
  upsertSubscription(
    @Request() req,
    @Body() body: CreatePushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.pushService.upsertSubscription(
      req.user.userId,
      body,
      userAgent,
    );
  }

  @Delete('subscriptions')
  removeSubscription(@Request() req, @Query('endpoint') endpoint: string) {
    return this.pushService.removeSubscription(req.user.userId, endpoint);
  }
}
