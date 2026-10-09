import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignProjectDTO } from '../../dto/create-Voicebot-campaign';

export class KnowledgebaseDetailsDTO {
  @IsOptional()
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileName: string;
}

export class CreateInboundBotDto {
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

export class TalkToUltimaBotDto {

   @IsString()
    name?: string;
  
    @IsString()
    email?: string;
  
    @IsString()
    phone?: string;
  
    @IsString()
    address?: string;
  
    @IsString()
    website?: string;

    @IsString()
    @IsOptional()
    message?: string;
  
    @IsString()
    @IsOptional()
    isLeadType?: string;

    @IsOptional()
    @IsString()
    knowledgebaseId?: string;

}
