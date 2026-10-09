export const CAMPAIGN_EMAIL_LEAD_COLLECTION = 'campaignEmailLead';

export interface CampaignEmailLead {
  knowledgebaseId?: string;
  standAloneAssistant?: boolean;
  campaignId?: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  addedBy: string;
}
