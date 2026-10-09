import { LoggerService, Injectable } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, context, stack }) => {
  const ctx = context ? `[${context}] ` : '';
  return stack
    ? `${timestamp} ${level}: ${ctx}${message}\n${stack}`
    : `${timestamp} ${level}: ${ctx}${message}`;
});

function buildTransports() {
  const transports: winston.transport[] = [];

  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const fileTransport = new (winston.transports as any).DailyRotateFile({
    dirname: logDir,
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxFiles: '30d',
    level: 'debug',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat,
    ),
  });

  transports.push(fileTransport);

  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        format: combine(
          colorize({ all: true }),
          timestamp({ format: 'HH:mm:ss' }),
          errors({ stack: true }),
          logFormat,
        ),
      }),
    );
  }

  return transports;
}

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug',
      transports: buildTransports(),
    });
  }

  log(message: any, context?: string) {
    this.logger.info(String(message), { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(String(message), { context, stack: trace });
  }

  warn(message: any, context?: string) {
    this.logger.warn(String(message), { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(String(message), { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(String(message), { context });
  }
}
