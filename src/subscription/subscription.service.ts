import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { AppConfigService } from '../common/config/appConfig.service';
import {
  BillingCycle,
  Subscription,
  SubscriptionData,
} from '../user/user.schema';
import { UserService } from '../user/user.service';
import {
  LemonSqueezyWebhookEventName,
  LemonSqueezyWebhookOrderCreatedEvent,
  LemonSqueezyWebhookSubscriptionCreatedEvent,
} from './lemon-squeezy.types';
import axios from 'axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { firstValueFrom, from } from 'rxjs';
import { Collection, Db, ObjectId } from 'mongodb';
import { TopUpPlans } from './subscription.const';
import { BillingHistoryService } from './billing-history.service';
import {
  WALLET_TRANSACTION_COLLECTION,
  WalletTransaction,
} from './wallet-transaction.schema';
import { MONGODB } from '../common/mongo/mongo.module';

@Injectable()
export class SubscriptionService {
  private readonly logger: Logger;
  private readonly baseUrl = 'https://api.lemonsqueezy.com/v1';
  private readonly walletTransactionCollection: Collection<WalletTransaction>;

  constructor(
    private appConfig: AppConfigService,
    private userService: UserService,
    private billingHistoryService: BillingHistoryService,
    @Inject(MONGODB) private db: Db,
  ) {
    this.walletTransactionCollection = this.db.collection<WalletTransaction>(
      WALLET_TRANSACTION_COLLECTION,
    );
    this.logger = new Logger(SubscriptionService.name);
  }

  private validateLemonSqueezyPayload(
    payload: any,
    signature: string,
  ): boolean {
    const secret = this.appConfig.get('lemonSqueezySignSecret');

    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(
      hmac.update(payload).digest('hex'),
      'utf8',
    ) as any;
    const hash = Buffer.from(signature || '', 'utf8') as any;

    if (!crypto.timingSafeEqual(digest, hash)) {
      return false;
    }

    return true;
  }

  async handleLemonSqueezyWebhookEvent(
    payload: any,
    signature: string,
    rawBody?: Buffer,
  ) {
    // Validate signature — throw so NestJS returns 401 and Lemon Squeezy can alert on failures
    if (!this.validateLemonSqueezyPayload(rawBody, signature)) {
      this.logger.warn('Invalid webhook signature rejected');
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }
    switch (payload.meta.event_name) {
      case LemonSqueezyWebhookEventName.ORDER_CREATED:
        await this.orderCreatedHandler(payload);
        break;

      case LemonSqueezyWebhookEventName.SUBSCRIPTION_CREATED:
        await this.subscriptionCreatedHandler(payload);
        break;

      case LemonSqueezyWebhookEventName.SUBSCRIPTION_UPDATED:
        await this.subscriptionUpdatedHandler(payload);
        break;

      case LemonSqueezyWebhookEventName.SUBSCRIPTION_PLAN_CHANGED:
        await this.subscriptionPlanChangedHandler(payload); // NOT here
        break;

      case LemonSqueezyWebhookEventName.SUBSCRIPTION_PAYMENT_SUCCESS:
        await this.subscriptionPaymentHandler(payload);
        break;

      case LemonSqueezyWebhookEventName.SUBSCRIPTION_CANCELLED:
        await this.subscriptionCancelledHandler(payload);
        break;
    }
  }

  async subscriptionCancelledHandler(
    payload: LemonSqueezyWebhookSubscriptionCreatedEvent,
  ) {
    const email = payload.data.attributes.user_email?.toLowerCase();
    if (!email) return;

    const variantId = payload.data.attributes.variant_id;
    const status = payload.data.attributes.status;
    const endsAt = payload.data.attributes.ends_at ?? null;

    const { plan, billingCycle } = await this.getVariantIDByPlan(variantId);

    const subscriptionData: SubscriptionData = {
      provider: 'lemonsqueezy',
      data: {
        subscriptionId: payload.data.id,
        productId: payload.data.attributes.product_id,
        variantId,
        status,
        createdAt: payload.data.attributes.created_at,
        updatedAt: payload.data.attributes.updated_at,
        endsAt,
      },
    };

    await this.userService.SubscriptionCancellationHandler(
      email,
      plan,
      subscriptionData,
      billingCycle,
    );

    const user = await this.userService.getUserByEmail(email);
    if (user) {
      await this.billingHistoryService.deactivateActivePlans(user._id);
    }
  }

  async subscriptionPlanChangedHandler(
    payload: LemonSqueezyWebhookSubscriptionCreatedEvent,
  ) {
    const email = payload.data.attributes.user_email?.toLowerCase();
    if (!email) return;

    const subscriptionId = payload.data.id;
    const variantId = payload.data.attributes.variant_id;
    const { plan, billingCycle } = await this.getVariantIDByPlan(variantId);

    // Fetch full invoice details for the NEW variant (retries up to 3x)
    const invoiceDetails = await this.getLatestInvoiceForVariant(
      subscriptionId,
      variantId,
    );

    const invoiceUrl = invoiceDetails?.attributes?.urls?.invoice_url || null;

    // Record billing history immediately so /my-invoices reflects the change
    const user = await this.userService.getUserByEmail(email);
    if (user) {
      const listVariantIds = await this.appConfig.get('lemonSqueezyVariantIds');
      const parsedVariantIds = listVariantIds
        ? JSON.parse(listVariantIds)
        : undefined;

      await this.billingHistoryService.recordBillingEvent({
        userId: user._id,
        userEmail: email,
        provider: 'lemonsqueezy',
        type: 'subscription_update',
        providerInvoiceId: invoiceDetails?.id || undefined,
        providerSubscriptionId: subscriptionId,
        amount: invoiceDetails ? invoiceDetails.attributes.total / 100 : 0,
        subtotal: invoiceDetails?.attributes?.subtotal ?? 0,
        currency: 'USD',
        status: 'success',
        plan,
        billingCycle,
        variantId:
          this.getVariantFromPlan(plan, billingCycle, parsedVariantIds) ||
          variantId,
        invoiceUrl: invoiceUrl || undefined,
        billingReason: 'updated',
        isActivePlan: true,
        createdAt: invoiceDetails
          ? new Date(invoiceDetails.attributes.created_at)
          : new Date(),
      });

      this.logger.log(
        `subscription_plan_changed → billing history recorded for ${email} | plan=${plan}`,
      );
    }

    await this.userService.sendInvoiceAndPaymentConfirmationEmail(
      email,
      plan,
      billingCycle,
      invoiceUrl,
      true, // isPlanUpgrade
    );
  }

  /**
   * Fetch the latest invoice for a specific variant, with retries.
   * Used by subscriptionPlanChangedHandler to get full invoice details.
   */
  async getLatestInvoiceForVariant(
    subscriptionId: string,
    targetVariantId: number,
  ): Promise<any | null> {
    const apiKey = await this.appConfig.get('lemonSqueezyApiKey');
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
      try {
        const response = await axios.get(
          `${this.baseUrl}/subscriptions/${subscriptionId}/subscription-invoices?sort=-created_at`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/vnd.api+json',
            },
          },
        );
        const invoices = response.data?.data;
        if (!invoices || invoices.length === 0) continue;

        const match = invoices.find(
          (inv: any) => inv.attributes?.variant_id === targetVariantId,
        );
        if (match) return match;
        // Invoice not yet generated for the new variant — retry
        continue;
      } catch (error) {
        this.logger.error(
          `Invoice fetch error (attempt ${attempt + 1}): ${error.message}`,
        );
      }
    }
    return null;
  }

  async getLatestInvoiceUrl(
    subscriptionId: string,
    targetVariantId?: number,
  ): Promise<string | null> {
    const apiKey = await this.appConfig.get('lemonSqueezyApiKey');
    // Retry up to 3 times — new invoices may not be ready immediately after plan change
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
      try {
        const response = await axios.get(
          `${this.baseUrl}/subscriptions/${subscriptionId}/subscription-invoices?sort=-created_at`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/vnd.api+json',
            },
          },
        );
        const invoices = response.data?.data;
        if (!invoices || invoices.length === 0) continue;

        if (targetVariantId) {
          const match = invoices.find(
            (inv: any) => inv.attributes?.variant_id === targetVariantId,
          );
          if (match) return match.attributes.urls.invoice_url;
          // Invoice not yet generated for the new variant — retry
          continue;
        }

        return invoices[0].attributes.urls.invoice_url;
      } catch (error) {
        this.logger.error('Invoice fetch error:', error.message);
      }
    }
    return null;
  }

  async getSubscriptionDetails(subscriptionId: string) {
    const response = await axios.get(
      `${this.baseUrl}/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${await this.appConfig.get(
            'lemonSqueezyApiKey',
          )}`,
          Accept: 'application/vnd.api+json',
        },
      },
    );

    return response.data.data.attributes;
  }

  async getLatestInvoiceDetails(subscriptionId: string) {
    const apiKey = await this.appConfig.get('lemonSqueezyApiKey');
    try {
      const response = await axios.get(
        `${this.baseUrl}/subscriptions/${subscriptionId}/subscription-invoices?sort=-created_at`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/vnd.api+json',
          },
        },
      );
      const invoices = response.data?.data;
      if (invoices && invoices.length > 0) {
        return invoices[0];
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch latest invoice details: ${error.message}`,
      );
    }
    return null;
  }

  async subscriptionPaymentHandler(payload: any) {
    const email = payload.data.attributes.user_email?.toLowerCase();
    if (!email) return;

    let subscriptionId: string;
    let invoiceUrl: string | null = null;
    let invoiceId: string | null = null;
    let amount: number | null = null;
    let subtotal: number | null = null;
    let billingReason: string | null = null;
    let createdAt = new Date();

    const isInvoicePayload = payload.data.type === 'subscription-invoices';

    if (isInvoicePayload) {
      invoiceId = payload.data.id;
      subscriptionId = payload.data.attributes.subscription_id?.toString();
      invoiceUrl = payload.data.attributes.urls?.invoice_url;
      amount = payload.data.attributes.total / 100;
      subtotal = payload.data.attributes.subtotal;
      billingReason = payload.data.attributes.billing_reason;
      createdAt = new Date(payload.data.attributes.created_at);
    } else {
      subscriptionId = payload.data.id;
      // Retry up to 5 times — invoice may not be ready immediately after payment
      let invoiceDetails: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
        invoiceDetails = await this.getLatestInvoiceDetails(subscriptionId);
        if (invoiceDetails?.id) break;
      }
      if (invoiceDetails) {
        invoiceId = invoiceDetails.id;
        invoiceUrl = invoiceDetails.attributes?.urls?.invoice_url;
        amount = invoiceDetails.attributes?.total / 100;
        subtotal = invoiceDetails.attributes?.subtotal;
        billingReason = invoiceDetails.attributes?.billing_reason;
        createdAt = new Date(invoiceDetails.attributes?.created_at);
      } else {
        createdAt = new Date(payload.data.attributes.created_at);
      }
    }

    const subscription = await this.getSubscriptionDetails(subscriptionId);
    const variantId = subscription.variant_id;
    const { plan, billingCycle } = await this.getVariantIDByPlan(variantId);
    const listVariantIds = await this.appConfig.get('lemonSqueezyVariantIds');
    const parsedVariantIds = listVariantIds
      ? JSON.parse(listVariantIds)
      : undefined;

    if (!invoiceUrl) {
      invoiceUrl = await this.getLatestInvoiceUrl(subscriptionId);
    }

    // Record to database
    const user = await this.userService.getUserByEmail(email);
    const userId = user ? user._id : null;

    if (userId) {
      let eventType:
        | 'subscription_initial'
        | 'subscription_renewal'
        | 'subscription_update' = 'subscription_renewal';
      if (isInvoicePayload) {
        if (billingReason === 'initial') {
          eventType = 'subscription_initial';
        } else if (billingReason === 'updated') {
          eventType = 'subscription_update';
        }
      } else {
        eventType = 'subscription_initial';
      }

      await this.billingHistoryService.recordBillingEvent({
        userId,
        userEmail: email,
        provider: 'lemonsqueezy',
        type: eventType,
        providerInvoiceId: invoiceId || undefined,
        providerSubscriptionId: subscriptionId,
        amount: amount !== null ? amount : 0,
        subtotal: subtotal !== null ? subtotal : 0,
        currency: 'USD',
        status: 'success',
        plan,
        billingCycle,
        variantId:
          this.getVariantFromPlan(plan, billingCycle, parsedVariantIds) ||
          variantId,
        invoiceUrl: invoiceUrl || undefined,
        billingReason:
          billingReason ||
          (eventType === 'subscription_initial' ? 'initial' : 'renewal'),
        isActivePlan: true,
        createdAt,
      });
    }

    await this.userService.sendInvoiceAndPaymentConfirmationEmail(
      email,
      plan,
      billingCycle,
      invoiceUrl,
    );
  }

  async subscriptionUpdatedHandler(
    payload: LemonSqueezyWebhookSubscriptionCreatedEvent,
  ) {
    const email = payload.data.attributes.user_email?.toLowerCase();
    if (!email) return;

    const variantId = payload.data.attributes.variant_id;
    const status = payload.data.attributes.status;
    const endsAt = payload.data.attributes.ends_at ?? null;

    const { plan, billingCycle } = await this.getVariantIDByPlan(variantId);

    this.logger.log(
      `subscription_updated → ${email} | status=${status} | plan=${plan}`,
    );

    const subscriptionData: SubscriptionData = {
      provider: 'lemonsqueezy',
      data: {
        subscriptionId: payload.data.id,
        productId: payload.data.attributes.product_id,
        variantId,
        status,
        createdAt: payload.data.attributes.created_at,
        updatedAt: payload.data.attributes.updated_at,
        endsAt,
      },
    };

    await this.userService.subscriptionUpdateHandler(
      email,
      plan,
      subscriptionData,
      billingCycle,
    );
  }

  async subscriptionCreatedHandler(
    payload: LemonSqueezyWebhookSubscriptionCreatedEvent,
  ) {
    const email = payload.data.attributes.user_email?.toLowerCase();
    if (!email) return;

    const variantId = payload.data.attributes.variant_id;

    const { plan, billingCycle } = await this.getVariantIDByPlan(variantId);

    const subscriptionData: SubscriptionData = {
      provider: 'lemonsqueezy',
      data: {
        subscriptionId: payload.data.id,
        productId: payload.data.attributes.product_id,
        variantId,
        status: payload.data.attributes.status, // active
        createdAt: payload.data.attributes.created_at,
        updatedAt: payload.data.attributes.updated_at,
        endsAt: payload.data.attributes.ends_at ?? null,
      },
    };

    this.logger.log(
      `subscription_created → ${email} | plan=${plan} | cycle=${billingCycle}`,
    );

    await this.userService.setUserSubscription(
      email,
      plan,
      subscriptionData,
      billingCycle,
    );
    // Billing history is recorded by the subscription_payment_success webhook
    // which fires shortly after with the real invoice data.
  }

  async getPaymentMethodInfo(email: string) {
    const user = await this.userService.getUserByEmail(email);
    if (
      !user ||
      !user.subscriptionData?.data?.subscriptionId ||
      user.subscriptionData.data.status !== 'active'
    ) {
      throw new BadRequestException('Active subscription not found');
    }

    const subscriptionId = user.subscriptionData.data.subscriptionId;

    const subscriptionResponse = await firstValueFrom(
      from(
        axios.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
          headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${await this.appConfig.get(
              'lemonSqueezyApiKey',
            )}`,
          },
        }),
      ),
    );

    const attributes = subscriptionResponse.data.data.attributes;

    return {
      paymentMethod: attributes.payment_method,
      cardBrand: attributes.card_brand || null,
      cardLastFour: attributes.card_last_four || null,
      updatePaymentMethodUrl: attributes.urls?.update_payment_method || null,
    };
  }

  async changeSubscriptionPlan(email: string, newVariantId: number) {
    try {
      const user = await this.userService.getUserByEmail(email);
      if (
        !user ||
        !user.subscriptionData?.data?.subscriptionId ||
        user.subscriptionData.data.status !== 'active'
      ) {
        throw new BadRequestException('Active subscription not found');
      }

      if (!newVariantId) {
        throw new BadRequestException('New subscription Id is required');
      }

      const currentVariantId = user.subscriptionData.data.variantId;

      if (currentVariantId === newVariantId) {
        throw new BadRequestException('You are already on this plan');
      }

      const subscriptionId = user.subscriptionData.data.subscriptionId;

      // 🔍 Fetch subscription to detect payment method
      const subscriptionResponse = await firstValueFrom(
        from(
          axios.get(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
            headers: {
              Accept: 'application/vnd.api+json',
              Authorization: `Bearer ${await this.appConfig.get(
                'lemonSqueezyApiKey',
              )}`,
            },
          }),
        ),
      );

      const subscription = subscriptionResponse.data.data;
      const paymentMethod = subscription.attributes.payment_method; // "card" | "paypal"

      // 🟡 PayPal → redirect required
      if (paymentMethod === 'paypal') {
        return {
          redirectUrl:
            subscription.attributes.urls.customer_portal_update_subscription,
          message: 'Redirect user to Lemon Squeezy portal',
        };
      }

      // 🟢 Card → Update directly
      await firstValueFrom(
        from(
          axios.patch(
            `${this.baseUrl}/subscriptions/${subscriptionId}`,
            {
              data: {
                type: 'subscriptions',
                id: subscriptionId,
                attributes: {
                  variant_id: newVariantId,
                  invoice_immediately: true,
                },
              },
            },
            {
              headers: {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                Authorization: `Bearer ${await this.appConfig.get(
                  'lemonSqueezyApiKey',
                )}`,
              },
            },
          ),
        ),
      );

      await this.waitForPlanChangeConfirmation(email, newVariantId);
      this.pollAndRecordUpgradeInvoice(
        user,
        email,
        subscriptionId,
        newVariantId,
      ).catch((err) => {
        this.logger.error(
          `Failed to record upgrade invoice for subscription ${subscriptionId}: ${err.message}`,
        );
      });

      return {
        message: 'Subscription updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        error?.response?.data ||
          error.message ||
          'Failed to change subscription plan',
        error?.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
  private async waitForPlanChangeConfirmation(
    email: string,
    newVariantId: number,
  ) {
    const maxAttempts = 10;
    const delayMs = 1000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const user = await this.userService.getUserByEmail(email);
      if (user?.lastProcessedVariantId === newVariantId) {
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    this.logger.warn(
      `Timed out waiting for DB confirmation of plan change to variant ${newVariantId} for ${email}; responding optimistically.`,
    );
  }
  private async pollAndRecordUpgradeInvoice(
    user: any,
    email: string,
    subscriptionId: string,
    newVariantId: number,
  ) {
    const apiKey = await this.appConfig.get('lemonSqueezyApiKey');
    const { plan, billingCycle } = await this.getVariantIDByPlan(newVariantId);
    const listVariantIds = await this.appConfig.get('lemonSqueezyVariantIds');
    const parsedVariantIds = listVariantIds
      ? JSON.parse(listVariantIds)
      : undefined;

    let invoiceDetails: any = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await axios.get(
          `${this.baseUrl}/subscriptions/${subscriptionId}/subscription-invoices?sort=-created_at`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/vnd.api+json',
            },
          },
        );
        const invoices = res.data?.data;
        if (invoices?.length > 0) {
          const match = invoices.find(
            (inv: any) => inv.attributes?.variant_id === newVariantId,
          );
          if (match) {
            invoiceDetails = match;
            break;
          }
        }
      } catch (err) {
        this.logger.error(
          `Invoice poll error (attempt ${attempt + 1}): ${err.message}`,
        );
      }
    }

    if (invoiceDetails) {
      await this.billingHistoryService.recordBillingEvent({
        userId: user._id,
        userEmail: email,
        provider: 'lemonsqueezy',
        type: 'subscription_update',
        providerInvoiceId: invoiceDetails.id,
        providerSubscriptionId: subscriptionId,
        amount: invoiceDetails.attributes.total / 100,
        subtotal: invoiceDetails.attributes.subtotal,
        currency: 'USD',
        status: 'success',
        plan,
        billingCycle,
        variantId:
          this.getVariantFromPlan(plan, billingCycle, parsedVariantIds) ||
          newVariantId,
        invoiceUrl: invoiceDetails.attributes?.urls?.invoice_url || undefined,
        billingReason: 'updated',
        isActivePlan: true,
        createdAt: new Date(invoiceDetails.attributes.created_at),
      });
    }
  }

  async createTopUpCheckout(amount: string, email: string, plan: TopUpPlans) {
    const userData = await this.userService.getUserByEmail(email);
    if (!userData) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const storeId = await this.appConfig.get('lemonSqueezyStoreId');
    const variantId = await this.appConfig.get('lemonSqueezyTopupVariantId');

    if (!storeId || !variantId) {
      throw new HttpException(
        'Lemon Squeezy config missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const userId = userData._id.toString();

    try {
      const response = await firstValueFrom(
        from(
          axios.post(
            'https://api.lemonsqueezy.com/v1/checkouts',
            {
              data: {
                type: 'checkouts',
                attributes: {
                  custom_price: Number(amount) * 100, // Convert to cents
                  product_options: {
                    enabled_variants: [Number(variantId)],
                  },
                  checkout_options: {
                    embed: true,
                  },
                  checkout_data: {
                    email,
                    custom: {
                      purpose: 'wallet_topup',
                      userId,
                      expectedAmount: amount,
                      plan,
                    },
                  },
                },
                relationships: {
                  store: {
                    data: {
                      type: 'stores',
                      id: String(storeId),
                    },
                  },
                  variant: {
                    data: {
                      type: 'variants',
                      id: String(variantId),
                    },
                  },
                },
              },
            },
            {
              headers: {
                Authorization: `Bearer ${await this.appConfig.get(
                  'lemonSqueezyApiKey',
                )}`,
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
              },
            },
          ),
        ),
      );

      return response.data.data.attributes.url;
    } catch (error) {
      throw new HttpException(
        error?.response?.data || 'Failed to create top-up checkout',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async orderCreatedHandler(payload: LemonSqueezyWebhookOrderCreatedEvent) {
    const email = payload.data.attributes.user_email?.toLowerCase();
    if (!email) return;
    const customData = (payload.meta as any)?.custom_data;

    // WALLET TOP-UP HANDLER
    if (customData?.purpose === 'wallet_topup') {
      const orderId = payload.data.id;
      const userId = new ObjectId(customData.userId);
      const amount = payload.data.attributes.total / 100;

      // Credit wallet (only here)
      await this.userService.addTopUpBalance(
        userId,
        amount,
        orderId,
        customData.plan,
        payload.data.attributes.currency,
        payload.data.attributes?.urls.receipt,
      );

      // Record to BillingHistory DB
      await this.billingHistoryService.recordBillingEvent({
        userId,
        userEmail: email,
        provider: 'lemonsqueezy',
        type: 'topup',
        providerInvoiceId: orderId,
        amount,
        subtotal: payload.data.attributes.subtotal || amount * 100,
        currency: payload.data.attributes.currency,
        status: 'success',
        plan: customData.plan || 'Instant Topup',
        billingCycle: 'N/A',
        variantId: payload.data.attributes.first_order_item?.variant_id
          ? Number(payload.data.attributes.first_order_item.variant_id)
          : undefined,
        invoiceUrl: payload.data.attributes?.urls?.receipt,
      });

      this.logger.log(
        `Wallet top-up success: $${amount} credited to user ${userId}`,
      );
      return;
    }
  }

  async getVariantIDByPlan(
    variantId: number,
  ): Promise<{ plan: Subscription; billingCycle: BillingCycle }> {
    const listVariantIds = await this.appConfig.get('lemonSqueezyVariantIds');
    const parsedVariantIds: Record<string, string> =
      typeof listVariantIds === 'string'
        ? JSON.parse(listVariantIds)
        : listVariantIds;

    if (parsedVariantIds && typeof parsedVariantIds === 'object') {
      for (const [key, value] of Object.entries(parsedVariantIds)) {
        if (Number(value) === variantId) {
          const [plan, billingCycle] = key.split('_');
          return {
            plan: plan as Subscription,
            billingCycle: billingCycle as BillingCycle,
          };
        }
      }
    }

    // Static fallback mapping for both production (12413xx) and sandbox (15517xx) variant IDs
    const staticMap: Record<
      string,
      { plan: Subscription; billingCycle: BillingCycle }
    > = {
      // Production store 44589
      '1241348': {
        plan: Subscription.STARTER,
        billingCycle: BillingCycle.MONTHLY,
      },
      '1241349': { plan: Subscription.PRO, billingCycle: BillingCycle.MONTHLY },
      '1241350': {
        plan: Subscription.AGENCY,
        billingCycle: BillingCycle.MONTHLY,
      },
      '1241351': {
        plan: Subscription.ULTIMATE,
        billingCycle: BillingCycle.MONTHLY,
      },
      '1241352': {
        plan: Subscription.STARTER,
        billingCycle: BillingCycle.YEARLY,
      },
      '1241353': { plan: Subscription.PRO, billingCycle: BillingCycle.YEARLY },
      '1241354': {
        plan: Subscription.AGENCY,
        billingCycle: BillingCycle.YEARLY,
      },
      '1241355': {
        plan: Subscription.ULTIMATE,
        billingCycle: BillingCycle.YEARLY,
      },
      // Sandbox store 76784
      '1551743': {
        plan: Subscription.STARTER,
        billingCycle: BillingCycle.MONTHLY,
      },
      '1551759': { plan: Subscription.PRO, billingCycle: BillingCycle.MONTHLY },
      '1551760': {
        plan: Subscription.AGENCY,
        billingCycle: BillingCycle.MONTHLY,
      },
      '1551762': {
        plan: Subscription.ULTIMATE,
        billingCycle: BillingCycle.MONTHLY,
      },
      '1551765': {
        plan: Subscription.STARTER,
        billingCycle: BillingCycle.YEARLY,
      },
      '1551777': { plan: Subscription.PRO, billingCycle: BillingCycle.YEARLY },
      '1551781': {
        plan: Subscription.AGENCY,
        billingCycle: BillingCycle.YEARLY,
      },
      '1551790': {
        plan: Subscription.ULTIMATE,
        billingCycle: BillingCycle.YEARLY,
      },
    };

    const staticInfo = staticMap[variantId.toString()];
    if (staticInfo) {
      return staticInfo;
    }

    throw new Error(`Unknown Lemon Squeezy variant ID: ${variantId}`);
  }

  private getVariantFromPlan(
    plan: string,
    billingCycle: string,
    parsedVariantIds?: any,
  ): number | undefined {
    const key = `${plan}_${billingCycle}`;
    if (parsedVariantIds && parsedVariantIds[key]) {
      return Number(parsedVariantIds[key]);
    }
    const fallbackMap: Record<string, number> = {
      STARTER_MONTHLY: 1551743,
      PRO_MONTHLY: 1551759,
      AGENCY_MONTHLY: 1551760,
      ULTIMATE_MONTHLY: 1551762,
      STARTER_YEARLY: 1551765,
      PRO_YEARLY: 1551777,
      AGENCY_YEARLY: 1551781,
      ULTIMATE_YEARLY: 1551790,
    };
    if (fallbackMap[key]) {
      return fallbackMap[key];
    }
    return undefined;
  }

  async cancelSubscription(email: string) {
    try {
      const userData = await this.userService.getUserByEmail(email);

      if (
        !userData ||
        !userData.subscriptionData?.data?.subscriptionId ||
        userData.subscriptionData.data.status !== 'active'
      ) {
        throw new Error('Active subscription not found');
      }

      const subscriptionId = userData?.subscriptionData?.data?.subscriptionId;

      const url = `${this.baseUrl}/subscriptions/${subscriptionId}`;

      await firstValueFrom(
        from(
          axios.delete(url, {
            headers: {
              Accept: 'application/vnd.api+json',
              'Content-Type': 'application/vnd.api+json',
              Authorization: `Bearer ${await this.appConfig.get(
                'lemonSqueezyApiKey',
              )}`,
            },
          }),
        ),
      );

      return {
        message: 'Subscription cancelled successfully',
      };
    } catch (error) {
      throw new HttpException(
        error?.response?.data ||
          error.message ||
          'Failed to cancel subscription',
        error?.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async backfillUserInvoices(userId: ObjectId, email: string) {
    try {
      this.logger.log(`Starting backfill of invoices for user ${email}...`);

      const apiKey = await this.appConfig.get('lemonSqueezyApiKey');
      const topupVariantIds = await this.appConfig.get(
        'lemonSqueezyTopupVariantId',
      );
      const listVariantIds = await this.appConfig.get('lemonSqueezyVariantIds');
      const parsedVariantIds = listVariantIds ? JSON.parse(listVariantIds) : {};

      const lookupVariant = async (vid: number) => {
        for (const [key, value] of Object.entries(parsedVariantIds)) {
          if (Number(value) === vid) {
            const [p, bc] = key.split('_');
            return {
              plan: p as Subscription,
              billingCycle: bc as BillingCycle,
            };
          }
        }
        try {
          return await this.getVariantIDByPlan(vid);
        } catch {
          return null;
        }
      };

      const getPlanFromPrice = (amountCents: number) => {
        switch (amountCents) {
          case 4900:
            return { plan: 'STARTER', billingCycle: 'MONTHLY' };
          case 9900:
            return { plan: 'PRO', billingCycle: 'MONTHLY' };
          case 14900:
            return { plan: 'AGENCY', billingCycle: 'MONTHLY' };
          case 29900:
            return { plan: 'ULTIMATE', billingCycle: 'MONTHLY' };
          case 47000:
            return { plan: 'STARTER', billingCycle: 'YEARLY' };
          case 95000:
            return { plan: 'PRO', billingCycle: 'YEARLY' };
          case 143000:
            return { plan: 'AGENCY', billingCycle: 'YEARLY' };
          case 287000:
            return { plan: 'ULTIMATE', billingCycle: 'YEARLY' };
          default:
            return null;
        }
      };

      // 1. FETCH SUBSCRIPTIONS
      const subscriptionRes = await axios.get(
        `${this.baseUrl}/subscriptions?filter[user_email]=${encodeURIComponent(
          email,
        )}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/vnd.api+json',
          },
        },
      );
      const subscriptions = subscriptionRes.data?.data || [];

      for (const sub of subscriptions) {
        const subscriptionId = sub.id;
        const subVariantInfo = await lookupVariant(sub.attributes?.variant_id);
        const fallbackPlan = subVariantInfo?.plan ?? 'N/A';
        const fallbackPlanType = subVariantInfo?.billingCycle ?? 'N/A';

        let url = `${this.baseUrl}/subscription-invoices?filter[subscription_id]=${subscriptionId}`;
        const subInvoices: any[] = [];

        while (url) {
          const invoiceRes = await axios.get(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/vnd.api+json',
            },
          });
          const invoiceData = invoiceRes.data;
          if (invoiceData?.data) {
            subInvoices.push(...invoiceData.data);
          }
          url = invoiceData?.links?.next || null;
        }

        // Sort oldest first for carry-forward chronological mapping
        subInvoices.sort(
          (a, b) =>
            new Date(a.attributes.created_at).getTime() -
            new Date(b.attributes.created_at).getTime(),
        );

        let activePlan = 'N/A';
        let activePlanType = 'N/A';

        for (let index = 0; index < subInvoices.length; index++) {
          const invoice = subInvoices[index];
          let plan = 'N/A';
          let planType = 'N/A';

          const matched = getPlanFromPrice(invoice.attributes.subtotal);
          if (matched) {
            activePlan = matched.plan;
            activePlanType = matched.billingCycle;
            plan = activePlan;
            planType = activePlanType;
          } else {
            if (invoice.attributes.billing_reason === 'updated') {
              let nextMatched = null;
              for (let i = index + 1; i < subInvoices.length; i++) {
                const m = getPlanFromPrice(subInvoices[i].attributes.subtotal);
                if (m) {
                  nextMatched = m;
                  break;
                }
              }
              if (nextMatched) {
                activePlan = nextMatched.plan;
                activePlanType = nextMatched.billingCycle;
              } else {
                activePlan = fallbackPlan;
                activePlanType = fallbackPlanType;
              }
              plan = activePlan;
              planType = activePlanType;
            } else {
              if (activePlan !== 'N/A') {
                plan = activePlan;
                planType = activePlanType;
              } else {
                let nextMatched = null;
                for (let i = index + 1; i < subInvoices.length; i++) {
                  const m = getPlanFromPrice(
                    subInvoices[i].attributes.subtotal,
                  );
                  if (m) {
                    nextMatched = m;
                    break;
                  }
                }
                if (nextMatched) {
                  activePlan = nextMatched.plan;
                  activePlanType = nextMatched.billingCycle;
                } else {
                  activePlan = fallbackPlan;
                  activePlanType = fallbackPlanType;
                }
                plan = activePlan;
                planType = activePlanType;
              }
            }
          }

          let eventType:
            | 'subscription_initial'
            | 'subscription_renewal'
            | 'subscription_update' = 'subscription_renewal';
          if (invoice.attributes.billing_reason === 'initial') {
            eventType = 'subscription_initial';
          } else if (invoice.attributes.billing_reason === 'updated') {
            eventType = 'subscription_update';
          }

          const isActivePlan =
            sub.attributes?.status === 'active' &&
            index === subInvoices.length - 1;

          await this.billingHistoryService.recordBillingEvent({
            userId,
            userEmail: email,
            provider: 'lemonsqueezy',
            type: eventType,
            providerInvoiceId: invoice.id,
            providerSubscriptionId: subscriptionId,
            amount: invoice.attributes.total / 100,
            subtotal: invoice.attributes.subtotal,
            currency: invoice.attributes.currency || 'USD',
            status: 'success',
            plan,
            billingCycle: planType as any,
            variantId:
              this.getVariantFromPlan(plan, planType, parsedVariantIds) ||
              sub.attributes?.variant_id,
            invoiceUrl: invoice.attributes.urls?.invoice_url,
            billingReason: invoice.attributes.billing_reason,
            isActivePlan,
            createdAt: new Date(invoice.attributes.created_at),
          });
        }
      }

      // 2. FETCH ORDERS (TOP-UPS)
      let orderUrl = `${
        this.baseUrl
      }/orders?filter[user_email]=${encodeURIComponent(email)}`;
      while (orderUrl) {
        const orderRes = await axios.get(orderUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/vnd.api+json',
          },
        });
        const orderData = orderRes.data;
        if (orderData?.data) {
          const topupOrders = orderData.data.filter((order) => {
            const variantId =
              order.attributes?.first_order_item?.variant_id?.toString();
            return topupVariantIds?.includes(variantId);
          });

          for (const order of topupOrders) {
            await this.billingHistoryService.recordBillingEvent({
              userId,
              userEmail: email,
              provider: 'lemonsqueezy',
              type: 'topup',
              providerInvoiceId: order.id,
              amount: order.attributes.total / 100,
              subtotal: order.attributes.subtotal || order.attributes.total,
              currency: order.attributes.currency || 'USD',
              status: 'success',
              plan: 'Instant Topup',
              billingCycle: 'N/A',
              variantId: order.attributes?.first_order_item?.variant_id
                ? Number(order.attributes.first_order_item.variant_id)
                : undefined,
              invoiceUrl: order.attributes.urls?.receipt,
              createdAt: new Date(order.attributes.created_at),
            });
          }
        }
        orderUrl = orderData?.links?.next || null;
      }
      this.logger.log(`Completed backfill of invoices for user ${email}.`);
    } catch (error) {
      this.logger.error(
        `Error during user invoices backfill: ${error.message}`,
      );
    }
  }

  async getInvoicesByUser(
    userId: string,
    viewAll = false,
    page = 1,
    limit = 5,
    year?: number,
  ) {
    try {
      const user = await this.userService.getUserById(new ObjectId(userId));
      if (!user?.email) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const email = user.email.toLowerCase();
      const userObjectId = new ObjectId(userId);

      // Auto-backfill on first load if no local records exist
      const hasHistory = await this.billingHistoryService.hasBillingHistory(
        userObjectId,
      );
      if (!hasHistory) {
        await this.backfillUserInvoices(userObjectId, email);
      }

      // Query local DB
      const result = await this.billingHistoryService.getBillingHistoryByUser(
        userObjectId,
        page,
        limit,
        viewAll,
        year,
      );

      const formatDate = (date: Date) => {
        const d = new Date(date);
        return `${String(d.getDate()).padStart(2, '0')}-${String(
          d.getMonth() + 1,
        ).padStart(2, '0')}-${d.getFullYear()}`;
      };

      const mappedInvoices = result.data.map((invoice) => ({
        id: invoice.providerInvoiceId || invoice._id?.toString() || 'N/A',
        type: invoice.type === 'topup' ? 'topup' : 'subscription',
        date: formatDate(invoice.createdAt),
        plan: invoice.plan,
        planType: invoice.billingCycle,
        amount: invoice.amount,
        status: invoice.status === 'success' ? 'success' : invoice.status,
        invoiceUrl: invoice.invoiceUrl,
      }));

      return {
        data: mappedInvoices,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get invoices by user: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to fetch invoices',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
