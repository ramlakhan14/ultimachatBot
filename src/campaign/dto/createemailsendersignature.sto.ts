import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateEmailSenderSignatureDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  authKey: string;

  @IsString()
  postmarkEmailAppPassword: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  replyToEmail?: string;

  @IsString()
  @IsOptional()
  personalNote?: string;
}
