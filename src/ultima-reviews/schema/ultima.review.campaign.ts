export const ULTIMA_REVIEW_CAMPAIGN_SCHEMA = 'ultimaReviewCampaigns';

export enum UltimaReviewStatus {
  Completed = 'Completed',
  Running = 'Running',
  Initiated = 'Initiated',
  Pending = 'Pending',
  Failed = 'Failed',
  Scheduled = 'Scheduled',
  Paused = 'Paused',
}

export enum UltimaReviewLeadType {
  Scraped = 'GMB Scraped',
  Uploaded = 'CSV Uploaded',
  FaceBook = 'Facebook Scraped',
  ManualAdded = 'Manual Added',
  Linkedin = 'Linkedin',
}

// Schema for Ultima Review Campaign Schema
export interface UltimaReviewCampaignSchema {
  userId: string;
  status: UltimaReviewStatus;
  campaignName: string;
  targetAudience: string;
  totalLeads?: number;
  createdAt: Date;
  updatedAt: Date;
}
