import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  Matches,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TransferCallMode,
  FallbackAction,
  IsLeadDataCollection,
} from '../schema/voicebot-setting.schema';

export class InboundSettingsDto {
  @IsEnum(TransferCallMode)
  @IsOptional()
  transferCall: TransferCallMode;

  @IsString()
  @IsOptional()
  customTransferMessage: string;

  @IsEnum(FallbackAction)
  @IsOptional()
  fallbackAction: FallbackAction;
}

export class LeadCollectionDataDto {
  @IsEnum(IsLeadDataCollection)
  @IsOptional()
  fullName?: IsLeadDataCollection;

  @IsEnum(IsLeadDataCollection)
  @IsOptional()
  email?: IsLeadDataCollection;

  @IsEnum(IsLeadDataCollection)
  @IsOptional()
  contactNumber?: IsLeadDataCollection;

  @IsEnum(IsLeadDataCollection)
  @IsOptional()
  address?: IsLeadDataCollection;
}

export class OutboundSettingsDto {
  @IsString()
  @IsNotEmpty()
  callForwardingNumber: string;

  @IsEnum(TransferCallMode)
  @IsNotEmpty()
  transferCall: TransferCallMode;

  @IsString()
  @IsNotEmpty()
  customTransferMessage: string;

  @IsEnum(FallbackAction)
  @IsNotEmpty()
  fallbackAction: FallbackAction;

  @ValidateNested()
  @Type(() => LeadCollectionDataDto)
  @IsNotEmpty()
  leadCollectionData: LeadCollectionDataDto;

  @IsString()
  @IsNotEmpty()
  defaultPrompt: string;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

class LunchHourDto {
  @IsString()
  @Matches(TIME_REGEX, { message: 'Invalid lunch start time' })
  start: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'Invalid lunch end time' })
  end: string;
}

class ReminderIntervalDto {
  @IsString()
  @IsNotEmpty()
  type: string; // e.g., 'daily', 'weekly', 'monthly'

  @IsNumber()
  @IsNotEmpty()
  amount: number; // e.g., 1 for daily, 2 for weekly, etc.

  @IsString()
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Invalid start time format (HH:mm)' })
  startTime: string;

  @IsString()
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Invalid end time format (HH:mm)' })
  endTime: string;
}

export class FollowupSettingDto {
  @ValidateNested()
  @Type(() => LunchHourDto)
  lunchHour: LunchHourDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkDayAndHourDto)
  workDaysAndHours: WorkDayAndHourDto[];

  @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => ReminderIntervalDto)
  reminderIntervals: ReminderIntervalDto[];
}

class WorkHourDto {
  @IsString()
  @Matches(TIME_REGEX, { message: 'Invalid start time format (HH:mm)' })
  startTime: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'Invalid end time format (HH:mm)' })
  endTime: string;
}

class WorkDayAndHourDto {
  @IsString()
  day:
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday';

  @ValidateNested()
  @Type(() => WorkHourDto)
  hours: WorkHourDto;
}
