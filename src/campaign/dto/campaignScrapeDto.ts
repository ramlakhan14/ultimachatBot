import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CampaignScrapeDTO {
  @IsString()
  @IsOptional()
  query: string;

  @IsArray()
  @IsOptional()
  categories: [];

  @IsString()
  @IsOptional()
  country: string;

  @IsNumber()
  @IsNotEmpty()
  limit: number;

  @IsOptional()
  filter: [];

  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @IsString()
  @IsOptional()
  userToken?: string;
}

export class EditDraftEmailDto {
  @IsNotEmpty()
  @IsString()
  draftEmailId: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  emailTextContent?: string;
}
