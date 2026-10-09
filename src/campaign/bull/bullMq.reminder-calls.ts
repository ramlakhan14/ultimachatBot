import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '../../common/email/email.service';
import { VapiService } from '../../voicebot/voicebot/vapi.service';
import { ReminderPreference } from '../../voicebot/schema/voicebot-setting.schema';
import { HttpException, OnModuleInit , Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Processor('notificationQueue')
export class NotificationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger('NotificationProcessor');

  private vapiService: VapiService;

  constructor(
    private readonly emailService: EmailService,
    private readonly moduleRef: ModuleRef, // private readonly vapiService: VapiService,
  ) {
    super();
  }
  async onModuleInit() {
    this.vapiService = this.moduleRef.get(VapiService, { strict: false });
  }

  async process(job: Job) {
    const { email, name, meetDate, userId, userPhoneNumber } = job.data;

    try {

      // Get reminder setting
      const setting = await this.vapiService.checkVoiceReminderSetting(
        userId,
        email,
        name,
        meetDate,
      );

      const reminderPref = setting?.reminderPreference;

      if (reminderPref === ReminderPreference.Email) {
        await this.emailService.sendMeetingNotificationEmail(
          email,
          name,
          meetDate,
          userId,
        );
      } else if (reminderPref === ReminderPreference.Call) {
        await this.vapiService.sendVoiceReminderCall(
          userId,
          email,
          name,
          meetDate,
          userPhoneNumber,
        );
      } else {
        await this.emailService.sendMeetingNotificationEmail(
          email,
          name,
          meetDate,
          userId,
        );
        await this.vapiService.sendVoiceReminderCall(
          userId,
          email,
          name,
          meetDate,
          userPhoneNumber,
        );
      }

      return 'Notification job completed successfully';
    } catch (error) {
      this.logger.error('Error processing job:', error);
      throw new HttpException(
        'Failed to process notification job',
        error.statusCode || 500,
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: any, result: any): void {
  }
}
