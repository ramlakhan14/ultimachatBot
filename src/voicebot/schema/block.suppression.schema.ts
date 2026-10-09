import { ObjectId } from 'mongodb';

export const BLOCK_SUPPRESSION_SCHEMA = 'blockSuppressionPhoneList';

export interface BlockSuppressionSchema {
  userId: ObjectId;
  email: string;
  blockedNumbers: string[];
  suppressNumbers: string[];
  createdAt: Date;
  updatedAt: Date;
}
