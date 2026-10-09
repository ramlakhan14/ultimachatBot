import { Module } from '@nestjs/common';
import { MongoModule } from '../common/mongo/mongo.module';
import { VoiceChangerController } from './voice-changer.controller';
import { VoiceChangerService } from './voice-changer.service';

@Module({
  imports: [MongoModule],
  controllers: [VoiceChangerController],
  providers: [VoiceChangerService],
  exports: [VoiceChangerService],
})
export class VoiceChangerModule {}
