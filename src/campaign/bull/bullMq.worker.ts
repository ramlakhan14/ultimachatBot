import { Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { AdminPostmarkService } from '../postmark/admin-postmark.service';
export class BullMqWorker {
  private readonly logger = new Logger('BullMqWorker');

  constructor(private readonly adminEmailService: AdminPostmarkService) {}
  // Worker function to process jobs

  /**
   * @developer : Ankur
   * @working : It is javascript implementation, used to create parallel worker for email processing
   *           but i just come to know nestjs bullmq have own options for creating worker.
   *           this is not used now.
   */
  async createWorker() {
    const connection = {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10),
    };
    // Define queue name and concurrency
    const queueName = process.env.QUEUE_NAME || 'emailProcessingQueue';
    const concurrency = parseInt(process.env.CONCURRENCY, 10) || 10;
    const worker = new Worker(
      queueName,
      async (job) => {
        try {
          //call the method here.
          return new Promise((resolve) =>
            resolve(`Job ${job.id} completed successfully ${job.data.email}`),
          );
        } catch (error) {
          this.logger.error(`Job ${job.id} failed: ${error.message}`);
          throw error; // add job retry methodology
        }
      },
      {
        connection,
        concurrency, // Process up to 10 jobs concurrently per worker
      },
    );

    worker.on('completed', (job) => {});

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job.id} failed: ${err.message}`);
      // add failed jobs to db so we can know better how much jobs get failed
    });

    return worker;
  }
}
