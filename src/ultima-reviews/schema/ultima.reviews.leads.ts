import { UltimaReviewLeadType } from './ultima.review.campaign';

export const ULTIMA_REVIEW_LEAD_SCHEMA = 'ultimaReviewLeads';

export enum UltimaReviewSignUpStatus {
  SignedUp = 'Signed Up',
  DidNotSignUp = "Didn't Sign Up",
  AlreadySignedUp = 'Already Signed Up',
}

export enum UltimaReviewLeadEmailSendStatus {
  Sent = 'Sent',
  NotSent = 'Not Sent',
  Failed = 'Failed',
  Pending = 'Pending',
  AlreadySent = 'Already Sent',
}

export enum UltimaReviewLeadStatus {
  Active = 'Active',
  Suspended = 'Suspended',
  Reactivate = 'Reactivate',
  Null = 'null',
}

export enum LeadsPlanName {
  Free = 'Free',
  Pro = 'Pro',
  Ultimate = 'Ultimate',
  Business = 'Business',
  Default_Plan = 'Default Plan',
}

export class UltimaReviewsLeadSchema {
  ultimaReviewId: string;
  userId: string;
  email: string;
  businessName: string;
  seat_id?: string;
  LeadStatus?: UltimaReviewLeadStatus;
  signUpStatus?: UltimaReviewSignUpStatus;
  emailSendStatus?: UltimaReviewLeadEmailSendStatus;
  isVerified?: boolean;
  leadType: UltimaReviewLeadType;
  plan_name?: LeadsPlanName;
  createdAt: Date;
  updatedAt: Date;
}
