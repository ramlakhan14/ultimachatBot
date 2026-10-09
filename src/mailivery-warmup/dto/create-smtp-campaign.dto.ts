import {
  IsString,
  IsEmail,
  IsInt,
  IsBoolean,
  Min,
  Max,
  Length,
  IsOptional,
  IsIn,
  IsEnum,
  IsArray,
} from 'class-validator';
import { MailiveryCampaignType } from '../schema/warmupEmail.schema';

export class SmtpConfigDto {
  @IsString()
  @Length(1, 255)
  smtp_host: string;

  @IsInt()
  @IsIn([465, 587, 25, 2525, 8025])
  smtp_port: number;

  @IsString()
  @Length(1, 255)
  smtp_username: string;

  @IsString()
  @Length(1, 255)
  smtp_password: string;
}

export class ImapConfigDto {
  @IsString()
  @Length(1, 255)
  imap_host: string;

  @IsInt()
  imap_port: number; // 143 or 993 typically

  @IsEmail()
  @IsOptional()
  imap_email: string;

  @IsString()
  @Length(1, 255)
  @IsOptional()
  imap_username: string;

  @IsString()
  @Length(1, 255)
  imap_password: string;
}

export class CreateSmtpCampaignDto {
  @IsString()
  @Length(1, 255)
  first_name: string;


  @IsString()
  @Length(1, 255)
  last_name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(0)
  @Max(200)
  email_per_day: number;

  @IsInt()
  @Min(0)
  @Max(100)
  response_rate: number;

  // Nested configs
  smtp: SmtpConfigDto;
  imap: ImapConfigDto;

  // Optional fields
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
