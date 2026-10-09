import { forwardRef, Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { MongoModule } from '../common/mongo/mongo.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongoModule,
    forwardRef(() => SubscriptionModule),
    SubscriptionModule,
    forwardRef(() => UserModule),
  ],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
