import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { MailiveryWarmupService } from './mailivery-warmup.service';
import { CreateSmtpCampaignDto } from './dto/create-smtp-campaign.dto';
import { GetCampaignsDto } from './dto/get-campaigns.dto';
import { PatchCampaignDto } from './dto/patch-campaign.dto';
import { CreateGmailCampaignDto } from './dto/create-gmail-campaign.dto';
import { RequestWithUser } from '../common/@types/nest.types';
import { ResponseUtil } from '../utils/response.util';
@Controller('mailivery-warmup')
export class MailiveryWarmupController {
  constructor(private readonly mailwarmupservice: MailiveryWarmupService) {}

  @Post('campaigns/smtp')
  async createSmtp(
    @Req() req: RequestWithUser,
    @Body() dto: CreateSmtpCampaignDto,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.createSmtpCampaign(
        dto,
        userId,
      );
      return ResponseUtil.success(result, 'SMTP campaign created');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to Create Warmup Email Listing, Please try again',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('campaigns')
  async list(
    @Req() req: RequestWithUser,
    @Query() query: GetCampaignsDto,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status: string,
    @Query('search') search: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.listCampaigns(
        query,
        userId,
        Number(page),
        Number(limit),
        status,
        search,
      );
      return ResponseUtil.success(result, 'Campaigns listed');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch the lisitng of the warm up Emails',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('campaigns/bulk-update')
  async update(@Req() req: RequestWithUser, @Body() dto: PatchCampaignDto) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.patchCampaign(dto, userId);
      return result;
      // return ResponseUtil.success(result, 'Campaign updated');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to update the warm up Emails',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('campaigns/:id')
  async getEmailBox(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.getEmailBoxById(id, userId);
      return ResponseUtil.success(result, 'Campaign fetched');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch the warm up Email details',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('campaigns/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.mailwarmupservice.deleteCampaign(id);
      return ResponseUtil.success(result, 'Campaign deleted');
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

  @Patch('campaigns/:id/start-warmup')
  async startWarmup(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.startWarmup(id, userId);
      return ResponseUtil.success(result, 'Warmup started');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to start warmup, Please try again',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('campaigns/:id/pause-warmup')
  async PauseWarmUp(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.pauseWarmup(id, userId);
      return ResponseUtil.success(result, 'Warmup paused');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to pause warmup, Please try again',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('campaigns/:id/resume-warmup')
  async ResumeWarmUp(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.resumeWarmup(id, userId);
      return ResponseUtil.success(result, 'Warmup resumed');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to resume warmup, Please try again',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('campaigns/:id/get-metrics')
  async metrics(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.mailwarmupservice.getMetrics(id);
      return ResponseUtil.success(result, 'Metrics fetched');
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

  @Patch('campaigns/connections/recheck')
  async recheck() {
    try {
      const result = await this.mailwarmupservice.recheckConnections();
      return ResponseUtil.success(result, 'Connections rechecked');
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

  @Post('campaigns/sendgrid')
  async createSendgrid(@Body() config: { api_key: string; email: string }) {
    const result = await this.mailwarmupservice.createSendgridCampaign(config);
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: result.message ?? 'SendGrid campaign created',
      data: result.data,
    };
  }

  @Post('campaigns/google')
  async createGoogle(@Body() config: CreateGmailCampaignDto) {
    const result = await this.mailwarmupservice.createGoogleCampaign(config);
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: result.message ?? 'Google campaign created',
      data: result.data,
    };
  }

  @Patch('campaigns/:id/rampup')
  async rampup(
    @Param('id', ParseIntPipe) id: number,
    @Body('speed') speed: 'slow' | 'normal' | 'fast',
  ) {
    const result = await this.mailwarmupservice.rampupCampaign(id, speed);
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: result.message ?? 'Rampup initiated',
      data: result.data,
    };
  }

  @Patch('campaigns/:id/update-email-per-day')
  async updateEmailPerDay(
    @Param('id', ParseIntPipe) id: number,
    @Body('emailsPerDay') emailsPerDay: number,
  ) {
    const result = await this.mailwarmupservice.updateEmailPerDay(
      id,
      emailsPerDay,
    );
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: 'Emails per day updated',
      data: result.data,
    };
  }

  @Post('warmup-templates')
  async createWarmupTemplate(@Body() data: any) {
    const result = await this.mailwarmupservice.createWarmupTemplate(data);
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: result.message ?? 'Warm-up template created',
      data: result.data,
    };
  }

  @Patch('warmup-templates/:templateId')
  async updateWarmupTemplate(
    @Param('templateId') templateId: string,
    @Body() data: any,
  ) {
    const result = await this.mailwarmupservice.updateWarmupTemplate(
      templateId,
      data,
    );
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: result.message ?? 'Warm-up template updated',
      data: result.data,
    };
  }

  @Delete('warmup-templates/:templateId')
  async deleteWarmupTemplate(@Param('templateId') templateId: string) {
    const result = await this.mailwarmupservice.deleteWarmupTemplate(
      templateId,
    );
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: result.message ?? 'Warm-up template deleted',
      data: result.data,
    };
  }

  @Get('warmup-templates')
  async getWarmupTemplates() {
    const result = await this.mailwarmupservice.getWarmupTemplates();
    return {
      statusCode: result.statusCode ?? HttpStatus.OK,
      message: result.message ?? 'Warm-up templates retrieved',
      data: result.data,
    };
  }

  @Patch('campaigns/:id/fetch-ramp-up-status')
  async fetchRampUpStatus(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.fetchRampUpStatus(id, userId);
      return {
        statusCode: result.statusCode ?? HttpStatus.OK,
        message: result.message ?? 'Ramp-up status fetched',
        data: result.data,
      };
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch ramp-up status, Please try again',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('campaigns/:id/update-response-rate')
  async UpdateResponseRate(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body('response_rate') response_rate: number,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.mailwarmupservice.updateResponseRate(
        id,
        userId,
        response_rate,
      );
      return ResponseUtil.success(result, 'Response rate updated');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to update response rate, Please try again',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Patch('campaigns/:id/enable-ramp-up')
  // async enableRampUp(
  //   @Req() req: RequestWithUser,
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body('rampup_speed') rampup_speed: 'slow' | 'normal' | 'fast',
  // ) {
  //   try {
  //     const userId = req.user._id.toHexString();
  //     const result = await this.mailwarmupservice.enableRampUp(
  //       id,
  //       userId,
  //       rampup_speed,
  //     );
  //     return ResponseUtil.success(result, 'Ramp-up status updated');
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message ||
  //         error.response ||
  //         error.response?.data?.message ||
  //         'Internal Server Error',
  //       error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  @Patch('campaigns/bulk-enable-ramp-up')
  async enableRampUpBulk(
    @Req() req: RequestWithUser,
    @Body('Ids') Ids: number[],
    @Body('rampup_speed') rampup_speed: 'slow' | 'normal' | 'fast',
  ) {
    try {
      const userId = req.user._id.toHexString();

      if (!Ids || !Ids.length) {
        throw new BadRequestException('Ids array is required');
      }

      const results = [];
      for (const id of Ids) {
        try {
          const result = await this.mailwarmupservice.enableRampUp(
            Number(id),
            userId,
            rampup_speed,
          );
          results.push(result);
        } catch (error) {
          results.push({
            message:
              error.message ||
              error.response?.data?.message ||
              'Failed to enable ramp-up',
          });
        }
      }
      return results[0];
      // return ResponseUtil.success(results, 'Ramp-up status updated');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to enable ramp-up, Please try again',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Patch('campaigns/:id/disable-ramp-up')
  // async disableRampUp(
  //   @Req() req: RequestWithUser,
  //   @Param('id', ParseIntPipe) id: number,
  // ) {
  //   try {
  //     const userId = req.user._id.toHexString();
  //     const result = await this.mailwarmupservice.disableRampUp(id, userId);
  //     return ResponseUtil.success(result, 'Ramp-up status updated');
  //   } catch (error) {
  //     return ResponseUtil.error(
  //       error.message ||
  //         error.response ||
  //         error.response?.data?.message ||
  //         'Internal Server Error',
  //       error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  @Patch('campaigns/bulk-disable-ramp-up')
  async disableRampUpBulk(
    @Req() req: RequestWithUser,
    @Body('Ids') Ids: number[],
  ) {
    try {
      const userId = req.user._id.toHexString();

      if (!Ids || !Ids.length) {
        throw new BadRequestException('Ids array is required');
      }

      const results = [];

      for (const id of Ids) {
        try {
          const result = await this.mailwarmupservice.disableRampUp(
            Number(id),
            userId,
          );
          results.push(result);
        } catch (error) {
          results.push({
            statusCode: error?.response?.statusCode || 400,
            message:
              error.message ||
              error.response?.data?.message ||
              'Failed to disable ramp-up',
          });
        }
      }

      //Already disabled
      const allAlreadyDisabled = results.every(
        (res) =>
          res.statusCode === 400 && res.message === 'Ramp-up already disabled',
      );
      if (allAlreadyDisabled) {
        return {
          statusCode: 400,
          message: 'Ramp-up already disabled',
        };
      }
      return results[0];
      // return ResponseUtil.success(results, 'Ramp-up status updated');
    } catch (error) {
      return ResponseUtil.error(
        'Unable to disable ramp-up, Please try again',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
