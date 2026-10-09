export const VOICE_BOT_CAMPAIGN_DASHBOARD_SCHEMA = 'voiceBotCampaignDashboard';

// Schema for voice bot campaign
export interface VoiceBotCampaignDashboardSchema {
  userId: string;
  followUpEffective: number;
  callByStatus: {
    completed: number;
    failed: number;
    noAnswer: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
