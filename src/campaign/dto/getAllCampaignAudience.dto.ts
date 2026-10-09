import { IsOptional, IsString } from 'class-validator';

export class GetAllCampaignAudeinceDto {
  @IsOptional()
  limit: number;

  @IsOptional()
  offset: number;

  @IsString()
  @IsOptional()
  searchStr: string;

  @IsString()
  @IsOptional()
  campaignId: string;
}
