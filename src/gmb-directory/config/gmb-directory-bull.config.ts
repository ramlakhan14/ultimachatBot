// Reuses the same Redis connection already registered globally by
// BullMqModule's `BullModule.forRoot(...)` (see src/campaign/bull/bullMq.module.ts)
// - @nestjs/bullmq's forRoot() config is global, so registering a new named
// queue here does not open a second Redis connection or require importing
// that module directly.
export const GmbDirectoryReverificationQueueOption = {
  name: 'gmbDirectoryReverificationQueue',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
  },
};
