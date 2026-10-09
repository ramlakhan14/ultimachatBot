import { ObjectId } from 'mongodb';
import { CampaignProjectDTO } from '../../dto/create-Voicebot-campaign';
import { KnowledgebaseDetailsDTO } from '../dto/create-inbound-bot.dto';

export const INBOUND_BOT_SCHEMA = 'inboundBot';

export enum BotStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Failed = 'Failed',
}

// Schema for inbound bot
export interface InboundBotSchema {
  userId: ObjectId;
  status: BotStatus;
  botName: string;
  totalCalls?: number;
  failedCalls?: number;
  successCalls?: number;
  voiceCharacter: string;
  campaignProject: CampaignProjectDTO;
  botPurpose: string;
  phoneNumber: string;
  toneOfVoice?: string;
  prompt: string;
  assistantId?: string;
  phoneNumberId?: string;
  knowledgebaseDetails?: KnowledgebaseDetailsDTO;
  voiceCloneId?: string;
  isLeadBot?: boolean;
  emailToTeam?: string | null;
  failedReason?: string;
  vapiAssistantData?: any;
  createdAt: Date;
  updatedAt: Date;
}
