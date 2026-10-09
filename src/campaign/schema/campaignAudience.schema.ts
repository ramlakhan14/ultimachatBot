import { DATA_SOURCE, EMAIL_PROCESS_STATUS, EMAIL_STATUS } from '../enum/enum';

export const CAMPAIGNAUDIENCE_COLLECTION = 'campaignAudience';

export interface CampaignAudience {
  websiteName?: string;
  websiteUrl?: string;
  email: string;
  chatbotUrl?: string;
  emailContent?: string;
  emailStatus?: EMAIL_STATUS;
  processStatus?: EMAIL_PROCESS_STATUS;
  campaignId: string;
  campaignName: string;
  dataSource: DATA_SOURCE;
  dataSourceType?: string;
  lastUsed?: Date;
  duplicateLeadId?: string;
  createdAt: Date;
  updatedAt: Date;
  addedBy: string;
  senderEmailId: string;
  subscribeStatus?: boolean;
  isVerified?: boolean;
}
