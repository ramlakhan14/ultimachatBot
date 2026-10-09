import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../common/config/appConfig.module';
import { AdminPostmarkService } from './admin-postmark.service';
import { OpenaiModule } from '../../openai/openai.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [AppConfigModule, OpenaiModule, EmailModule],
  providers: [AdminPostmarkService],
  exports: [AdminPostmarkService],
})
export class AdminPostmarkModule {}
