import { IsOptional, IsString } from 'class-validator';

export class CampaignSchedulerDto {
  @IsString()
  campaignId: string;

  @IsOptional()
  campaignName: string;

  @IsString()
  scheduleDate: string;

  @IsString()
  scheduleTime: string;
}
