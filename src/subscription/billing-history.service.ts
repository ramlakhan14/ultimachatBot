import { Inject, Injectable, Logger } from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import {
  BillingHistory,
  BILLING_HISTORY_COLLECTION,
} from './billing-history.schema';

@Injectable()
export class BillingHistoryService {
  private readonly billingCollection: Collection<BillingHistory>;
  private readonly logger = new Logger(BillingHistoryService.name);

  constructor(@Inject(MONGODB) private readonly db: Db) {
    this.billingCollection = this.db.collection<BillingHistory>(
      BILLING_HISTORY_COLLECTION,
    );
  }

  /**
   * Idempotently record or update a billing/payment history log in the database.
   */
  async recordBillingEvent(record: Partial<BillingHistory>): Promise<boolean> {
    try {
      const providerInvoiceId = record.providerInvoiceId;
      const userId = record.userId;

      // Guard: skip records without an invoice ID (prevents ghost/duplicate entries)
      // Topups use order IDs so they're always present
      if (!providerInvoiceId && record.type !== 'topup') {
        this.logger.warn(
          `Skipping billing event — no providerInvoiceId for ${record.userEmail} (type=${record.type})`,
        );
        return false;
      }

      // If this record is being marked as the current active plan, clear it on previous subscription records
      if (record.isActivePlan && userId) {
        await this.billingCollection.updateMany(
          { userId, type: { $ne: 'topup' } },
          { $set: { isActivePlan: false } },
        );
      }

      if (providerInvoiceId) {
        // Idempotency check using invoice ID
        const { createdAt, ...rest } = record;
        await this.billingCollection.updateOne(
          { providerInvoiceId },
          {
            $set: {
              ...rest,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: createdAt || new Date(),
            },
          },
          { upsert: true },
        );
      } else {
        await this.billingCollection.insertOne({
          ...record,
          createdAt: record.createdAt || new Date(),
          updatedAt: new Date(),
        } as BillingHistory);
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to record billing event: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Set isActivePlan = false for all subscription plans of a user (e.g. when cancelled).
   */
  async deactivateActivePlans(userId: ObjectId): Promise<boolean> {
    try {
      await this.billingCollection.updateMany(
        { userId, type: { $ne: 'topup' } },
        { $set: { isActivePlan: false, updatedAt: new Date() } },
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to deactivate active plans: ${error.message}`);
      return false;
    }
  }

  /**
   * Fetch paginated/filtered billing history records for a user from local database.
   */
  async getBillingHistoryByUser(
    userId: ObjectId,
    page = 1,
    limit = 5,
    viewAll = false,
    year?: number,
  ) {
    try {
      const query: any = { userId };

      if (year) {
        query.createdAt = {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`),
        };
      }

      // Latest first
      const cursor = this.billingCollection.find(query).sort({ createdAt: -1 });

      const total = await this.billingCollection.countDocuments(query);
      let data: BillingHistory[] = [];

      const effectiveLimit = limit || 5;
      const effectivePage = page || 1;
      const startIndex = (effectivePage - 1) * effectiveLimit;

      if (viewAll) {
        data = await cursor.toArray();
      } else {
        data = await cursor.skip(startIndex).limit(effectiveLimit).toArray();
      }

      return {
        data,
        total,
        page: effectivePage,
        limit: effectiveLimit,
        totalPages: Math.ceil(total / effectiveLimit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch billing history from DB: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Helper to check if a user has any recorded billing histories locally.
   */
  async hasBillingHistory(userId: ObjectId): Promise<boolean> {
    const count = await this.billingCollection.countDocuments({ userId });
    return count > 0;
  }
}
