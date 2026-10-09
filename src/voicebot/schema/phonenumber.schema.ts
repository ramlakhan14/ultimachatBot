import { ObjectId } from 'mongodb';

export const TWILIO_PHONE_NUMBER_COLLECTION = 'twiliophonenumberlist';

export enum InUseStatus {
  YES = 'Yes',
  NO = 'No',
}

export enum CallType {
  INBOUND = 'Inbound',
  OUTBOUND = 'Outbound',
}

export interface TwilioPhoneNumber {
  id?: ObjectId;
  userId: string;
  assistantId?: string; // References Assistant
  assistantName?: string;
  phoneNumber: string;
  callType: 'Inbound' | 'Outbound'; // Use an ENUM
  status: 'Yes' | 'No'; // Use an ENUM
  phoneNumberId?: string; // Use an ENUM
  createdAt: Date;
  updatedAt: Date;
}
