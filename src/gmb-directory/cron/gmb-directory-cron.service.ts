import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GmbDirectoryService } from '../gmb-directory.service';
import { DistributedLockService } from '../../common/distributed-lock/distributed-lock.service';

// 90 days balances staleness risk (contact info drifting) against
// re-verification cost (every check is an Outscraper call) - shorter would
// re-check businesses that haven't had time to change; longer risks serving
// dead contacts as if they were fresh.
const STALE_AFTER_DAYS = 90;

// Caps how many re-verification calls get queued per day, so this
// maintenance job can never itself become a meaningful cost driver - it
// only exists to keep the cache trustworthy, not to re-check everything at
// once. At 500/day even a large directory clears its backlog within a few
// months while keeping daily spend predictable.
const MAX_PER_RUN = 500;

@Injectable()
export class GmbDirectoryCronService {
  private readonly logger = new Logger('GmbDirectoryCronService');

  constructor(
    private readonly gmbDirectoryService: GmbDirectoryService,
    @InjectQueue('gmbDirectoryReverificationQueue')
    private readonly reverificationQueue: Queue,
    private readonly distributedLock: DistributedLockService,
  ) {}

  // Off-peak, low-traffic hour. This only finds candidates and enqueues
  // them - the actual Outscraper calls happen in
  // GmbDirectoryReverificationProcessor, spread out under the queue's own
  // concurrency limit instead of all firing at once inside the cron tick.
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'gmbDirectoryReverification',
  })
  async enqueueStaleEntries(): Promise<void> {
    await this.distributedLock.withLock(
      'gmb-directory-reverification',
      20 * 60 * 1000,
      async () => {
        const staleEntries = await this.gmbDirectoryService.findStaleEntries(
          STALE_AFTER_DAYS,
          MAX_PER_RUN,
        );

        if (!staleEntries.length) {
          this.logger.log('No stale GMB directory entries to re-verify');
          return;
        }

        await this.reverificationQueue.addBulk(
          staleEntries
            .filter((entry) => entry._id && entry.email)
            .map((entry) => ({
              name: 'reverify',
              data: { id: entry._id.toHexString(), email: entry.email },
            })),
        );

        this.logger.log(
          `Enqueued ${staleEntries.length} GMB directory entries for re-verification`,
        );
      },
    );
  }
}
