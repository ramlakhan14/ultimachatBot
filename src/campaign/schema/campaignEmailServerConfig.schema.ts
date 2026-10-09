import {
  EMAIL_SERVICE_PROVIDER_NAME,
  EMAIL_SERVICE_PROVIDER_STATUS,
} from '../enum/enum';

export const CAMPAIGN_EMAIL_SERVER_CONFIG_COLLECTION =
  'campaignEmailServerConfig';

export interface CampaignEmailServerConfig {
  userId: string; // @unique
  emailServiceProviderName: EMAIL_SERVICE_PROVIDER_NAME; //postmark, sendgrid, mailchimps etc
  emailServerApiKey: string;
  emailAccountAuthKey: string;
  status: EMAIL_SERVICE_PROVIDER_STATUS;
  createdAt: Date;
  updatedAt: Date;
}
