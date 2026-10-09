import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongoModule } from '../common/mongo/mongo.module';
import { AppConfigModule } from '../common/config/appConfig.module';
import { UserModule } from '../user/user.module';
import { YellowPagesController } from './yellow-pages.controller';
import { YellowPagesService } from './yellow-pages.service';
import { YellowPagesScrapeQueueOption } from './config/yellow-pages-bull.config';
import { YellowPagesScrapeProcessor } from './bull/yellow-pages-scrape.processor';

@Module({
  imports: [
    MongoModule,
    AppConfigModule,
    UserModule,
    BullModule.registerQueue(YellowPagesScrapeQueueOption),
  ],
  controllers: [YellowPagesController],
  providers: [YellowPagesService, YellowPagesScrapeProcessor],
  exports: [YellowPagesService],
})
export class YellowPagesModule {}
