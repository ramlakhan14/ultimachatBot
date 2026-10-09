import {
  IsArray,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ObjectId } from 'mongodb';

export class CreateAppointmentDto {
  @IsOptional()
  _id?: ObjectId;

  @IsOptional()
  knowledgebaseId: ObjectId;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  service: string;

  @IsString()
  duration: string;

  // @IsArray()
  slotsTiming: any;

  // @IsArray()
  availableSlotDays: any;

  globalTime: any;

  isActive: boolean;

  timezone: string;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}
