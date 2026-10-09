import { Module } from '@nestjs/common';
import { LinkedinScrapperService } from './linkedin-scrapper.service';
import { LinkedinScrapperController } from './linkedin-scrapper.controller';
import { MongoModule } from '../common/mongo/mongo.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongoModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule
  ],
  controllers: [LinkedinScrapperController],
  providers: [LinkedinScrapperService],
  exports: [LinkedinScrapperService],
})
export class LinkedinScrapperModule {}
