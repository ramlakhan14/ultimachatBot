import './bootstrap.patch';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/role.enum';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ActivationGuard } from './auth/guards/activation.guard';
import { Logger } from '@nestjs/common';
import { AppLoggerService } from './common/logger/app-logger.service';
import * as morgan from 'morgan';
import helmet from 'helmet';

async function bootstrap() {
  const appLogger = new AppLoggerService();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: appLogger,
  });

  app.useBodyParser('json', { limit: '5mb' });
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
  app.useGlobalGuards(new RolesGuard(new Reflector()));
  app.useGlobalGuards(new ActivationGuard());

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      // Auto typecast income data to DTO Type whereever possible
      transform: true,
    }),
  );

  app.useLogger(appLogger);

  const logger = new Logger('Bootstrap');

  process.on('uncaughtException', (error: Error) => {
    logger.error(`Unhandled Exception: ${error.message}`, error.stack);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error(`Unhandled Rejection at: ${promise}`, String(reason));
  });

  const host = process.env.HOST || '127.0.0.1';
  const appPort = Number.parseInt(process.env.PORT || '3000', 10);

  app.use(morgan('dev'));
  app.use(helmet());
  app.set('trust proxy', true);

  await app.listen(appPort, host);
  logger.log(`Backend Server is running on Port: ${appPort}`);
}
bootstrap();
