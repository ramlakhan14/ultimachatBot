import { ObjectId } from 'mongodb';
import { WebhookRequestType } from '../common/zapier-webhook.enum';
export interface UserUltimabotWebhook {
  _id?: ObjectId;
  userId: string;
  crmName: string;
  webhookUrl: string;
  webhookSecret: string;
  urlSecret: string;
  requestType: WebhookRequestType;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const USER_ULTIMABOT_WEBHOOK_COLLECTION = 'userUltimabotWebhook';
