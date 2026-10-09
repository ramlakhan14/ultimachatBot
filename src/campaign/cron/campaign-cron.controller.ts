import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CronService } from './campaign-cron.service';
import { Public } from '../../auth/guards/public.guard';

@Public()
@Controller('campaign-cron')
export class CampaignCronController {
  constructor(private readonly cronService: CronService) {}

  /**
   * Manually trigger the campaign cron job that runs daily at 10AM.
   */
  @Get('run-campaign')
  @HttpCode(HttpStatus.OK)
  async runCampaignCron(): Promise<{ message: string }> {
    await this.cronService.handleCampaign();
    return { message: 'Campaign cron job executed successfully.' };
  }

  /**
   * Manually trigger the email sender signature status check cron.
   */
  @Get('check-email-signature-status')
  @HttpCode(HttpStatus.OK)
  async checkEmailSignatureStatus(): Promise<{ message: string }> {
    await this.cronService.handleEmailSenderSignatureStatus();
    return {
      message: 'Email sender signature status check executed successfully.',
    };
  }

  /**
   * Manually trigger the email conversation cron.
   */
  @Get('run-email-conversation')
  @HttpCode(HttpStatus.OK)
  async runEmailConversation(): Promise<{ message: string }> {
    await this.cronService.handleEmailConversation();
    return { message: 'Email conversation cron executed successfully.' };
  }

  /**
   * Manually trigger the follow up email cron.
   */
  @Get('run-followup-email')
  @HttpCode(HttpStatus.OK)
  async runFollowUpEmail(): Promise<{ message: string }> {
    await this.cronService.handleFollowUpEmail();
    return { message: 'Follow up email cron executed successfully.' };
  }

  /**
   * Manually trigger the Gmail draft sync cron.
   */
  @Get('run-gmail-draft')
  @HttpCode(HttpStatus.OK)
  async runGmailDraft(): Promise<{ message: string }> {
    await this.cronService.handleGmailDraft();
    return { message: 'Gmail draft cron executed successfully.' };
  }

  /**
   * Manually trigger the voice bot campaign cron.
   */
  @Get('run-voicebot-campaign')
  @HttpCode(HttpStatus.OK)
  async runVoiceBotCampaign(): Promise<{ message: string }> {
    await this.cronService.startVoiceBotCampaign();
    return { message: 'Voice bot campaign cron executed successfully.' };
  }
}
