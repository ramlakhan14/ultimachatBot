import { ObjectId } from 'mongodb';
import {
  CampaignProjectDTO,
  CustomQuestionsDTO,
  PainPointSolutionDTO,
  PhoneNumberDTO,
  TargetAudienceDTO,
} from '../dto/create-Voicebot-campaign';
import { KnowledgebaseDetailsDTO } from '../inbound-bot/dto/create-inbound-bot.dto';

export const VOICE_BOT_CAMPAIGN_SCHEMA = 'voiceBotCampaigns';
export const TARGET_AUDIENCES_SCHEMA = 'targetAudiences';

export enum CampaignStatus {
  Completed = 'Completed',
  Running = 'Running',
  Initiated = 'Initiated',
  Pending = 'Pending',
  Failed = 'Failed',
  Scheduled = 'Scheduled',
  Paused = 'Paused',
  Resumed = 'Resumed',
  Created = 'Created',
}

// Schema for voice bot campaign
export interface VoiceBotCampaignSchema {
  userId: string;
  totalAudience?: number;
  totalCalls?: number;
  successCalls?: number;
  failedCalls?: number;
  status: CampaignStatus;
  campaignName: string;
  voiceCharacter: string;
  campaignProject: CampaignProjectDTO;
  language?: string;
  maxPerDayCall: number;
  phoneNumbers: PhoneNumberDTO[];
  painPointSolution: PainPointSolutionDTO[];
  totalBlocked?: Number;
  totalSuppressed?: Number;
  targetAudience: TargetAudienceDTO[];
  scheduledAt?: Date;
  prompt: string;
  emailToTeam?: string | null;
  failedReason?: string;
  toneOfVoice?: string;
  createdAt: Date;
  updatedAt: Date;
  customQuestions?: CustomQuestionsDTO;
  knowledgebaseDetails?: KnowledgebaseDetailsDTO;
}

export enum DATA_SOURCE_FOR_TARGET_AUDIENCE {
  CSV = 'csv',
  GMB = 'gmb',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  PREVIOUS_CAMPAIGNS = 'previous_campaigns',
  UNSUBSCRIPTIONS = 'unsubscriptions',
  YELLOW_PAGES = 'yellow_pages',
}

export enum CALL_END_REASON {
  CUSTOMER_BUSY = 'customer-busy',
  CUSTOMER_DID_NOT_ANSWER = 'customer-did-not-answer',
  CALL_ENDED = 'call-ended',
  CALL_FAILED = 'call-failed',
  CALL_DISCONNECTED = 'call-disconnected',
  CALL_REJECTED = 'call-rejected',
  CALL_TIMEOUT = 'call-timeout',
  CALL_NO_ANSWER = 'call-no-answer',
}
// Schema for target audience
export interface TargetAudienceSchema {
  _id?: ObjectId;
  callCompleted?: boolean;
  vapiId?: string;
  campaignId: string;
  userId: string;
  phoneNumber: string;
  email?: string;
  websiteUrl: string;
  prompt?: string;
  status?: CrwalStatus;
  summary?: targetCrawledDataStore;
  dataSource: string;
  callerNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
  callEndedReason?: 'customer-busy' | 'customer-did-not-answer' | 'completed';
  retryCount: number | 0;
  isFollowUpEmailSent: boolean;
  audienceCompanyName?: string;
}

export enum CrwalStatus {
  CREATED = 'CREATED',
  CRAWLING = 'CRAWLING',
  CRAWLED = 'CRAWLED',
  CRAWL_ERROR = 'CRAWL_ERROR',
  GENERATING_EMBEDDINGS = 'GENERATING_EMBEDDINGS',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  READY = 'READY',
}

export interface targetCrawledDataStore {
  content: string;
  url: string;
  title: string;
  type: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
