import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CAMPAIGN_STATUS, CAMPAIGN_TRIGGER_STATUS } from '../enum/enum';

export class UpdateCampaignDto {
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @IsString()
  @IsOptional()
  campaignName: string;

  @IsString()
  @IsOptional()
  campaignProjectId: string;

  @IsArray()
  @IsOptional()
  targetAudience: object[];

  @IsArray()
  @IsOptional()
  painPoints: object[];

  @IsArray()
  @IsOptional()
  solutionOffer: object[];

  @IsObject()
  @IsOptional()
  callOfAction: object;

  @IsString()
  @IsOptional()
  campaignLanguage: string;

  @IsString()
  @IsOptional()
  emailLength: string;

  @IsNumber()
  @IsOptional()
  maxEmailsPerDay: number;

  @IsNumber()
  @IsOptional()
  maxEmailsPerLead: number; // max follow up email limit aka max email per lead

  @IsArray()
  @IsOptional()
  emailAndSenderLimit: object[];

  @IsDate()
  @IsOptional()
  createdAt: Date;

  @IsDate()
  @IsOptional()
  updatedAt: Date;

  @IsString()
  @IsOptional()
  status: CAMPAIGN_STATUS;

  @IsString()
  @IsOptional()
  campaignTrigger: CAMPAIGN_TRIGGER_STATUS;

  @IsString()
  @IsOptional()
  scheduledId: string;

  @IsNumber()
  @IsOptional()
  followUpFrequency: number; //FE KEY:- Number of the day followups

  @IsNumber()
  @IsOptional()
  totalFollowUps: number; //FE KEY :- number of follow ups
}
