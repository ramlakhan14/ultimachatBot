import { ObjectId } from 'mongodb';
import { CAMPAIGN_STATUS, CAMPAIGN_TRIGGER_STATUS } from '../enum/enum';

export const CAMPAIGNDATA_COLLECTION = 'campaign';
export const GMB_COLLECTION = 'gmbdata';

export interface Campaign {
  campaignName: string;
  campaignProject: object;
  targetAudience: object[];
  painPoints: object[];
  solutionOffer: object[];
  callOfAction: object;
  campaignLanguage: string;
  emailLength: string;
  maxEmailsPerDay: number;
  maxEmailsPerLead: number; // max follow up email limit aka max email per lead
  emailAndSenderLimit: any[];
  createdAt: Date;
  updatedAt: Date;
  status: CAMPAIGN_STATUS;
  campaignTrigger?: CAMPAIGN_TRIGGER_STATUS;
  scheduledId?: string;
  isAudienceDuplicated?: boolean;
  addedBy: string;
  followUpFrequency?: number;
  totalFollowUps?: number;
}

export interface GMBData {
  _id?: ObjectId;
  jobId: string;
  userId: string;
  campaignId: string | null;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: [] | any;
  createdAt: Date;
  updatedAt?: Date;
}
