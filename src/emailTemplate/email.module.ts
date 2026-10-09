import { forwardRef, Module } from '@nestjs/common';
import { MongoModule } from '../common/mongo/mongo.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { EmailTemplateService } from './email.service';
import { EmailTemplateController } from './email.controller';

@Module({
  imports: [MongoModule, forwardRef(() => SubscriptionModule)],
  controllers: [EmailTemplateController],
  providers: [EmailTemplateService],
  exports: [EmailTemplateService],
})
export class EmailTemplateModule {}
