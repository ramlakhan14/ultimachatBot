import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export interface YPFilter {
  field?: string;
  key?: string;
  operator: string;
  value?: any;
}

export class YellowPagesSearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsArray()
  @IsOptional()
  filter?: YPFilter[];
}
