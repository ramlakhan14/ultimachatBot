import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { getAllCities, getPostalCodes } from 'world-postalcodes';
import { MONGODB } from '../common/mongo/mongo.module';
import {
  KB_DATASTORE_COLLECTION,
  KbDataStore,
  Knowledgebase,
  KNOWLEDGEBASE_COLLECTION,
  KnowledgebaseStatus,
} from '../knowledgebase/knowledgebase.schema';
import { isAdmin } from 'src/auth/guards/role.enum';
import { User, USER_COLLECTION, UserSparse } from '../user/user.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Outscraper from 'outscraper';

import { ProjectWebsiteDataDto, ScrapeDTO } from './project.dto';
import { AppConfigService } from '../common/config/appConfig.service';
import {
  Categories,
  CATEGORIES_COLLECTION,
  ScrapInviteEmailStatus,
  Scrap,
  SCRAPDATA_COLLECTION,
} from './project.schema';
import { KnowledgebaseService } from '../knowledgebase/knowledgebase.service';
import { KnowledgebaseDbService } from '../knowledgebase/knowledgebase-db.service';
import { OpenaiService } from '../openai/openai.service';
import { EmailService } from '../common/email/email.service';
import { readFileAsync } from '../common/utils';
import { defaultSetting } from './project.constant';
import axios from 'axios';
import thankYouMailTemplate from '../common/email/templates/thankYouMail';
import { findParentCategory } from './vakmangids_cat';
import { NotificationService } from '../web-push/push.service';
import { NotificationStatus } from '../web-push/notification.schema';
import { UserService } from '../user/user.service';
import { GMB_COLLECTION, GMBData } from '../campaign/schema/campaign.schema';
import { CreateKnowledgebaseDTO } from '../knowledgebase/knowledgebase.dto';
import { GPTModels } from '../campaign/enum/enum';
import { DistributedLockService } from '../common/distributed-lock/distributed-lock.service';
import { GmbDirectoryService } from '../gmb-directory/gmb-directory.service';
import { GmbBusinessDirectoryEntry } from '../gmb-directory/gmb-directory.schema';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger('ProjectService');

  //   private readonly userCollection: Collection<User>;
  private readonly knowledgebaseCollection: Collection<Knowledgebase>;
  private readonly scrapeCollection: Collection<Scrap>;
  private isJobRunning = false;
  private readonly kbDataStoreCollection: Collection<KbDataStore>;
  private readonly categoriesCollection: Collection<Categories>;
  private readonly userCollection: Collection<User>;
  private readonly gmbCollection: Collection<GMBData>;

  // In-memory registry of jobIds whose polling side gave up waiting (hit the
  // client-facing timeout) - the background scrape checks this at its next
  // batch/chunk checkpoint and stops gracefully instead of continuing to
  // burn API calls/credits for a job nobody is waiting on anymore. Safe as
  // a plain in-memory Set since ProjectService is a singleton within this
  // process, which is also the process running the background job.
  private readonly cancelledScrapeJobIds = new Set<string>();

  cancelScrapeJob(jobId?: string): void {
    if (jobId) this.cancelledScrapeJobIds.add(jobId);
  }

  private isScrapeJobCancelled(jobId?: string): boolean {
    return !!jobId && this.cancelledScrapeJobIds.has(jobId);
  }

  // In-memory snapshot of results found so far for a running job, updated
  // after each enrichment chunk regardless of whether a dataEntryFunction
  // was provided. Lets a poller read real accumulated progress on timeout
  // even for flows (like the Invite-Users scrape) that don't auto-save to a
  // DB collection - the frontend reviews/selects candidates before a
  // separate call persists them, so there's nothing to query there instead.
  private readonly scrapeJobProgress = new Map<string, any[]>();

  getScrapeJobProgress(jobId?: string): any[] {
    return (jobId && this.scrapeJobProgress.get(jobId)) || [];
  }

  constructor(
    @Inject(MONGODB) private db: Db, // private subsPlanService: SubscriptionPlanInfoService,
    private appConfig: AppConfigService,
    private readonly kbService: KnowledgebaseService,
    private readonly kbdbService: KnowledgebaseDbService,
    private openaiService: OpenaiService,
    private emailService: EmailService,
    private readonly userService: UserService,
    private readonly distributedLock: DistributedLockService,
    private readonly gmbDirectoryService: GmbDirectoryService,
  ) {
    this.knowledgebaseCollection = this.db.collection<Knowledgebase>(
      KNOWLEDGEBASE_COLLECTION,
    );
    this.scrapeCollection = this.db.collection<Scrap>(SCRAPDATA_COLLECTION);
    this.categoriesCollection = this.db.collection<Categories>(
      CATEGORIES_COLLECTION,
    );
    this.kbDataStoreCollection = this.db.collection<KbDataStore>(
      KB_DATASTORE_COLLECTION,
    );
    this.userCollection = this.db.collection<User>(USER_COLLECTION);
    this.gmbCollection = this.db.collection<GMBData>(GMB_COLLECTION);
  }

  /* get all users projects data */

  async listAllKnowledgebasesForAdmin(user: UserSparse) {
    const adminStatus = isAdmin(user);
    if (adminStatus) {
      const kbs = this.knowledgebaseCollection
        .find(
          { chatbotType: { $ne: 'vakmangids' } },
          {
            projection: {
              _id: 1,
              name: 1,
              status: 1,
              monthUsage: 1,
              'crawlData.stats': 1,
              owner: 1,
              'websiteData.websiteUrl': 1,
              updatedAt: 1,
            },
          },
        )
        .toArray(); // Convert the cursor to an array

      return kbs;
    } else {
      throw new HttpException(
        'Failed to retrieve knowledge bases',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  // ── Helper: adminOnly scope ───────────────────────────────────────────────
  private async getAdminOnlyKnowledgebases(
    user: UserSparse,
    queryFilter: any,
    baseFilter: any,
    staticCounts: {
      totalItemsStatic: number;
      totalAdminItemsStatic: number;
      totalsScrapedLeadProjectStatic: number;
    },
    search: string | undefined,
    isChatbotEnabled: boolean | undefined,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    // Safely combine $or with owner filter
    if (queryFilter.$or) {
      const existingOr = queryFilter.$or;
      delete queryFilter.$or;
      queryFilter.$and = [{ $or: existingOr }, { owner: user._id }];
    } else {
      queryFilter.owner = user._id;
    }

    // Admin count: excludes scraped lead projects, search-aware
    const adminCountFilter: any = {
      ...baseFilter,
      owner: user._id,
      $or: [
        { isScrapedLeadProject: false },
        { isScrapedLeadProject: { $exists: false } },
      ],
    };
    if (search) {
      adminCountFilter.name = { $regex: search, $options: 'i' };
    }
    if (isChatbotEnabled === true || isChatbotEnabled === false) {
      adminCountFilter.isChatbotEnabled = isChatbotEnabled;
    }

    const totalAdminItems = await this.knowledgebaseCollection.countDocuments(
      adminCountFilter,
    );
    const paginationTotal = await this.knowledgebaseCollection.countDocuments(
      queryFilter,
    );

    const kbs = await this.knowledgebaseCollection
      .find(queryFilter, { projection: this.knowledgebaseProjection() })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    return {
      data: kbs,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: staticCounts.totalItemsStatic, // static, excludes scraped
        totalAdminItems, // search-aware, excludes scraped
        totalsScrapedLeadProject: staticCounts.totalsScrapedLeadProjectStatic, // static
        totalPages: Math.ceil(paginationTotal / limit),
      },
    };
  }

  // ── Helper: isScrapedLeadProject=true scope ───────────────────────────────
  private async getScrapedLeadProjectKnowledgebases(
    queryFilter: any,
    staticCounts: {
      totalItemsStatic: number;
      totalAdminItemsStatic: number;
      totalsScrapedLeadProjectStatic: number;
    },
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const totalsScrapedLeadProject =
      await this.knowledgebaseCollection.countDocuments(queryFilter);

    const kbs = await this.knowledgebaseCollection
      .find(queryFilter, { projection: this.knowledgebaseProjection() })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    return {
      data: kbs,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: staticCounts.totalItemsStatic, // static, excludes scraped
        totalAdminItems: staticCounts.totalAdminItemsStatic, // static, excludes scraped
        totalsScrapedLeadProject, // search-aware
        totalPages: Math.ceil(totalsScrapedLeadProject / limit),
      },
    };
  }

  // ── Helper: global scope (adminOnly=false, isScrapedLeadProject != true) ──
  private async getGlobalKnowledgebases(
    queryFilter: any,
    staticCounts: {
      totalItemsStatic: number;
      totalAdminItemsStatic: number;
      totalsScrapedLeadProjectStatic: number;
    },
    search: string | undefined,
    isScrapedLeadProject: string | undefined,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const paginationTotal = await this.knowledgebaseCollection.countDocuments(
      queryFilter,
    );

    // totalItems is filter-aware when search OR isScrapedLeadProject=false is active
    const isFiltered = !!search || isScrapedLeadProject === 'false';
    const totalItems = isFiltered
      ? paginationTotal
      : staticCounts.totalItemsStatic;

    const kbs = await this.knowledgebaseCollection
      .find(queryFilter, { projection: this.knowledgebaseProjection() })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    return {
      data: kbs,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems, // filter-aware
        totalAdminItems: staticCounts.totalAdminItemsStatic, // static, excludes scraped
        totalsScrapedLeadProject: staticCounts.totalsScrapedLeadProjectStatic, // static
        totalPages: Math.ceil(paginationTotal / limit),
      },
    };
  }

  // ── Projection helper ─────────────────────────────────────────────────────
  private knowledgebaseProjection() {
    return {
      _id: 1,
      name: 1,
      status: 1,
      monthUsage: 1,
      'crawlData.stats': 1,
      owner: 1,
      'websiteData.websiteUrl': 1,
      updatedAt: 1,
      isChatbotEnabled: 1,
      isScrapedLeadProject: 1,
    };
  }

  // ── Main function ─────────────────────────────────────────────────────────
  async listAllKnowledgebasesForAdminV2(
    user: UserSparse,
    page: number,
    limit: number,
    adminOnly?: boolean,
    search?: string,
    isChatbotEnabled?: boolean,
    isScrapedLeadProject?: string,
  ) {
    const adminStatus = isAdmin(user);
    if (!adminStatus) {
      throw new HttpException(
        'Failed to retrieve knowledge bases',
        HttpStatus.NOT_FOUND,
      );
    }

    // ── Immutable base filter ───────────────────────────────────────────────
    const baseFilter: any = { chatbotType: { $ne: 'vakmangids' } };

    // ── Non-scraped $or condition (reused across counts) ───────────────────
    const nonScrapedOr = [
      { isScrapedLeadProject: false },
      { isScrapedLeadProject: { $exists: false } },
    ];

    // ── Static counts (scraped projects excluded from totalItems & totalAdminItems)
    const staticCounts = {
      // All projects excluding scraped lead projects
      totalItemsStatic: await this.knowledgebaseCollection.countDocuments({
        ...baseFilter,
        $or: nonScrapedOr,
      }),

      // Admin projects excluding scraped lead projects
      totalAdminItemsStatic: await this.knowledgebaseCollection.countDocuments({
        ...baseFilter,
        owner: user._id,
        $or: nonScrapedOr,
      }),

      // Only scraped lead projects (separate bucket)
      totalsScrapedLeadProjectStatic:
        await this.knowledgebaseCollection.countDocuments({
          ...baseFilter,
          isScrapedLeadProject: true,
        }),
    };

    // ── Build dynamic query filter ──────────────────────────────────────────
    const queryFilter: any = { ...baseFilter };

    if (search) {
      queryFilter.name = { $regex: search, $options: 'i' };
    }

    if (isChatbotEnabled === true || isChatbotEnabled === false) {
      queryFilter.isChatbotEnabled = isChatbotEnabled;
    }

    if (isScrapedLeadProject === 'true') {
      // Only scraped lead projects
      queryFilter.isScrapedLeadProject = true;
    } else {
      // Always exclude scraped lead projects unless explicitly requested
      queryFilter.$or = nonScrapedOr;
    }

    // ── Delegate to appropriate scope handler ──────────────────────────────
    let result: any;

    if (adminOnly) {
      result = await this.getAdminOnlyKnowledgebases(
        user,
        queryFilter,
        baseFilter,
        staticCounts,
        search,
        isChatbotEnabled,
        page,
        limit,
      );
    } else if (isScrapedLeadProject === 'true') {
      result = await this.getScrapedLeadProjectKnowledgebases(
        queryFilter,
        staticCounts,
        page,
        limit,
      );
    } else {
      result = await this.getGlobalKnowledgebases(
        queryFilter,
        staticCounts,
        search,
        isScrapedLeadProject,
        page,
        limit,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Knowledgebases fetched successfully',
      ...result,
    };
  }

  async listChatbotEnabledKnowledgebasesForAdmin(
    user: UserSparse,
    page: number,
    limit: number,
    adminOnly?: boolean,
    search?: string,
    isScrapedLeadProject?: string,
  ) {
    const adminStatus = isAdmin(user);

    // ── Base filter always includes isChatbotEnabled=true ─────────────────
    const baseFilter: any = {
      chatbotType: { $ne: 'vakmangids' },
      isChatbotEnabled: true, // ← baked in, affects everything
    };

    const nonScrapedOr = [
      { isScrapedLeadProject: false },
      { isScrapedLeadProject: { $exists: false } },
    ];

    // ── Static counts (all isChatbotEnabled=true aware) ───────────────────
    const staticCounts = {
      totalItemsStatic: await this.knowledgebaseCollection.countDocuments({
        ...baseFilter,
        $or: nonScrapedOr,
      }),

      totalAdminItemsStatic: await this.knowledgebaseCollection.countDocuments({
        ...baseFilter,
        owner: user._id,
        $or: nonScrapedOr,
      }),

      totalsScrapedLeadProjectStatic:
        await this.knowledgebaseCollection.countDocuments({
          ...baseFilter,
          isScrapedLeadProject: true,
        }),
    };

    // ── Build dynamic query filter ─────────────────────────────────────────
    const queryFilter: any = { ...baseFilter };

    if (search) {
      queryFilter.name = { $regex: search, $options: 'i' };
    }

    if (isScrapedLeadProject === 'true') {
      queryFilter.isScrapedLeadProject = true;
    } else {
      queryFilter.$or = nonScrapedOr;
    }

    // ── Delegate to same scope handlers ───────────────────────────────────
    let result: any;

    if (adminOnly) {
      result = await this.getAdminOnlyKnowledgebases(
        user,
        queryFilter,
        baseFilter,
        staticCounts,
        search,
        true, // isChatbotEnabled always true here
        page,
        limit,
      );
    } else if (isScrapedLeadProject === 'true') {
      result = await this.getScrapedLeadProjectKnowledgebases(
        queryFilter,
        staticCounts,
        page,
        limit,
      );
    } else {
      result = await this.getGlobalKnowledgebases(
        queryFilter,
        staticCounts,
        search,
        isScrapedLeadProject,
        page,
        limit,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Knowledgebases fetched successfully',
      ...result,
    };
  }

  // async listAllKnowledgebasesForAdminV2(
  //   user: UserSparse,
  //   page: number,
  //   limit: number,
  //   adminOnly?: boolean,
  //   search?: string,
  //   isChatbotEnabled?: boolean,
  //   isScrapedLeadProject?: string,
  // ) {
  //   // const adminStatus = isAdmin(user);
  //   // if (!adminStatus) {
  //   //   throw new HttpException(
  //   //     'Failed to retrieve knowledge bases',
  //   //     HttpStatus.NOT_FOUND,
  //   //   );
  //   // }

  //   const skip = (page - 1) * limit;

  //   // ── Immutable base filter ─────────────────────────────────────────────────
  //   const baseFilter: any = { chatbotType: { $ne: 'vakmangids' } };

  //   // ── Static counts (no search, no filters) ────────────────────────────────
  //   const totalItemsStatic = await this.knowledgebaseCollection.countDocuments(baseFilter);

  //   const totalAdminItemsStatic = await this.knowledgebaseCollection.countDocuments({
  //     ...baseFilter,
  //     owner: user._id,
  //   });

  //   const totalsScrapedLeadProjectStatic = await this.knowledgebaseCollection.countDocuments({
  //     ...baseFilter,
  //     isScrapedLeadProject: true,
  //   });

  //   // ── Build dynamic query filter ────────────────────────────────────────────
  //   const queryFilter: any = { ...baseFilter };

  //   if (search) {
  //     queryFilter.name = { $regex: search, $options: 'i' };
  //   }

  //   if (isChatbotEnabled === true || isChatbotEnabled === false) {
  //     queryFilter.isChatbotEnabled = isChatbotEnabled;
  //   }

  //   if (isScrapedLeadProject === 'true') {
  //     queryFilter.isScrapedLeadProject = true;
  //   } else if (isScrapedLeadProject === 'false') {
  //     queryFilter.$or = [
  //       { isScrapedLeadProject: false },
  //       { isScrapedLeadProject: { $exists: false } },
  //     ];
  //   }

  //   // ── Compute counts based on active scope ──────────────────────────────────
  //   let totalItems = totalItemsStatic;
  //   let totalAdminItems = totalAdminItemsStatic;
  //   let totalsScrapedLeadProject = totalsScrapedLeadProjectStatic;
  //   let paginationTotal: number;

  //   if (adminOnly) {
  //     // If queryFilter has $or (from isScrapedLeadProject=false),
  //     // wrap in $and to safely combine with owner filter
  //     if (queryFilter.$or) {
  //       const existingOr = queryFilter.$or;
  //       delete queryFilter.$or;
  //       queryFilter.$and = [
  //         { $or: existingOr },
  //         { owner: user._id },
  //       ];
  //     } else {
  //       queryFilter.owner = user._id;
  //     }
  //     totalAdminItems = await this.knowledgebaseCollection.countDocuments(queryFilter);
  //     paginationTotal = totalAdminItems;

  //   } else if (isScrapedLeadProject === 'true') {
  //     totalsScrapedLeadProject = await this.knowledgebaseCollection.countDocuments(queryFilter);
  //     paginationTotal = totalsScrapedLeadProject;

  //   } else {
  //     // Recompute totalItems only when search is active
  //     if (search) {
  //       totalItems = await this.knowledgebaseCollection.countDocuments(queryFilter);
  //     }
  //     paginationTotal = await this.knowledgebaseCollection.countDocuments(queryFilter);
  //   }

  //   // ── Fetch paginated data ──────────────────────────────────────────────────
  //   const projection = {
  //     _id: 1,
  //     name: 1,
  //     status: 1,
  //     monthUsage: 1,
  //     'crawlData.stats': 1,
  //     owner: 1,
  //     'websiteData.websiteUrl': 1,
  //     updatedAt: 1,
  //     isChatbotEnabled: 1,
  //     isScrapedLeadProject: 1,
  //   };

  //   const kbs = await this.knowledgebaseCollection
  //     .find(queryFilter, { projection })
  //     .skip(skip)
  //     .limit(limit)
  //     .sort({ createdAt: -1 })
  //     .toArray();

  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Knowledgebases fetched successfully',
  //     data: kbs,
  //     pagination: {
  //       currentPage: page,
  //       pageSize: limit,
  //       totalItems,
  //       totalAdminItems,
  //       totalsScrapedLeadProject,
  //       totalPages: Math.ceil(paginationTotal / limit),
  //     },
  //   };
  // }
  async googleMapScrapResult(
    query: string[],
    limit: number,
    region?: string,
    enrichment?: [],
    coordinates?: string,
    fields?: string,
    language?: string,
    jobId?: string,
  ) {
    try {
      const client = new Outscraper(this.appConfig.get('outscraperKey'));

      // NOTE: previously capped this at a small fixed value on the
      // assumption that a single "postal code" query is narrow enough that
      // it wouldn't have many real matches. That assumption was wrong: some
      // datasets have very few postal codes for a whole large city (e.g.
      // only 7 for "new delhi"), so each one covers a huge area and can
      // legitimately have 100+ real matching businesses. Capping this
      // silently threw away most real results. Use the caller's requested
      // limit as originally, since there's no way to know per-query result
      // density in advance.
      const finalLimit = limit && limit > 0 ? limit : 20;
      const finalLanguage = language || 'en';
      const finalRegion = (region || 'us').toUpperCase(); // normalize

      const batchSize = 4;
      const batches: string[][] = [];
      for (let i = 0; i < query.length; i += batchSize) {
        batches.push(query.slice(i, i + batchSize));
      }

      // Batches used to be processed one at a time, so total wait time scaled
      // linearly with the number of postal codes/queries requested. Running
      // a capped number of batches concurrently keeps that time roughly flat
      // - but only up to whatever this Outscraper account's real safe
      // concurrency ceiling actually is.
      // NOTE: both 20 and 8 were tried and caused widespread silent failures
      // under load - confirmed directly against Outscraper's API that a
      // single isolated request for the exact same query returns full, real
      // results, so the degradation is specifically caused by concurrent
      // request volume from this account, not the query itself. Outscraper
      // doesn't return a clear rate-limit error like Apify does - it just
      // silently returns empty/degraded results, indistinguishable from
      // "found nothing". Keep this very conservative until a real safe
      // ceiling for this account is established empirically.
      const BATCH_CONCURRENCY = 3;
      const GOOGLE_MAPS_SEARCH_TIMEOUT_MS = 30000;

      const processBatch = async (batch: string[]) => {
        try {
          const taskOrData = await this.withTimeout<any>(
            client.googleMapsSearch(
              batch,
              finalLimit,
              finalLanguage,
              finalRegion,
            ),
            GOOGLE_MAPS_SEARCH_TIMEOUT_MS,
            'Timed out starting Google Maps search',
          );

          // If SDK returns data directly
          if (Array.isArray(taskOrData)) {
            return { data: taskOrData };
          }

          if (!taskOrData?.results_location) {
            throw new Error('Outscraper task missing results_location');
          }

          let attempts = 0;
          const maxAttempts = 30;
          const delayMs = 2000;
          let lastStatus: string | undefined;

          while (attempts < maxAttempts) {
            try {
              const pollRes = await axios.get(taskOrData.results_location, {
                timeout: 15000,
              });

              const taskInfo = Array.isArray(pollRes.data)
                ? pollRes.data[0]
                : pollRes.data;

              lastStatus = taskInfo?.status;

              // keep waiting on both Pending + Processing
              if (lastStatus === 'Pending' || lastStatus === 'Processing') {
                attempts++;
                await new Promise((r) => setTimeout(r, delayMs));
                continue;
              }

              if (lastStatus === 'Success') {
                return { data: taskInfo.data || [] };
              }

              // any terminal failure status
              throw new Error(
                `Scraping failed with status: ${lastStatus || 'Unknown'}`,
              );
            } catch (pollErr: any) {
              attempts++;
              if (attempts >= maxAttempts) {
                throw new Error(
                  `Scraping timed out. Last status: ${
                    lastStatus || 'Unknown'
                  }. Error: ${pollErr.message}`,
                );
              }
              await new Promise((r) => setTimeout(r, delayMs));
            }
          }
          return { data: [] };
        } catch (batchErr: any) {
          // Skip this batch instead of failing the whole search, so the
          // other batches (and the postal codes/queries they cover) still
          // come back successfully.
          return { data: [] as any[], error: batchErr.message as string };
        }
      };

      // Once enough raw results have actually been found, stop launching
      // further batches instead of grinding through every remaining
      // postal-code/category combination - e.g. 17 categories x 7 postal
      // codes doesn't need to keep searching once hundreds of real results
      // are already in hand. This reacts to real accumulated data rather
      // than guessing a per-query allocation upfront (which is what caused
      // today's under-fetching regression), so a genuinely rich query is
      // never cut short - only the *number of remaining queries attempted*
      // is reduced. A few batches already in flight when the threshold is
      // hit will still complete, so raw results can slightly overshoot
      // `finalLimit` - trimmed below.
      let accumulatedRawCount = 0;
      const shouldStopSearch = () =>
        accumulatedRawCount >= finalLimit || this.isScrapeJobCancelled(jobId);

      const batchOutcomes = await this.runWithConcurrency(
        batches,
        BATCH_CONCURRENCY,
        async (batch) => {
          const outcome = await processBatch(batch);
          accumulatedRawCount += outcome.data.length;
          return outcome;
        },
        shouldStopSearch,
      );

      // Early-exited batches are left as `undefined` holes in the results
      // array (never dispatched) - filter those out before flattening.
      const dispatchedOutcomes = batchOutcomes.filter(Boolean);
      const batchesSkipped = batches.length - dispatchedOutcomes.length;
      if (batchesSkipped > 0) {
      }

      // outcome.data is nested one level deeper than it looks: Outscraper
      // returns one results array PER QUERY in the batch (confirmed via
      // direct API testing), not a flat list - e.g. for a batch of 4
      // queries, outcome.data = [resultsForQuery1, ..., resultsForQuery4].
      // .flatMap() only removes the across-batches nesting; .flat() removes
      // the across-queries-within-a-batch nesting. Skipping the second flat
      // silently drops every query's results except the first in each batch.
      const allResults = dispatchedOutcomes
        .flatMap((outcome) => outcome.data)
        .flat()
        .slice(0, finalLimit);
      const failedBatches = dispatchedOutcomes.filter(
        (outcome) => outcome.error,
      );

      // Only surface an error if every batch failed and nothing came back at
      // all — a batch returning zero matches is a valid outcome, not a bug.
      if (
        allResults.length === 0 &&
        failedBatches.length === dispatchedOutcomes.length &&
        dispatchedOutcomes.length > 0
      ) {
        throw new HttpException(
          `Scraping failed for all batches. Last error: ${
            failedBatches[failedBatches.length - 1]?.error || 'Unknown'
          }`,
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      return allResults;
    } catch (err) {
      if (err instanceof HttpException) throw err;

      throw new HttpException(
        'Error occurred while scraping: ' + (err?.message || err),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // Added By Nidhi Sharma on 14-1-2025
  private extractValidDomain(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim();

    // Skip social media
    if (
      /facebook\.com|twitter\.com|instagram\.com|linkedin\.com|tiktok\.com|youtube\.com/i.test(
        trimmed,
      )
    ) {
      return null;
    }

    try {
      // Ensure protocol exists
      const normalizedUrl = trimmed.startsWith('http')
        ? trimmed
        : `https://${trimmed}`;

      const parsed = new URL(normalizedUrl);

      // Remove www.
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  // Guards against Outscraper SDK calls (e.g. emailsAndContacts) that have no
  // built-in timeout and can otherwise hang a scrape job indefinitely.
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

  // Runs `worker` over `items` with at most `concurrency` in flight at once,
  // instead of firing every item at once (unbounded Promise.all) or one at a
  // time (sequential loop). Optional `shouldStop` is checked before each new
  // item is dispatched - once true, no further items are started (items
  // already in flight still complete), letting callers react to real
  // accumulated progress instead of guessing an upfront allocation.
  private async runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
    shouldStop?: () => boolean,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const runners = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (cursor < items.length) {
          if (shouldStop?.()) break;
          const index = cursor++;
          results[index] = await worker(items[index], index);
        }
      },
    );

    await Promise.all(runners);
    return results;
  }

  async dataScrapping(
    user: UserSparse,
    data: ScrapeDTO,
    dataEntryFunction?: (
      data: any[],
      user: UserSparse,
      optional?: string,
    ) => Promise<void>,
    campaignId?: string,
    enrichment?: any,
    coordinates?: any,
    fields?: any,
    language?: any,
    userToken?: string,
    jobId?: string,
  ) {
    const adminStatus = isAdmin(user) || user.role === 'user';
    if (adminStatus) {
      try {
        const startTime = Date.now();
        const client = new Outscraper(this.appConfig.get('outscraperKey'));
        if (!data?.query && !data?.categories) {
          throw new HttpException(
            'Query or Categories must be provided ',
            HttpStatus.EXPECTATION_FAILED,
          );
        }
        if (data?.categories?.length > 0 && !data.country) {
          throw new HttpException(
            'Location must be provided ',
            HttpStatus.EXPECTATION_FAILED,
          );
        }

        const { city, country, query, categories, limit } = data;

        // GMB directory cache-first check: every entry in this collection
        // was already proven valid (real domain + real discoverable email)
        // by a previous scrape, by this user or any other - a fresh
        // Outscraper search silently drops a large fraction of raw
        // listings that have no findable email, which is why a request for
        // `limit` leads routinely comes back short. Serving already-known
        // businesses out of the cache first fixes both the shortfall (cache
        // hits are 100% valid by construction) and the repeat cost (no
        // Outscraper call at all for them).
        const cityKey = this.gmbDirectoryService.normalizeTerm(city);
        const countryKey = this.gmbDirectoryService.normalizeTerm(country);
        const categoryKeys = this.gmbDirectoryService.buildCategoryKeys(
          query,
          categories,
        );

        // When the request also carries advanced-parameter filters
        // (business status / verified / phone / rating), fetch more
        // candidates than `limit` up front - some will be excluded by the
        // filter below, so asking for exactly `limit` would under-fill the
        // cache portion and push avoidable extra load onto Outscraper.
        const CACHE_OVERFETCH_MULTIPLIER = 3;
        const CACHE_OVERFETCH_CAP = 300;
        const hasFilter = data?.filter?.length > 0;
        const cacheFetchLimit = hasFilter
          ? Math.min(limit * CACHE_OVERFETCH_MULTIPLIER, CACHE_OVERFETCH_CAP)
          : limit;

        const rawCachedEntries: GmbBusinessDirectoryEntry[] =
          categoryKeys.length && cityKey && countryKey
            ? await this.gmbDirectoryService.findCachedLeads({
                categoryKeys,
                cityKey,
                countryKey,
                limit: cacheFetchLimit,
              })
            : [];

        // Cached entries already passed the valid-lead gate, but they've
        // never been run through *this request's* filter - without this,
        // a cache hit could come back non-verified/no-phone/wrong-rating
        // even though the user explicitly asked to exclude those, while a
        // freshly-scraped result for the same request correctly obeys the
        // filter. Reuses applyFilters() itself (mapped onto the directory's
        // field names) instead of re-implementing the same operator/value
        // semantics a second time.
        const cachedEntries: GmbBusinessDirectoryEntry[] = hasFilter
          ? (
              await this.applyFilters(
                rawCachedEntries.map((entry) => ({
                  _entry: entry,
                  business_status: entry.businessStatus,
                  verified: entry.verified,
                  phone: entry.phoneNumber,
                  rating: entry.rating,
                })),
                data.filter,
              )
            )
              .map((mapped: any) => mapped._entry as GmbBusinessDirectoryEntry)
              .slice(0, limit)
          : rawCachedEntries.slice(0, limit);

        const deliveredEmailSet = new Set<string>(
          cachedEntries
            .map((entry) => entry.email?.toLowerCase())
            .filter(Boolean),
        );

        const remainingTarget = Math.max(0, limit - cachedEntries.length);

        let postalCodeData: any[] = [];
        if (remainingTarget > 0) {
          const { data: pcData, message } = await this.getPostalCodeFromCity(
            country,
            city,
          );
          if (!pcData || pcData.length === 0) {
            if (cachedEntries.length === 0) {
              throw new HttpException(message, HttpStatus.NO_CONTENT);
            }
          } else {
            postalCodeData = pcData;
          }
        }

        type EnrichmentCandidate = { dataItem: any; domain: string };

        // Makes a result-count collapse (e.g. search/enrichment silently
        // starved by too much concurrency) immediately visible in logs
        // instead of requiring reconstruction from scattered error lines.

        // NOTE: 20 was tried and caused every single enrichment call in a
        // large run to time out simultaneously - emailsAndContacts is a
        // synchronous Outscraper endpoint, and it appears to degrade hard
        // under concurrent load well before returning any rate-limit error.
        // Keep conservative until a real safe ceiling is established.
        const EMAIL_ENRICHMENT_CONCURRENCY = 12;
        const EMAIL_ENRICHMENT_TIMEOUT_MS = 15000;

        const enrichOne = async ({ dataItem, domain }: EnrichmentCandidate) => {
          try {
            const contactResponse = await this.withTimeout(
              client.emailsAndContacts(domain),
              EMAIL_ENRICHMENT_TIMEOUT_MS,
              `Timed out fetching contacts for ${domain}`,
            );

            if (
              contactResponse &&
              Array.isArray(contactResponse) &&
              contactResponse.length > 0 &&
              ((contactResponse[0]?.emails &&
                contactResponse[0].emails.length > 0) ||
                (contactResponse[0]?.external_emails &&
                  contactResponse[0].external_emails.length > 0))
            ) {
              const email =
                contactResponse[0].emails &&
                contactResponse[0].emails.length > 0
                  ? contactResponse[0].emails[0].value
                  : contactResponse[0].external_emails[0].value;

              // Already served from cache, or already produced by an
              // earlier enrichment in this same request (e.g. two
              // overlapping postal-code queries both surfacing the same
              // business) - skip rather than return/charge/write-through
              // it a second time. Synchronous check-then-add: safe even
              // under this loop's concurrency since nothing here awaits
              // between the check and the add.
              const emailKey = email?.toLowerCase();
              if (!emailKey || deliveredEmailSet.has(emailKey)) {
                return null;
              }
              deliveredEmailSet.add(emailKey);

              return {
                dataItem,
                lead: {
                  userId: user._id.toHexString(),
                  websiteName: dataItem.name,
                  websiteUrl: dataItem.site ?? dataItem.website,
                  email: email,
                  phoneNumber: dataItem?.phone,
                  emailStatus: ScrapInviteEmailStatus.PENDING,
                  processStatus: 0,
                  chatbotUrl: '',
                  emailContent: '',
                  source: 'gmb',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  signUpStatus: false,
                },
              };
            }
            return null;
          } catch (err) {
            // Skip this domain instead of failing the whole batch, so a
            // single slow/broken domain can no longer stall or wipe out
            // every other result already fetched.
            return null;
          }
        };

        // Enrich and save in chunks instead of accumulating everything in
        // memory and doing one giant save at the very end. For a large scrape
        // (thousands of candidates) that final step could be minutes away -
        // if the process crashes or times out before reaching it, every lead
        // found so far would be lost even though the work to find them
        // already happened. Saving per chunk means only the currently
        // in-flight chunk (bounded, small) is ever at risk.
        const SAVE_CHUNK_SIZE = 50;
        const allValidResults: any[] = [];
        let combinedEntryResult: any;

        const mergeEntryResults = (acc: any, next: any) => {
          if (!next) return acc;
          if (!acc) return next;
          return {
            statusCode: next.statusCode,
            message: next.message,
            data: {
              uniqueScrapData: [
                ...(acc.data?.uniqueScrapData || []),
                ...(next.data?.uniqueScrapData || []),
              ],
              uniqueScrapDataCount:
                (acc.data?.uniqueScrapDataCount || 0) +
                (next.data?.uniqueScrapDataCount || 0),
              duplicateData: [
                ...(acc.data?.duplicateData || []),
                ...(next.data?.duplicateData || []),
              ],
              duplicateDataCount:
                (acc.data?.duplicateDataCount || 0) +
                (next.data?.duplicateDataCount || 0),
            },
          };
        };

        // Serve already-validated leads out of the GMB directory cache
        // first - these cost no Outscraper search or enrichment call at
        // all, since a previous scrape already proved them valid. They
        // still go through the same credit-consumption + dataEntryFunction
        // (destination dedup) path as freshly scraped leads, so downstream
        // behaviour (billing, per-user/campaign duplicate handling) is
        // unchanged regardless of where a lead came from.
        if (cachedEntries.length > 0) {
          const cachedLeads = cachedEntries.map((entry) => ({
            userId: user._id.toHexString(),
            websiteName: entry.websiteName || entry.businessName,
            websiteUrl: entry.websiteUrl,
            email: entry.email,
            phoneNumber: entry.phoneNumber,
            emailStatus: ScrapInviteEmailStatus.PENDING,
            processStatus: 0,
            chatbotUrl: '',
            emailContent: '',
            source: 'gmb',
            createdAt: new Date(),
            updatedAt: new Date(),
            signUpStatus: false,
          }));

          for (let i = 0; i < cachedLeads.length; i += SAVE_CHUNK_SIZE) {
            const chunk = cachedLeads.slice(i, i + SAVE_CHUNK_SIZE);
            allValidResults.push(...chunk);
            if (jobId) this.scrapeJobProgress.set(jobId, allValidResults);

            if (chunk.length > 0 && dataEntryFunction) {
              await this.userService.consumeCredits(
                user._id,
                'SCRAPING_GMB',
                null,
                null,
                chunk.length,
              );

              const chunkEntryResult = await dataEntryFunction(
                chunk,
                user,
                campaignId,
              );
              combinedEntryResult = mergeEntryResults(
                combinedEntryResult,
                chunkEntryResult,
              );
            }
          }

          await this.gmbDirectoryService.markServed(
            cachedEntries
              .map((entry) => entry._id)
              .filter((id): id is ObjectId => Boolean(id)),
          );
        }

        // Runs one round's raw listings through the filter -> valid-domain
        // gate -> enrichment -> save/bill/write-through pipeline. Extracted
        // so the retry-round loop below can call it once per batch of
        // postal codes instead of duplicating this whole block per round.
        //
        // NOTE: cancellation is deliberately NOT checked here. By this
        // point the expensive, still-avoidable work (search) for this
        // round is already done and paid for - these are real results
        // already found. Stopping here would throw away that completed
        // work for a modest saving on the cheaper enrichment step.
        // Cancellation only cuts short the search phase (see
        // shouldStopSearch in googleMapScrapResult, and the round loop's
        // own isScrapeJobCancelled check below); once there are real
        // candidates in hand, they're always enriched and saved.
        const enrichAndSaveCandidates = async (
          candidates: EnrichmentCandidate[],
        ) => {
          for (
            let i = 0;
            i < candidates.length && allValidResults.length < limit;
            i += SAVE_CHUNK_SIZE
          ) {
            const chunk = candidates.slice(i, i + SAVE_CHUNK_SIZE);

            const enrichedChunk = await this.runWithConcurrency<
              EnrichmentCandidate,
              { dataItem: any; lead: any }
            >(chunk, EMAIL_ENRICHMENT_CONCURRENCY, enrichOne);

            const validEnrichedChunk = enrichedChunk.filter(
              (item): item is { dataItem: any; lead: any } => item != null,
            );

            // A whole chunk (up to SAVE_CHUNK_SIZE candidates, deliberately
            // over-fetched beyond `limit` for enrichment-yield buffer) can
            // finish with every candidate valid - without capping here,
            // that overshoots the caller's requested `limit` and, worse,
            // over-bills credits for leads beyond what was asked for. Cap
            // what's actually returned/billed/saved to the destination to
            // the remaining slots, but keep write-through (below)
            // uncapped - every genuinely-found valid lead still gets
            // cached for next time even if this request doesn't need it.
            const remainingSlots = Math.max(0, limit - allValidResults.length);
            const cappedValidChunkResults = validEnrichedChunk
              .slice(0, remainingSlots)
              .map((item) => item.lead);

            allValidResults.push(...cappedValidChunkResults);
            if (jobId) this.scrapeJobProgress.set(jobId, allValidResults);

            if (cappedValidChunkResults.length > 0 && dataEntryFunction) {
              //Added By Nidhi Sharma to deduct the cost for the gmb scrapping on 27-01-2026
              await this.userService.consumeCredits(
                user._id,
                'SCRAPING_GMB',
                null,
                null,
                cappedValidChunkResults.length,
              );

              const chunkEntryResult = await dataEntryFunction(
                cappedValidChunkResults,
                user,
                campaignId,
              );
              combinedEntryResult = mergeEntryResults(
                combinedEntryResult,
                chunkEntryResult,
              );
            }

            // Write-through: persist every freshly-validated lead into the
            // shared GMB directory cache so a future request for this same
            // category/city/country (from this user or anyone else) can be
            // served from cache instead of paying Outscraper again -
            // deliberately uncapped (see comment above).
            if (validEnrichedChunk.length > 0) {
              const directoryEntries = validEnrichedChunk.map(
                ({ dataItem, lead }) => {
                  const rawCategory =
                    (typeof dataItem?.query === 'string' &&
                      dataItem.query.split(',')[0].trim()) ||
                    (categories as unknown as string[])?.[0] ||
                    (query ? query.split('\n')[0] : '') ||
                    '';

                  return {
                    businessName: dataItem?.name || lead.websiteName,
                    email: lead.email,
                    phoneNumber: lead.phoneNumber,
                    websiteUrl: lead.websiteUrl,
                    websiteName: lead.websiteName,
                    category: rawCategory,
                    city,
                    cityKey,
                    country,
                    countryKey,
                    postalCode: dataItem?.postal_code,
                    address: dataItem?.full_address,
                    rating: dataItem?.rating,
                    businessStatus: dataItem?.business_status,
                    verified: dataItem?.verified,
                    latitude: dataItem?.latitude,
                    longitude: dataItem?.longitude,
                  };
                },
              );
              await this.gmbDirectoryService.upsertLeads(directoryEntries);
            }
          }
        };

        // Keep searching with fresh postal codes - instead of accepting
        // whatever a single pass happened to yield - until the target is
        // actually met, the location runs out of postal codes to try, two
        // rounds in a row add nothing new (real exhaustion: further rounds
        // are very unlikely to help), or a hard round cap is hit (backstop
        // against an unexpectedly expensive request). Each round asks for
        // more raw listings than it strictly needs
        // (POSTAL_OVERFETCH_MULTIPLIER), since only a fraction of any raw
        // listing pool survives the domain+email valid-lead gate.
        const MAX_SEARCH_ROUNDS = 5;
        const POSTAL_OVERFETCH_MULTIPLIER = 3;
        const MIN_POSTAL_BATCH = 5;
        let postalCursor = 0;
        let round = 0;
        let consecutiveEmptyRounds = 0;

        while (
          allValidResults.length < limit &&
          postalCursor < postalCodeData.length &&
          round < MAX_SEARCH_ROUNDS &&
          consecutiveEmptyRounds < 2 &&
          !this.isScrapeJobCancelled(jobId)
        ) {
          round++;
          const stillNeeded = limit - allValidResults.length;
          const postalBatchSize = Math.max(
            stillNeeded * POSTAL_OVERFETCH_MULTIPLIER,
            MIN_POSTAL_BATCH,
          );
          const postalBatch = postalCodeData.slice(
            postalCursor,
            postalCursor + postalBatchSize,
          );
          postalCursor += postalBatch.length;
          if (!postalBatch.length) break;

          const scrapQuery: string[] = [];
          postalBatch.forEach((queryData: any) => {
            const locationPart = `${queryData.zipcode}, ${city}, ${
              queryData.state
            }, ${country.toUpperCase()}`;
            if (query) {
              scrapQuery.push(
                ...query.split('\n').map((q) => `${q}, ${locationPart}`),
              );
            } else {
              scrapQuery.push(
                ...categories.map((c) => `${c}, ${locationPart}`),
              );
            }
          });

          const response = await this.googleMapScrapResult(
            scrapQuery,
            stillNeeded * POSTAL_OVERFETCH_MULTIPLIER,
            data?.country,
            enrichment,
            coordinates,
            fields,
            language,
            jobId,
          );

          // googleMapScrapResult already returns a flat array of listings
          // (see the comment there) - indexing [0] here would silently
          // take only the first listing instead of the whole result set.
          let filteredData: any;
          if (data?.filter?.length > 0) {
            filteredData = await this.applyFilters(response, data?.filter);
          }
          const finalresult =
            data?.filter?.length > 0 ? filteredData : response;

          // Skip enrichment entirely for items with no usable domain
          // instead of spending a worker slot / timeout window on them.
          const enrichmentCandidates: EnrichmentCandidate[] = (
            finalresult || []
          )
            .map((dataItem: any) => ({
              dataItem,
              domain: this.extractValidDomain(
                dataItem.site || dataItem.website,
              ),
            }))
            .filter(
              (entry: {
                dataItem: any;
                domain: string | null;
              }): entry is EnrichmentCandidate => Boolean(entry.domain),
            );

          const beforeRoundCount = allValidResults.length;
          await enrichAndSaveCandidates(enrichmentCandidates);

          consecutiveEmptyRounds =
            allValidResults.length === beforeRoundCount
              ? consecutiveEmptyRounds + 1
              : 0;
        }

        const endTime = Date.now();
        const timeTaken = endTime - startTime;

        return {
          length: allValidResults.length,
          data: allValidResults,
          results: combinedEntryResult?.data,
          timeTaken: `${timeTaken}ms`,
          timeTakenSeconds: `${(timeTaken / 1000).toFixed(2)}s`,
        };
      } catch (err) {
        throw new HttpException(
          err.message || 'Error occurred while scraping',
          err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      } finally {
        // Whether this finished normally, was cancelled, or errored, these
        // registry entries are no longer needed - clean them up so they
        // don't grow unboundedly across many scrape jobs over time. Once
        // finished, the job's real persisted result (or job.result written
        // by the caller) is the source of truth, not this in-memory snapshot.
        if (jobId) {
          this.cancelledScrapeJobIds.delete(jobId);
          this.scrapeJobProgress.delete(jobId);
        }
      }
    } else {
      throw new HttpException('Unauthorized User', HttpStatus.UNAUTHORIZED);
    }
  }

  async scrapCollectionDataEntry(validResults: any, user: UserSparse) {
    const uniqueScrapData = [];
    for (const dataItem of validResults) {
      const isDuplicate = await this.scrapeCollection.findOne({
        email: dataItem.email,
      });
      if (!isDuplicate) {
        uniqueScrapData.push({
          ...dataItem,
          userId: user._id.toHexString(),
          source: dataItem.source || 'gmb',
          emailStatus: dataItem.emailStatus || ScrapInviteEmailStatus.PENDING,
        });
      }
    }
    if (uniqueScrapData.length > 0) {
      await this.scrapeCollection.insertMany(uniqueScrapData);
      this.scheduleEmbeddingAndKnowledgebase(user);
    }
    return {
      savedCount: uniqueScrapData.length,
      skippedCount: validResults.length - uniqueScrapData.length,
    };
  }

  async dataScrappingAndInvoking(
    user: UserSparse,
    data: ScrapeDTO,
    userToken?: string,
  ) {
    try {
      const jobId = new ObjectId().toHexString();
      const userId = user._id.toHexString();
      await this.gmbCollection.insertOne({
        jobId,
        userId,
        campaignId: null,
        status: 'PROCESSING',
        createdAt: new Date(),
      });

      this.processScrapingJob(jobId, user, data);
      return jobId;
    } catch (error) {
      throw error; // Add this line
    }
  }

  async processScrapingJob(jobId: string, user: UserSparse, data: ScrapeDTO) {
    try {
      const result = await this.dataScrapping(
        user,
        data,
        // this.scrapCollectionDataEntry.bind(this),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        jobId,
      );

      await this.gmbCollection.updateOne(
        { jobId },
        {
          $set: {
            status: 'COMPLETED',
            result,
            updatedAt: new Date(),
          },
        },
      );
    } catch (error) {
      await this.gmbCollection.updateOne(
        { jobId },
        {
          $set: {
            status: 'FAILED',
            error: error.message,
          },
        },
      );
    }
  }

  async saveScrappedData(user: UserSparse, data: any) {
    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new BadRequestException('Empty data provided');
      }
      const addedDates = data?.map((item) => ({
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      const result = await this.scrapCollectionDataEntry(addedDates, user);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getScrapeResult(jobId: string, userId: string) {
    const job = await this.gmbCollection.findOne(
      { jobId, userId },
      { projection: { result: 1, _id: 0, status: 1, createdAt: 1 } },
    );

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const now = Date.now();
    const createdAt = new Date(job.createdAt).getTime();
    const TIMEOUT_LIMIT = 15 * 60 * 1000;
    if (now - createdAt > TIMEOUT_LIMIT && job.status === 'PROCESSING') {
      // Signal the background job to stop searching for more (already-found
      // candidates still get enriched regardless - see dataScrapping) and
      // return whatever's been found so far, in the exact same shape as the
      // success path below, instead of throwing an error that discards it.
      // This flow doesn't auto-save (the frontend reviews/selects candidates
      // before a separate saveScrappedData call persists them), so there's
      // no DB collection to query - the in-memory progress snapshot is the
      // only place this data exists before the job finishes.
      this.cancelScrapeJob(jobId);

      const partialData = this.getScrapeJobProgress(jobId);
      const uniquePartialData = [];
      for (const dataItem of partialData) {
        const isDuplicate = await this.scrapeCollection.findOne({
          email: dataItem.email,
        });
        if (!isDuplicate) {
          uniquePartialData.push(dataItem);
        }
      }
      return uniquePartialData;
    }

    if (job.status === 'FAILED') {
      return {
        success: false,
        message: 'Your scraping job has failed. Please try again.',
        status: job.status,
      };
    }
    const data = job.result?.data || [];
    const uniqueScrapData = [];
    for (const dataItem of data) {
      const isDuplicate = await this.scrapeCollection.findOne({
        email: dataItem.email,
      });
      if (!isDuplicate) {
        uniqueScrapData.push(dataItem);
      }
    }
    return uniqueScrapData;
  }

  async checkKnowledgeBaseStatus(
    kbId: ObjectId,
    status: string,
    maxRetries = 10,
    ms = 3000,
  ) {
    let retries = 0;
    while (retries < maxRetries) {
      const kbdata = await this.kbdbService.getKnowledgebaseSparseById(kbId);
      if (kbdata.status == status) {
        return;
      }
      retries += 1;
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  scheduleEmbeddingAndKnowledgebase(user: UserSparse) {
    this.isJobRunning = true;
    // Trigger the cron job to run
    this.startCronJob(user);
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'embeddingJob' })
  async startCronJob(user: UserSparse) {
    if (!this.isJobRunning) return;
    await this.distributedLock.withLock(
      'project-embedding-job',
      540_000,
      async () => {
        const entries = await this.scrapeCollection
          .find({ processStatus: { $ne: 1 } })
          .toArray();

        if (entries.length === 0) {
          this.isJobRunning = false; // Stop the cron if no entries are pending
          return;
        }

        for (const entry of entries) {
          try {
            const data: CreateKnowledgebaseDTO = {
              chatbotType: 'scraped_lead',
              owner: entry.userId,
              name: entry?.websiteName || 'unknown',
              websiteUrl: entry.websiteUrl,
              urls: [],
              include: [],
              exclude: [],
              isChatbotEnabled: true,
              isScrapedLeadProject: true,
            };
            let kbData: Knowledgebase | { _id: ObjectId; status?: string };
            try {
              kbData = await this.kbService.createKnowledgebase(
                user,
                data,
                true,
              );
            } catch (createErr) {
              // Bypass: a knowledgebase for this owner+URL already exists
              // from an earlier pass (e.g. it got partway through before
              // this cron stopped retrying) - createKnowledgebase() throws
              // "This domain already exists" in that case, which otherwise
              // permanently stalls this entry since every future retry
              // would hit the same guard instead of ever resuming the
              // existing KB. Look it up using the same normalization
              // createKnowledgebase() used internally to detect it, so the
              // lookup is guaranteed consistent with what just threw.
              if (
                createErr instanceof BadRequestException &&
                createErr.message === 'This domain already exists'
              ) {
                kbData = await this.kbdbService.getKnowledgebaseByWebsiteUrl(
                  this.kbService.normalizeUrl(entry.websiteUrl),
                  new ObjectId(entry.userId),
                );
                if (!kbData) {
                  throw createErr;
                }
              } else {
                throw createErr;
              }
            }

            if (kbData.status !== KnowledgebaseStatus.READY) {
              if (kbData.status !== KnowledgebaseStatus.GENERATING_EMBEDDINGS) {
                await this.checkKnowledgeBaseStatus(kbData._id, 'CRAWLED');
                await this.kbService.generateEmbeddingsForKnowledgebase(
                  user,
                  kbData._id.toString(),
                );
              }
              await this.checkKnowledgeBaseStatus(kbData._id, 'READY');
            }

            // Update process status to 1 when done
            // apply check on the basis of status
            const checkCrawledStatus =
              await this.kbdbService.getKnowledgebaseSparseById(kbData._id);
            const contentData = await this.kbDataStoreCollection.findOne({
              knowledgebaseId: kbData._id,
            });

            const dynamicEmailData = await this.generateContentEmail(
              contentData?.content,
              new ObjectId(entry.userId),
            );
            if (checkCrawledStatus.status == 'READY' && dynamicEmailData) {
              //TODO: ================================================================================================================
              await this.kbdbService.setKnowledgebaseChatWidgetData(
                kbData._id,
                defaultSetting,
              );
              //TODO: =========================================================================================

              await this.scrapeCollection.updateOne(
                { _id: entry._id },
                {
                  $set: {
                    processStatus: 1,
                    chatbotUrl: `${this.appConfig.get(
                      'chatbotUrl',
                    )}/?kbId=${kbData._id.toString()}&embed=true&hide-chat-actions=true`,
                    emailContent: dynamicEmailData.response,
                    updatedAt: new Date(),
                  },
                },
              );
            }
          } catch (error) {
            this.logger.error(`Error processing entry ${entry._id}:`, error);
          }
        }
        // If all entries are processed, stop the cron job
        if (entries.length === 0) {
          this.isJobRunning = false;
        }
        this.isJobRunning = false;
      },
    );
  }

  async generateContentEmail(content: string, userId: ObjectId) {
    const prompt = [
      {
        role: 'system',
        content:
          'You are an experienced sales assistant designed to promote the Ultima Chatbot. You must analyze the crawled content of a website homepage and draft personalized email messages that highlight pain points related to customer communication and offer solutions that the Ultima Chatbot can provide.',
      },
      {
        role: 'user',
        content: `Using the crawled content of the homepage of a particular website, prepare the body of an email message that we will send to the scraped leads' email id to sell our chatbot. For the Crawled content of the homepage, use the following content: ${content}. The broad section headings that you need to cover in the message content include:
          
          1. Pain Points related to customer communication identified upon crawling the content of the homepage.
          2. Unique Solutions that our Ultima Chatbot can provide to address each pain point covered in the above section.
          
            Follow this exact HTML format for each pain point and solution pair, ensuring no extra spacing is added between pairs:
          <div>
        <p><strong>Pain Point #1:</strong> Description of the pain point in one line.</p>
        <p><strong>Solution:</strong> Description of how Ultima Chatbot solves that pain point.</p>
      </div>

      Repeat this pattern for up to 4-5 pain points, using new <div> blocks but without any extra <br> tags or empty lines between each pair. Ensure that:

      1. Write content only for unique pain points and solutions.
      2. Don’t include any greetings or sign-offs like "Hi" or "Hope you are doing well."
      3. Avoid any CTAs like "You can get back to us."
      4. Keep the content short, crisp, and in proper HTML format, using only the specified <div> and <p> tags without adding any extra spacing or blank lines.
      5. Ensure each new pain point starts with "<div><p><strong>Pain Point #X:</strong></p>" and maintain this format throughout your response.`,
      },
    ];

    const emailContent = await this.openaiService.getChatGptCompletion(
      {
        messages: prompt as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_5_MINI,
      },
      [],
      userId,
      'project-content-email',
    );
    return emailContent;
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'scrapEmailSendJob' })
  async sendEmailtoScrappedData() {
    await this.distributedLock.withLock(
      'project-scrapped-email',
      1_680_000,
      async () => {
        try {
          if (this.isJobRunning == true) {
            return;
          }
          const MAX_EMAIL_ATTEMPTS = 2; // original attempt + 1 retry, then stop
          const response = await this.scrapeCollection
            .find({
              processStatus: 1,
              $or: [
                {
                  emailStatus: {
                    $in: [
                      ScrapInviteEmailStatus.PENDING,
                      ScrapInviteEmailStatus.NOTSENT,
                    ],
                  },
                },
                {
                  // $not/$gte (rather than $lt) so leads that failed before
                  // this counter existed - emailAttemptCount missing - are
                  // still treated as eligible for their one retry, instead
                  // of being silently excluded forever.
                  emailStatus: ScrapInviteEmailStatus.FAILED,
                  emailAttemptCount: { $not: { $gte: MAX_EMAIL_ATTEMPTS } },
                },
              ],
            })
            .toArray();
          if (response.length == 0) {
            return;
          }
          for (const data of response) {
            try {
              const emailResponse = await this.emailService.sendScrappingEmail(
                { ...data, userId: data.userId },
                'Free AI Chatbot for your website to streamline your website communication',
              );
              const sent = emailResponse.Message == 'OK';
              await this.scrapeCollection.updateOne(
                { _id: data._id },
                {
                  $set: {
                    emailStatus: sent
                      ? ScrapInviteEmailStatus.SENT
                      : ScrapInviteEmailStatus.FAILED,
                    updatedAt: new Date(),
                  },
                  // Only count failures toward the retry cap - a successful
                  // send doesn't need the counter anymore.
                  ...(sent ? {} : { $inc: { emailAttemptCount: 1 } }),
                },
                { upsert: false },
              );
            } catch (sendErr) {
              // Isolate this lead's failure so one bad send doesn't stop
              // the rest of the batch from being processed this run.
              await this.scrapeCollection.updateOne(
                { _id: data._id },
                {
                  $set: {
                    emailStatus: ScrapInviteEmailStatus.FAILED,
                    updatedAt: new Date(),
                  },
                  $inc: { emailAttemptCount: 1 },
                },
                { upsert: false },
              );
            }
          }
        } catch (err) {
          return null;
        }
      },
    );
  }

  // async getOutscrapperCategories() {
  //   return this.categoriesCollection
  //     .find({}, { projection: { type: 1 } })
  //     .toArray();
  // }

  // Function to apply filters dynamically
  applyFilters(data: any, filters: any) {
    return data.filter((item: any) => {
      return filters.every((filter) => {
        const { field, operator, value } = filter;

        // Handle "business status" filter
        if (field === 'business status' && operator === 'equals') {
          return item.business_status === value.toUpperCase();
        }

        // Handle "verified" filter
        if (field === 'verified' && operator === 'equals') {
          return item.verified === value;
        }

        // Handle "phone" filter (checking for blank)
        if (
          field === 'phone' &&
          operator === 'equals' &&
          value === 'is_blank'
        ) {
          return !item.phone || item.phone === '';
        }

        if (
          field === 'phone' &&
          operator === 'equals' &&
          value === 'is_not_blank'
        ) {
          // `item.phone || item.phone !== ''` was the previous form here -
          // for a missing phone (undefined, the common shape for a listing
          // Outscraper found no number for) that evaluates to
          // `undefined || true` = true, so it was letting blank-phone
          // listings through exactly the filter meant to exclude. This is
          // just the logical negation of the is_blank branch above.
          return Boolean(item.phone) && item.phone !== '';
        }

        // Handle "rating" filter (starts with)
        // if (field === 'rating' && operator === 'starts with') {
        //   const valuesArray = value.split(',').map((val) => val.trim()); // Split the string into an array and trim whitespace
        //   return valuesArray.some((val) => String(item.rating) === val); // Check if any value matches the rating
        // }

        if (field === 'rating') {
          // `value` is normally a comma-separated string from the frontend,
          // but tolerate a plain number or an actual array too - either one
          // would otherwise throw (no `.split` on a number) and fail the
          // entire request instead of just this filter.
          const valuesArray = (
            Array.isArray(value) ? value : String(value).split(',')
          ).map((val) => String(val).trim());
          let result;
          switch (operator) {
            case 'contains_one_of':
              result = valuesArray.some((val) =>
                String(item.rating).includes(val),
              );
              break;

            case 'contains_none_of':
              result = valuesArray.every(
                (val) => !String(item.rating).includes(val),
              );
              break;

            case 'starts_with':
              result = valuesArray.some((val) =>
                String(item.rating).startsWith(val),
              );
              break;

            case 'equals':
              result = valuesArray.some((val) => String(item.rating) === val);
              break;

            default:
              result = false; // Handle unknown operator
          }
          return result;
        }

        // Return true for unknown filters (ignore them)
        return true;
      });
    });
  }

  async getInviteUsersDetails(
    user: UserSparse,
    page: number,
    pageSize: number,
    searchQuery?: string,
  ) {
    const adminStatus = isAdmin(user);
    const itemsPerPage = Math.max(pageSize, -1);
    let filter: any;
    if (searchQuery) {
      filter = {
        // processStatus: 1,
        $or: [
          // { name: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          // { activeSubscription: { $regex: searchQuery, $options: 'i' } },
        ],
      };
    } else {
      filter = {
        // processStatus: 1,
      };
    }

    if (adminStatus) {
      const [getAllScrapedData, count] = await Promise.all([
        this.scrapeCollection
          .find(filter, {
            projection: {
              websiteUrl: 1,
              email: 1,
              chatbotUrl: 1,
              emailStatus: 1,
              createdAt: 1,
              updatedAt: 1,
              signUpStatus: 1,
              source: 1,
            },
            limit: itemsPerPage,
            skip: (page - 1) * pageSize,
          })
          .sort({ createdAt: -1 })
          .toArray(),
        this.scrapeCollection.countDocuments(filter),
      ]);
      return {
        getAllScrapedData,
        pages: Math.ceil(count / pageSize),
        totalCount: count,
      };
    } else {
      throw new HttpException('Unauthorized User', HttpStatus.UNAUTHORIZED);
    }
  }

  //function to send  renvite Scrap Leads Mail
  async reinviteScrappedUsers(id: string, user: UserSparse) {
    const adminStatus = isAdmin(user);
    if (!adminStatus) {
      throw new HttpException('unauthorised User', HttpStatus.UNAUTHORIZED);
    }
    const scrapLeadsData = await this.scrapeCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!scrapLeadsData) {
      throw new HttpException('No Such Lead Exists', HttpStatus.NOT_FOUND);
    }

    if (scrapLeadsData.emailStatus !== ScrapInviteEmailStatus.RESEND) {
      let kbId = '';
      if (scrapLeadsData.chatbotUrl) {
        const urlParams = new URLSearchParams(
          scrapLeadsData.chatbotUrl.split('?')[1],
        );
        kbId = urlParams.get('kbId') || '';
        await this.kbdbService.setKnowledgebaseChatWidgetData(
          new ObjectId(kbId),
          defaultSetting,
        );
      }
      const emailResponse = await this.emailService.sendScrappingEmail(
        { ...scrapLeadsData, userId: user._id.toHexString() },
        'Free AI Chatbot for your website to streamline your website communication',
      );
      if (emailResponse.Message == 'OK') {
        await this.scrapeCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { emailStatus: ScrapInviteEmailStatus.RESEND } },
          { upsert: false },
        );
      } else {
        await this.scrapeCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { emailStatus: ScrapInviteEmailStatus.FAILED } },
          { upsert: false },
        );
        throw new HttpException(
          'Reinvite email failed to send',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } else {
      throw new HttpException(
        'Reinvite Mail Already send',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async scrappedUsersProfileData(id: string, user: UserSparse) {
    const adminStatus = isAdmin(user);
    if (!adminStatus) {
      throw new HttpException('unauthorised User', HttpStatus.UNAUTHORIZED);
    }
    const scrapLeadsData = await this.scrapeCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!scrapLeadsData) {
      throw new HttpException('No Such Lead Exists', HttpStatus.NOT_FOUND);
    }
    const scrapUserData = await this.userCollection.findOne({
      email: scrapLeadsData.email,
    });
    if (!scrapUserData) {
      throw new HttpException('User Does not Exists ', HttpStatus.NOT_FOUND);
    }
    return scrapUserData;
  }

  async createChatbotForVakmangids(websiteData: ProjectWebsiteDataDto) {
    try {
      let parentCategory: string | undefined = undefined;
      if (websiteData?.subcategory) {
        parentCategory = findParentCategory(websiteData?.subcategory);
      }

      const prompt = this.generateVakmangidsPromptV2(
        websiteData?.subcategory || undefined,
        parentCategory || undefined,
      );

      const data: any = {
        subcategory: websiteData?.subcategory,
        name: websiteData?.name || 'unknown',
        websiteUrl: websiteData.websiteUrl,
        urls: [],
        include: [],
        exclude: [],
        chatbotType: 'vakmangids',
        chatWidgetData: {
          heading: 'Vakmangids',
          description:
            'Hallo! Ik ben Vakmangids, jouw AI-assistent. Hoe kan ik je vandaag helpen?',
          chatInputPlaceholderText: 'Typ hier je bericht...',
          welcomeMessages: ['Hallo! Hoe kan ik u vandaag van dienst zijn? '],
          backgroundColor: '#1a4175',
          fontColor: '#FFF',
          placement: 'right',
          borderRadius: '12px',
          offlineMessage: true,
          showReadMore: true,
          showAsPopup: false,
          popupDelay: 3000,
          collectEmailText: 'What is your email address?',
          customCSS: '',
          contentEmail: '',
          contentPhone: '',
          contentWhatsapp: '',
          contentVideo: '',
          contentAppointment: '',
          avatarFieldValue: '',
          avatarFieldLabel: '',
          appointmentFieldLabel: '',
          videoFieldLabel: '',
          whatsappFieldLabel: '',
          phoneFieldLabel: '',
          emailLabel: '',
          questionExamples: [
            {
              heading: 'Welcome Video Link',
              question: 'https_vide0_welcome',
              label: 'Video',
            },
            {
              heading: 'Welcome Book Appointment Link',
              question: 'https_calendaly_welcome',
              label: 'Book an appointment',
            },
            {
              heading: "Call Link (if chatbot don't answer",
              question: 'https_Call_welcome',
              label: 'Call',
            },
            {
              heading: "WhatsApp Link (if chatbot don't answer",
              question: 'https_WhatsApp_welcome',
              label: 'WhatsApp',
            },
            {
              heading: "Email Link (if chatbot don't answer",
              question: 'https_Email_welcome',
              label: 'Email',
            },
          ],
          // welcomeMessages: [''],
          prompt: prompt,
          defaultAnswer: 'Ik weet niet hoe ik daarop moet antwoorden',
          launcherIcon: {
            id: 'icon1',
            svgElement:
              '<svg focusable="false" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style="width: 38px; height: 38px;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M5.821 4.91c3.898 -2.765 9.469 -2.539 13.073 .536c3.667 3.127 4.168 8.238 1.152 11.897c-2.842 3.447 -7.965 4.583 -12.231 2.805l-.232 -.101l-4.375 .931l-.075 .013l-.11 .009l-.113 -.004l-.044 -.005l-.11 -.02l-.105 -.034l-.1 -.044l-.076 -.042l-.108 -.077l-.081 -.074l-.073 -.083l-.053 -.075l-.065 -.115l-.042 -.106l-.031 -.113l-.013 -.075l-.009 -.11l.004 -.113l.005 -.044l.02 -.11l.022 -.072l1.15 -3.451l-.022 -.036c-2.21 -3.747 -1.209 -8.392 2.411 -11.118l.23 -.168z" stroke-width="0" fill="currentColor"></path></svg>',
          },
          assistantTabHeader: 'AI-assistent',
          offlineMsgTabHeader: 'Offline bericht',
          readMoreText: 'Read more:',
          offlineMsgHeading: 'Offline bericht',
          offlineMsgDescription:
            'Vul het onderstaande formulier in en wij nemen zo spoedig mogelijk contact met u op.',
          nameFieldLabel: 'Naam',
          nameFieldPlaceholder: 'Voer uw naam in',
          emailFieldLabel: 'E-mail',
          emailFieldPlaceholder: 'Voer uw e-mail in',
          privacyPolicyLabel: 'Ik ga akkoord met het Privacybeleid',
          privacyPolicyLink:
            'https://vakmangids.ultimawriter.ai/privacy-policy/',
          termsAndConditionsLabel: 'Ik ga akkoord met de Algemene Voorwaarden',
          termsAndConditionsLink:
            'https://vakmangids.ultimawriter.ai/algemene-voorwaarden/',
          msgFieldLabel: 'Bericht',
          msgFieldPlaceholder: 'Voer uw bericht in',
          requiredFieldMsg: 'Dit veld is verplicht',
          invalidEmailMsg: 'Voer een geldig e-mailadres in',
          formSubmitBtnLabel: 'Verzenden',
          formSubmitBtnSubmittingText: 'Verzenden...',
          formSubmitSuccessMsg: 'Uw bericht is succesvol verzonden!',
          formSubmitErrorMsg: 'Oeps! Er is iets misgegaan',
          formSendAgainBtnLabel: 'Opnieuw verzenden',
          formTryAgainBtnLabel: 'Opnieuw proberen',
          model: GPTModels.GPT_4O_MINI,
          thankYouMailTemplate: thankYouMailTemplate,
          isThankYouEmailEnabled: true,
          leadCollectionData: [
            {
              phoneNumber: false,
              address: false,
              isThankYouEmailEnabled: false,
            },
          ],
          thankyouEmailText: '',
        },
      };
      data.websiteUrl = data.websiteUrl.replace(/\/+$/, '');
      data.owner =
        process.env.SUPER_ADMIN_USER_ID || '66d92ebb9944525e612535c4';

      const kbExists = await this.kbdbService.getKnowledgebaseByWebsiteName(
        data.websiteUrl,
      );

      if (kbExists) {
        return kbExists._id.toString();
      }

      if (
        data.websiteUrl == 'https://vakmangids.ultimawriter.ai/offerteservice'
      )
        return null;

      const kbData = await this.kbService.createKnowledgebaseForVisitors(data);

      await this.checkKnowledgeBaseStatus(kbData._id, 'CRAWLED');
      await this.kbService.generateEmbeddingsForKnowledgebaseVisitors(
        kbData._id.toString(),
      );
      await this.checkKnowledgeBaseStatus(kbData._id, 'READY', 25);

      // Update process status to 1 when done
      // apply check on the basis of status
      const checkCrawledStatus =
        await this.kbdbService.getKnowledgebaseSparseById(kbData._id);

      if (checkCrawledStatus.status == 'READY') {
        return kbData._id;
      } else if (
        checkCrawledStatus.status === 'CRAWL_ERROR' ||
        checkCrawledStatus.status === 'EMBEDDING_ERROR'
      ) {
        throw new HttpException(
          'Error Occured while creating chatbot',
          HttpStatus.EXPECTATION_FAILED,
        );
      } else {
        throw new HttpException(
          'Something Went Wrong',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
    } catch (err) {
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getVakmangidsUrlKbId(data: any) {
    data.websiteUrl = data.websiteUrl.replace(/\/+$/, '');

    const kbExists = await this.kbdbService.getKnowledgebaseByWebsiteName(
      data.websiteUrl,
    );

    if (kbExists) {
      return kbExists._id.toString();
    } else {
      throw new HttpException(
        'Website URL Does Not Exists, Please save knowledgebase first',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getCategoriesForVakmangids() {
    const path = 'src/common/config/data/categories.json';
    return await readFileAsync(path);
  }

  async getPostalCodeFromCity(
    countryName: string,
    cityName: string,
  ): Promise<any> {
    try {
      const response = await getPostalCodes(countryName, cityName);
      return response;
    } catch (error) {
      this.logger.error('Error fetching postal code:', error);
      throw new Error('Failed to fetch postal code');
    }
  }

  async getAllCitiesOnCountryCode(countryName: string) {
    try {
      if (!countryName) {
        throw new HttpException(
          'Country name is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const response = (await getAllCities(countryName)) as any;
      return response as any;
    } catch (error) {
      this.logger.error('Error fetching cities:', error);
      throw new HttpException(
        error.message || 'Failed to fetch cities',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateVakmangidsPromptV2(
    subcategory?: string,
    category?: string,
  ): string {
    // const CONTEXT_TAIL = `\n\nContext Sections:\n---\n{{ctx}}`;

    let systemContent: string;

    if (subcategory && category) {
      systemContent = `You are {{chatbotName}}, an experienced sales assistant designed to help visitors understand the benefits of the services offered on the website and guide them towards taking the next steps. Your responses should be SHORT, PRECISE, AND ACCURATE based on the given context. You should remember the visitor details they provide in the entire conversation by taking reference from the pastMessages, and avoid asking for these details again and again in the entire conversation. Guide visitors towards the goal, which you can analyze from the website. Do not ask for these details in the very first response. Instead, start with a friendly introduction and gather necessary information naturally as the conversation progresses. ### Key Instructions: **Visitor Details Collection:** Collect the following details: 1. FirstName 2. LastName 3. Email 4. Phone 5. City 6. Service Type 7. Location 8. jobDescription **Important:** The category is already known as "${category}" and subcategory is already known as "${subcategory}" - DO NOT ask for category or subcategory as they are already provided. Ask these details one at a time in a conversational manner, ensuring the visitor comfort. Confirm collected details before moving to the next. **Sequential Flow for Details Collection:** - Ask for **firstName** first, then **lastName** **email** and **phone**. - Once firstName,lastName, email, and phone are collected, ask for **city**. - After collecting city, ask for **postalCode**. - After collecting postal code ask for **serviceType**. - Once serviceType is collected, ask for **location**. - After collecting location, Finally Ask for **jobDescription** (Skip category and subcategory as they are already known: Category: ${category}, Subcategory: ${subcategory}). Always check if the visitor has already provided the details before asking again. Ask a relevant question at the end every time by analyzing the whole conversation from the pastMessages. You also provide these services as they are not included in the content Transport companiesCoach,rental,Rent a bus,bus trips,Airport transportation,Taxi. Remember type of service should be the query visitor is asking about.`;
    } else if (subcategory) {
      systemContent = `You are {{chatbotName}}, an experienced sales assistant designed to help visitors understand the benefits of the services offered on the website and guide them towards taking the next steps. Your responses should be SHORT, PRECISE, AND ACCURATE based on the given context. You should remember the visitor details they provide in the entire conversation by taking reference from the pastMessages, and avoid asking for these details again and again in the entire conversation. Guide visitors towards the goal, which you can analyze from the website. Do not ask for these details in the very first response. Instead, start with a friendly introduction and gather necessary information naturally as the conversation progresses. ### Key Instructions: **Visitor Details Collection:** Collect the following details: 1. FirstName 2. LastName 3. Email 4. Phone 5. City 6. Service Type 7. Location 8. category 9. jobDescription **Important:** The subcategory is already known as "${subcategory}" - DO NOT ask for subcategory as it's already provided. Ask these details one at a time in a conversational manner, ensuring the visitor comfort. Confirm collected details before moving to the next. **Sequential Flow for Details Collection:** - Ask for **firstName** first, then **lastName** **email** and **phone**. - Once firstName,lastName, email, and phone are collected, ask for **city**. - After collecting city, ask for **postalCode**. - After collecting postal code ask for **serviceType**. - Once serviceType is collected, ask for **location**. - Once location is collected ask for **category**. - After collecting category, Finally Ask for **jobDescription** (Skip subcategory as it's already known: ${subcategory}). Always check if the visitor has already provided the details before asking again. Ask a relevant question at the end every time by analyzing the whole conversation from the pastMessages. You also provide these services as they are not included in the content Transport companiesCoach,rental,Rent a bus,bus trips,Airport transportation,Taxi. Remember type of service should be the query visitor is asking about.`;
    } else {
      systemContent = `You are {{chatbotName}}, an experienced sales assistant designed to help visitors understand the benefits of the services offered on the website and guide them towards taking the next steps. Your responses should be SHORT, PRECISE, AND ACCURATE based on the given context. You should remember the visitor details they provide in the entire conversation by taking reference from the pastMessages, and avoid asking for these details again and again in the entire conversation. Guide visitors towards the goal, which you can analyze from the website. Do not ask for these details in the very first response. Instead, start with a friendly introduction and gather necessary information naturally as the conversation progresses.### Key Instructions:**Visitor Details Collection:** Collect the following details:1. FirstName 2.LastName3. Email4.Phone5. City6.Service Type 7.Location 8. category9. subCategory10. jobDescription.Ask these details one at a time in a conversational manner, ensuring the visitor comfort. Confirm collected details before moving to the next.**Sequential Flow for Details Collection:** - Ask for **firstName** first, then **lastName** **email** and **phone**.- Once firstName,lastName, email, and phone are collected, ask for **city**.- After collecting city,, ask for **postalCode**.- After collecting postal code ask for **serviceType**.- Once serviceType is collected, ask for **location**.-Once location is collected ask for **category**.- Once category is collected,ask for the **subCategory**-After collecting subCategory Finally,Ask for **jobDescription**.Always check if the visitor has already provided the details before asking again.Ask a relevant question at the end every time by analyzing the whole conversation from the pastMessages.You also provide these services as they are not included in the content Transport companiesCoach,rental,Rent a bus,bus trips,Airport transportation,Taxi.Remember type of service should be the query visitor is asking about.`;
    }

    return JSON.stringify(systemContent);
  }
}
