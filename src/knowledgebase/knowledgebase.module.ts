import { Module } from '@nestjs/common';
import { CeleryClientModule } from '../common/celery/celery-client.module';
import { MongoModule } from '../common/mongo/mongo.module';
import { RedisModule } from '../common/redis/redis.module';
import { OpenaiModule } from '../openai/openai.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UserModule } from '../user/user.module';
import { ChatbotController } from './chatbot/chatbot.controller';
import { ChatbotService } from './chatbot/chatbot.service';
import { KnowledgebaseController } from './knowledgebase.controller';
import { KnowledgebaseService } from './knowledgebase.service';
import { KnowledgebaseDbService } from './knowledgebase-db.service';
import { OpenaiChatbotService } from './chatbot/openaiChatbotService';
import { OfflineMsgService } from './offline-msg/offline-msg.service';
import { OfflineMessageController } from './offline-msg/offline-msg.controller';
import { PromptsController } from './prompt/prompt.controller';
import { PromptService } from './prompt/prompt.service';
import { DataStoreService } from './datastore.service';
import { EmailModule } from '../common/email/email.module';
import { TaskModule } from '../task/task.module';
import { CustomKeyService } from './custom-key.service';
import { WebhookModule } from '../webhook/webhook.module';
import { ProjectModule } from 'src/project/project.module';
import { AppConfigModule } from '../common/config/appConfig.module';
import { GoogleCalenderController } from './googleCalender/googleCalender.controller';
import { GoogleCalenderService } from './googleCalender/googleCalender.service';
import { ConsoleModule } from '../campaign/email-console/email-console.module';
import { GoogleAuthService } from '../campaign/email-console/googleconsole.service';
import { HttpModule } from '@nestjs/axios';
import { ZapierWebhookModule } from '../zapier-webhook/zapier-webhook.module';
import { VoicebotWebhookController } from './voicebot-webhook/voicebot-webhook.controller';
import { VoicebotWebhookService } from './voicebot-webhook/voicebot-webhook.service';
import { BullMqService } from '../campaign/bull/bullMq.service';
import { BullMqModule } from '../campaign/bull/bullMq.module';
@Module({
  imports: [
    AppConfigModule,
    MongoModule,
    RedisModule,
    OpenaiModule,
    CeleryClientModule,
    UserModule,
    ProjectModule,
    SubscriptionModule,
    EmailModule,
    TaskModule,
    WebhookModule,
    ConsoleModule,
    HttpModule,
    ZapierWebhookModule,
    BullMqModule,
  ],
  controllers: [
    GoogleCalenderController,
    ChatbotController,
    KnowledgebaseController,
    OfflineMessageController,
    PromptsController,
    VoicebotWebhookController,
  ],
  providers: [
    KnowledgebaseDbService,
    KnowledgebaseService,
    DataStoreService,
    ChatbotService,
    OpenaiChatbotService,
    OfflineMsgService,
    PromptService,
    CustomKeyService,
    GoogleCalenderService,
    GoogleAuthService,
    VoicebotWebhookService,
    BullMqService,
  ],
  exports: [
    KnowledgebaseDbService,
    DataStoreService,
    KnowledgebaseService,
    GoogleCalenderService,
    OpenaiChatbotService,
  ],
})
export class KnowledgebaseModule {}
