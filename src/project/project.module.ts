import { forwardRef, Module } from '@nestjs/common';
import { MongoModule } from '../common/mongo/mongo.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ProjectsController } from './project.controller';
import { ProjectService } from './project.service';
import { KnowledgebaseService } from '../knowledgebase/knowledgebase.service';
import { KnowledgebaseDbService } from '../knowledgebase/knowledgebase-db.service';
import { CeleryClientModule } from '../common/celery/celery-client.module';
import { CustomKeyService } from '../knowledgebase/custom-key.service';
import { AppConfigModule } from '../common/config/appConfig.module';
import { EmailModule } from '../common/email/email.module';
import { RedisModule } from '../common/redis/redis.module';
import { OpenaiModule } from '../openai/openai.module';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { WebhookModule } from '../webhook/webhook.module';
import { ChatbotService } from '../knowledgebase/chatbot/chatbot.service';
import { OpenaiChatbotService } from '../knowledgebase/chatbot/openaiChatbotService';
import { DataStoreService } from '../knowledgebase/datastore.service';
import { OfflineMsgService } from '../knowledgebase/offline-msg/offline-msg.service';
import { PromptService } from '../knowledgebase/prompt/prompt.service';
import { GoogleCalenderService } from '../knowledgebase/googleCalender/googleCalender.service';
import { ConsoleModule } from '../campaign/email-console/email-console.module';
import { GoogleAuthService } from '../campaign/email-console/googleconsole.service';
import { HttpModule } from '@nestjs/axios';
import { ZapierWebhookModule } from '../zapier-webhook/zapier-webhook.module';
import { NotificationModule } from '../web-push/push.module';
import { GmbDirectoryModule } from '../gmb-directory/gmb-directory.module';
@Module({
  imports: [
    MongoModule,
    CeleryClientModule,
    forwardRef(() => SubscriptionModule),
    AppConfigModule,
    RedisModule,
    OpenaiModule,
    UserModule,
    SubscriptionModule,
    EmailModule,
    TaskModule,
    WebhookModule,
    ConsoleModule,
    HttpModule,
    ZapierWebhookModule,
    NotificationModule,
    GmbDirectoryModule,
  ],
  controllers: [ProjectsController],
  providers: [
    GoogleCalenderService,
    ProjectService,
    KnowledgebaseDbService,
    KnowledgebaseService,
    DataStoreService,
    ChatbotService,
    OpenaiChatbotService,
    OfflineMsgService,
    PromptService,
    CustomKeyService,
    GoogleAuthService,
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
