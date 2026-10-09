import { ObjectId } from 'mongodb';
// import { SubscriptionPlanInfo } from '../subscription/subscription.const';
import { UserMonthlyUsage } from '../user/user.schema';
import { CrawlerStats } from '../importers/crawler/crawlee/crawler.types';

/** **************************************************
 * KNOWLEDGEBASE
 *************************************************** */

export const KNOWLEDGEBASE_COLLECTION = 'knowledgebase';

export enum KnowledgebaseStatus {
  CREATED = 'CREATED',
  CRAWLING = 'CRAWLING',
  CRAWLED = 'CRAWLED',
  CRAWL_ERROR = 'CRAWL_ERROR',
  GENERATING_EMBEDDINGS = 'GENERATING_EMBEDDINGS',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  READY = 'READY',
}

export interface CustomKeyData {
  useOwnKey: boolean;
  keys?: string[];
}

export interface OpenaiKeyData {
  useOwnKey?: boolean;
  apiKey?: string;
  name?: string;
  limitType?: 'Value' | 'Percentage';
  limitValue?: number;
}
export interface Knowledgebase {
  _id?: ObjectId;
  name: string;
  isDemo?: boolean;
  status: KnowledgebaseStatus;
  websiteData: {
    websiteUrl: string;
    urls: string[];
    include: string[];
    exclude: string[];
  };
  crawlData?: {
    stats: CrawlerStats;
  };
  billing?: {
    chargedTokens: number;
    lastChargedAt?: Date;
  };
  monthUsage?: UserMonthlyUsage;
  chatWidgeData?: any;
  owner: ObjectId;
  // Alternate email for knowledgebase
  adminEmail?: string;
  createdAt: Date;
  updatedAt: Date;
  lastCrawlAt?: Date;
  // Custom prompt fields
  defaultAnswer?: string;
  prompt?: string;
  // Custom domain
  customDomain?: string;
  chatbotType?: string;
  chatWidgetData?: any;
  isChatbotEnabled?: boolean;
  projectDescription?: string;
  projectServices?: string[];
  isScrapedLeadProject?: boolean;
}

export type KnowledgebaseSparse = Pick<
  Knowledgebase,
  | '_id'
  | 'name'
  | 'status'
  | 'monthUsage'
  | 'crawlData'
  | 'owner'
  | 'chatbotType'
  | 'lastCrawlAt'
>;

/*********************************************************
 * KB DATA STORE
 *********************************************************/

export const KB_DATASTORE_COLLECTION = 'kbDataStore';

export enum DataStoreType {
  WEBPAGE = 'WEBPAGE',
  CUSTOM = 'CUSTOM',
  DOCUMENT = 'DOCUMENT',
  PDF = 'PDF',
  HTML = 'HTML',
  DOCX = 'DOCX',
  PPTX = 'PPTX',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  CSV = 'CSV',
  VIDEO = 'VIDEO',
}

export const DELETE_DATASTORE_MESSAGE_MAP: Record<DataStoreType, string> = {
  [DataStoreType.WEBPAGE]: 'Webpage deleted successfully',
  [DataStoreType.CUSTOM]: 'Custom data deleted successfully',
  [DataStoreType.DOCUMENT]: 'Document deleted successfully',
  [DataStoreType.PDF]: 'PDF deleted successfully',
  [DataStoreType.HTML]: 'HTML file deleted successfully',
  [DataStoreType.DOCX]: 'DOCX file deleted successfully',
  [DataStoreType.PPTX]: 'PPTX file deleted successfully',
  [DataStoreType.TEXT]: 'Text data deleted successfully',
  [DataStoreType.IMAGE]: 'Image deleted successfully',
  [DataStoreType.CSV]: 'CSV file deleted successfully',
  [DataStoreType.VIDEO]: 'Video deleted successfully',
};
export enum DataStoreStatus {
  CREATED = 'CREATED',
  CHUNKED = 'CHUNKED',
  TRAINED = 'TRAINED',
}

export interface KbDataStore {
  _id?: ObjectId;
  knowledgebaseId: ObjectId;
  url?: string;
  title?: string;
  content: string;
  type: DataStoreType;
  status: DataStoreStatus;
  fileBuffer?: Buffer | null;
  mimeType?: string;
  storageKey?: string; // R2 object key when file is stored in R2 instead of MongoDB
  createdAt: Date;
  updatedAt: Date;
}

export type KbDataStoreUrl = Pick<KbDataStore, '_id' | 'url'>;

/*********************************************************
 * CHUNKS
 *********************************************************/

export const CHARS_PER_TOKEN = 4;

// CHUNK SIZE = 1500 tokens
export const CHUNK_SIZE = 1500 * CHARS_PER_TOKEN;

export const CHUNK_COLLECTION = 'chunks';

export enum ChunkStatus {
  CREATED = 'CREATED',
  EMBEDDING_GENERATED = 'EMBEDDING_GENERATED',
}

export interface Chunk {
  _id?: ObjectId;
  knowledgebaseId: ObjectId;
  dataStoreId: ObjectId;
  url?: string;
  title?: string;
  chunk: string;
  status: ChunkStatus;
  type: DataStoreType;
  createdAt: Date;
  updatedAt: Date;
}

/*********************************************************
 * KB EMBEDDINGS
 *********************************************************/

export const KB_EMBEDDING_COLLECTION = 'kbEmbeddings';
export interface KbEmbedding {
  _id?: ObjectId; // Same as chunkId
  knowledgebaseId: ObjectId;
  embeddings: number[];
  type: DataStoreType;
}

/*********************************************************
 * CHAT SESSION
 *********************************************************/

export enum ChatAnswerFeedbackType {
  BAD,
  GOOD,
}

export interface ChatQueryAnswer {
  q: string;
  a: string;
  qTokens: number;
  aTokens: number;
  ts: Date;
  feedback?: ChatAnswerFeedbackType;
}

export const CHAT_SESSION_COLLECTION = 'chatSessions';
export interface ChatSession {
  _id?: ObjectId;
  knowledgebaseId: ObjectId;
  kbName: string;
  defaultAnswer?: string;
  prompt?: string;
  isDemo?: boolean;
  src?: string;
  customKeys?: CustomKeyData;
  userId: ObjectId;
  isUnread?: boolean;
  messages: ChatQueryAnswer[];
  userData?: any;
  startedAt: Date;
  updatedAt: Date;
  isAddress: boolean;
  isPhone: boolean;
}
export type ChatSessionSparse = Pick<
  ChatSession,
  | '_id'
  | 'knowledgebaseId'
  | 'src'
  | 'messages'
  | 'userData'
  | 'startedAt'
  | 'updatedAt'
>;

export interface ChatMessageWebhookPayload {
  q: string;
  a: string;
  ts: Date;
  session: {
    id: string;
    knowledgebaseId: string;
    kbName: string;
    src: string;
    userData: string;
    startedAt: Date;
    updatedAt: Date;
  };
}

/*********************************************************
 * PROMPT
 *********************************************************/

export const PROMPT_COLLECTION = 'prompts';

export interface Prompt {
  _id: ObjectId;
  prompt: string;
}

/*********************************************************
 * LEADS
 **********************************************************/

export const LEADS_COLLECTION = 'leads';

export enum IsLeadType {
  'mailBot' = 'mailBot',
  'voiceBot' = 'voiceBot',
  'chatBot' = 'chatBot',
  'zapierCrm' = 'zapierCrm',
  'callbackRequest' = 'callbackRequest',
  'widgetLead' = 'widgetLead',
}

export interface Lead {
  _id?: ObjectId;
  userId: string;
  name?: string;
  knowledgebaseId?: ObjectId;
  standAloneAssistant?: boolean;
  chatSessionId?: ObjectId;
  voiceBotRecordingId?: ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  city?: string;
  location?: string;
  postalCode?: string;
  serviceType?: string;
  category?: string;
  subCategory?: string;
  createdAt: Date;
  updatedAt: Date;
  emailStatus?: boolean;
  chatbotType?: string;
  fieldStatus?: number;
  jobDescription?: string;
  userData?: any;
  IsLeadType: IsLeadType;
  countryCode?: string;
  isSyncedToCrm: boolean;
  campaignId?: string;
  webhookCrmName?: string;
  campaignDetails?: { _id: ObjectId; campaignName?: string };
  chatMessage?: any;
  emailConversationId?: ObjectId;
  voiceBotRecordingURL?: string;
  callSummery?: string;
  customQuestions?: { question: string; answer: string }[];
  isMeetingBookedOnGoogleMeet?: boolean;
  zapierWebhookId?: string;
  calendarEventId?: string;
  isAppointmentBooked?: boolean;
  meetingDateAndTime?: Date;
  vapiId?: string;
}

export interface ChatSessionForWidget {
  id: string;
  messages: ChatMessageForWidget[];
}

export interface ChatMessageForWidget {
  id: string;
  role: string;
  content: string;
  timestamp: Date;
}
export interface WebsiteProject {
  _id: string;
  name: string;
  owner: string;
  status: string;
  websiteData: WebsiteData;
  createdAt: string;
  updatedAt: string;
  lastCrawlAt: string;
  crawlData: CrawlData;
  chatWidgeData: ChatWidgetData;
  defaultAnswer: string;
  monthUsage: MonthUsage;
  adminEmail: string;
}

export interface WebsiteData {
  websiteUrl: string;
  urls: string[];
  include: string[];
  exclude: string[];
}

export interface CrawlData {
  stats: {
    crawledPages: number;
    failedPages: number;
    runTime: number;
  };
}

export interface ChatWidgetData {
  backgroundColor: string;
  fontColor: string;
  placement: string;
  borderRadius: string;
  heading: string;
  description: string;
  offlineMessage: boolean;
  showReadMore: boolean;
  showAsPopup: boolean;
  popupDelay: number;
  collectEmailText: string;
  adminEmail: string;
  customCSS: string;
  avatarFieldValue: string;
  avatarFieldLabel: string;
  phoneFieldLabel: string;
  whatsappFieldLabel: string;
  videoFieldLabel: string;
  appointmentFieldLabel: string;
  contentEmail: string;
  contentPhone: string;
  contentWhatsapp: string;
  contentVideo: string;
  contentAppointment: string;

  questionExamples: QuestionExample[];
  welcomeMessages: string[];
  prompt: string;
  defaultAnswer: string;

  launcherIcon: LauncherIcon;
  chatInputPlaceholderText: string;
  assistantTabHeader: string;
  offlineMsgTabHeader: string;
  readMoreText: string;
  offlineMsgHeading: string;
  offlineMsgDescription: string;

  nameFieldLabel: string;
  nameFieldPlaceholder: string;

  emailFieldLabel: string;
  emailFieldPlaceholder: string;

  privacypolicyLabel: string;
  privacypolicyValue: string;

  termsandconditionsLabel: string;
  termsandconditionsValue: string;

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

  thankyouEmailText: string;
  isThankYouEmailEnabled: boolean;
}

export interface QuestionExample {
  heading: string;
  question: string;
  label: string;
}

export interface LauncherIcon {
  id: string;
  svgElement: string;
}

export interface LeadCollectionItem {
  phoneNumber: boolean;
  address: boolean;
}

export interface MonthUsage {
  month: string;
  count: number;
}
