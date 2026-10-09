import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  isString,
  IsString,
  IsUrl,
} from 'class-validator';

export class ScrapeDTO {
  // @IsString()
  // @IsOptional()
  // query: string;

  // @IsArray()
  // @IsOptional()
  // categories: [];

  // @IsNumber()
  // @IsNotEmpty()
  // limit: number;

  // @IsOptional()
  // filter: [];

  @IsOptional()
  enrichment?: [];

  @IsString()
  @IsOptional()
  coordinates?: string;

  @IsString()
  @IsOptional()
  fields?: string;

  @IsString()
  @IsOptional()
  language?: string;

  // @IsString()
  // @IsOptional()
  // userToken?: string;

  @IsString()
  @IsOptional()
  city?: string;

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
  @IsOptional()
  userToken?: string;
}

export class ProjectWebsiteDataDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl()
  websiteUrl: string;

  @IsOptional()
  @IsString()
  subcategory?: string;
}
