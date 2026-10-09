import { Subscription } from '../user/user.schema';

// export enum SubscriptionType {
//   DAILY = 'DAILY',
//   MONTHLY = 'MONTHLY',
//   YEARLY = 'YEARLY',
//   LIFETIME = 'LIFETIME',
// }

// export interface SubscriptionPlanInfo {
//   name: string;
//   type: SubscriptionType;
//   maxChatbots: number;
//   maxTokens: number;
//   maxPages: number;
//   maxChunksPerPage: number;
// }

export type BotLimit = number | 'UNLIMITED';

export interface PlanLimits {
  maxBots: BotLimit;
  freeCredits: number; // one-time credits
}

export const enum TopUpPlans {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ULTIMATE = 'ULTIMATE',
  CUSTOM = 'CUSTOM',
}

export const addTopUpBalancePlan = {
  STARTER: {
    bonusPercentage: 0,
  },
  PRO: {
    bonusPercentage: 5,
  },
  ULTIMATE: {
    bonusPercentage: 10,
  },
  CUSTOM: {
    bonusPercentage: 0,
  },
};

export const subscriptionPlanData: Record<Subscription, PlanLimits> = {
  STARTER: {
    maxBots: 5,
    freeCredits: 1000,
  },

  PRO: {
    maxBots: 10,
    freeCredits: 2500,
  },

  AGENCY: {
    maxBots: 20,
    freeCredits: 3500,
  },

  ULTIMATE: {
    maxBots: 'UNLIMITED',
    freeCredits: 5000,
  },
};

// export const subscriptionPlanData: Record<Subscription, SubscriptionPlanInfo> =
//   {
//     [Subscription.STARTER]: {
//       name: 'STARTER',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 0,
//       maxTokens: 0,
//       maxPages: 0,
//       maxChunksPerPage: 0,
//     },
//     [Subscription.PRO]: {
//       name: 'PRO',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 5,
//       maxTokens: 4000000,
//       maxPages: 100,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.AGENCY]: {
//       name: 'AGENCY',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 1,
//       maxTokens: 1000000,
//       maxPages: 1000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.ULTIMATE]: {
//       name: 'ULTIMATE',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 999,
//       maxTokens: 10000000,
//       maxPages: 10000,
//       maxChunksPerPage: 100,
//     },
//       name: 'Base',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 5,
//       maxTokens: 4000000,
//       maxPages: 100,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.STANDARD_MONTHLY]: {
//       name: 'Standard',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 1,
//       maxTokens: 1000000,
//       maxPages: 1000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.PREMIUM_MONTHLY]: {
//       name: 'Premium',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 3,
//       maxTokens: 2500000,
//       maxPages: 2500,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.ENTERPRISE_MONTHLY]: {
//       name: 'Enterprise',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 999,
//       maxTokens: 10000000,
//       maxPages: 10000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.BASE_YEARLY]: {
//       name: 'Base',
//       type: SubscriptionType.YEARLY,
//       maxChatbots: 5,
//       maxTokens: 4000000,
//       maxPages: 100,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.STANDARD_YEARLY]: {
//       name: 'Standard',
//       type: SubscriptionType.YEARLY,
//       maxChatbots: 1,
//       maxTokens: 1000000,
//       maxPages: 1000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.PREMIUM_YEARLY]: {
//       name: 'Premium',
//       type: SubscriptionType.YEARLY,
//       maxChatbots: 100,
//       maxTokens: 25000000,
//       maxPages: 2500,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.ENTERPRISE_YEARLY]: {
//       name: 'Enterprise',
//       type: SubscriptionType.YEARLY,
//       maxChatbots: 999,
//       maxTokens: 95000000,
//       maxPages: 10000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.DEMO_ACCOUNT]: {
//       name: 'DEMO',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 500,
//       maxTokens: 995000000,
//       maxPages: 200,
//       maxChunksPerPage: 100,
//     },
//     // APP SUMO PLANS
//     [Subscription.APPSUMO_TIER1]: {
//       name: 'App Sumo Tier 1',
//       type: SubscriptionType.LIFETIME,
//       maxChatbots: 20,
//       maxTokens: 1000000,
//       maxPages: 2000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.APPSUMO_TIER2]: {
//       name: 'App Sumo Tier 2',
//       type: SubscriptionType.LIFETIME,
//       maxChatbots: 50,
//       maxTokens: 2500000,
//       maxPages: 5000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.APPSUMO_TIER3]: {
//       name: 'App Sumo Tier 3',
//       type: SubscriptionType.LIFETIME,
//       maxChatbots: 500,
//       maxTokens: 5000000,
//       maxPages: 10000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.SELF_HOSTED]: {
//       name: 'Self Hosted',
//       type: SubscriptionType.LIFETIME,
//       maxChatbots: 500,
//       maxTokens: 5000000,
//       maxPages: 100000,
//       maxChunksPerPage: 500,
//     },
//     [Subscription.STANDARD]: {
//       name: 'Standard',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 1,
//       maxTokens: 1000000,
//       maxPages: 1000,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.PREMIUM]: {
//       name: 'Premium',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 100,
//       maxTokens: 2500000,
//       maxPages: 2500,
//       maxChunksPerPage: 100,
//     },
//     [Subscription.ENTERPRISE]: {
//       name: 'Enterprise',
//       type: SubscriptionType.MONTHLY,
//       maxChatbots: 999,
//       maxTokens: 10000000,
//       maxPages: 10000,
//       maxChunksPerPage: 100,
//     },
//   }
// [Subscription.STANDARD_DAILY]: {
//   name: 'TEST_DAILY_FIRST',
//   type: SubscriptionType.DAILY,
//   maxChatbots: 1,
//   maxTokens: 1000,
//   maxPages: 11,
//   maxChunksPerPage: 500,
// },
// [Subscription.PREMIUM_DAILY]: {
//   name: 'TEST_DAILY_SECOND',
//   type: SubscriptionType.DAILY,
//   maxChatbots: 2,
//   maxTokens: 5000,
//   maxPages: 22,
//   maxChunksPerPage: 500,
// },
// [Subscription.ENTERPRISE_DAILY]: {
//   name: 'TEST_DAILY_THIRD',
//   type: SubscriptionType.DAILY,
//   maxChatbots: 3,
//   maxTokens: 10000,
//   maxPages: 33,
//   maxChunksPerPage: 500,
// },
// };
