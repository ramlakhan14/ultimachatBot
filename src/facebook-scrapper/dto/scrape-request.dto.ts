import { IsOptional, IsString, IsNumber } from 'class-validator';

export class ScrapeRequestDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  resultsLimit: number;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class FacebookScrapeRequestDto {
  @IsString({ each: true })
  query: string[];

  @IsOptional()
  @IsString({ each: true })
  locations: string[];

  @IsNumber()
  resultsLimit: number;

  @IsOptional()
  @IsString()
  campaignId?: string;
}
