import { IsArray, ArrayNotEmpty } from 'class-validator';

export class ChatSummaryDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Messages array must not be empty' })
  messages: any[];
}

export class EmailSummaryDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Emails array must not be empty' })
  emails: any[];    
}