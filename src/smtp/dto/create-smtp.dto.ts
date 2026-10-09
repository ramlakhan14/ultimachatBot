import {
  IsBoolean, IsDefined, IsEmail, IsNumber, IsOptional,
  IsString, ValidateIf, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WarmupSettingsDto } from './warmup.setting.dto';

export class CreateSmtpDto {
  @IsOptional()
  @IsString()
  knowledgebaseId?: string;

  @IsOptional()
  @IsBoolean()
  isStandAloneAssistant?: boolean;

  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsOptional()
  @IsString()
  imapHost?: string;

  @IsOptional()
  @IsNumber()
  imapPort?: number;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  timeout?: number;

  @IsOptional()
  @IsString()
  testEmail?: string;

  // User must explicitly choose — no default assumed
  @IsBoolean()
  enableWarmup: boolean;

  // Required only when enableWarmup=true
  @ValidateIf((o) => o.enableWarmup === true)
  @IsDefined({ message: 'Response Rate and Email Per Day is required when Warmup is enabled' })
  @ValidateNested()
  @Type(() => WarmupSettingsDto)
  warmupSettings?: WarmupSettingsDto;
}