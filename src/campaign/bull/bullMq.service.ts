import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable , Logger } from '@nestjs/common';
import * as moment from 'moment-timezone';
@Injectable()
export class BullMqService {
  private readonly logger = new Logger('BullMqService');

  constructor(
    @InjectQueue('emailProcessingQueue') private readonly myEmailQueue: Queue,
    @InjectQueue('voiceBotCampaignQueue') private readonly voiceCampaign: Queue,
    @InjectQueue('campaignScheduleQueue')
    private readonly myCampaignScheduleQueue: Queue,
    @InjectQueue('campaignCronQueue')
    private readonly myCampaignCronQueue: Queue,
    @InjectQueue('notificationQueue') private readonly notificationQueue: Queue,
  ) {}

  async addJob(data: any) {
    await this.myEmailQueue.add('emailProcessingQueue', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  async addBulkJob(data: any) {
    await this.myEmailQueue.addBulk(data);
  }

  async getJobs(statusArray: any) {
    const jobs = await this.myEmailQueue.getJobs(statusArray);
    return jobs;
  }

  async scheduleJob(data: any) {
    const { adminTimezone } = data;
    if (!data?.scheduledDateAndTime) {
      throw new Error('scheduledDateAndTime is required');
    }

    let delay = 0;
    if (adminTimezone) {
      // Parse scheduled time as local in adminTimezone
      const scheduledTimeInTz = moment.tz(
        data.scheduledDateAndTime,
        adminTimezone,
      );
      // Get current time in adminTimezone
      const nowInTz = moment.tz(adminTimezone);

      delay = Math.max(scheduledTimeInTz.valueOf() - nowInTz.valueOf(), 0);

    } else {
      const scheduledTime = new Date(data.scheduledDateAndTime).getTime();
      const currentTime = Date.now();
      const ISTTime = new Date(currentTime + 5.5 * 60 * 60 * 1000);


      delay = Math.max(scheduledTime - ISTTime.getTime(), 0);
    }
    // Convert scheduled time to UTC

    try {
      await this.myCampaignScheduleQueue.add('campaignScheduleQueue', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        delay: delay,
      });
    } catch (err) {
      this.logger.error(`Failed to schedule job: ${err.message}`);
      throw err;
    }
  }
  //   async scheduleJob(data: any) {
  //   if (!data?.scheduledDateAndTime) {
  //     throw new Error('scheduledDateAndTime is required');
  //   }

  //   // Use moment.parseZone to respect timezone offsets like +05:30
  //   const scheduledTime = moment.parseZone(data.scheduledDateAndTime);
  //   const now = moment(); // Current time in UTC
  //   const delay = Math.max(scheduledTime.diff(now), 0);

  //   // Debug logs
  //   console.log('Scheduled Time (UTC):', scheduledTime.utc().format());
  //   console.log('Current Time (UTC):', now.utc().format());
  //   console.log('Calculated Delay (ms):', delay);

  //   try {
  //     await this.myCampaignScheduleQueue.add('campaignScheduleQueue', data, {
  //       delay,
  //       attempts: 3,
  //       backoff: { type: 'exponential', delay: 3000 },
  //       removeOnComplete: true,
  //     });
  //     console.log('Job added successfully with delay');
  //   } catch (err) {
  //     this.logger.error(`Failed to schedule job: ${err.message}`);
  //     throw err;
  //   }
  // }

  async removeJob(campaignId: string) {
    try {
      const jobs = await this.myCampaignScheduleQueue.getJobs([
        'waiting',
        'delayed',
        'active',
      ]);

      const matchingJob = jobs.find(
        (job) => job.data?.campaignId === campaignId,
      );

      if (matchingJob) {
        await matchingJob.remove();
      } else {
        this.logger.warn(`No scheduled job found for campaignId: ${campaignId}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to remove job for campaignId ${campaignId}: ${err.message}`,
      );
      throw err;
    }
  }

  async addBulkCronJob(data: any) {
    this.myCampaignCronQueue.addBulk(
      data.map((item) => ({
        name: 'campaignCronQueue',
        data: JSON.stringify(item),
      })),
    );
  }

  async startVoiceBotJob(data: any) {
    await this.voiceCampaign.add('voiceBotCampaignQueue', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  async addMeetingNotification(data: any) {
    const { reminderTime } = data;

    const delayInMs = new Date(reminderTime).getTime() - Date.now();

    if (delayInMs <= 0) {
      this.logger.warn(`Reminder time is in the past. Skipping...`);
      return;
    }

    const result = await this.notificationQueue.add('notificationQueue', data, {
      delay: delayInMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
    });

    return result;
  }
}
