import { ObjectId } from 'mongodb';

export const BILLING_HISTORY_COLLECTION = 'billing_histories';

export type BillingEventType =
  | 'subscription_initial' // First payment when subscribing
  | 'subscription_renewal' // Subsequent recurring renewals
  | 'subscription_update' // Prorated invoice generated during upgrade/downgrade
  | 'topup'; // Instant credit purchases

export type BillingStatus = 'success' | 'failed' | 'refunded' | 'pending';

export interface BillingHistory {
  _id?: ObjectId;
  userId: ObjectId;
  userEmail: string;
  provider: 'lemonsqueezy' | 'manual';
  type: BillingEventType;

  // Lemon Squeezy identifiers
  providerInvoiceId?: string; // matches subscription-invoice ID (or order ID for topups)
  providerSubscriptionId?: string; // matches subscription ID

  // Financial details
  amount: number; // actual charged amount (in USD, e.g. 99.00 or 485.59)
  subtotal: number; // subtotal in cents/cents-equivalent (e.g. 9900)
  currency: string; // e.g. 'USD'
  status: BillingStatus;

  // Plan details mapped AT THE TIME of transaction
  plan: string; // e.g. 'STARTER' | 'PRO' | 'AGENCY' | 'ULTIMATE' | 'Instant Topup'
  billingCycle: 'MONTHLY' | 'YEARLY' | 'N/A';
  variantId?: number; // variant_id at the moment of the transaction
  isActivePlan?: boolean; // true if this invoice represents the current active plan of the user

  // External resource links
  invoiceUrl?: string; // URL to the Lemon Squeezy receipt/invoice page
  billingReason?: string; // raw billing reason from lemonsqueezy (initial, renewal, updated)

  createdAt: Date;
  updatedAt: Date;
}
