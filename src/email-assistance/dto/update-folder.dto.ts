import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateFolderDto {
  @IsString()
  @IsNotEmpty()
  folderId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  folderName: string;

  @IsString()
  @IsNotEmpty()
  folderType: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  commonFolderId: string;

  @IsString()
  @IsOptional()
  emailAccountId?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateFolderDto_ extends PartialType(UpdateFolderDto) {}
