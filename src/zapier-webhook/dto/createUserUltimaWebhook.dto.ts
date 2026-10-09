import { IsOptional, IsString } from 'class-validator';
import { IsNotEmpty } from 'class-validator';
import { WebhookRequestType } from '../common/zapier-webhook.enum';

export class CreateUserUltimaWebhookDto {
  @IsOptional()
  @IsString()
  webhookUrl: string;

  @IsOptional()
  @IsString()
  webhookSecret: string;

  @IsOptional()
  @IsString()
  urlSecret: string;

  @IsNotEmpty()
  @IsString()
  crmName: string;

  @IsOptional()
  requestType: WebhookRequestType;

  @IsOptional()
  @IsString()
  description?: string;
}
