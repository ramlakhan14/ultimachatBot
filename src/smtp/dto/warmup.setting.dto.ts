import {
  IsIn,
  IsInt, IsOptional, IsString, Max, Min,
} from 'class-validator';

export enum WarmupPreset {
  SAFE = 'safe',
  STANDARD = 'standard',
  AGGRESSIVE = 'aggressive',
}

// No longer asked at creation — Option 1 is the default.
// Only exposed if user manually switches to Option 2 post-warmup.
export enum PostWarmupOption {
  AUTO_RAMPUP = 'auto_rampup',   // DEFAULT: mimics warmup growth into live sends
  MANUAL_LIMIT = 'manual_limit', // User sets their own live limit after warmup
}

export class WarmupSettingsDto {
  @IsInt()
  @Min(0)
  @Max(200)
  email_per_day: number;

  @IsInt()
  @Min(0)
  @Max(100)
  response_rate: number;

}