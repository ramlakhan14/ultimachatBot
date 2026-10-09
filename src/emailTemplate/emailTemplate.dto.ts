import { IsString } from 'class-validator';

export class UpdateEmailtemplateDto {
  @IsString()
  signupEmailText: string;

  @IsString()
  forgetPasswordEmailText: string;

  @IsString()
  forgetPasswordSuccessEmailText: string;

  @IsString()
  inviteUserEmailText: string;

  @IsString()
  leadsDataEmailText: string;

  @IsString()
  offlineMessagesEmailText: string;
}
