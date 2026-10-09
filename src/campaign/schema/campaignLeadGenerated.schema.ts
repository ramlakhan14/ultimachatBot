export const CAMPAIGN_LEAD_GENERATION_COLLECTION = 'campaignLeadGeneration';

export interface CampaignLeadGeneration {
  campaignId?: string;
  knowledgebaseId?: string;
  standAloneAssistant?: boolean;
  senderEmail: string;
  receiverEmail: string;
  emailConversation: LeadGeneratedEmail[];
  createdAt: Date;
  updatedAt: Date;
  status: string;
  addedBy: string; // userId
}

export interface LeadGeneratedEmail {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  subject: string;
  emailTextContent: string;
  dateAndTime: Date;
}
