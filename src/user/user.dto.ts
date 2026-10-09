import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserDTO {
  @IsNotEmpty()
  email: string;

  name?: string;

  password?: string;

  avatarUrl?: string;

  locale?: string;

  openaiKey?: OpenApiKeyDto;
}

export class UserDetailsPreviewDTO {
  @IsNotEmpty()
  id: string;
}

export class OpenApiKeyDto {
  @IsOptional()
  @IsBoolean()
  useOwnKey?: boolean;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  limitValue?: number;

  @IsOptional()
  @IsString()
  limitType?: 'Value' | 'Percentage';
}
export class OTPDTO {
  @IsString()
  email: string;

  @IsString()
  otp: string;
}
export class ChangePasswordDTO {
  @IsNotEmpty()
  @IsString()
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
