import { IsNotEmpty, IsOptional } from 'class-validator';
import { IsString } from 'class-validator';
import { WebhookRequestType } from '../common/zapier-webhook.enum';

export class UpdateUserUltimaWebhookDto {
  @IsNotEmpty()
  @IsString()
  webhookId: string;

  @IsOptional()
  @IsString()
  crmName: string;

  @IsOptional()
  requestType: WebhookRequestType;
}
