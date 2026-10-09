import { forwardRef, Module } from '@nestjs/common';
import { EmailAssistanceService } from './email-assistance.service';
import { EmailAssistanceController } from './email-assistance.controller';
import { MongoModule } from '../common/mongo/mongo.module';
import { GmailService } from '../campaign/email-console/googleGmailApiOperation.service';
import { ImapService } from '../campaign/campaign-utils/nodeImap.service';
import { EmailAssistantCronService } from './cron/email.assistant.cron.service';
import { ConsoleModule } from '../campaign/email-console/email-console.module';
import { CampaignModule } from '../campaign/campaign.module';
@Module({
  imports: [MongoModule, ConsoleModule, forwardRef(() => CampaignModule)],
  controllers: [EmailAssistanceController],
  providers: [
    EmailAssistanceService,
    EmailAssistantCronService,
  ],
  exports: [EmailAssistanceService],
})
export class EmailAssistanceModule {}
