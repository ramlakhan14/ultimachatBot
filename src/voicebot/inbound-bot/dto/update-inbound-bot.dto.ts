import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CampaignProjectDTO } from '../../dto/create-Voicebot-campaign';
import { Type } from 'class-transformer';
import { KnowledgebaseDetailsDTO } from './create-inbound-bot.dto';

export class UpdateInboundBotDto  {
  @IsString()
  @IsNotEmpty()
  _id: string;

  @IsString()
    @IsNotEmpty()
    botName: string;
  
    @IsString()
    @IsNotEmpty()
    voiceCharacter: string;
  
    @IsNotEmpty()
    @Type(() => CampaignProjectDTO)
    campaignProject: CampaignProjectDTO;
  
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;
  
    @IsOptional()
    @IsString()
    toneOfVoice?: string;
  
    @IsString()
    @IsNotEmpty()
    prompt: string;
  
    @IsString()
    @IsNotEmpty()
    botPurpose: string;
  
    @IsOptional()
    @IsBoolean()
    isLeadBot?: boolean;
  
    @IsOptional()
    @IsString()
    voiceCloneId?: string;
  
    @IsOptional()
    @IsString()
    emailToTeam?: string | null;
  
    @IsOptional()
    knowledgebaseDetails?: KnowledgebaseDetailsDTO;
}
