export enum CAMPAIGN_STATUS {
  COMPLETED = 'completed',
  FAILED = 'failed',
  RUNNING = 'running',
  SCHEDULED = 'scheduled',
  INITIATED = 'initiated',
  PAUSED = 'paused',
}

export enum CAMPAIGN_TRIGGER_STATUS {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
}

export enum DATA_SOURCE {
  CSV = 'csv',
  GMB = 'gmb',
  MANUAL = 'manual',
  DUPLICATE = 'duplicate',
  YELLOWPAGES = 'yellowpages',
}

export enum CAMPAIGN_SCHEDULER_STATUS {
  SCHEDULED = 'scheduled',
  PROCESSED = 'processed',
}

export enum DUPLICATE_LEAD_STATUS {
  INTIATED = 'initiated',
  COMPLETED = 'completed',
}

export enum GPTModels {
  GPT_3_5_Turbo = 'gpt-3.5-turbo',
  GPT_3_5_Turbo_16k = 'gpt-3.5-turbo-16k',
  GPT_4 = 'gpt-4',
  GPT_4_32k = 'gpt-4-32k',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_5_MINI = 'gpt-5-mini',
}

export enum EMAIL_PROCESS_STATUS {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum EMAIL_STATUS {
  SENT = 'sent',
  FAILED = 'failed',
  INITIATED = 'initiated',
}

export enum FOLLOW_UP_STATUS {
  NOT_REPLIED = 'not_replied',
  REPLIED = 'replied',
}

export enum EMAIL_SERVICE_PROVIDER_NAME {
  POSTMARK = 'postmark',
  SENDGRID = 'sendgrid',
  MAILCHIMP = 'mailchimp',
}

export enum EMAIL_AND_PASSKEY_STATUS {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum EMAIL_SERVICE_PROVIDER_STATUS {
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum EMAIL_SERVER_TYPE {
  GOOGLE = 'google',
  YAHOO = 'yahoo',
  MICROSOFT = 'microsoft',
}

export enum EMAIL_HOST_TYPE {
  MICROSOFT = 'outlook.office365.com',
  GOOGLE = 'imap.gmail.com',
  YAHOO = 'imap.mail.yahoo.com',
}

export enum NOTIFICATION_TYPE {
  MANUAL = 'manual_approval',
  FOLLOWUP = 'follow_up',
}
