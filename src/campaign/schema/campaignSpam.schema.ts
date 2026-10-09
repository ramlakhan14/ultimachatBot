export const CAMPAIGN_SPAM_COLLECTION = 'campaignSpam';

export interface CampaignSpam {
  campaignId: string;
  senderEmail: string;
  receiverEmail: string;
  emailTemplateId: string;
  emailConversation: SpamEmail[];
  createdAt: Date;
  updatedAt: Date;
  status: string;
  addedBy: string;
}

export interface SpamEmail {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  isSpamEmail: boolean;
  subject: string;
  emailTextContent: string;
  dateAndTime: Date;
}
