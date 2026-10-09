export const CAMPAIGN_DRAFT_COLLECTION = 'campaignDraft';

export interface CampaignDraft {
  campaignId?: string;
  knowledgebaseId?: string;
  standAloneAssistant?: boolean;
  senderEmail: string;
  receiverEmail: string;
  emailConversation: DraftEmail[];
  createdAt: Date;
  updatedAt: Date;
  addedBy: string;
}

export interface DraftEmail {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  emailType: string;
  folderId?: string;
  subject: string;
  emailTextContent: string;
  dateAndTime: Date;
}
