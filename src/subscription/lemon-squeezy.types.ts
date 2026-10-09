/** **************************************************
 * TYPES
 *************************************************** */

import { Subscription } from '../user/user.schema';

export enum LemonSqueezyWebhookEventName {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_RESUMED = 'subscription_resumed',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  SUBSCRIPTION_PAUSED = 'subscription_paused',
  SUBSCRIPTION_UNPAUSED = 'subscription_unpaused',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_PAYMENT_SUCCESS = 'subscription_payment_success',
  SUBSCRIPTION_PLAN_CHANGED = 'subscription_plan_changed',
  ORDER_CREATED = 'order_created',
}

export enum LemonSqueezySubscriptionStatus {
  ON_TRIAL = 'on_trial',
  ACTIVE = 'active',
  PAUSED = 'paused',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface LemonSqueezySubscription {
  id: string;
  type: 'subscriptions';
  links: {
    self: string;
  };
  attributes: {
    urls: {
      update_payment_method: string;
    };
    pause: any;
    status: LemonSqueezySubscriptionStatus;
    ends_at: any;
    order_id: number;
    store_id: number;
    cancelled: boolean;
    renews_at: string;
    test_mode: boolean;
    user_name: string;
    created_at: string;
    product_id: number;
    updated_at: string;
    user_email: string;
    variant_id: number;
    card_brand: string | null;
    card_last_four: string | null;
    product_name: string;
    variant_name: string;
    order_item_id: number;
    trial_ends_at: any;
    billing_anchor: number;
    status_formatted: string;
    plan_name: string;
  };
}

export interface LemonSqueezyOrder {
  type: 'orders';
  id: string;
  attributes: {
    store_id: number;
    identifier: string;
    order_number: number;
    user_name: string;
    user_email: string;
    currency: string;
    currency_rate: string;
    subtotal: number;
    discount_total: number;
    tax: number;
    total: number;
    subtotal_usd: number;
    discount_total_usd: number;
    tax_usd: number;
    total_usd: number;
    tax_name: string;
    tax_rate: string;
    status: string;
    status_formatted: string;
    refunded: number;
    refunded_at: any;
    subtotal_formatted: string;
    discount_total_formatted: string;
    tax_formatted: string;
    total_formatted: string;
    urls?: {
      receipt?: string;
      invoice_url?: string;
    };
    first_order_item: {
      id: number;
      order_id: number;
      product_id: number;
      variant_id: number;
      product_name: string;
      variant_name: string;
      price: number;
      created_at: string;
      updated_at: string;
      test_mode: boolean;
    };

    checkout_data?: {
      email?: string;
      name?: string;
      custom?: {
        purpose?: 'wallet_topup' | 'subscription' | string;
        userId?: string;
        amount?: number;
        [key: string]: any;
      };
    };
    created_at: string;
    updated_at: string;
    ends_at?: string | null;
  };
}

export interface LemonSqueezyWebhookSubscriptionCreatedEvent {
  meta: {
    event_name: LemonSqueezyWebhookEventName.SUBSCRIPTION_CREATED;
  };
  data: LemonSqueezySubscription;
}

export interface LemonSqueezyWebhookSubscriptionCancelledEvent {
  meta: {
    event_name: LemonSqueezyWebhookEventName.SUBSCRIPTION_CANCELLED;
  };
  data: LemonSqueezySubscription;
}

export interface LemonSqueezyWebhookSubscriptionResumedEvent {
  meta: {
    event_name: LemonSqueezyWebhookEventName.SUBSCRIPTION_RESUMED;
  };
  data: LemonSqueezySubscription;
}

export interface LemonSqueezyWebhookSubscriptionExpiredEvent {
  meta: {
    event_name: LemonSqueezyWebhookEventName.SUBSCRIPTION_EXPIRED;
  };
  data: LemonSqueezySubscription;
}

export interface LemonSqueezyWebhookSubscriptionPausedEvent {
  meta: {
    event_name: LemonSqueezyWebhookEventName.SUBSCRIPTION_PAUSED;
  };
  data: LemonSqueezySubscription;
}

export interface LemonSqueezyWebhookSubscriptionUnpausedEvent {
  meta: {
    event_name: LemonSqueezyWebhookEventName.SUBSCRIPTION_UNPAUSED;
  };
  data: LemonSqueezySubscription;
}

export interface LemonSqueezyWebhookOrderCreatedEvent {
  meta: {
    event_name: LemonSqueezyWebhookEventName.ORDER_CREATED;
  };
  data: LemonSqueezyOrder;
}

// const VARIANT_TO_SUBSCRIPTION_MAP: Record<number, Subscription> = {
//   // 51438: Subscription.BASE_MONTHLY,
//   // 51439: Subscription.STANDARD_MONTHLY,
//   // 51440: Subscription.PREMIUM_MONTHLY,
//   // 51714: Subscription.ENTERPRISE_MONTHLY,
//   // 51713: Subscription.BASE_YEARLY,
//   // 476973: Subscription.STANDARD, // testing1 subscription
//   // 476974: Subscription.PREMIUM, // testing2 subscription
//   // 476976: Subscription.ENTERPRISE, // testing3 subscription
//   // 482226: Subscription.STANDARD, // main subscription
//   // 482221: Subscription.PREMIUM, // main subscription
//   // 482219: Subscription.ENTERPRISE, // main subscription
//   // 51718: Subscription.PREMIUM_YEARLY,
//   // 68062: Subscription.ENTERPRISE_YEARLY,
//   // 330124: Subscription.STANDARD_MONTHLY, // shubham_subscription
//   // 330122: Subscription.PREMIUM_MONTHLY, // shubham_subscription
//   // 330120: Subscription.ENTERPRISE_MONTHLY, // shubham_subscription
//   // 483015: Subscription.STANDARD_MONTHLY, // test_subscription
//   // 483019: Subscription.PREMIUM_MONTHLY, // test_subscription
//   // 483020: Subscription.ENTERPRISE_MONTHLY, // test_subscription
//   // 359728: Subscription.SELF_HOSTED, // shubham_subscription only for admin unlimited
//   // 303267: Subscription.STANDARD_DAILY,
//   // 303262: Subscription.PREMIUM_DAILY,
//   // 302995: Subscription.ENTERPRISE_DAILY,
// };

// const LTD_VARIANT_ID = 97685;

const WHITELABELLING_VARIANT = 110028;

// export function getSubscriptionPlanFromVariantId(
//   variantId: number,
// ): Subscription | undefined {
//   if (variantId in VARIANT_TO_SUBSCRIPTION_MAP) {
//     return VARIANT_TO_SUBSCRIPTION_MAP[variantId];
//   }
//   return undefined;
// }

export function getPlanFromVariantId(variantId: number): {
  plan: Subscription;
  billingCycle: 'MONTHLY' | 'YEARLY';
} {
  const map = {
    101: { plan: 'STARTER', billingCycle: 'MONTHLY' },
    102: { plan: 'STARTER', billingCycle: 'YEARLY' },
    201: { plan: 'PRO', billingCycle: 'MONTHLY' },
    202: { plan: 'PRO', billingCycle: 'YEARLY' },
    301: { plan: 'AGENCY', billingCycle: 'MONTHLY' },
    302: { plan: 'AGENCY', billingCycle: 'YEARLY' },
    401: { plan: 'ULTIMATE', billingCycle: 'MONTHLY' },
    402: { plan: 'ULTIMATE', billingCycle: 'YEARLY' },
  };

  return map[variantId];
}

// export function isVariantForLifeTimeDeals(variantId: number) {
//   return variantId === LTD_VARIANT_ID;
// }

export function isVariantForWhileLabelling(variantId: number) {
  return variantId === WHITELABELLING_VARIANT;
}
