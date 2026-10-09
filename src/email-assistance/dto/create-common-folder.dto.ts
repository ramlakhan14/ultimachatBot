import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommonFolderDto {
  @IsString()
  @IsNotEmpty()
  folderName: string;

  @IsString()
  @IsNotEmpty()
  folderType: string;
}
