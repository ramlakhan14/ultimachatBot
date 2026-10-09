export const CAMPAIGN_TRASH_COLLECTION = 'campaignTrash';

export interface CampaignTrash {
  campaignId: string;
  senderEmail: string;
  receiverEmail: string;
  emailConversation: TrashEmail[];
  createdAt: Date;
  updatedAt: Date;
  status: string;
  addedBy: string;
}

export interface TrashEmail {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  isTrashEmail: boolean;
  subject: string;
  emailTextContent: string;
  dateAndTime: Date;
}
