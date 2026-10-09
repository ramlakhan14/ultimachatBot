export const BullConnectionConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10),
};

export const BullEmailQueueOption = {
  name: 'emailProcessingQueue',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
  },
};

export const BullScheduleQueueOption = {
  name: 'campaignScheduleQueue',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
  },
};

export const BullCronQueueOption = {
  name: 'campaignCronQueue',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
  },
};

export const BullNotificationQueueOption = {
  name: 'notificationQueue',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
  },
};

export const BullVoiceCampaignOption = {
  name: 'voiceBotCampaignQueue',
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
  },
};
