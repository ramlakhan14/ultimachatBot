import { forwardRef, Module } from '@nestjs/common';
import { MongoModule } from '../common/mongo/mongo.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UsersController } from './user.controller';
import { UserService } from './user.service';
import { EmailModule } from '../common/email/email.module';
import { CronService } from './user.cron.service';
@Module({
  imports: [MongoModule, EmailModule, forwardRef(() => SubscriptionModule)],
  controllers: [UsersController],
  providers: [UserService, CronService],
  exports: [UserService, CronService],
})
export class UserModule {}
