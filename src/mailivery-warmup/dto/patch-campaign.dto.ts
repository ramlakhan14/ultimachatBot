import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsInt,
  ArrayNotEmpty,
  ArrayUnique,
  IsEmail,
  IsEnum,
  Length,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MailiveryCampaignType } from '../schema/warmupEmail.schema';

class SmtpConfigDto {
  @IsOptional()
  @IsString()
  smtp_host?: string;

  @IsOptional()
  @IsInt()
  smtp_port?: number;

  @IsOptional()
  @IsString()
  smtp_username?: string;

  @IsOptional()
  @IsString()
  smtp_password?: string;
}

class ImapConfigDto {
  @IsOptional()
  @IsString()
  imap_host?: string;

  @IsOptional()
  @IsInt()
  imap_port?: number;

  @IsOptional()
  @IsEmail()
  imap_email?: string;

  @IsOptional()
  @IsString()
  imap_username?: string;

  @IsOptional()
  @IsString()
  imap_password?: string;
}

export class PatchCampaignDto {
  @ArrayNotEmpty()
  Ids: string[];

  @IsOptional()
  @IsString()
  @Length(1, 255)
  first_name?: string;

  @IsOptional()
  @IsEnum(MailiveryCampaignType)
  campaignType?: MailiveryCampaignType;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  email_per_day?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  emailPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  response_rate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  responseRate?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtp?: SmtpConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImapConfigDto)
  imap?: ImapConfigDto;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  ramp_up?: boolean;

  @IsOptional()
  @IsIn(['slow', 'normal', 'fast'])
  rampup_speed?: 'slow' | 'normal' | 'fast';

  @IsOptional()
  @IsArray()
  tags?: string[] | null;

  @IsOptional()
  @IsEmail()
  owner_email?: string;
}
