export const CAMPAIGNFOLLOWUPSEMAILS_COLLECTION = 'campaignFollowUpEmails';

export interface CampaignFollowUpEmailConversation {
  campaignId: string;
  senderEmail: string;
  receiverEmail: string;
  emailTemplateId: string;
  emailConversation: FollowUpEmail[];
  createdAt: Date;
  updatedAt: Date;
  status: string;
  addedBy: string;
}

export interface FollowUpEmail {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  isFollowUpEmail: boolean;
  subject: string;
  emailTextContent: string;
  dateAndTime: Date;
}
