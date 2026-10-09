import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AssistantDTO {
  @IsString()
  @IsOptional()
  assistantId: string;

  @IsString()
  transcriberProvider: string;

  @IsString()
  transcriberModel: string;

  @IsString()
  @IsOptional()
  transcriberLanguage: string;

  @IsString()
  systemPrompt: string;

  @IsUUID()
  @IsOptional()
  knowledgeBaseId: string;

  @IsBoolean()
  isEmotionRecognitionEnabled: boolean;

  @IsString()
  voiceProvider: string;

  @IsString()
  voiceModel: string;

  @IsString()
  voiceId: string;

  @IsString()
  firstMessage: string;

  @IsString()
  backgroundSound: string;

  @IsString()
  assistantName: string;

  @IsString()
  endCallMessage: string;

  @IsString()
  voiceMailMessage: string;

  @IsString()
  idleMessage: string;
}

export class updateAssistantDTO {
  @IsUUID()
  @IsNotEmpty()
  assistantId: string;

  @IsUUID()
  @IsOptional()
  toolId: string;

  @IsUUID()
  @IsOptional()
  knowledgeBaseId: string;
}
// honeNumber, twilioAccountSid, twilioAuthToken, assistantId , name
export class createPhoneNumber {
  @IsString()
  phoneNumber: string;

  @IsString()
  twilioAccountSid: string;

  @IsString()
  twilioAuthToken: string;

  @IsString()
  assistantId: string;

  @IsString()
  name: string;
}
