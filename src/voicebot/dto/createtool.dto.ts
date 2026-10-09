import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateToolDto {
  @IsString()
  @IsNotEmpty()
  function_name: string;

  @IsString()
  @IsNotEmpty()
  request_start_message: string;

  @IsString()
  @IsNotEmpty()
  request_complete_message: string;

  @IsString()
  @IsNotEmpty()
  request_failed_message: string;

  @IsString()
  @IsNotEmpty()
  request_response_delayed_message: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsUrl()
  @IsNotEmpty()
  function_server_url: string;
}

export class KeyVerificationDTO {
  @IsString()
  vapiKey: string;

  @IsString()
  twilioAuthToken: string;

  @IsString()
  twilioAccountSid: string;

  @IsString()
  @IsOptional()
  serverConfigId: string;

  @IsString()
  @IsOptional()
  elevenLabsAPIKey: string;
}
