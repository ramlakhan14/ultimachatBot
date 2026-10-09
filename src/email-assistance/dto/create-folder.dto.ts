import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFolderDto {
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
