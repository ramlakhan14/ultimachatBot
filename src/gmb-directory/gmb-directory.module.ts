import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongoModule } from '../common/mongo/mongo.module';
import { AppConfigModule } from '../common/config/appConfig.module';
import { GmbDirectoryService } from './gmb-directory.service';
import { GmbDirectoryReverificationQueueOption } from './config/gmb-directory-bull.config';
import { GmbDirectoryReverificationProcessor } from './bull/gmb-directory-reverification.processor';
import { GmbDirectoryCronService } from './cron/gmb-directory-cron.service';

@Module({
  imports: [
    MongoModule,
    AppConfigModule,
    BullModule.registerQueue(GmbDirectoryReverificationQueueOption),
  ],
  providers: [
    GmbDirectoryService,
    GmbDirectoryReverificationProcessor,
    GmbDirectoryCronService,
  ],
  exports: [GmbDirectoryService],
})
export class GmbDirectoryModule {}
