import { ObjectId } from 'mongodb';
import { VOICE_SERVICE_PROVIDER_STATUS } from '../constant/voicebot.constants';

export const CAMPAIGN_VOICE_SERVER_CONFIG_COLLECTION =
  'campaignVoiceServerConfig';

export interface Assistant {
  id: string;
  orgId: string;
  name: string;
  voice: VoiceConfig;
  createdAt: Date;
  updatedAt: Date;
  model: ModelConfig;
  firstMessage?: string;
  firstMessageMode?:
    | 'assistant-speaks-first'
    | 'assistant-speaks-first-with-model-generated-message'
    | 'assistant-waits-for-user';
  clientMessages?: string[];
  serverMessages?: string[];
  hipaaEnabled?: boolean;
  backchannelingEnabled?: boolean;
  backgroundDenoisingEnabled?: boolean;
  endCallFunctionEnabled?: boolean;
  transcriber?: TranscriberConfig;
  backgroundSound?: string;
  isServerUrlSecretSet?: boolean;
  assistantResponse: object; //save all the response from vapi in onject formate
  toolIds: {
    toolId: string;
    toolName: string;
    toolDescription: string;
    createdAt: Date;
    toolData: object;
  }[];
  phoneNumber?: string;
}

export interface VoiceCampaignServerConfig {
  _id?: ObjectId;
  userId: string;
  vapiServerAPIkey: string;
  twilioAuthToken: string;
  twilioAccountSid: string;
  vapiAssistantData?: Assistant[];
  vapiToolsData?: ToolData[];
  status: VOICE_SERVICE_PROVIDER_STATUS;
  vapiKeyHash?: string;
  inboundToolsData?: any;
  elevenLabsAPIKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface VoiceConfig {
  model?: string;
  voiceId: string;
  provider: '11labs' | 'deepgram' | 'cartesia';
  stability?: number;
  similarityBoost?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelConfig {
  model: string;
  toolIds?: string[];
  messages: Message[];
  provider: 'openai' | 'azure' | 'assembly-ai' | 'anyscale';
  temperature: number;
  maxTokens: number;
  knowledgeBaseId: string;
  emotionRecognitionEnabled: boolean;
}

export interface TranscriberConfig {
  model: string;
  language: string;
  provider: string;
}

// Response type for getting all assistants
export interface AssistantResponse {
  assistants: Assistant[];
  total: number;
  page: number;
  limit: number;
}

export interface ToolData {
  // request_start_message?: string;
  // request_complete_message?: string;
  // request_failed_message?: string;
  // request_response_delayed_message?: string;
  toolType: 'function' | 'dtmf' | 'transferCall';
  toolId: string;
  toolName: string;
  // phoneNumber?:number;
  // messageBeforeTransfer?:string;
  description?: string;
  function_server_url?: string;
  // parameters?: {
  //   name: string;
  //   description: string;
  //   type: string;
  //   required?: boolean
  // }[];
  // headers?: Record<string, string>;
  // is_async?: boolean;
  // strict_paramater_validation?: boolean;
  toolData?: object;
}
