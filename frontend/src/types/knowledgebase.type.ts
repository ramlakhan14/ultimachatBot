export interface CrawlData {
  stats: {
    crawledPages: number;
    failedPages: number;
    runTime: number;
  };
}

export interface DocsKnowledgeData {
  docs: CrawlDataList[];
  pages: number;
  knowledgebaseId: string;
}

export enum KnowledgebaseStatus {
  CREATED = 'CREATED',
  CRAWLING = 'CRAWLING',
  CRAWLED = 'CRAWLED',
  CRAWL_ERROR = 'CRAWL_ERROR',
  GENERATING_EMBEDDINGS = 'GENERATING_EMBEDDINGS',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  READY = 'READY',
}

export interface WebsiteData {
  websiteUrl: string;
  exclude: string[];
  include: string[];
  urls: string[];
  name?: string;
  isChatbotEnabled?: boolean;
}

export interface ProductSetupData {
  websiteData: WebsiteData;
  files?: File[];
}

export interface CrawlDataDetail {
  content: string;
  createdAt: string;
  knowledgebaseId: '64588edb0d197ba22fe686b9';
  status: KnowledgebaseStatus;
  title: string;
  type: 'WEBPAGE' | 'CUSTOM';
  updatedAt: string;
  url: string;
  _id: string;
}

export interface CrawlDataList {
  createdAt: string;
  status: 'CREATED';
  title: string;
  type: 'WEBPAGE';
  updatedAt: string;
  url: string;
  _id: string;
}

export interface launcherIcon {
  id: string;
  svgElement: string;
}

export interface LeadCollectionItem {
  phoneNumber: boolean;
  address: boolean;
  isThankYouEmailEnabled: boolean;
}
export interface ChatBotCustomizeData {
  backgroundColor: string;
  borderRadius: string;
  description: string;
  fontColor: string;
  heading: string;
  prompt?: string;
  emailLabel: string;
  avatarFieldLabel: string;
  appointmentFieldLabel: string;
  videoFieldLabel: string;
  avatarFieldValue: string;
  whatsappFieldLabel: string;
  phoneFieldLabel: string;
  defaultAnswer?: string;
  placement: 'left' | 'right';
  showReadMore: boolean;
  showAsPopup: boolean;
  popupDelay: number;
  offlineMessage: boolean;
  adminEmail: string;
  collectEmail: boolean;
  collectEmailText: string;
  welcomeMessage?: string;
  customCSS: string;
  contentEmail: string;
  contentPhone: string;
  contentWhatsapp: string;
  contentVideo: string;
  contentAppointment: string;
  questionExamples: {
    question: string;
    label: string;
  }[];
  welcomeMessages: string[];
  launcherIcon: launcherIcon;
  chatInputPlaceholderText: string;
  assistantTabHeader: string;
  offlineMsgTabHeader: string;
  readMoreText: string;
  offlineMsgHeading: string;
  offlineMsgDescription: string;
  nameFieldLabel: string;
  nameFieldPlaceholder: string;
  privacypolicyLabel: any;
  privacypolicyValue: any;
  termsandconditionsLabel: any;
  termsandconditionsValue: any;
  emailFieldLabel: string;
  emailFieldPlaceholder: string;
  msgFieldLabel: string;
  msgFieldPlaceholder: string;
  requiredFieldMsg: string;
  invalidEmailMsg: string;
  formSubmitBtnLabel: string;
  formSubmitBtnSubmittingText: string;
  formSubmitSuccessMsg: string;
  formSubmitErrorMsg: string;
  formSendAgainBtnLabel: string;
  formTryAgainBtnLabel: string;
  model: string;
  leadCollectionData: LeadCollectionItem[];
  // thankyouTextPlaceholderText?: string;
  isThankYouEmailEnabled: boolean;
  thankyouEmailText: string;
}

export interface googleSettingsData {
  duration: string;
  globalTime: {
    from: string;
    to: string;
  };
  availableSlotDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  slotsTiming: {
    [day: string]: {
      slots: {
        start: string;
        end: string;
      }[];
    };
  };
  name: string;
  email: string;
  service: string;
}

export interface revokeTokenType {
  kbId: string;
  token: string;
}
export interface CrawlDataListPagination {
  pages: number;
  results: CrawlDataList[];
}

export interface Knowledgebase {
  chatbotType: any;
  name: string;
  createdAt: string;
  owner: string;
  updatedAt: string;
  _id: string;
  status: string;
  websiteData: WebsiteData;
  crawlData: CrawlData;
  chatWidgeData: ChatBotCustomizeData;

}

export interface KnowledgeBaseWebsiteData {
  exclude: string[];
  include: string[];
  urls: string[];
}

export interface TrainingData {
  createdAt: string;
  status: string;
  title: string;
  updatedAt: string;
  type: string;
  _id: string;
}
export interface TrainingDataDetail {
  content: string;
  createdAt: string;
  knowledgebaseId: string;
  status: string;
  title: string;
  updatedAt: string;
  type: string;
  _id: string;
}

export interface MessageList {
  a: string;
  aTokens: number;
  q: string;
  qTokens: number;
  ts: string;
}

export interface UserData {
  ip: string;
}

export interface ChatSession {
  isUnread: boolean;
  firstMessage: MessageList;
  startedAt: string;
  updatedAt: string;
  userData: UserData;
  _id: string;
}

export interface SubscriptionData {
  name: string;
  type: string;
  maxChatbots: number;
  maxTokens: number;
  maxPages: number;
  maxChunksPerPage: number;
}

export interface ChatSessionDetail {
  _id: string;
  knowledgebaseId: string;
  kbName: string;
  defaultAnswer: null;
  prompt: null;
  isDemo: null;
  subscriptionData: SubscriptionData;
  userId: string;
  startedAt: string;
  updatedAt: string;
  messages: MessageList[];
  userData: UserData;
  src: null;
}

export interface OfflineMessage {
  _id: string;
  chatSessionId: string;
  name: string;
  email: string;
  message: string;
  url: null;
  createdAt: string;
}

export interface OfflineMessageData {
  _id: string;
  chatSessionId: string;
  name: string;
  email: string;
  message: string;
  url: null;
  createdAt: string;
  emailStatus?: string;
}

export interface OfflineMessagePagination {
  pages: number;
  results: OfflineMessage[];
  totalCount?: number;
}
export interface ChatSessionPagination {
  pages: number;
  results: ChatSession[];
  totalCount?: number;
}

export interface CustomDataPagination {
  pages: number;
  results: TrainingDataDetail[];
}
export interface leads {
  _id: string;
  chatSessionId: string;
  firstName: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}
export interface leadsPagination {
  pages: number;
  totalCount?: number;
  results: leads[];
}
