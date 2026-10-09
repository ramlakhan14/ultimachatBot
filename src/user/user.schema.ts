import { ObjectId } from 'mongodb';
import {
  CustomKeyData,
  OpenaiKeyData,
} from '../knowledgebase/knowledgebase.schema';
import { UserState } from '../auth/types/role.enum';

/** **************************************************
 * TYPES
 *************************************************** */

export const USER_COLLECTION = 'users';

export enum Subscription {
  STARTER = 'STARTER',
  PRO = 'PRO',
  AGENCY = 'AGENCY',
  ULTIMATE = 'ULTIMATE',
}
export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface UserMonthlyUsage {
  month: string;
  count: number;
  limitAlertSent?: boolean;
  fullAlertSent?: boolean;
}

export interface SubscriptionData {
  provider: 'lemonsqueezy';
  data: {
    subscriptionId: string;
    status: string;
    productId: number;
    variantId: number;
    createdAt: string;
    updatedAt: string;
    endsAt?: string;
  };
}

export interface WebhookData {
  id: ObjectId;
  url: string;
  secret?: string;
}
export interface User {
  _id?: ObjectId;
  email: string;
  password?: string;
  name?: string;
  avatarUrl?: string;
  locale?: string;
  // Stores the usage (# messages) for current month
  monthUsage?: UserMonthlyUsage;
  // Subscription details
  tokenCredits?: number;
  balanceAfterUsage?: number;
  creditAlertThreshold?: number; // e.g. 100, 500
  activeSubscription?: Subscription;
  billingCycle?: BillingCycle;
  subscriptionStartedAt?: Date;
  subscriptionExpiresAt?: Date;
  subscriptionData?: SubscriptionData;
  lastProcessedVariantId?: number;
  lastProcessedWebhookAt?: Date;
  customKeys?: CustomKeyData;
  // Whitelabelling settings
  whitelabelling?: {
    removeBranding: boolean;
  };
  // Webhooks
  webhook?: {
    url: string;
    secret: string;
  };
  webhooks?: WebhookData[];
  loginType?: 'google' | 'email';
  role?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  //flag to deactivate the user
  isActive?: UserState;
  openaiKeys?: OpenaiKeyData;
  gdpr?: {
    pendingDeletion: boolean; // true if user has requested deletion or subscription was canceled
    deletionRequestedAt?: Date;
    deletionScheduledFor?: Date;
    deletionReason?: 'manual' | 'subscription';
    canRecoverUntil?: Date;
    permanentlyDeleted?: boolean;
    isDeleted?: boolean;
    cleanedAt?: Date;
  };
  currentSessionVersion?: number;
  otp?: string;
  otpExpiresAt?: Date;
  isVerified?: boolean;
  limitType?: 'Value' | 'Percentage';
  limitValue?: number;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
}

export type UserSparse = Pick<
  User,
  | '_id'
  | 'email'
  | 'activeSubscription'
  | 'role'
  | 'isActive'
  | 'currentSessionVersion'
  | 'subscriptionData'
  | 'otp'
>;

export type UserProfile = Pick<
  User,
  | '_id'
  | 'email'
  | 'avatarUrl'
  | 'monthUsage'
  | 'activeSubscription'
  | 'tokenCredits'
  | 'billingCycle'
>;

export const createDefaultCustomKeyData = (): CustomKeyData => {
  return {
    useOwnKey: false, // Default value for useOwnKey
    keys: [], // Default value for keys (an empty array)
  };
};
export const BOT_COLLECTION = 'bots';

export type BotType =
  | 'chatbot'
  | 'email_assistant'
  | 'inbound_voicebot'
  | 'outbound_voicebot'
  | 'email_outreach';

export interface Bot {
  _id?: ObjectId;
  userId: ObjectId;
  type: BotType;
  name: string;
  status: 'active' | 'paused' | 'deleted';
  isResetOnPlanChange?: boolean; // Flag to indicate if the bot was reset due to a plan change
  referenceId: ObjectId; // e.g., knowledgebaseId for chatbot
  createdAt: Date;
  updatedAt: Date;
}
export const CREDIT_USAGE_COLLECTION = 'credit_usage';

export interface CreditUsage {
  _id?: ObjectId;
  userId: ObjectId;
  action:
    | 'SCRAPING_GMB'
    | 'SCRAPING_LINKEDIN'
    | 'SCRAPING_FACEBOOK'
    | 'EMAIL_VALIDATION'
    | 'EMAIL_WARMUP'
    | 'VECTOR_EMBEDDING'
    | 'INBOUND_CALLS'
    | 'OUTBOUND_CALLS';
  creditsUsed: number;
  balanceAfterUsage: number;
  createdAt: Date;
}

export const CREDIT_COSTS = {
  SCRAPING_GMB: 1,
  SCRAPING_LINKEDIN: 3,
  SCRAPING_FACEBOOK: 4,
  EMAIL_VALIDATION: 2,
  EMAIL_WARMUP: 5,
  VECTOR_EMBEDDING_PER_1K_TOKEN: 1,
};
