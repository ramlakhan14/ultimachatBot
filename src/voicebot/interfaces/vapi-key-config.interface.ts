import { KnowledgebaseDetailsDTO } from '../inbound-bot/dto/create-inbound-bot.dto';

export interface IBookingAppoitment {
  fullName: string;
  dateAndTime: string;
  email: string;
  contactNumber: string;
}

export interface IUpdateAssistant {
  userId?: string;
  assistantId?: string;
  campaignName?: string;
  language: string;
  voiceCharacter: string;
  prompt?: string;
  assistantName?: string;
  companyName?: string;
  supportEmailId?: string;
  solutions?: string;
  painPoints?: string;
  toolIds: string[];
  IsContactEnable?: boolean;
  waitSeconds?: number;
  IsAddressEnable?: boolean;
  knowledgebaseId?: string;
  knowledgeBaseFiles?: string[];
  webhookUrl?: string;
}

export interface IConfigData {
  userId: string;
  vapiServerAPIkey: string;
  twilioAuthToken: string;
  twilioAccountSid: string;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
  vapiAssistantData?: IUpdateAssistant[];
  vapiToolsData?: IToolData[];
}

export interface IToolData {
  toolId: string;
  toolName: string;
  toolDescription: string;
  toolType: string;
  toolConfig: object;
}
