export const WARMUP_EMAIL_COLLECTION = 'mailiveryWarmupEmails';

export enum CampaignStatusCode {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
  DELETED = 'DELETED',
}

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password?: string;
  secure?: boolean;
  [key: string]: any;
}

export interface ImapSettings {
  host: string;
  port: number;
  username: string;
  password?: string;
  secure?: boolean;
  [key: string]: any;
}

export enum MailiveryCampaignType {
  GOOGLE = 'google',
  SMTP = 'smtp',
  SENDGRID = 'sendgrid',
}

export interface MailiveryCampaign {
  mailiveryCampaignId?: number;
  firstName: string;
  lastName: string;
  email: string;
  smtp?: SmtpSettings;
  imap?: ImapSettings;
  appPassword?: string;
  mailiveryCampaignType: MailiveryCampaignType;
  emailPerDay: number;
  responseRate: number;
  withRampup: boolean;
  rampUpSpeed: string;
  timezone: string;
  name?: string;
  statusCode?: CampaignStatusCode;
  archiveFolder?: string;
  nextEmailAfter?: string;
  outreachToday: number;
  responseToday?: number;
  remainingForToday?: number;
  scheduledForToday?: string;
  providerType?: string;
  dashboardUrl?: string;
  mailiveryResponseMetadata: any;
  scheduleSending: string;
  status: string;
  savedFromSpam:number;
  spamRate: number;
  emailsSentToday: number;
  sentInLast45Days: number;
  spamInLast14Days:number;
  spamRateInLast14Days?  : number;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  isActive: boolean;
  rampUpStatus: any;
}
