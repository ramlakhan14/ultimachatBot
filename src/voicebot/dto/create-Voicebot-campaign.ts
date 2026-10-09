import {
  ArrayNotEmpty,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  IsArray,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { meetingStatus } from '../../knowledgebase/google-calender-meeting.schema';
import { DATA_SOURCE_FOR_TARGET_AUDIENCE } from '../schema/voicebot.campaign.schema';

// // Enum for voice character
// export enum voiceCharacter {
//   Female = 'Female',
//   Male = 'Male',
// }

// DTO for phone number
export class PhoneNumberDTO {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsInt()
  maxLimit: number;

  @IsOptional()
  @IsString()
  assistantId?: string;

  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @IsOptional()
  @IsString()
  assistantName?: string;
}

// DTO for target audience
export class TargetAudienceCsvDTO {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  websiteUrl: string;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  companyName?: string | null;

  @IsString()
  @IsOptional()
  leadType?: string;

  @IsOptional()
  @IsString()
  businessName?: string | null;

  @IsOptional()
  @IsBoolean()
  isEmailInvalid?: boolean;

  @IsOptional()
  @IsBoolean()
  isPhoneInvalid?: boolean;

  @IsOptional()
  @IsBoolean()
  isWebsiteInvalid?: boolean;
}

export class TargetLeadsDTO {
  csvUploadLeads?: TargetAudienceCsvDTO[];

  linkedinLeads?: TargetAudienceCsvDTO[];

  facebookLeads?: TargetAudienceCsvDTO[];

  gmbLeads?: TargetAudienceCsvDTO[];

  yellowpagesLeads?: TargetAudienceCsvDTO[];

  forceContinue?: boolean;

  skipDuplicatesFromActiveCampaigns?: boolean;
}

export class CampaignProjectDTO {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;
}

export class PainPointSolutionDTO {
  @IsString()
  @IsNotEmpty()
  painPoint: string;

  @IsString()
  @IsNotEmpty()
  solution: string;
}

export class TargetAudienceDTO {
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CustomQuestionsDTO {
  @IsOptional()
  @IsString()
  firstQuestion?: string;

  @IsOptional()
  @IsString()
  secondQuestion?: string;

  @IsOptional()
  @IsString()
  thirdQuestion?: string;
}

// DTO for create voicebot campaign
export class CreateVoicebotCampaignDTO {
  @IsString()
  @IsNotEmpty()
  campaignName: string;

  @IsString()
  @IsOptional()
  toneOfVoice?: string;

  @IsString()
  @IsNotEmpty()
  voiceCharacter: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsNotEmpty()
  @IsInt()
  maxPerDayCall: number;

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDTO)
  phoneNumbers: PhoneNumberDTO[];

  @IsNotEmpty()
  @IsString()
  prompt: string;

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TargetAudienceCsvDTO)
  targetAudienceCsv: TargetAudienceCsvDTO[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CampaignProjectDTO)
  campaignProject: CampaignProjectDTO;

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PainPointSolutionDTO)
  painPointSolution: PainPointSolutionDTO[];

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TargetAudienceDTO)
  targetAudience: TargetAudienceDTO[];

  @IsString()
  @IsOptional()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  emailToTeam?: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsBoolean()
  @IsOptional()
  forceContinue: boolean;

  @IsBoolean()
  @IsOptional()
  skipDuplicatesFromActiveCampaigns: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomQuestionsDTO)
  customQuestions?: CustomQuestionsDTO;
}

export class UpdateVoicebotCampaignDTO {
  @IsString()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsNotEmpty()
  campaignName: string;

  @IsString()
  @IsOptional()
  toneOfVoice?: string;

  @IsString()
  @IsNotEmpty()
  voiceCharacter: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsNotEmpty()
  @IsInt()
  maxPerDayCall: number;

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PhoneNumberDTO)
  phoneNumbers: PhoneNumberDTO[];

  @IsOptional()
  @IsString()
  prompt: string;

  @IsOptional()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TargetAudienceCsvDTO)
  targetAudienceCsv: TargetAudienceCsvDTO[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CampaignProjectDTO)
  campaignProject: CampaignProjectDTO;

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PainPointSolutionDTO)
  painPointSolution: PainPointSolutionDTO[];

  @IsOptional()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TargetAudienceDTO)
  targetAudience: TargetAudienceDTO[];

  @IsString()
  @IsOptional()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  emailToTeam?: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string;

  @IsBoolean()
  @IsOptional()
  forceContinue: boolean;

  @IsBoolean()
  @IsOptional()
  skipDuplicatesFromActiveCampaigns: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomQuestionsDTO)
  customQuestions?: CustomQuestionsDTO;
}

export class ChangeMeetingStatus {
  @IsString()
  @IsNotEmpty()
  @IsEnum(meetingStatus)
  status: meetingStatus;

  @IsString()
  @IsNotEmpty()
  id: string;
}

export class VoicebotCampaignScrapeDTO {
  @IsString()
  @IsOptional()
  query: string;

  @IsArray()
  @IsOptional()
  categories: [];

  @IsString({ message: 'Country must be a string' })
  @IsNotEmpty({ message: 'Country name is required' })
  country: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City name is required' })
  city: string;

  @IsNumber()
  @IsNotEmpty()
  limit: number;

  @IsOptional()
  filter: [];

  @IsString()
  @IsOptional()
  userToken?: string;
}
