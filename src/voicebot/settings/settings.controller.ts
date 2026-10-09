import { Body, Controller, Get, HttpStatus, Post, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ResponseUtil } from '../utils/response.util';
import { RequestWithUser } from '../../common/@types/nest.types';
import {
  OutBoundSettings,
  InBoundSettings,
  ReminderPreference,
} from '../schema/voicebot-setting.schema';
import { FollowupSettingDto } from '../dto/voice-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post('/outbound')
  async updateOutboundSettings(
    @Req() req: RequestWithUser,
    @Body() payload: OutBoundSettings,
  ) {
    try {
      const userId = req.user._id.toString();
      const email = req.user.email;
      const result = await this.settingsService.updateOutboundSettings(
        userId,
        payload,
        email,
      );
      return ResponseUtil.success(
        result,
        'Outbound settings updated successfully',
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message ||
          error.response ||
          error.response?.data?.message ||
          'Internal Server Error',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/inbound')
  async updateInboundSettings(
    @Req() req: RequestWithUser,
    @Body() payload: InBoundSettings,
  ) {
    try {
      const userId = req.user._id.toString();
      const email = req.user.email;
      const result = await this.settingsService.updateInboundSettings(
        userId,
        payload,
        email,
      );
      return ResponseUtil.success(
        result,
        'Inbound settings updated successfully',
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message ||
          error.response ||
          error.response?.data?.message ||
          'Internal Server Error',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/reminder')
  async updateReminderSettings(
    @Req() req: RequestWithUser,
    @Body()
    payload: {
      setReminderBeforeMeeting: { value: number }[];
      reminderPreference: ReminderPreference;
    },
  ) {
    try {
      const userId = req.user._id.toString();
      const email = req.user.email;
      const result = await this.settingsService.updateReminderSettings(
        userId,
        payload,
        email,
      );
      return ResponseUtil.success(
        result,
        'Reminder settings updated successfully',
      );
    } catch (error) {
      return ResponseUtil.error('Internal Server Error', error.statusCode);
    }
  }

  @Post('followup')
  async updateFollowUpSettings(
    @Req() req: RequestWithUser,
    @Body()
    payload: FollowupSettingDto,
  ) {
    try {
      const userId = req.user._id.toString();
      const email = req.user.email;
      const result = await this.settingsService.updateFollowUpSettings(
        userId,
        payload,
        email,
      );
      return ResponseUtil.success(
        result,
        'Follow up settings updated successfully',
      );
    } catch (error) {
      return ResponseUtil.error('Internal Server Error', error.statusCode);
    }
  }

  @Get('/get')
  async getSettings(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toString();
      const result = await this.settingsService.getSettings(userId);
      return ResponseUtil.success(result, 'Settings retrieved successfully');
    } catch (error) {
      return ResponseUtil.error('Internal Server Error', error.statusCode);
    }
  }
}
