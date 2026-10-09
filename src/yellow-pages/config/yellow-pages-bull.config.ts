// Reuses the same Redis connection already registered globally by
// BullMqModule's `BullModule.forRoot(...)` (see src/campaign/bull/bullMq.module.ts).
// @nestjs/bullmq's forRoot() config is global, so registering a new named
// queue here does not open a second Redis connection or require importing
// that module directly.
export const YellowPagesScrapeQueueOption = {
  name: 'yellowPagesScrapeQueue',
  defaultJobOptions: {
    removeOnComplete: true, // clean up Redis entry after job succeeds
    removeOnFail: true, // clean up Redis entry after all retries exhausted
    attempts: 3, // retry failed jobs up to 3 times
    backoff: {
      type: 'exponential', // wait 5s, 10s, 20s between retries
      delay: 5000,
    },
  },
};
