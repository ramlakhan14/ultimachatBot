import { forwardRef, Module } from '@nestjs/common';
import { MongoModule } from '../common/mongo/mongo.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SettingController } from './setting/setting.controller';
import { FacebookScrapperModule } from '../facebook-scrapper/facebook-scrapper.module';

@Module({
  imports: [
    MongoModule,
    forwardRef(() => SubscriptionModule),
    FacebookScrapperModule,
  ],
  controllers: [AdminController, SettingController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
