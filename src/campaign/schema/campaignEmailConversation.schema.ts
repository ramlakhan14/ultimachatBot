export const CAMPAIGN_EMAIL_CONVERSATION_COLLECTION =
  'campaignEmailConversation';

export interface EmailConversation {
  isSentEmail: boolean;
  messageId?: string;
  isReceivedEmail: boolean;
  isAutoReply: boolean;
  emailTextContent: string;
  folderId?: string;
  dateAndTime: Date;
}
export interface CampaignEmailConversation {
  campaignId?: string;
  knowledgebaseId?: string;
  standAloneAssistant?: boolean;
  userEmailId: string;
  audienceEmailId: string;
  subject: string;
  emailConversation: EmailConversation[];
  repliedAt?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
