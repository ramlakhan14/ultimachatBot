import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TargetLeadsDto } from './target.leads.dto';

export class CreateUltimaReviewCampaignDto {
  @IsString()
  @IsNotEmpty()
  campaignName: string;

  @IsString()
  @IsNotEmpty()
  targetAudience: string;

  @IsNotEmpty()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TargetLeadsDto)
  targetLeads: TargetLeadsDto[];
}

export class UltimaReviewCampaignScrapeDTO {
  @IsString()
  @IsOptional()
  query: string;

  @IsArray()
  @IsOptional()
  categories: [];

  @IsString()
  @IsOptional()
  country: string;

  @IsString()
  @IsOptional()
  city: string;

  @IsNumber()
  @IsNotEmpty()
  limit: number;

  @IsOptional()
  filter: [];

  @IsString()
  @IsOptional()
  userToken?: string;
}
