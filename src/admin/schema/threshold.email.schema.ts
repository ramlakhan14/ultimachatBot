import { Subscription } from '../../user/user.schema';

const THRESHOLD_EMAIL_SCHEMA = 'thresholdEmailSettings';

interface ThresholdEmailSetting {
  planName: Subscription;
  limitType: 'Value' | 'Percentage';
  limitValue: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

export { THRESHOLD_EMAIL_SCHEMA, ThresholdEmailSetting };
