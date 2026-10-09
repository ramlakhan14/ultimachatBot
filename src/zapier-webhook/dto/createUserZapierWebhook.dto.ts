import { IsOptional, IsString } from 'class-validator';
import { IsNotEmpty } from 'class-validator';
import { WebhookRequestType } from '../common/zapier-webhook.enum';

export class CreateZapierWebhookDto {
  @IsNotEmpty()
  @IsString()
  crmName: string;

  @IsNotEmpty()
  @IsString()
  webhookUrl: string;

  @IsOptional()
  webhookRequestType: WebhookRequestType;
}
