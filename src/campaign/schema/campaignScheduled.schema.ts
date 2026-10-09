import { CAMPAIGN_SCHEDULER_STATUS } from '../enum/enum';

export const CAMPAIGNSCHEDULED_COLLECTION = 'campaignScheduled';

export interface CampaignScheduled {
  campaignId: string;
  campaignName?: string;
  scheduleDate: string;
  scheduleTime: string;
  scheduledDateAndTime: Date | string; // Use Date for storing the date and time
  createdAt: Date;
  updatedAt: Date;
  addedBy: string;
  status: CAMPAIGN_SCHEDULER_STATUS;
  IsCampaignScheduledFor?: 'voicebot' | 'chatbot';
}
