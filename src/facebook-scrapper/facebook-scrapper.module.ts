import { Module } from '@nestjs/common';
import { FacebookScrapperService } from './facebook-scrapper.service';
import { FacebookScrapperController } from './facebook-scrapper.controller';
import { HttpModule } from '@nestjs/axios';
import { MongoModule } from '../common/mongo/mongo.module';
import { CampaignModule } from '../campaign/campaign.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [HttpModule, MongoModule, CampaignModule, UserModule],
  controllers: [FacebookScrapperController],
  providers: [FacebookScrapperService],
  exports: [FacebookScrapperService],
})
export class FacebookScrapperModule {}
