export const SCRAPDATA_COLLECTION = 'scrap';

export type ScrapSource = 'gmb' | 'linkedin' | 'facebook';

export interface Scrap {
  userId?: string;
  websiteName: string;
  websiteUrl: string;
  email: string;
  chatbotUrl: string;
  emailContent: string;
  emailStatus: string;
  processStatus: number;
  signUpStatus: boolean;
  phoneNumber?: string;
  source?: ScrapSource;
  /** Number of send attempts made so far - caps automatic retries for FAILED leads at one retry (see sendEmailtoScrappedData). */
  emailAttemptCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const CATEGORIES_COLLECTION = 'categories';
export interface Categories {
  type: string;
  numberOfAppearances: number;
}

export enum ScrapInviteEmailStatus {
  PENDING = 'pending',
  SENT = 'send',
  FAILED = 'failed',
  RESEND = 'resend',
  /** @deprecated legacy value kept only to read pre-migration documents; new writes use PENDING */
  NOTSENT = 'notSend',
}
