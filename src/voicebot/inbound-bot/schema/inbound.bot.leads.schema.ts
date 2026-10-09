import { ObjectId } from 'mongodb';
import { CallType } from '../../schema/phonenumber.schema';

export const INBOUND_BOT_LEADS_RECORDING_SCHEMA = 'inboundBotLeadsRecordings';

export enum InboundCallEndedReason {
  ASSISTANT_ENDED_CALL = 'assistant-ended-call',
  ASSISTANT_ENDED_CALL_AFTER_MESSAGE_SPOKEN = 'assistant-ended-call-after-message-spoken',
  ASSISTANT_ENDED_CALL_WITH_HANGUP_TASK = 'assistant-ended-call-with-hangup-task',
  ASSISTANT_ERROR = 'assistant-error',
  ASSISTANT_FORWARDED_CALL = 'assistant-forwarded-call',
  ASSISTANT_JOIN_TIMED_OUT = 'assistant-join-timed-out',
  ASSISTANT_NOT_FOUND = 'assistant-not-found',
  ASSISTANT_NOT_VALID = 'assistant-not-valid',
  ASSISTANT_NOT_PROVIDED = 'assistant-not-provided',
  ASSISTANT_REQUEST_FAILED = 'assistant-request-failed',
  ASSISTANT_REQUEST_RETURNED_ERROR = 'assistant-request-returned-error',
  ASSISTANT_REQUEST_RETURNED_FORWARDING_PHONE_NUMBER = 'assistant-request-returned-forwarding-phone-number',
  ASSISTANT_REQUEST_RETURNED_INVALID_ASSISTANT = 'assistant-request-returned-invalid-assistant',
  ASSISTANT_REQUEST_RETURNED_NO_ASSISTANT = 'assistant-request-returned-no-assistant',
  ASSISTANT_REQUEST_RETURNED_UNSPEAKABLE_ERROR = 'assistant-request-returned-unspeakable-error',
  ASSISTANT_SAID_END_CALL_PHRASE = 'assistant-said-end-call-phrase',

  CALL_IN_PROGRESS_ERROR_VAPIFAULT = 'call.in-progress.error-vapifault-*',
  CALL_IN_PROGRESS_ERROR_PROVIDERFAULT = 'call.in-progress.error-providerfault-*',
  PIPELINE_ERROR = 'pipeline-error-*',
  PIPELINE_NO_AVAILABLE_LLM_MODEL = 'pipeline-no-available-llm-model',
  CALL_IN_PROGRESS_ERROR_PIPELINE_NO_AVAILABLE_LLM_MODEL = 'call.in-progress.error-pipeline-no-available-llm-model',

  CUSTOMER_BUSY = 'customer-busy',
  CUSTOMER_ENDED_CALL = 'customer-ended-call',
  CUSTOMER_DID_NOT_ANSWER = 'customer-did-not-answer',
  CUSTOMER_DID_NOT_GIVE_MICROPHONE_PERMISSION = 'customer-did-not-give-microphone-permission',
  CALL_IN_PROGRESS_ERROR_ASSISTANT_DID_NOT_RECEIVE_CUSTOMER_AUDIO = 'call.in-progress.error-assistant-did-not-receive-customer-audio',
  PHONE_CALL_PROVIDER_CLOSED_WEBSOCKET = 'phone-call-provider-closed-websocket',
  PHONE_CALL_PROVIDER_BYPASS_ENABLED_BUT_NO_CALL_RECEIVED = 'phone-call-provider-bypass-enabled-but-no-call-received',
  TWILIO_FAILED_TO_CONNECT_CALL = 'twilio-failed-to-connect-call',
  TWILIO_REPORTED_CUSTOMER_MISDIALED = 'twilio-reported-customer-misdialed',
  VONAGE_DISCONNECTED = 'vonage-disconnected',
  VONAGE_FAILED_TO_CONNECT_CALL = 'vonage-failed-to-connect-call',
  VONAGE_REJECTED = 'vonage-rejected',
  VONAGE_COMPLETED = 'vonage-completed',
  CALL_IN_PROGRESS_ERROR_SIP_TELEPHONY_PROVIDER_FAILED_TO_CONNECT_CALL = 'call.in-progress.error-sip-telephony-provider-failed-to-connect-call',

  CALL_START_ERROR_NEITHER_ASSISTANT_NOR_SERVER_SET = 'call-start-error-neither-assistant-nor-server-set',
  CALL_START_ERROR_GET_ORG = 'call.start.error-get-org',
  CALL_START_ERROR_GET_SUBSCRIPTION = 'call.start.error-get-subscription',
  CALL_START_ERROR_GET_ASSISTANT = 'call.start.error-get-assistant',
  CALL_START_ERROR_GET_PHONE_NUMBER = 'call.start.error-get-phone-number',
  CALL_START_ERROR_GET_CUSTOMER = 'call.start.error-get-customer',
  CALL_START_ERROR_GET_RESOURCES_VALIDATION = 'call.start.error-get-resources-validation',
  CALL_START_ERROR_VAPI_NUMBER_INTERNATIONAL = 'call.start.error-vapi-number-international',
  CALL_START_ERROR_VAPI_NUMBER_OUTBOUND_DAILY_LIMIT = 'call.start.error-vapi-number-outbound-daily-limit',
  CALL_START_ERROR_GET_TRANSPORT = 'call.start.error-get-transport',

  CALL_FORWARDING_OPERATOR_BUSY = 'call.forwarding.operator-busy',
  CALL_RINGING_HOOK_EXECUTED_SAY = 'call.ringing.hook-executed-say',
  CALL_RINGING_HOOK_EXECUTED_TRANSFER = 'call.ringing.hook-executed-transfer',

  DATABASE_ERROR = 'database-error',
  EXCEEDED_MAX_DURATION = 'exceeded-max-duration',
  MANUALLY_CANCELED = 'manually-canceled',
  SILENCE_TIMED_OUT = 'silence-timed-out',
  VOICEMAIL = 'voicemail',
  WORKER_SHUTDOWN = 'worker-shutdown',

  CALL_RINGING_SIP_INBOUND_CALLER_HUNGUP_BEFORE_CALL_CONNECT = 'call.ringing.sip-inbound-caller-hungup-before-call-connect',
  CALL_RINGING_ERROR_SIP_INBOUND_CALL_FAILED_TO_CONNECT = 'call.ringing.error-sip-inbound-call-failed-to-connect',

  UNKNOWN_ERROR = 'unknown-error',
}

export interface InboundCallFilter {
  status?: CallSuccess;
  phoneNumber?: string;
  botNumber?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export enum CallSuccess {
  Success = 'Success',
  Failed = 'Failed',
  Transferred = 'Transferred',
}

export interface InboundBotCallRecordingsSchema {
  inboundBotId: ObjectId;
  status: CallSuccess;
  userId: ObjectId;
  vapiId: string;
  phoneNumber: string;
  botNumber: string;
  callType: CallType;
  callSummery: string | 'N/A';
  callDuration: string | 'N/A';
  recordingUrl: string | 'N/A';
  createdAt: Date;
  updatedAt: Date;
  callEndedReason?: InboundCallEndedReason;
}
