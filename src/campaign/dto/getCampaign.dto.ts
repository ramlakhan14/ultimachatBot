import { IsOptional, IsString } from 'class-validator';

export class GetCampaignDto {
  @IsOptional()
  limit: number;

  @IsOptional()
  offset: number;

  @IsString()
  @IsOptional()
  searchStr: string;
}
