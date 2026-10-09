import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullMqService } from './bullMq.service';
import { BullMqEmailProcessor } from './bullMq.email.processor';
import {
  BullConnectionConfig,
  BullCronQueueOption,
  BullEmailQueueOption,
  BullScheduleQueueOption,
  BullVoiceCampaignOption,
  BullNotificationQueueOption,
} from '../config/bullMq.config';
import { BullMqWorker } from './bullMq.worker';
import { BullMqScheduleProcessor } from './bullMq.schedule.processor';
import { CampaignModule } from '../campaign.module';
import { BullMqCronProcessor } from './bullMq.cron.processor';
import { AdminPostmarkModule } from '../postmark/admin-postmark.module';
import { VoiceBotProcessor } from './bullMq.voiceBot.processor';
import { VoicebotModule } from '../../voicebot/voicebot/voicebot.module';
import { NotificationProcessor } from './bullMq.reminder-calls';
import { EmailModule } from '../../common/email/email.module';
import { SmtpModule } from '../../smtp/smtp.module';
import { NodemailerModule } from '../../smtp/nodemailer/nodemailer.module';
import { MongoModule } from '../../common/mongo/mongo.module';

@Module({
  imports: [
    MongoModule,
    forwardRef(() => VoicebotModule),
    AdminPostmarkModule,
    EmailModule,
    forwardRef(() => CampaignModule),
    BullModule.forRoot({
      connection: BullConnectionConfig,
    }),
    SmtpModule,
    forwardRef(() => NodemailerModule),
    BullModule.registerQueue(
      BullEmailQueueOption,
      BullScheduleQueueOption,
      BullCronQueueOption,
      BullVoiceCampaignOption,
      BullNotificationQueueOption,
    ),
  ],
  providers: [
    BullMqService,
    BullMqEmailProcessor,
    VoiceBotProcessor,
    AdminPostmarkModule,
    BullMqWorker,
    BullMqScheduleProcessor,
    BullMqCronProcessor,
    NotificationProcessor,
  ],
  exports: [
    BullMqService,
    BullMqWorker,
    BullMqEmailProcessor,
    BullMqScheduleProcessor,
    BullMqCronProcessor,
    VoiceBotProcessor,
    NotificationProcessor,
    BullModule,
  ],
})
export class BullMqModule {}
