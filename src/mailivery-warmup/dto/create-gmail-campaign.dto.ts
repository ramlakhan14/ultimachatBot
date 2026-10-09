import {
  IsBoolean,
  IsInt,
  IsString,
  IsOptional,
  IsIn,
  IsEmail,
  Min,
  Max,
  Length,
  IsNumber,
} from 'class-validator';

export class CreateGmailCampaignDto {
  @IsString()
  @Length(1, 255)
  app_password: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  email_per_day: number;

  @IsString()
  @Length(1, 255)
  first_name: string;

  @IsString()
  @Length(1, 255)
  last_name: string;

  @IsInt()
  @Min(0)
  @Max(100)
  response_rate: number;

  @IsOptional()
  @IsBoolean()
  ramp_up?: boolean = false;

  @IsOptional()
  @IsIn(['slow', 'normal', 'fast'])
  rampup_speed?: 'slow' | 'normal' | 'fast' = 'normal';

  @IsOptional()
  @IsString()
  timezone?: string = 'America/Chicago';

  @IsOptional()
  sending_schedule_presets?: any;

  @IsOptional()
  @IsString()
  tags?: string | null;

  @IsOptional()
  @IsEmail()
  owner_email?: string;
}
