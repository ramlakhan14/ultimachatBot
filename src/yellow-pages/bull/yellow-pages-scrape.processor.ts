import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { YellowPagesService } from '../yellow-pages.service';

// Shape of data stored in Redis for each scrape job.
// Passed from YellowPagesService.startScrapeJob() → queue → processor.
export interface YPScrapeJobData {
  jobId: string;
  userId: string;
  dto: {
    query: string;
    location: string;
    limit?: number;
    campaignId?: string;
  };
}

// concurrency: 2 — max 2 YP scrape jobs run simultaneously per worker instance.
// Kept low deliberately: each job fires multiple Outscraper HTTP calls
// (yellowpagesSearch + emailsAndContacts), so higher concurrency would
// compete for rate limits and memory on large scrapes (e.g. limit: 100+).
@Processor('yellowPagesScrapeQueue', { concurrency: 2, lockDuration: 600000 }) // 10 min lock for large scrapes
export class YellowPagesScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(YellowPagesScrapeProcessor.name);

  constructor(private readonly yellowPagesService: YellowPagesService) {
    super();
  }

  // BullMQ calls this automatically when a job is picked up from Redis.
  // Keeps processor lean — all scrape logic lives in YellowPagesService.
  // On error: rethrows so BullMQ's configured retry/backoff handles it
  // (see attempts: 3, exponential backoff in yellow-pages-bull.config.ts).
  async process(job: Job<YPScrapeJobData>): Promise<void> {
    const { jobId, userId, dto } = job.data;
    try {
      await this.yellowPagesService.processJob(jobId, dto, userId);
    } catch (err) {
      this.logger.warn(`YP scrape job ${jobId} failed: ${err}`);
      throw err;
    }
  }
}
