import {
  IsString,
  IsNotEmpty,
  Matches,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { CallType } from '../schema/phonenumber.schema';

export class CreatePhoneNumberDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message:
      'Phone number must be in E.164 format (e.g., +1234567890). Must start with + followed by 1-15 digits.',
  })
  phoneNumber: string;

  @IsEnum(CallType)
  @IsNotEmpty()
  callType: CallType;

  @IsString()
  @IsNotEmpty()
  assistantId: string;

  @IsOptional()
  assistantName?: string;
}
