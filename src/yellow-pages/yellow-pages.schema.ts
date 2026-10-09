import { ObjectId } from 'mongodb';

export const YP_JOB_COLLECTION = 'ypdata';

export interface YPJobData {
  _id?: ObjectId;
  jobId: string;
  userId: string;
  campaignId: string | null;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt?: Date;
}
