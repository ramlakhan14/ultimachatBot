import { ObjectId } from 'mongodb';

export const UNSUBSCRIPTION_COLLECTION = 'unsubscriptionsEmails';
export interface UnsubscriptionSchema {
  _id?: ObjectId;
  userId?: string;
  email: string;
  reason?: string;
  campaignId?: string;
  addedBy?: string;
  isUnsubscriptionForSender?: boolean;
  unsubscribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
