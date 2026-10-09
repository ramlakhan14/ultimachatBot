import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailAssistanceService } from '../email-assistance.service';
import { DistributedLockService } from '../../common/distributed-lock/distributed-lock.service';

@Injectable()
export class EmailAssistantCronService {
  private readonly logger = new Logger(EmailAssistantCronService.name);
  constructor(
    private readonly emailAssistanceService: EmailAssistanceService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleEmailConversation() {
    await this.distributedLock.withLock('email-assistant-reply', 6_900_000, async () => {
      this.logger.log('Starting email fetch and replying Cron...');
      await this.emailAssistanceService.fetchEmailAndReplyToEmails();
      this.logger.log('Email fetch and replying Cron... completed');
    });
  }
}
