import { Module } from '@nestjs/common';
import { ZapierWebhookService } from './zapier-webhook.service';
import { ZapierWebhookController } from './zapier-webhook.controller';
import { MongoModule } from '../common/mongo/mongo.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    MongoModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [ZapierWebhookController],
  providers: [ZapierWebhookService],
  exports: [ZapierWebhookService],
})
export class ZapierWebhookModule {}
