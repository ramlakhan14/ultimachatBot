export type SubscriptionType = 'Starter' | 'Pro' | 'Agency' | 'Ultimate';

export type SubscriptionTypeLTD =
  | 'AppSumo tier 1'
  | 'AppSumo tier 2'
  | 'AppSumo tier 3';

export type activeSubscriptionId =
  | 'STARTER_MONTHLY'
  | 'STARTER_YEARLY'
  | 'PRO_YEARLY'
  | 'PRO_YEARLY'
  | 'AGENCY_YEARLY'
  | 'AGENCY_YEARLY'
  | 'ULTIMATE_YEARLY'
  | 'ULTIMATE_YEARLY'
  | 'APPSUMO_TIER1'
  | 'APPSUMO_TIER2'
  | 'APPSUMO_TIER3'
  | string;

export type SubscriptionTier = 'MONTHLY' | 'YEARLY' | 'LIFETIME';

export type PageCount = 100 | 1000 | 2500 | 10000;

export type TokenSize = '400K' | '1M' | '2.5M' | '10M' | 'unlimited';

export type ProjectCount =
  | 1
  | 3
  | 5
  | 10
  | 100
  | 1000
  | 'unlimited'
  | 'Unlimited';

export type PageCountLTD = 2000 | 5000 | 10000;

export type TokenSizeLTD = '1M' | '2.5M' | '5M';

export type ProjectCountLTD = 20 | 50 | 'unlimited';

export interface SubscriptionData {
  type: SubscriptionType;
  pageCount: PageCount;
  tokenSize: TokenSize;
  projectCount: ProjectCount;
}

export interface SubscriptionDataLTD {
  type: SubscriptionTypeLTD;
  pageCount: PageCountLTD;
  tokenSize: TokenSizeLTD;
  projectCount: ProjectCountLTD;
}

export interface DiscoutData {
  couponCode: string;
  discountPercentage: number;
  countryFlag: string;
  country: string;
}
