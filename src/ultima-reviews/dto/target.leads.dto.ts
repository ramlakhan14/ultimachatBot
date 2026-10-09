import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UltimaReviewLeadType } from '../schema/ultima.review.campaign';

export class TargetLeadsDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsOptional()
  @IsNotEmpty()
  @IsBoolean()
  isVerified?: boolean;

  @IsString()
  @IsNotEmpty()
  @IsEnum(UltimaReviewLeadType)
  leadType: UltimaReviewLeadType;
}
