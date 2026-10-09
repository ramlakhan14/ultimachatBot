import { MailiveryCampaignType } from '../../mailivery-warmup/schema/warmupEmail.schema';
import { EMAIL_AND_PASSKEY_STATUS } from '../enum/enum';

export const CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION =
  'campaignEmailWarmupCount';

export interface CampaignEmailWarmupCount {
  userId: string;
  mailiveryCampaignId?: number;
  mailiveryWarmupEmailId?: string; //refere mailivery warmup email table
  email: string;
  status: EMAIL_AND_PASSKEY_STATUS;
  isWarmUpEnabled: boolean;
  isWarmedUp?: boolean;
  mailiveryWarmupStatus?: string;
  mailboxType?: MailiveryCampaignType;
  warmupCount: number;
  updatedMaxLimit: number;
  maxLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
