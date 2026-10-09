import { forwardRef, Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { LemonSqueezyController } from './lemon-squeezy.controller';
import { SubscriptionPlanInfoService } from './subscription-plan.service';
import { SubscriptionService } from './subscription.service';
import { BillingHistoryService } from './billing-history.service';
import { MongoModule } from '../common/mongo/mongo.module';

@Module({
  imports: [forwardRef(() => UserModule), MongoModule],
  providers: [
    SubscriptionService,
    SubscriptionPlanInfoService,
    BillingHistoryService,
  ],
  controllers: [LemonSqueezyController],
  exports: [SubscriptionPlanInfoService, BillingHistoryService],
})
export class SubscriptionModule {}
