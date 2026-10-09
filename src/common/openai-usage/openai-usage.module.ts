import { Global, Module } from '@nestjs/common';
import { MongoModule } from '../mongo/mongo.module';
import { OpenAiUsageService } from './openai-usage.service';
import { OpenAiUsageController } from './openai-usage.controller';

@Global()
@Module({
  imports: [MongoModule],
  controllers: [OpenAiUsageController],
  providers: [OpenAiUsageService],
  exports: [OpenAiUsageService],
})
export class OpenAiUsageModule {}
