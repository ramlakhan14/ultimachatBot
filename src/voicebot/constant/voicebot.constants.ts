export enum TOOLNAME {
  CAMPAIGN = 'manual_approval',
  FOLLOW_UP = 'follow_up',
}

export enum VOICE_SERVICE_PROVIDER_STATUS {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum transcriberLanguage {
  'English' = 'en',
  'Hindi' = 'hi',
  'French' = '11labs',
  'German' = 'azure',
  'Spanish' = 'google',
}

export enum model {
  'gpt-3.5-turbo' = 'gpt-3.5-turbo',
  'gpt-4o-mini' = 'gpt-4o-mini',
  'gpt-4o-latest' = 'gpt-4o-latest',
  'gpt-4' = 'gpt-4',
}

export enum VapiWebhookEnum {
  TOOL_CALL = 'tool-calls',
}

export type ToolCall = {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: any;
  };
};

interface BaseVapiPayload {
  call: VapiCall;
}
export interface VapiCall {}

export interface VapiPayload extends BaseVapiPayload {
  type: VapiWebhookEnum.TOOL_CALL;
  toolCalls: any;
  toolWithToolCallList: any;
}
