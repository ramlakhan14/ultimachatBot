import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from './common/logger/logger.module';
import { DistributedLockModule } from './common/distributed-lock/distributed-lock.module';
import { CeleryClientModule } from './common/celery/celery-client.module';
import { AppConfigModule } from './common/config/appConfig.module';
import { MongoModule } from './common/mongo/mongo.module';
import { OpenaiModule } from './openai/openai.module';
import { KnowledgebaseModule } from './knowledgebase/knowledgebase.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { SentryModule } from './common/sentry/sentry.module';
import { EmailModule } from './common/email/email.module';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { ImportersModule } from './importers/importers.module';
import { TaskModule } from './task/task.module';
import { WebhookModule } from './webhook/webhook.module';
import { ProjectModule } from './project/project.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailTemplateModule } from './emailTemplate/email.module';
import { CampaignModule } from './campaign/campaign.module';
import { EmailAssistanceModule } from './email-assistance/email-assistance.module';
import { ZapierWebhookModule } from './zapier-webhook/zapier-webhook.module';
import { VoicebotModule } from './voicebot/voicebot/voicebot.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SettingsModule } from './voicebot/settings/settings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UltimaReviewsModule } from './ultima-reviews/ultima-reviews.module';
import { FacebookScrapperModule } from './facebook-scrapper/facebook-scrapper.module';
import { SmtpModule } from './smtp/smtp.module';
import { LinkedinScrapperModule } from './linkedin-scrapper/linkedin-scrapper.module';
import { MailiveryWarmupModule } from './mailivery-warmup/mailivery-warmup.module';
import { VoiceChangerModule } from './voice-changer/voice-changer.module';
import { NotificationModule } from './web-push/push.module';
import { InboundBotModule } from './voicebot/inbound-bot/inbound-bot.module';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OpenAiUsageModule } from './common/openai-usage/openai-usage.module';
import { VideoUploadModule } from './video-upload/video-upload.module';
import { YellowPagesModule } from './yellow-pages/yellow-pages.module';

@Module({
  imports: [
    LoggerModule,
    DistributedLockModule,
    OpenAiUsageModule,
    AppConfigModule,
    SentryModule.forRoot({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.3,
    }),
    EventEmitterModule.forRoot(),
    RedisModule,
    MongoModule,
    CeleryClientModule,
    TaskModule,
    OpenaiModule,
    KnowledgebaseModule,
    ImportersModule,
    AuthModule,
    UserModule,
    AdminModule,
    ProjectModule,
    SubscriptionModule,
    EmailModule,
    WebhookModule,
    EmailTemplateModule,
    ScheduleModule.forRoot(),
    CampaignModule,
    EmailAssistanceModule,
    ZapierWebhookModule,
    VoicebotModule,
    InboundBotModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // milliseconds
          limit: 100,
          name: 'default',
        },
      ],
      storage: new ThrottlerStorageRedisService({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      }),
    }),
    SettingsModule,
    DashboardModule,
    UltimaReviewsModule,
    FacebookScrapperModule,
    SmtpModule,
    LinkedinScrapperModule,
    MailiveryWarmupModule,
    VoiceChangerModule,
    NotificationModule,
    VideoUploadModule,
    YellowPagesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(Sentry.Handlers.requestHandler()).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
