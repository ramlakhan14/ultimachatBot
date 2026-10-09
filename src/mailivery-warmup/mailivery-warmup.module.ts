import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailiveryWarmupController } from './mailivery-warmup.controller';
import { MailiveryWarmupService } from './mailivery-warmup.service';
import { MetricsCron } from './cron/fetch-warmup-status.cron';
import { HttpModule } from '@nestjs/axios';
import { MongoModule } from '../common/mongo/mongo.module';

@Module({
  imports: [
    MongoModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        baseURL: 'https://app.mailivery.io/api/v1',
        headers: {
          Authorization: `Bearer ${cfg.get('MAILIVERY_API_KEY')}`,
          'Content-Type': 'application/json',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MailiveryWarmupController],
  providers: [MailiveryWarmupService, MetricsCron],
  exports: [MailiveryWarmupService],
})
export class MailiveryWarmupModule {}
