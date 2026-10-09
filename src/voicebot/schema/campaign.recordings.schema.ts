export const CAMPAIGN_RECORDINGS_SCHEMA = 'campaignRecordings';

export enum CallType {
  Incoming = 'Incoming',
  Outgoing = 'Outgoing',
}

export enum CallStatus {
  CONNECTED = 'Call connected',
  LEAD_GENERATED = 'Lead generated',
  CUSTOMER_BUSY = 'Customer busy',
  CUSTOMER_DID_NOT_ANSWER = 'Customer did not answer',
  NOT_CONNECTED = 'Not connected',
  N_A = 'N/A',
}

// Schema for campaign recordings
export interface CampaignRecordingsSchema {
  vapiId?: string;
  userId: string;
  status?: string;
  campaignName: string;
  campaignId: string;
  phoneNumber: string;
  botNumber: string;
  callType: CallType;
  callSummery?: string;
  callDuration: string;
  recordingUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
