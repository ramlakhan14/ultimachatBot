import { DUPLICATE_LEAD_STATUS } from '../enum/enum';

export const CAMPAIGN_DUPLICATELEAD_COLLECTION = 'campaignDuplicateLead';

export interface CampaignDuplicateLead {
  currentCampaignId: string;
  previousCampaign: [];
  createdAt: Date;
  updatedAt: Date;
  addedBy: string;
  status: DUPLICATE_LEAD_STATUS;
}
