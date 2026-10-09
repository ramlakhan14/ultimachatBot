import { forwardRef, Module } from '@nestjs/common';
import { NodemailerService } from './nodemailer.service';
import { SmtpModule } from '../smtp.module';
import { CampaignModule } from '../../campaign/campaign.module';
import { OpenaiModule } from '../../openai/openai.module';

@Module({
  imports: [
    forwardRef(() => SmtpModule),
    forwardRef(() => CampaignModule),
    forwardRef(() => OpenaiModule),
  ],
  providers: [NodemailerService],
  exports: [NodemailerService],
})
export class NodemailerModule {}
