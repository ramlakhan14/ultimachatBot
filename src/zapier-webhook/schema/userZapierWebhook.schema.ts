import { ObjectId } from 'mongodb';
import { SyncStatus, WebhookRequestType } from '../common/zapier-webhook.enum';
export interface UserZapierWebhook {
  _id?: ObjectId;
  userId: string;
  webhookUrl: string;
  webhookRequestType: WebhookRequestType;
  webhookType: string;
  syncStatus: SyncStatus;
  leadType: string[];
  crmName: string;
  createdAt: Date;
  updatedAt: Date;
}

export const USER_ZAPIER_WEBHOOK_COLLECTION = 'userZapierWebhook';
