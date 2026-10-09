import { Inject, Injectable, Logger } from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import { AppConfigService } from '../common/config/appConfig.service';
import {
  GMB_DIRECTORY_COLLECTION,
  GmbBusinessDirectoryEntry,
} from './gmb-directory.schema';

export interface DirectoryUpsertInput {
  businessName: string;
  email: string;
  phoneNumber?: string;
  websiteUrl: string;
  websiteName?: string;
  category: string; // raw term this particular hit was found under
  city: string;
  cityKey: string;
  country: string;
  countryKey: string;
  postalCode?: string;
  address?: string;
  rating?: number;
  businessStatus?: string;
  verified?: boolean;
  latitude?: number;
  longitude?: number;
}

// Backs the GMB directory: a shared, cross-user cache of already-validated
// GMB leads (real domain + real discoverable email), keyed by normalized
// category + city + country. Every product that scrapes GMB
// (project/inviteUsers, campaigns, UltimaReviews) goes through
// ProjectService.dataScrapping(), which is the single place this is wired
// in - so this service doesn't need to know which caller is asking.
@Injectable()
export class GmbDirectoryService {
  private readonly logger = new Logger('GmbDirectoryService');
  private readonly collection: Collection<GmbBusinessDirectoryEntry>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private readonly appConfig: AppConfigService,
  ) {
    this.collection = this.db.collection<GmbBusinessDirectoryEntry>(
      GMB_DIRECTORY_COLLECTION,
    );
  }

  // Lowercases, strips punctuation, collapses whitespace, and does a naive
  // singularization (categories/query terms are free text - "Restaurant",
  // "restaurants", " Restaurant " all need to land on the same cache
  // bucket). Deliberately independent of any single service's fixed
  // taxonomy (e.g. vakmangids_cat.ts is specific to the Vakmangids product
  // and doesn't cover the free-text categories used for GMB search).
  normalizeTerm(term?: string): string {
    if (!term || typeof term !== 'string') return '';
    let value = term.toLowerCase().trim();
    value = value.replace(/[^a-z0-9\s]/g, ' ');
    value = value.replace(/\s+/g, ' ').trim();
    if (value.length > 3) {
      if (value.endsWith('ies')) {
        value = value.slice(0, -3) + 'y';
      } else if (/(ses|xes|ches|shes)$/.test(value)) {
        value = value.slice(0, -2);
      } else if (value.endsWith('s') && !value.endsWith('ss')) {
        value = value.slice(0, -1);
      }
    }
    return value;
  }

  // Every distinct category/query term a request is searching for,
  // normalized and de-duplicated - a request can pass either free-text
  // `query` (newline-separated) or a `categories` array.
  buildCategoryKeys(query?: string, categories?: string[]): string[] {
    const terms: string[] = [];
    if (query) terms.push(...query.split('\n'));
    if (categories?.length) terms.push(...categories);
    const keys = terms.map((term) => this.normalizeTerm(term)).filter(Boolean);
    return Array.from(new Set(keys));
  }

  async findCachedLeads(params: {
    categoryKeys: string[];
    cityKey: string;
    countryKey: string;
    limit: number;
  }): Promise<GmbBusinessDirectoryEntry[]> {
    const { categoryKeys, cityKey, countryKey, limit } = params;
    if (!categoryKeys.length || !cityKey || !countryKey || limit <= 0) {
      return [];
    }
    return this.collection
      .find({
        categoryKeys: { $in: categoryKeys },
        cityKey,
        countryKey,
        isDead: { $ne: true },
      })
      .limit(limit)
      .toArray();
  }

  async markServed(ids: ObjectId[]): Promise<void> {
    if (!ids.length) return;
    await this.collection.updateMany(
      { _id: { $in: ids } },
      { $inc: { usageCount: 1 }, $set: { lastServedAt: new Date() } },
    );
  }

  // Entries whose email hasn't been checked in `staleAfterDays` - contact
  // details drift (business closes, inbox abandoned), so a cache entry
  // scraped a year ago shouldn't be served indefinitely as if it were just
  // found. Already-dead entries are excluded; there's nothing to gain by
  // re-checking an email that already failed verification, and this keeps
  // the daily re-verification cost bounded to the genuinely-aging portion
  // of the directory rather than repeatedly re-billing already-known-dead
  // rows.
  async findStaleEntries(
    staleAfterDays: number,
    cap: number,
  ): Promise<GmbBusinessDirectoryEntry[]> {
    const cutoff = new Date(Date.now() - staleAfterDays * 24 * 60 * 60 * 1000);
    return this.collection
      .find({ lastVerifiedAt: { $lt: cutoff }, isDead: { $ne: true } })
      .limit(cap)
      .toArray();
  }

  // Re-checks a single entry's email via Outscraper's email validator and
  // updates its freshness. Called from the reverification queue processor
  // (one job per stale entry) rather than inline in the cron - keeps the
  // cron itself fast (just a find + enqueue) and lets the queue's
  // concurrency/retry/rate-limit settings absorb the actual Outscraper
  // traffic instead of a long-running cron blocking on it.
  async reverifyEntry(id: string, email: string): Promise<void> {
    const isDeliverable = await this.verifyEmailDeliverable(email);
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          lastVerifiedAt: new Date(),
          isDead: !isDeliverable,
        },
      },
    );
  }

  // On any ambiguous outcome (API error, timeout, unexpected shape)
  // defaults to "still deliverable" - a transient Outscraper failure should
  // never be able to wipe a genuinely good lead out of the cache. Only an
  // explicit non-"RECEIVING" verification status marks an entry dead.
  private async verifyEmailDeliverable(email: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.app.outscraper.com/validators/email?query=${encodeURIComponent(
          email,
        )}&async=false`,
        {
          method: 'GET',
          headers: { 'X-API-KEY': this.appConfig.get('outscraperKey') },
        },
      );
      if (!response.ok) return true;

      const body: any = await response.json();
      const result = Array.isArray(body?.data) ? body.data[0] : undefined;
      if (!result) return true;

      return result.status === 'RECEIVING';
    } catch (err) {
      this.logger.warn(`Email re-verification failed for ${email}: ${err}`);
      return true;
    }
  }

  // Write-through: called with every freshly-enriched, already-valid lead a
  // live Outscraper scrape produces, so the same business never has to be
  // re-scraped (or re-enriched) for a future request in the same
  // category/city/country. Upserts by email - a business found again under
  // a different category term accumulates that term instead of creating a
  // duplicate row (see categories/categoryKeys arrays on the schema).
  async upsertLeads(entries: DirectoryUpsertInput[]): Promise<void> {
    if (!entries.length) return;
    const now = new Date();
    const ops = entries
      .filter((entry) => entry.email)
      .map((entry) => {
        const categoryKey = this.normalizeTerm(entry.category);
        return {
          updateOne: {
            filter: { email: entry.email },
            update: {
              $set: {
                businessName: entry.businessName,
                email: entry.email,
                phoneNumber: entry.phoneNumber,
                websiteUrl: entry.websiteUrl,
                websiteName: entry.websiteName,
                city: entry.city,
                cityKey: entry.cityKey,
                country: entry.country,
                countryKey: entry.countryKey,
                postalCode: entry.postalCode,
                address: entry.address,
                rating: entry.rating,
                businessStatus: entry.businessStatus,
                verified: entry.verified,
                latitude: entry.latitude,
                longitude: entry.longitude,
                source: 'outscraper' as const,
                lastVerifiedAt: now,
                // A fresh Outscraper hit means the email is deliverable
                // again right now - revive it if a past re-verification
                // pass had previously marked it dead.
                isDead: false,
              },
              $addToSet: {
                categories: entry.category,
                ...(categoryKey ? { categoryKeys: categoryKey } : {}),
              },
              $setOnInsert: {
                firstScrapedAt: now,
                usageCount: 0,
              },
            },
            upsert: true,
          },
        };
      })
      .filter((op) => op.updateOne.update.$addToSet.categoryKeys);

    if (!ops.length) return;
    await this.collection.bulkWrite(ops, { ordered: false });
  }
}
