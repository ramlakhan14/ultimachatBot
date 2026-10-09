import { forwardRef, Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { MongoModule } from '../../common/mongo/mongo.module';
import { OpenaiModule } from '../../openai/openai.module';
import { EmailModule } from '../../common/email/email.module';
import { VoicebotModule } from '../voicebot/voicebot.module';
@Module({
  imports: [MongoModule, OpenaiModule, EmailModule, forwardRef(() => VoicebotModule)],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
