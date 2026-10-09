export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type?: string;
  expiry_date?: number;
}

export interface GmailOperation {
  recipientEmail: string;
  tokens: GmailTokens;
}

export interface SpamFilterCriteria extends GmailOperation {
  spamSenderEmails?: string[];
  includePhishingDetection?: boolean;
  includeSpamDetection?: boolean;
}
