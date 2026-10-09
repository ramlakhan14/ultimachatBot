import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsLeadType } from '../../knowledgebase/knowledgebase.schema';

export class LeadSyncWithCrmDto {
  @IsString()
  name?: string;

  @IsString()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  address?: string;

  @IsString()
  website?: string;

  @IsEnum(IsLeadType)
  @IsOptional()
  IsLeadType?: IsLeadType;

  @IsString()
  @IsOptional()
  knowledgebaseId?: string | any;

  @IsString()
  @IsOptional()
  chatSessionId?: string | any;

  @IsString()
  @IsOptional()
  message?: string;
}
