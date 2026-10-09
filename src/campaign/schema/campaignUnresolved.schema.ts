export const CAMPAIGN_UNRESOLVED_COLLECTION = 'campaignUnresolved';

export interface CampaignUnresolved {
  campaignId: string;
  senderEmail: string;
  receiverEmail: string;
  emailConversation: UnresolvedEmail[];
  createdAt: Date;
  updatedAt: Date;
  status?: string;
  addedBy: string; // userId
}

export interface UnresolvedEmail {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  isUnresolvedEmail: boolean;
  subject: string;
  emailTextContent: string;
  dateAndTime: Date;
}
