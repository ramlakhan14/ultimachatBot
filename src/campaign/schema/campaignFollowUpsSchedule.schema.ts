export const CAMPAIGNFOLLOWUPS_COLLECTION = 'campaignFollowUpsSchedule';

export interface CampaignFollowUpsSchedule {
  campaignId: string;
  emailPromptId?: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  addedBy: string;
  scheduleDate: Date; // it will get add based on followUpFrequency
}
