// web-push.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Query,
  Req,
  Logger,
} from '@nestjs/common';
import { NotificationService } from './push.service';
import { NotificationDto } from './notification.dto';
import { RequestWithUser } from '../common/@types/nest.types';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  async sendNotification(
    @Req() req: RequestWithUser,
    @Body() body: NotificationDto,
  ) {
    const userId = req.user._id.toHexString();
    this.logger.log(`Sending notification to user: ${userId}`);
    return this.notificationService.sendNotification(body, userId);
  }

  @Get()
  async getMyNotifications(@Req() req: RequestWithUser) {
    const userId = req.user._id.toHexString();
    return this.notificationService.getNotifications(userId);
  }

  @Get('admin/all')
  async getAllNotifications(@Query('userId') userId: string) {
    return this.notificationService.getNotifications(userId);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') notificationId: string) {
    return this.notificationService.markAsRead(notificationId);
  }

  @Put('subscription')
  async updateSubscription(
    @Req() req: RequestWithUser,
    @Body('subscribeStatus') subscribeStatus: boolean,
  ) {
    const userId = req.user._id.toHexString();
    return this.notificationService.updateSubscriptionStatus(
      userId,
      subscribeStatus,
    );
  }
}
