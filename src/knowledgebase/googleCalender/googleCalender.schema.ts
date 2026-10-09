import { ObjectId } from 'mongodb';

export interface googleCalender {
  _id?: ObjectId;
  knowledgebaseId?: ObjectId;
  name: string;
  email: string;
  service: string;
  duration: string;
  slotsTiming: any;
  globalTime: any;
  availableSlotsDays?: any;
  isActive: boolean;
  accessToken?: string;
  refreshToken?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const GOOGLECALENDER_COLLECTION = 'calenderSettings';
