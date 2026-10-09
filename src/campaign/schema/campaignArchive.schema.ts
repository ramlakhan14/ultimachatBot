export const CAMPAIGN_ARCHIVE_COLLECTION = 'campaignArchive';

export interface CampaignArchive {
  campaignId: string;
  senderEmail: string;
  receiverEmail: string;
  emailConversation: ArchiveEmail[];
  createdAt: Date;
  updatedAt: Date;
  status: string;
  addedBy: string; // userId
}

export interface ArchiveEmail {
  isSentEmail: boolean;
  isReceivedEmail: boolean;
  isArchiveEmail: boolean;
  subject: string;
  emailTextContent: string;
  dateAndTime: Date;
}
