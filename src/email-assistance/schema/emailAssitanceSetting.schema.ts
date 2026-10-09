export const EMAIL_ASSISTANCE_SETTING_COLLECTION = 'emailAssistanceSetting';

export interface EmailAssistanceSetting {
  userId: string;
  autoReply?: AutoReply;
  emailSetting?: EmailSetting;
  ruleSetup?: RuleSetup;
  createdAt: Date;
  updatedAt: Date;
}

interface AutoReply {
  isAutoReply?: boolean;
  manualReply?: boolean;
  noReplyAutoFollowup?: boolean;
}

interface EmailSetting {
  size?: number;
  language?: string;
  content?: string;
  isLeadCollection?: boolean;
  leadCollectionInputFields?: LeadCollectionInputFields;
}

interface LeadCollectionInputFields {
  isName?: boolean;
  isPhone?: boolean;
  isAddress?: boolean;
}

interface RuleSetup {
  customizeSettings?: CustomizeSetting;
  fallbackMechanism?: FallbackMechanismSettings;
  archiveManaged?: ArchiveManaged;
}

interface CustomizeSetting {
  keywords?: [];
  emailExclusion?: [];
}

interface FallbackMechanismSettings {
  FALLBACK_MECHANISM_1?: boolean;
  FALLBACK_MECHANISM_2?: boolean;
  FALLBACK_MECHANISM_3?: {
    isForward: boolean;
    forwardTo: [];
  };
}

interface ArchiveManaged {
  timebasedArchive?: boolean;
  timebasedArchiveValue?: TimebasedArchiveValue;
  emails?: [];
  senderDetails?: [];
}

interface TimebasedArchiveValue {
  from?: Date;
  to?: Date;
}

// export enum FallbackMechanism {
//   FALLBACK_MECHANISM_1 = "Don't answer but add mail in a specific map/folder",
//   FALLBACK_MECHANISM_2 = 'Answer but reply that someone will reach out',
//   FALLBACK_MECHANISM_3 = 'Forward mail to specific mail Id',
// }
