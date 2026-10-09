import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '../common/config/appConfig.service';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailModule } from '../common/email/email.module';
import { ProjectModule } from '../project/project.module';
import { AdminModule } from '../admin/admin.module';
import { MongoModule } from '../common/mongo/mongo.module';

@Module({
  imports: [
    UserModule,
    AdminModule,
    ProjectModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => ({
        secret: configService.get('secretKey'),
        signOptions: { expiresIn: configService.get('tokenExpiry') },
      }),
    }),
    EmailModule,
    MongoModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class AuthModule {}
