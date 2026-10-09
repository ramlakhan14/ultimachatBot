export const VOICEBOT_CAMPAIGN_EMAIL_CONVERSATION_COLLECTION =
  'voicebotCampaignEmailConversation';

export interface EmailConversation {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  isAutoReply: boolean;
  emailTextContent: string;
  dateAndTime: Date;
}
export interface VoicebotCampaignEmailConversationSchema {
  campaignId: string;
  userEmailId: string; //admin email address
  audienceEmailId: string; //audience email address
  subject: string;
  emailConversation: EmailConversation[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
