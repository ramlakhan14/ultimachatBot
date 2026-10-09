import { ObjectId } from 'mongodb';

export const VOICEBOT_SETTING_COLLECTION = 'voicebotsetting';

export enum TransferCallMode {
  Blind = 'blind',
  Warm = 'warm',
}

export enum FallbackAction {
  Voicemail = 'voicemail',
  CallbackRequest = 'callbackRequest',
}

export interface InBoundSettings {
  callForwardingNumbers: {
    name: string;
    number: string;
    customMessage: string;
  }[];
  leadCollectionData: {
    fullName?: IsLeadDataCollection;
    email?: IsLeadDataCollection;
    contactNumber?: IsLeadDataCollection;
    address?: IsLeadDataCollection;
  };
  waitTimeBeforeSpeak: string;
  defaultPrompt: string;
}

export enum IsLeadDataCollection {
  True = 'true',
  False = 'false',
}

export interface OutBoundSettings {
  // callForwardingNumber: string;
  callForwardingNumbers: {
    name: string;
    number: string;
    customMessage: string;
  }[];
  waitTimeBeforeSpeak: string; //in seconds
  leadCollectionData: {
    fullName?: IsLeadDataCollection;
    email?: IsLeadDataCollection;
    contactNumber?: IsLeadDataCollection;
    address?: IsLeadDataCollection;
  };
  defaultPrompt: string;
}

export enum ReminderPreference {
  Call = 'call',
  Email = 'email',
  Both = 'both',
}

export interface VoicebotSetting {
  id?: ObjectId;
  email: string;
  inBoundSettings: InBoundSettings;
  outBoundSettings: OutBoundSettings;
  setReminderBeforeMeeting: number[]; // in minutes
  followUpSetting: {
    lunchHour: {
      start: string;
      end: string;
    };
    workDaysAndHours: WorkDayAndHour[];
    reminderIntervals: {
      type: string; // e.g., 'hours', 'days'
      amount: number; // e.g., 1 for daily, 2 for weekly, etc.
      startTime: string;
      endTime: string;
    }[];
  };
  reminderPreference: ReminderPreference;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkDayAndHour {
  day: DayOfWeek;
  hours: {
    startTime: string;
    endTime: string;
  };
}

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';
