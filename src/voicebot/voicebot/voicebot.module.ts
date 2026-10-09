import { forwardRef, Module } from '@nestjs/common';
import { VoicebotController } from './voicebot.controller';
import { VoicebotService } from './voicebot.service';
import { MongoModule } from '../../common/mongo/mongo.module';
import { VapiService } from './vapi.service';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import { RedisModule } from '../../common/redis/redis.module';
import { CeleryClientModule } from '../../common/celery/celery-client.module';
import { BullMqModule } from '../../campaign/bull/bullMq.module';
import { ProjectModule } from '../../project/project.module';
import { SettingsModule } from '../settings/settings.module';
import { SettingsService } from '../settings/settings.service';
// import { EmailModule } from '../../common/email/email.module';
import { OpenaiModule } from '../../openai/openai.module';
import { EmailModule } from '../../common/email/email.module';
import { CronService } from '../cron/cron.service';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    MongoModule,
    RedisModule,
    CeleryClientModule,
    ProjectModule,
    forwardRef(() => SettingsModule),
    OpenaiModule,
    EmailModule,
    UserModule,
    forwardRef(() => BullMqModule)
    // forwardRef(() => EmailModule),
  ],
  controllers: [VoicebotController],
  providers: [
    VoicebotService,
    VapiService,
    CryptoService,
    SettingsService,
    CronService,
  ],
  exports: [VapiService, CronService, VoicebotService],
})
export class VoicebotModule {}
