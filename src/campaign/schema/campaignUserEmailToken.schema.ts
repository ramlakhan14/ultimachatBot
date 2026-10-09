import { EMAIL_SERVER_TYPE } from '../enum/enum';

export const CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION = 'campaignUserEmailToken';

export interface CampaignUserEmailToken {
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiryDate: Date;
  tokenExpiresIn: number;
  idToken: string;
  tokenType: string;
  scope: string;
  server: EMAIL_SERVER_TYPE;
  createdAt: Date;
  updatedAt: Date;
}
