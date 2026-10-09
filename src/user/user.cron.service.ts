import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserService } from './user.service';
import { DistributedLockService } from '../common/distributed-lock/distributed-lock.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(
    private userService: UserService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checktheDeletedUser() {
    await this.distributedLock.withLock('user-permanent-delete', 3_600_000, async () => {
      this.logger.log('Checking the deleted users...');
      await this.userService.permanentlyDeleteData();
      this.logger.log('Checked the deleted users...');
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async deleteOldInactiveAccounts() {
    await this.distributedLock.withLock('user-delete-inactive', 3_600_000, async () => {
      const sevenYearsAgo = new Date();
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

      const deletedCount = await this.userService.deleteManyUserAfter7Years({
        lastLogin: { $lte: sevenYearsAgo },
        'gdpr.pendingDeletion': true,
      });
      this.logger.log(`Cron ran — deleted ${deletedCount} inactive accounts.`);
    });
  }
}
