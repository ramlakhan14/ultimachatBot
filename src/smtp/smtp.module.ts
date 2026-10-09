import { forwardRef, Module } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { SmtpController } from './smtp.controller';
import { MongoModule } from '../common/mongo/mongo.module';
import { NodemailerModule } from './nodemailer/nodemailer.module';
import { UserModule } from '../user/user.module';
import { MailiveryWarmupModule } from '../mailivery-warmup/mailivery-warmup.module';
import { EmailAssistanceModule } from '../email-assistance/email-assistance.module';

@Module({
  imports: [
    MongoModule,
    forwardRef(() => NodemailerModule),
    UserModule,
    MailiveryWarmupModule,
    EmailAssistanceModule,
  ],
  controllers: [SmtpController],
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
