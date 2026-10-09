import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetCampaignsDto {
  @IsOptional()
  @IsBoolean()
  include_connection_details?: boolean;

  @IsOptional()
  @IsIn(['created_at', 'updated_at', 'email_per_day', 'response_rate'])
  sort_column?: 'created_at' | 'updated_at' | 'email_per_day' | 'response_rate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_direction?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  per_page?: number;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  status?: string

  @IsOptional()
  @IsBoolean()
  owner_details?: boolean;

  @IsOptional()
  @IsString()
  tags?: string;
}
