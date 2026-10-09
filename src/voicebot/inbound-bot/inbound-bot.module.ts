import { Module } from '@nestjs/common';
import { InboundBotService } from './inbound-bot.service';
import { InboundBotController } from './inbound-bot.controller';
import { VoicebotModule } from '../voicebot/voicebot.module';
import { MongoModule } from '../../common/mongo/mongo.module';
import { RedisModule } from '../../common/redis/redis.module';
import { OpenaiModule } from '../../openai/openai.module';
import { EmailModule } from '../../common/email/email.module';
import { UserModule } from '../../user/user.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    VoicebotModule,
    MongoModule,
    RedisModule,
    OpenaiModule,
    EmailModule,
    UserModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [InboundBotController],
  providers: [InboundBotService],
})
export class InboundBotModule {}
