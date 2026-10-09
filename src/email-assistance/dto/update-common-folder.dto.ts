import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCommonFolderDto  {
  @IsString()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsNotEmpty()
  folderName: string;

  @IsString()
  @IsNotEmpty()
  folderType: string;

}
