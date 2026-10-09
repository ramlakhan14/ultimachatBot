import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailiveryWarmupService } from '../mailivery-warmup.service';
import { Public } from '../../auth/guards/public.guard';
import { DistributedLockService } from '../../common/distributed-lock/distributed-lock.service';

@Injectable()
export class MetricsCron {
  private readonly logger = new Logger(MetricsCron.name);

  constructor(
    private readonly svc: MailiveryWarmupService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  @Public()
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    await this.distributedLock.withLock('mailivery-warmup-metrics', 3_300_000, async () => {
      try {
        const list = await this.svc.listCampaigns({});
        const campaigns = Array.isArray(list.data) ? list.data : [];

        if (campaigns.length === 0) {
          this.logger.log('No campaigns found for metrics sync.');
          return;
        }

        const CONCURRENCY_LIMIT = 20;
        let index = 0;

        const processBatch = async (batch: any[]) => {
          await Promise.all(
            batch.map(async (c) => {
              try {
                const m = await this.svc.getMetrics(c.campaign_id);
                this.logger.debug(`Metrics for ${c.campaign_id}: ${JSON.stringify(m)}`);
              } catch (err) {
                this.logger.error(
                  `Failed to fetch metrics for campaign ${c.campaign_id}: ${err?.message || err}`,
                );
              }
            }),
          );
        };

        while (index < campaigns.length) {
          const batch = campaigns.slice(index, index + CONCURRENCY_LIMIT);
          await processBatch(batch);
          index += CONCURRENCY_LIMIT;
        }

        this.logger.log(`Metrics sync completed for ${campaigns.length} campaigns.`);
      } catch (err) {
        this.logger.error(`Metrics cron failed: ${err?.message || err}`);
      }
    });
  }
}
