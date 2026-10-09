import { forwardRef, Module } from '@nestjs/common';
import { MongoModule } from '../common/mongo/mongo.module';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { ImapService } from './campaign-utils/nodeImap.service';
import { ImapIdleWatcherService } from './campaign-utils/imapIdleWatcher.service';
import { BullMqModule } from './bull/bullMq.module';
import { ProjectModule } from '../project/project.module';
import { OpenaiModule } from '../openai/openai.module';
import { CronService } from './cron/campaign-cron.service';
import { AdminPostmarkModule } from './postmark/admin-postmark.module';
import { ConsoleModule } from './email-console/email-console.module';
import { EmailTemplateModule } from '../emailTemplate/email.module';
import { EmailAssistanceModule } from '../email-assistance/email-assistance.module';
import { EmailAssistanceService } from '../email-assistance/email-assistance.service';
import { ZapierWebhookModule } from '../zapier-webhook/zapier-webhook.module';
import { SmtpModule } from '../smtp/smtp.module';
import { NodemailerModule } from '../smtp/nodemailer/nodemailer.module';
import { EmailModule } from '../common/email/email.module';
import { VoicebotModule } from '../voicebot/voicebot/voicebot.module';
import { CampaignCronController } from './cron/campaign-cron.controller';
import { RedisModule } from '../common/redis/redis.module';
// import { GoogleCalenderService } from '../knowledgebase/googleCalender/googleCalender.service';
import { KnowledgebaseModule } from '../knowledgebase/knowledgebase.module';
import { UserModule } from '../user/user.module';
@Module({
  imports: [
    MongoModule,
    forwardRef(() => BullMqModule),
    RedisModule,
    ProjectModule,
    OpenaiModule,
    AdminPostmarkModule,
    ConsoleModule,
    EmailTemplateModule,
     forwardRef(() => EmailAssistanceModule),
    ZapierWebhookModule,
    SmtpModule,
    NodemailerModule,
    EmailModule,
    UserModule,
    forwardRef(() => VoicebotModule),
    forwardRef(() => KnowledgebaseModule),
  ],
  controllers: [CampaignController, CampaignCronController],
  providers: [
    CampaignService,
    ImapService,
    ImapIdleWatcherService,
    CronService,
  ],
  exports: [CampaignService, ImapService, ImapIdleWatcherService, CronService],
})
export class CampaignModule {}
