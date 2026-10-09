import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsDate,
} from 'class-validator';

export class NotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  userToken: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>; // Optional payload data

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsDate()
  @IsOptional()
  createdAt?: Date;

  @IsDate()
  @IsOptional()
  updatedAt?: Date;

  @IsBoolean()
  @IsOptional()
  subscribeStatus?: boolean; // Flag to check if user is subscribed to notifications
}
