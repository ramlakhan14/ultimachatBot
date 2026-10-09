import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GmbDirectoryService } from '../gmb-directory.service';

interface ReverifyJobData {
  id: string;
  email: string;
}

// Low concurrency and no rate-limit config here deliberately - this is a
// background maintenance queue re-checking a bounded daily batch (see
// MAX_PER_RUN in gmb-directory-cron.service.ts), not a latency-sensitive
// path, so it should never compete meaningfully with a live scrape's own
// Outscraper calls.
@Processor('gmbDirectoryReverificationQueue', { concurrency: 3 })
export class GmbDirectoryReverificationProcessor extends WorkerHost {
  private readonly logger = new Logger('GmbDirectoryReverificationProcessor');

  constructor(private readonly gmbDirectoryService: GmbDirectoryService) {
    super();
  }

  async process(job: Job<ReverifyJobData>) {
    const { id, email } = job.data;
    try {
      await this.gmbDirectoryService.reverifyEntry(id, email);
    } catch (err) {
      this.logger.warn(`Re-verification job failed for ${email}: ${err}`);
      throw err; // let BullMQ's configured retry/backoff handle it
    }
  }
}
