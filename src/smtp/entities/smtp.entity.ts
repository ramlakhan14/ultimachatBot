export const SMTP_SETUP_COLLECTION = 'smtpSetting';

import { PostWarmupOption } from '../dto/warmup.setting.dto';

export enum WarmupStatus {
  NOT_ENABLED = 'not_enabled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

// Add these to your existing SmtpSetting interface
export interface SmtpWarmupFields {
  enableWarmup: boolean;
  warmupStatus: WarmupStatus;
  warmupSettings?: {
    preset: string;
    startVolume: number;
    rampUpIncrement: number;
    maxVolume: number;
    durationDays: number;
  };
  warmupStartedAt?: Date;
  warmupCompletedAt?: Date;
  warmupCurrentDay?: number;
  warmupCurrentVolume?: number;
  // Stored after warmup completes for Option 1 auto-rampup
  postWarmupDailyLimit?: number;
  postWarmupOption: PostWarmupOption;
}
export interface SmtpSetting {
  knowledgebaseId?: string;
  isStandAloneAssistant?: boolean;
  userId: string;
  host: string;
  port: number;
  imapHost: string;
  imapPort: number;
  email: string;
  password: string;
  secure?: boolean;
  from?: string;
  name?: string;
  timeout?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  enableWarmup?: boolean;
  warmupStatus?: WarmupStatus;
  warmupSettings?: {
    responseRate: number | null;
    emailPerDay: number | null;
  };
  // warmupStartedAt?: Date;
  // warmupCompletedAt?: Date;
  // warmupCurrentDay?: number;
  // warmupCurrentVolume?: number;
  // // Stored after warmup completes for Option 1 auto-rampup
  // postWarmupDailyLimit?: number;
  // postWarmupOption: PostWarmupOption;
}
