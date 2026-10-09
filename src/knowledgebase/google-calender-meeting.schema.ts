export const GOOGLE_CALENDER_MEETING = 'calenderMeetings';

import { ObjectId } from 'mongodb';

interface Attendee {
  email: string;
  name?: string;
  role: 'Participant' | 'Host';
}

interface Reminder {
  reminderTime: Date;
  message: string;
}

export enum meetingStatus {
  Scheduled = 'Scheduled',
  Cancelled = 'Cancelled',
  Completed = 'Completed',
}

export enum meetingType {
  VoiceBot = 'voiceBot',
  ChatBot = 'chatBot',
  EmailBot = 'emailBot',
}

export interface GoogleCalendarMeeting {
  _id?: ObjectId;
  userId: string;
  startTime: Date | string; // Use Date for MongoDB storage, string for API compatibility
  endTime: Date | string; // Use Date for MongoDB storage, string for API compatibility
  attendees: Attendee[];
  agenda?: string;
  meetingType: meetingType;
  description?: string;
  hostEmail: string;
  status: meetingStatus;
  meetingLink?: string;
  reminders?: Reminder[];
  timeZone?: string;
  cancellationReason?: string;
  campaignId?: string | null;
  targetAudienceId?: string | null;
  isMeetingBookedOnGoogleMeet?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
