export interface FolderList {
  _id: string;
  folderName: string;
  folderType: "userCreated" | "systemCreated";
  emailAccountId?: string; // Optional because it's missing in some entries
  category?: string; // Optional because it's only present in one entry
  userId?: string; // Optional because it's missing in some entries
  createdAt: string;
  updatedAt: string;
  count: number;
}
export interface EmailFolder {
  folderName: string;
  emailAccountId: string;
  category: string;
  folderType: "userCreated";
};

export interface ReplySettings {
  isAutoReply: boolean;
  manualReply: boolean;
};

export interface LeadCollectionInputFields {
  isName: boolean;
  isPhone: boolean;
  isAddress: boolean;
};

export interface EmailSettings {
  size: number;
  language: string;
  content: string;
  isLeadCollection: boolean;
  leadCollectionInputFields: LeadCollectionInputFields;
};

export interface CustomizeSettings {
  keywords: string[];
  emailExclusion: string[];
}

export interface FallbackMechanism {
  FALLBACK_MECHANISM_1: boolean;
  FALLBACK_MECHANISM_2: boolean;
  FALLBACK_MECHANISM_3: {
      isForward: boolean;
      forwardTo: string[];
  };
}

export interface TimebasedArchiveValue {
  from: string; // ISO 8601 date string
  to: string;   // ISO 8601 date string
}

export interface ArchiveManaged {
  timebasedArchive: boolean;
  timebasedArchiveValue: TimebasedArchiveValue[];
  senderDetails: string[];
}

export interface RuleSetupSettings {
  customizeSettings: CustomizeSettings;
  fallbackMechanism: FallbackMechanism;
  archiveManaged: ArchiveManaged;
}

export interface EmailSetting {
  size: number;
  language: string;
  content: string;
  isLeadCollection: boolean;
  leadCollectionInputFields: {
    isName: boolean;
    isPhone: boolean;
    isAddress: boolean;
  };
};

export interface RuleSetup {
  customizeSettings: {
    keywords: string[];
    emailExclusion: string[];
  };
  fallbackMechanism: {
    FALLBACK_MECHANISM_1: boolean;
    FALLBACK_MECHANISM_2: boolean;
    FALLBACK_MECHANISM_3: {
      isForward: boolean;
      forwardTo: string;
    };
  };
  archiveManaged: {
    timebasedArchive: boolean;
    timebasedArchiveValue: {
      from: string; // ISO datetime string
      to: string; // ISO datetime string
    }[];
    emailContent: string;
    senderDetails: string[];
  };
};

export interface AutoReply {
  isAutoReply: boolean;
  manualReply: boolean;
};

export interface AllSettings {
  _id: string;
  userId: string;
  emailSetting: EmailSetting;
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
  ruleSetup: RuleSetup;
  autoReply: AutoReply;
  senderDetails: string[] | null;
};

export interface Notification {
  _id: string;
  userId: string;
  audienceEmailId: string;
  notificationType: "follow_up"; // You can expand this if there are more types
  isSeen: boolean;
  seenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// If you're dealing with an array of notifications:
export type Notifications = Notification[];

export interface Email {
  isReceivedEmail: boolean;
  isSentEmail: boolean;
  isFollowUpEmail: boolean;
  subject: string;
  emailTextContent: string;
  dateAndTime: {
    $date: string;
  };
  folderId?: string;
};

// If you expect an array of these emails:
export type EmailList ={ emails: Email[]}