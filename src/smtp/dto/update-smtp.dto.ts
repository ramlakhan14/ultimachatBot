import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { WarmupSettingsDto } from './warmup.setting.dto';
import { Type } from 'class-transformer';

export class UpdateSmtpDto {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  @IsOptional()
  imapHost: string;

  @IsNumber()
  @IsOptional()
  imapPort: number;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  timeout?: number;

  @IsString()
  @IsOptional()
  testEmail?: string;

  @IsString()
  knowledgebaseId: string;

  @IsBoolean()
  @IsOptional()
  isStandAloneAssistant: boolean;

    // User must explicitly choose — no default assumed
    @IsBoolean()
    enableWarmup: boolean;
  
    // Required only when enableWarmup=true
    @ValidateIf((o) => o.enableWarmup === true)
    @ValidateNested()
    @Type(() => WarmupSettingsDto)
    warmupSettings?: WarmupSettingsDto;
}
