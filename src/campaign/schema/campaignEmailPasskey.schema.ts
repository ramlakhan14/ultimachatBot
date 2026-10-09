import { EMAIL_AND_PASSKEY_STATUS } from '../enum/enum';

export const CAMPAIGN_EMAIL_PASSKEY_COLLECTION = 'campaignEmailPasskey';

export interface CampaignEmailPasskey {
  userId: string; // @unique
  email: string;
  name?: string;
  replyToEmail?: string;
  domain?: string;
  passkey?: string;
  emailHost?: string;
  isVerified?: boolean;
  isPasskeyAdded?: boolean;
  status: EMAIL_AND_PASSKEY_STATUS;
  senderSignatureId?: string;
  createdAt: Date;
  updatedAt: Date;
  campaignEmailServerId: string;
  postmarkEmailAppPassword?: string;
}
