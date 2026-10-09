import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CAMPAIGN_STATUS, CAMPAIGN_TRIGGER_STATUS } from '../enum/enum';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  campaignName: string;

  @IsObject()
  @IsNotEmpty()
  campaignProject: object;

  @IsArray()
  @IsNotEmpty()
  targetAudience: object[];

  @IsArray()
  @IsNotEmpty()
  painPoints: object[];

  @IsArray()
  @IsNotEmpty()
  solutionOffer: object[];

  @IsObject()
  @IsNotEmpty()
  callOfAction: object;

  @IsString()
  @IsNotEmpty()
  campaignLanguage: string;

  @IsString()
  @IsNotEmpty()
  emailLength: string;

  @IsNumber()
  @IsNotEmpty()
  maxEmailsPerDay: number;

  @IsNumber()
  @IsNotEmpty()
  maxEmailsPerLead: number; // max follow up email limit aka max email per lead

  @IsArray()
  @IsNotEmpty()
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
  followUpFrequency?: number;

  @IsNumber()
  @IsOptional()
  totalFollowUps?: number;
}

export class TargetEmailAudienceCsvDTO {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  websiteName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  zipcode?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  isEmailInvalid?: boolean;

  @IsBoolean()
  @IsOptional()
  isPhoneInvalid?: boolean;

  @IsBoolean()
  @IsOptional()
  isWebsiteInvalid?: boolean;
}

export class PreviousCampaignDTO {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  websiteName?: string;

  @IsString()
  @IsOptional()
  websiteUrl?: string;
}
export class TargetEmailLeadsDTO {
  csvUploadLeads?: TargetEmailAudienceCsvDTO[];

  linkedinLeads?: TargetEmailAudienceCsvDTO[];

  facebookLeads?: TargetEmailAudienceCsvDTO[];

  gmbLeads?: TargetEmailAudienceCsvDTO[];

  yellowpageLeads?: TargetEmailAudienceCsvDTO[];

  previousCampaigns?: PreviousCampaignDTO[];

  @IsString()
  @IsOptional()
  campaignId: string;

  @IsBoolean()
  @IsOptional()
  forceContinue?: boolean;

  @IsBoolean()
  @IsOptional()
  skipDuplicatesFromActiveCampaigns?: boolean;

  @IsArray()
  @IsOptional()
  unsubscriptions?: object[];
}
