import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MongoModule } from '../mongo/mongo.module';
import { EmailTemplateModule } from '../../emailTemplate/email.module';

@Module({
  imports: [MongoModule, EmailTemplateModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
