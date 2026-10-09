import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GPTModels } from '../../campaign/enum/enum';

export class TranscriberDto {
  @IsString()
  @IsOptional()
  provider?: string = 'deepgram';

  @IsString()
  model: string;

  @IsString()
  @IsOptional()
  language?: string = 'en';
}

export class ModelDto {
  @IsString()
  @IsOptional()
  provider?: string = 'openai';

  @IsString()
  @IsOptional()
  model?: string = GPTModels.GPT_5_MINI;

  @IsNumber()
  @IsOptional()
  temperature?: number = 0.5;

  @IsNumber()
  @IsOptional()
  maxTokens?: number = 250;

  @IsString()
  @IsOptional()
  knowledgeBaseId?: string;

  @IsBoolean()
  @IsOptional()
  emotionRecognitionEnabled?: boolean = false;
}

export class VoiceDto {
  @IsString()
  @IsOptional()
  provider?: string = 'cartesia';

  @IsString()
  model: string;

  @IsString()
  voiceId: string;
}

export class BackoffPlanDto {
  @IsNumber()
  @IsOptional()
  maxRetries?: number = 0;

  @IsOptional()
  type?: Record<string, any> = {};

  @IsNumber()
  @IsOptional()
  baseDelaySeconds?: number = 0;
}

export class ServerDto {
  @IsString()
  @IsOptional()
  url?: string = '';

  @IsNumber()
  @IsOptional()
  timeoutSeconds?: number = 0;

  @IsString()
  @IsOptional()
  secret?: string = '';

  @IsOptional()
  headers?: Record<string, any> = {};

  @ValidateNested()
  @Type(() => BackoffPlanDto)
  @IsOptional()
  backoffPlan?: BackoffPlanDto;
}

export class CompliancePlanDto {
  @IsBoolean()
  @IsOptional()
  hipaaEnabled?: boolean = false;

  @IsBoolean()
  @IsOptional()
  pciEnabled?: boolean = false;
}

export class MessagePlanDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  idleMessages?: string[] = [];

  @IsNumber()
  @IsOptional()
  idleMessageMaxSpokenCount?: number = 0;

  @IsNumber()
  @IsOptional()
  idleTimeoutSeconds?: number = 0;

  @IsString()
  @IsOptional()
  silenceTimeoutMessage?: string = '';
}

export class KeypadInputPlanDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = false;

  @IsNumber()
  @IsOptional()
  timeoutSeconds?: number = 0;

  @IsOptional()
  delimiters?: any = null;
}

export class CreateAssistantDto {
  @ValidateNested()
  @Type(() => TranscriberDto)
  transcriber: TranscriberDto;

  @ValidateNested()
  @Type(() => ModelDto)
  model: ModelDto;

  @ValidateNested()
  @Type(() => VoiceDto)
  voice: VoiceDto;

  @IsString()
  firstMessage: string;

  @IsArray()
  @IsOptional()
  clientMessages?: any[] = [];

  @IsArray()
  @IsOptional()
  serverMessages?: any[] = [];

  @IsNumber()
  @IsOptional()
  silenceTimeoutSeconds?: number = 0;

  @IsNumber()
  @IsOptional()
  maxDurationSeconds?: number = 0;

  @IsString()
  @IsOptional()
  backgroundSound?: string = 'off';

  @IsBoolean()
  @IsOptional()
  backgroundDenoisingEnabled?: boolean = true;

  @IsBoolean()
  @IsOptional()
  modelOutputInMessagesEnabled?: boolean = false;

  @IsArray()
  @IsOptional()
  transportConfigurations?: any[] = [];

  @IsArray()
  @IsOptional()
  credentials?: any[] = [];

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  voicemailMessage?: string;

  @IsString()
  @IsOptional()
  endCallMessage?: string;

  @IsArray()
  @IsOptional()
  endCallPhrases?: string[] = [];

  @ValidateNested()
  @Type(() => CompliancePlanDto)
  @IsOptional()
  compliancePlan?: CompliancePlanDto;

  @IsOptional()
  metadata?: Record<string, any> = {};

  @ValidateNested()
  @Type(() => MessagePlanDto)
  @IsOptional()
  messagePlan?: MessagePlanDto;

  @IsArray()
  @IsOptional()
  credentialIds?: string[] = [];

  @ValidateNested()
  @Type(() => ServerDto)
  @IsOptional()
  server?: ServerDto;

  @IsArray()
  @IsOptional()
  hooks?: any[] = [];

  @ValidateNested()
  @Type(() => KeypadInputPlanDto)
  @IsOptional()
  keypadInputPlan?: KeypadInputPlanDto;
}
