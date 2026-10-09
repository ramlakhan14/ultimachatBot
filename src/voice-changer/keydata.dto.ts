import { IsOptional, IsString } from 'class-validator';

export class KeyDataDto {
  @IsString()
  elevenLabsAPIKey: string;
}

export class CreatePVC {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  language: string;

  @IsString()
  @IsOptional()
  description: string;
}
