import { IsNotEmpty, IsOptional } from 'class-validator';
import { IsString } from 'class-validator';
import { WebhookRequestType } from '../common/zapier-webhook.enum';

export class UpdateUserZapierWebhookDto {
  @IsNotEmpty()
  @IsString()
  zapierWebhookId: string;

  @IsOptional()
  @IsString()
  webhookUrl: string;

  @IsOptional()
  @IsString()
  webhookRequestType: WebhookRequestType;
}
