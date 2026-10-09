import { IsArray, IsString } from 'class-validator';

export class DuplicateLeadDto {
  @IsString()
  currentCampaignId: string;

  @IsArray()
  previousCampaign: [];

  @IsArray()
  newCampaignAudiences: [];

  @IsArray()
  oldCampaignAudiences: [];
}
