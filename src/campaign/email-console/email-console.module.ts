import { Module } from '@nestjs/common';
import { MongoModule } from '../../common/mongo/mongo.module';
import { GoogleAuthController } from './googleconsole.controller';
import { GoogleAuthService } from './googleconsole.service';
import { YahooAuthService } from './yahooconsole.service';
import { MicrosoftAuthService } from './microsoftconsole.service';
import { MicrosoftAuthController } from './microsoftconsole.controller';
import { YahooAuthController } from './yahooconsole.controller';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../../user/user.module';
import { GmailService } from './googleGmailApiOperation.service';

@Module({
  imports: [MongoModule, HttpModule, UserModule, JwtModule],
  controllers: [
    GoogleAuthController,
    YahooAuthController,
    MicrosoftAuthController,
  ],
  providers: [
    GoogleAuthService,
    YahooAuthService,
    MicrosoftAuthService,
    GmailService,
  ],
  exports: [
    GoogleAuthService,
    YahooAuthService,
    MicrosoftAuthService,
    GmailService,
  ],
})
export class ConsoleModule {}
