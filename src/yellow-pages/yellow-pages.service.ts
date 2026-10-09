import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Collection, Db, ObjectId } from 'mongodb';
import * as Outscraper from 'outscraper';
import { MONGODB } from '../common/mongo/mongo.module';
import { AppConfigService } from '../common/config/appConfig.service';
import { UserService } from '../user/user.service';
import {
  validateLeads,
  ValidationResult,
} from '../voicebot/utils/ValidatorLeads';
import { EMAIL_PROCESS_STATUS, EMAIL_STATUS } from '../campaign/enum/enum';
import { YellowPagesSearchDto, YPFilter } from './yellow-pages.dto';
import { YP_JOB_COLLECTION, YPJobData } from './yellow-pages.schema';
import { YPScrapeJobData } from './bull/yellow-pages-scrape.processor';

const EMAIL_ENRICHMENT_CONCURRENCY = 10;

interface YPRawListing {
  query?: string;
  name?: string;
  phone?: string;
  street?: string;
  locality?: string;
  website?: string;
  categories?: string[];
  snippet?: string;
  thumbnail?: string;
  business_link?: string;
  position?: number;
  amenities?: string[];
}

@Injectable()
export class YellowPagesService {
  private readonly logger = new Logger(YellowPagesService.name);
  private readonly campaignAudienceCollection: Collection;
  private readonly campaignCollection: Collection;
  private readonly ypJobCollection: Collection<YPJobData>;

  constructor(
    @Inject(MONGODB) private db: Db,
    @InjectQueue('yellowPagesScrapeQueue') private readonly scrapeQueue: Queue,
    private readonly appConfig: AppConfigService,
    private readonly userService: UserService,
  ) {
    this.campaignAudienceCollection = this.db.collection('campaignAudience');
    this.campaignCollection = this.db.collection('campaignData');
    this.ypJobCollection = this.db.collection<YPJobData>(YP_JOB_COLLECTION);
  }

  //Enqueue job called by controller

  async startScrapeJob(
    dto: YellowPagesSearchDto,
    userId: string,
  ): Promise<string> {
    try {
      const jobId = new ObjectId().toHexString();

      await this.ypJobCollection.insertOne({
        jobId,
        userId,
        campaignId: dto.campaignId || null,
        status: 'PROCESSING',
        createdAt: new Date(),
      });

      const jobData: YPScrapeJobData = { jobId, userId, dto };
      await this.scrapeQueue.add('scrape', jobData, { jobId });

      return jobId;
    } catch (err: any) {
      this.logger.error('Failed to start YP scrape job', err?.message);
      throw new HttpException(
        err?.message || 'Failed to start scraping job',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Background job processor called by BullMQ processor

  async processJob(
    jobId: string,
    dto: YellowPagesSearchDto,
    userId: string,
  ): Promise<void> {
    try {
      const result = await this.runScrape(jobId, dto, userId);
      await this.ypJobCollection.updateOne(
        { jobId },
        { $set: { status: 'COMPLETED', result, updatedAt: new Date() } },
      );
    } catch (err: any) {
      this.logger.error(`YP scrape job ${jobId} failed`, err?.message);
      await this.ypJobCollection.updateOne(
        { jobId },
        {
          $set: {
            status: 'FAILED',
            error: err?.message || 'Unknown error',
            updatedAt: new Date(),
          },
        },
      );
      throw err;
    }
  }

  //Poll job result called by controller

  async getJobResult(jobId: string, userId: string) {
    try {
      const job = await this.ypJobCollection.findOne(
        { jobId, userId },
        {
          projection: {
            status: 1,
            result: 1,
            error: 1,
            createdAt: 1,
            campaignId: 1,
            _id: 0,
          },
        },
      );

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status === 'FAILED') {
        return {
          status: 'FAILED',
          message: 'Yellow Pages scraping job failed. Please try again.',
        };
      }

      if (job.status === 'PROCESSING') {
        return {
          status: 'PROCESSING',
          message: 'Scraping is still in progress.',
        };
      }

      // COMPLETED no campaignId, return result directly
      if (!job.campaignId) {
        return {
          status: 'COMPLETED',
          message: 'Job status',
          result: {
            totalScraped: job.result?.allRows?.length ?? 0,
            ...job.result,
          },
        };
      }

      // COMPLETED return saved audience from campaignAudience
      const audiences = await this.campaignAudienceCollection
        .find(
          {
            campaignId: job.campaignId,
            addedBy: userId,
            dataSource: 'yellowpages',
          },
          {
            projection: {
              campaignId: 1,
              businessName: 1,
              phoneNumber: 1,
              websiteUrl: 1,
              city: 1,
              address: 1,
              category: 1,
            },
          },
        )
        .toArray();

      return {
        status: 'COMPLETED',
        message: 'Job status',
        result: {
          totalScraped: job.result?.allRows?.length ?? 0,
          audiences,
          ...job.result,
        },
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to get YP job result for ${jobId}`,
        err?.message,
      );
      if (err instanceof NotFoundException) throw err;
      throw new HttpException(
        err?.message || 'Failed to retrieve job result',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Core scrape logic

  private async runScrape(
    jobId: string,
    dto: YellowPagesSearchDto,
    userId: string,
  ): Promise<ValidationResult> {
    try {
      const { query, location, city, limit = 20, campaignId, filter } = dto;

      const effectiveLocation = city ? `${city}, ${location}` : location;

      const rawListings = await this.searchYellowPages(query, effectiveLocation, limit);
      this.logger.log(`YP rawListings count: ${rawListings.length}`);

      const client = new Outscraper(this.appConfig.get('outscraperKey'));
      const enriched = await this.runWithConcurrency(
        rawListings,
        (item) => this.enrichEmail(item, client),
        EMAIL_ENRICHMENT_CONCURRENCY,
      );

      const normalized = enriched.map((item) => this.normalize(item));
      const filtered = filter?.length ? this.applyNormalizedFilters(normalized, filter) : normalized;
      const cappedNormalized = filtered.slice(0, limit);

      const result = validateLeads(cappedNormalized, { requirePhone: false, requireEmail: false });

      const capped = { ...result, validRows: result.validRows.slice(0, limit) };

      if (campaignId && capped.validRows.length > 0) {
        await this.saveToAudience(capped.validRows, userId, campaignId);
        await this.userService.consumeCredits(
          new ObjectId(userId),
          'SCRAPING_GMB',
          null,
          null,
          capped.validRows.length,
        );
      }

      return capped;
    } catch (err: any) {
      this.logger.error(`runScrape failed for job ${jobId}`, err?.message);
      throw err;
    }
  }

  // Email enrichment

  private async enrichEmail(
    item: YPRawListing,
    client: any,
  ): Promise<YPRawListing & { email: string }> {
    const domain = this.extractDomain(item.website);
    if (!domain) return { ...item, email: '' };

    try {
      const res = (await this.withTimeout(
        client.emailsAndContacts(domain),
        15000,
        `Timed out fetching contacts for ${domain}`,
      )) as any[];

      const record = res?.[0];
      const email =
        record?.emails?.[0]?.value ||
        record?.external_emails?.[0]?.value ||
        record?.contacts?.[0]?.value ||
        '';

      return { ...item, email };
    } catch (err: any) {
      this.logger.warn(
        `enrichEmail failed for domain ${domain}: ${err?.message?.replace(
          /[\r\n]/g,
          ' ',
        )}`,
      );
      return { ...item, email: '' };
    }
  }

  private extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
      const normalized = url.startsWith('http') ? url : `https://${url}`;
      const hostname = new URL(normalized).hostname.replace(/^www\./, '');
      // localsearch.com subdomains are YP-generated placeholder pages — no real contact info
      if (hostname.endsWith('localsearch.com')) return null;
      if (hostname === 'yellowpages.com' || hostname.endsWith('.yellowpages.com')) return null;
      return hostname;
    } catch {
      return null;
    }
  }

  //Outscraper yellowpages-search call — multi-query variation strategy for max unique results

  private buildQueryVariations(
    query: string,
    limit: number,
  ): { q: string; batchLimit: number }[] {
    const base = query.trim();
    const variations = [
      base,
      `${base} near me`,
      `${base} services`,
      `${base} company`,
      `local ${base}`,
    ];
    const PER_BATCH = 100;
    const fetchLimit = Math.min(limit * 3, 300); // fetch 3x to cover post-filter losses
    const needed = Math.min(
      Math.max(Math.ceil(fetchLimit / PER_BATCH), 1),
      variations.length,
    );
    return variations.slice(0, needed).map((q, i) => ({
      q,
      batchLimit: i === needed - 1 ? fetchLimit - i * PER_BATCH : PER_BATCH,
    }));
  }

  async searchYellowPages(
    query: string,
    location: string,
    limit: number,
  ): Promise<YPRawListing[]> {
    try {
      const queries = this.buildQueryVariations(query, limit);
      this.logger.log(
        `YP query variations (${queries.length}): ${queries
          .map((v) => `${v.q}(${v.batchLimit})`)
          .join(' | ')}`,
      );

      const batchResults = await this.runWithConcurrency(
        queries,
        ({ q, batchLimit }) => this.fetchYPBatch(q, location, batchLimit),
        2,
      );

      const seen = new Set<string>();
      const unique = batchResults.flat().filter((item) => {
        const key = `${item.phone || ''}|${item.name || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this.logger.log(
        `YP total unique results: ${unique.length} (requested: ${limit})`,
      );
      return unique;
    } catch (err: any) {
      this.logger.error('searchYellowPages failed', err?.message);
      throw new HttpException(
        err?.message || 'Yellow Pages search failed',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async fetchYPBatch(
    query: string,
    location: string,
    batchLimit: number,
  ): Promise<YPRawListing[]> {
    const client = new Outscraper(this.appConfig.get('outscraperKey'));
    const POLL_INTERVAL_MS = 3000;
    const INITIAL_WAIT_MS = 2000;
    const MAX_POLL_ATTEMPTS = 120; // 10 minutes max per batch

    // No timeout on the initial call — let Outscraper return task ID naturally
    this.logger.log(
      `YP fetchYPBatch starting: query="${query}" location=${location} limit=${batchLimit}`,
    );
    const taskOrData = (await client.yellowpagesSearch(
      query,
      location,
      batchLimit,
    )) as any;
    this.logger.log(
      `YP task received: status=${taskOrData?.status} id=${taskOrData?.id}`,
    );

    // Synchronous response — data returned immediately
    if (taskOrData?.status === 'Success' && Array.isArray(taskOrData?.data)) {
      const flat = (taskOrData.data as YPRawListing[][]).flat();
      if (flat.length > 0) {
        this.logger.log(`YP sample raw listing: ${JSON.stringify(flat[0])}`);
      }
      return flat;
    }
    if (Array.isArray(taskOrData)) {
      const flat = (taskOrData as any[]).flat();
      if (flat.length > 0) {
        this.logger.log(`YP sample raw listing: ${JSON.stringify(flat[0])}`);
      }
      return flat;
    }

    // Async response — poll results_location
    if (!taskOrData?.results_location) {
      throw new Error('Outscraper task missing results_location');
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const waitMs = attempt === 0 ? INITIAL_WAIT_MS : POLL_INTERVAL_MS;
      await new Promise((r) => setTimeout(r, waitMs));
      const pollRes = await fetch(taskOrData.results_location, {
        headers: { 'X-API-KEY': this.appConfig.get('outscraperKey') },
      });
      const pollData: any = await pollRes.json();
      const status = pollData?.status;

      if (status === 'Success') {
        const flat = ((pollData?.data ?? []) as YPRawListing[][]).flat();
        if (flat.length > 0) {
          this.logger.log(`YP sample raw listing: ${JSON.stringify(flat[0])}`);
        }
        return flat;
      }
      if (status && status !== 'Pending' && status !== 'Processing') {
        throw new Error(`Yellow Pages batch failed with status: ${status}`);
      }

      this.logger.debug(
        `YP batch poll attempt ${
          attempt + 1
        }/${MAX_POLL_ATTEMPTS} — status: ${status}`,
      );
    }

    throw new Error('Yellow Pages scrape timed out waiting for results');
  }

  // Normalize YP listing into common lead shape

  private parseLocality(locality: string): {
    city: string;
    state: string;
    zipcode: string;
  } {
    const match = locality.match(/^(.+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
    if (match) {
      return {
        city: match[1].trim(),
        state: match[2].trim(),
        zipcode: match[3]?.trim() || '',
      };
    }
    return { city: locality, state: '', zipcode: '' };
  }

  private normalize(yp: YPRawListing & { email?: string }) {
    const { city, state, zipcode } = this.parseLocality(yp.locality || '');
    const businessName = yp.name || '';
    const address = [yp.street, yp.locality].filter(Boolean).join(', ');
    const websiteUrl = this.extractDomain(yp.website) ? yp.website || '' : '';
    const email = yp.email?.endsWith('@yp.com') ? '' : yp.email || '';
    return {
      email,
      phoneNumber: yp.phone || '',
      websiteUrl,
      zipcode,
      city,
      state,
      address,
      companyName: businessName,
      businessName,
      category: yp.categories?.[0] || '',
      snippet: yp.snippet || '',
      businessLink: yp.business_link || '',
      source: 'yellowpages',
    };
  }

  // Save to campaignAudience

  private async saveToAudience(
    rows: any[],
    userId: string,
    campaignId: string,
  ): Promise<void> {
    try {
      const campaign = await this.campaignCollection.findOne(
        { _id: new ObjectId(campaignId) },
        { projection: { campaignName: 1 } },
      );
      const campaignName = campaign?.campaignName || '';

      for (const row of rows) {
        const contactInfo = {
          email: row.email || '',
          phoneNumber: row.phoneNumber || '',
          websiteUrl: row.websiteUrl || '',
          websiteName: row.businessName || '',
          businessName: row.businessName || '',
          companyName: row.companyName || '',
          zipcode: row.zipcode || '',
          city: row.city || '',
          state: row.state || '',
          address: row.address || '',
          category: row.category || '',
          snippet: row.snippet || '',
          businessLink: row.businessLink || '',
          emailStatus: EMAIL_STATUS.INITIATED,
          processStatus: EMAIL_PROCESS_STATUS.PENDING,
          dataSource: 'yellowpages',
          addedBy: userId,
          campaignId,
          campaignName,
          senderEmailId: null,
          subscribeStatus: true,
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          if (!contactInfo.phoneNumber && !contactInfo.websiteUrl) {
            await this.campaignAudienceCollection.insertOne(contactInfo);
            continue;
          }

          const existing = await this.campaignAudienceCollection.findOne({
            campaignId,
            $or: [
              ...(contactInfo.phoneNumber
                ? [{ phoneNumber: contactInfo.phoneNumber }]
                : []),
              ...(contactInfo.websiteUrl
                ? [{ websiteUrl: contactInfo.websiteUrl }]
                : []),
            ],
          });

          if (existing) {
            await this.campaignAudienceCollection.updateOne(
              { _id: existing._id },
              { $set: { ...contactInfo, updatedAt: new Date() } },
            );
          } else {
            await this.campaignAudienceCollection.insertOne(contactInfo);
          }
        } catch (err: any) {
          this.logger.error(
            `Failed to save YP contact ${
              contactInfo.phoneNumber || contactInfo.websiteUrl
            }`,
            err?.message,
          );
        }
      }
    } catch (err: any) {
      this.logger.error('saveToAudience failed', err?.message);
      throw new HttpException(
        err?.message || 'Failed to save leads to audience',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Apply filters on normalized data — checks final websiteUrl/phoneNumber after YP URL cleanup
  private applyNormalizedFilters(data: any[], filters: YPFilter[]): any[] {
    return data.filter((item) =>
      filters.every((f) => {
        const fieldKey = (f.key || f.field || '').toLowerCase();
        const op = (f.operator || '').toLowerCase().trim();
        const val = (f.value || '').toString().toLowerCase().trim();

        const isNotBlank = op === 'is not blank' || (op === 'equals' && (val === 'is_not_blank' || val === 'id_not_blank'));
        const isBlank = op === 'is blank' || (op === 'equals' && val === 'is_blank');

        if (fieldKey === 'phone') {
          if (isNotBlank) return Boolean(item.phoneNumber) && item.phoneNumber !== '';
          if (isBlank) return !item.phoneNumber || item.phoneNumber === '';
        }

        return true;
      }),
    );
  }

  // Concurrency helper

  private async runWithConcurrency<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency: number,
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(fn));
      results.push(...batchResults);
    }
    return results;
  }

  //Timeout helper
  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutMessage = 'Operation timed out',
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
