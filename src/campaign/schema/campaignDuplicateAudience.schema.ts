import { DATA_SOURCE, EMAIL_PROCESS_STATUS, EMAIL_STATUS } from '../enum/enum';

export const CAMPAIGN_DUPLICATEAUDIENCE_COLLECTION =
  'campaignDuplicateAudience';

export interface CampaignDuplicateAudience {
  email: string;
  campaignId: string;
  campaignName: string;
  websiteUrl: string;
  dataSource: DATA_SOURCE;
  emailStatus: EMAIL_STATUS;
  processStatus: EMAIL_PROCESS_STATUS;
  duplicateLeadId?: string;
  createdAt: Date;
  updatedAt: Date;
  addedBy: string;
  subscribeStatus: boolean;
  senderEmailId?: string;
}
