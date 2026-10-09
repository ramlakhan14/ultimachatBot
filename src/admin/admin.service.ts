import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { AppConfigService } from '../common/config/appConfig.service';
import { MONGODB } from '../common/mongo/mongo.module';
import { SubscriptionPlanInfoService } from '../subscription/subscription-plan.service';
import {
  User,
  UserSparse,
  USER_COLLECTION,
  Subscription,
} from '../user/user.schema';
import {
  Knowledgebase,
  KNOWLEDGEBASE_COLLECTION,
} from '../knowledgebase/knowledgebase.schema';
import { isAdmin } from '../auth/guards/role.enum';
import { Role, UserState } from '../auth/types/role.enum';
import {
  THRESHOLD_EMAIL_SCHEMA,
  ThresholdEmailSetting,
} from './schema/threshold.email.schema';
import { EditThresholdEmailDto } from './dto/threshold.email';
import { subscriptionPlanData } from '../subscription/subscription.const';
import { GMB_COLLECTION, GMBData } from '../campaign/schema/campaign.schema';
import { FacebookScrapperService } from '../facebook-scrapper/facebook-scrapper.service';
import { FacebookScrapeRequestDto } from '../facebook-scrapper/dto/scrape-request.dto';

@Injectable()
export class AdminService {
  private readonly userCollection: Collection<User>;
  private readonly knowledgebaseCollection: Collection<Knowledgebase>;
  private readonly thresholdEmailSetting: Collection<ThresholdEmailSetting>;
  private readonly gmbCollection: Collection<GMBData>;

  constructor(
    private appConfig: AppConfigService,
    @Inject(MONGODB) private db: Db,
    private subsPlanService: SubscriptionPlanInfoService,
    private readonly facebookScrapperService: FacebookScrapperService,
  ) {
    this.userCollection = this.db.collection<User>(USER_COLLECTION);
    this.knowledgebaseCollection = this.db.collection<Knowledgebase>(
      KNOWLEDGEBASE_COLLECTION,
    );
    this.thresholdEmailSetting = this.db.collection<ThresholdEmailSetting>(
      THRESHOLD_EMAIL_SCHEMA,
    );
    this.gmbCollection = this.db.collection<GMBData>(GMB_COLLECTION);
  }

  /** Get All Users Profile for Admin */
  async getAllUserProfiles(
    user: UserSparse,
    page: number,
    pageSize: number,
    searchQuery?: string,
  ) {
    const adminStatus = isAdmin(user);
    const itemsPerPage = Math.max(pageSize, -1);
    const filter: any = {};
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        {
          activeSubscription: { $regex: searchQuery, $options: 'i' },
        },
      ];
      filter.role = Role.User;
    } else {
      filter.role = Role.User;
    }
    if (adminStatus) {
      const [getAllUsers, count] = await Promise.all([
        this.userCollection
          .find(filter, {
            projection: {
              password: 0,
              currentSessionVersion: 0,
            },
            limit: itemsPerPage,
            skip: (page - 1) * pageSize,
          })
          .sort({ createdAt: -1 })
          .toArray(),
        this.userCollection.countDocuments(filter),
      ]);
      const allUsersProfileData = await Promise.all(
        getAllUsers.map(async (userData) => {
          // for getting the monthusage of the current month only
          const currentMonth = `${
            new Date().getMonth() + 1
          }/${new Date().getFullYear()}`;
          if (
            userData?.monthUsage?.month === undefined ||
            userData?.monthUsage?.month !== currentMonth
          ) {
            if (userData.monthUsage === undefined) {
              userData.monthUsage = { month: '', count: 0 };
            }
            userData.monthUsage.month = currentMonth;
            userData.monthUsage.count = 0;
          }
          const userProjectsCount =
            await this.knowledgebaseCollection.countDocuments({
              owner: userData._id,
            });
          const subscriptionData = {
            totalCredits: userData?.tokenCredits,
            activeSubscription: userData?.activeSubscription,
            balanceAfterUsage: userData?.balanceAfterUsage,
            BillingCycle: userData?.billingCycle,
            status: userData?.subscriptionData?.data?.status,
            endsAt: userData?.subscriptionData?.data?.endsAt,
          };
          return {
            ...userData,
            subscriptionData: subscriptionData ?? null,
            project: userProjectsCount ?? 0,
            balanceAfterUsage: userData?.balanceAfterUsage ?? 0,
            tokenCredits: userData?.tokenCredits ?? 0,
            activeSubscription: userData?.activeSubscription
              ? `${userData?.activeSubscription ?? ''} ${
                  subscriptionData?.BillingCycle ?? ''
                }`
              : 'N/A',
          };
        }),
      );
      return {
        allUsersProfileData,
        pages: Math.ceil(count / pageSize),
        totalCount: count,
      };
    } else {
      throw new HttpException('Admin Not Found', HttpStatus.NOT_FOUND);
    }
  }

  /** getting particular userDetails for Admin  */
  async getUserDetails(id: string) {
    const userId = new ObjectId(id);
    const userData: any = await this.userCollection.findOne(
      { _id: userId },
      {
        projection: {
          password: 0,
          currentSessionVersion: 0,
        },
      },
    );

    const subscriptionData = {
      totalCredits: userData?.tokenCredits,
      activeSubscription: userData?.activeSubscription,
      balanceAfterUsage: userData?.balanceAfterUsage,
      BillingCycle: userData?.billingCycle,
      status: userData?.subscriptionData?.data?.status,
      endsAt: userData?.subscriptionData?.data?.endsAt,
    };
    const userProjects = await this.knowledgebaseCollection
      .find({ owner: userId })
      .toArray();
    return {
      ...userData,
      subscriptionData: subscriptionData ?? null,
      project: userProjects?.length ?? 0,
      balanceAfterUsage: userData?.balanceAfterUsage ?? 0,
      tokenCredits: userData?.tokenCredits ?? 0,
      activeSubscription: userData?.activeSubscription,
      userProjects,
    };
  }

  async deleteUserByAdmin(id: string) {
    const userId = new ObjectId(id);
    const userData: any = await this.userCollection.findOneAndUpdate(
      { _id: userId },
      { $set: { isActive: UserState.Deleted } },
      { returnDocument: 'after' },
    );
    if (!userData) {
      throw new HttpException(
        'Unable to deactivate User',
        HttpStatus.NOT_FOUND,
      );
    }

    return userData.value;
  }

  //kill switch
  async deleteAllCollections() {
    const logger = new Logger('MongoController');
    try {
      const collections = await this.db.listCollections().toArray();

      for (const collection of collections) {
        await this.db.collection(collection.name).drop();
        logger.log(`Dropped collection: ${collection.name}`);
      }

      return { message: 'Successfully deleted all collections and data' };
    } catch (error) {
      logger.error('Failed to delete collections', error.stack);
      throw error;
    }
  }

  // Threshold Email Settings
  async getAllThresholdEmailSettings() {
    try {
      const subType = Object.keys(Subscription);
      for (let index = 0; index < subType.length; index++) {
        const planName = Subscription[subType[index]];
        const subscriptionPlan = subscriptionPlanData[planName];
        const existingSetting = await this.thresholdEmailSetting.findOne({
          planName: planName,
        });
        if (!existingSetting) {
          const now = new Date();
          await this.thresholdEmailSetting.insertOne({
            planName: planName,
            limitType: 'Percentage',
            maxTokens: subscriptionPlan.freeCredits,
            limitValue: 90,
            createdAt: now,
            updatedAt: now,
          } as ThresholdEmailSetting);
        }
      }
      return await this.thresholdEmailSetting.find({}).toArray();
    } catch (error) {
      throw error;
    }
  }

  async updateThresholdEmailSettings(body: EditThresholdEmailDto) {
    try {
      const { _id, limitType, limitValue } = body;
      const settingId = new ObjectId(_id);
      const existingSetting = await this.thresholdEmailSetting.findOne({
        _id: settingId,
      });
      if (!existingSetting) {
        throw new HttpException(
          'Threshold setting not found',
          HttpStatus.NOT_FOUND,
        );
      }
      if (limitType === 'Percentage' && (limitValue < 1 || limitValue > 100)) {
        throw new HttpException(
          'For Percentage, limitValue must be between 1 and 100',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (limitType === 'Value' && limitValue < 1) {
        throw new HttpException(
          'For Value, limitValue must be a positive number',
          HttpStatus.BAD_REQUEST,
        );
      }
      const updatedSetting = await this.thresholdEmailSetting.findOneAndUpdate(
        { _id: settingId },
        { $set: { limitType, limitValue, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      return updatedSetting.value;
    } catch (error) {
      throw error;
    }
  }

  // ── Admin scraping (async job pattern) ─────────────────────────────────────

  async insertFacebookScrapJob(user: UserSparse, body: FacebookScrapeRequestDto) {
    const jobId = new ObjectId().toHexString();
    const userId = user._id.toHexString();
    await this.gmbCollection.insertOne({
      jobId,
      userId,
      campaignId: null,
      status: 'PROCESSING',
      createdAt: new Date(),
    });
    this.processFacebookScrapJob(jobId, userId, body);
    return { jobId };
  }

  private async processFacebookScrapJob(
    jobId: string,
    userId: string,
    body: FacebookScrapeRequestDto,
  ) {
    try {
      const result = await this.facebookScrapperService.facebookScrape(body, userId);
      this.tagScrapeSource(result, 'facebook');
      await this.gmbCollection.updateOne(
        { jobId },
        { $set: { status: 'COMPLETED', result, updatedAt: new Date() } },
      );
    } catch (error) {
      await this.gmbCollection.updateOne(
        { jobId },
        { $set: { status: 'FAILED', error: error.message } },
      );
    }
  }

  async insertLinkedinScrapJob(
    user: UserSparse,
    body: { query: string; resultsLimit?: number; country?: string },
  ) {
    const jobId = new ObjectId().toHexString();
    const userId = user._id.toHexString();
    await this.gmbCollection.insertOne({
      jobId,
      userId,
      campaignId: null,
      status: 'PROCESSING',
      createdAt: new Date(),
    });
    this.processLinkedinScrapJob(jobId, userId, body);
    return { jobId };
  }

  private async processLinkedinScrapJob(
    jobId: string,
    userId: string,
    body: { query: string; resultsLimit?: number; country?: string },
  ) {
    try {
      const effectiveQuery = body.country
        ? `${body.query} ${body.country}`
        : body.query;
      const result = await this.facebookScrapperService.linkedinScrape(
        { query: effectiveQuery, resultsLimit: body.resultsLimit },
        userId,
      );
      this.tagScrapeSource(result, 'linkedin');
      await this.gmbCollection.updateOne(
        { jobId },
        { $set: { status: 'COMPLETED', result, updatedAt: new Date() } },
      );
    } catch (error) {
      await this.gmbCollection.updateOne(
        { jobId },
        { $set: { status: 'FAILED', error: error.message } },
      );
    }
  }

  // facebookScrape()/linkedinScrape() return rows shaped for internal
  // validation ({validRows, allRows}, each row having businessName/
  // companyName but no source or websiteName) - the frontend concatenates
  // these straight into the save-scrapped-data payload with no changes, so
  // without this tagging every saved lead defaults to source:"gmb" (see
  // scrapCollectionDataEntry's fallback) regardless of where it actually
  // came from. Also fills in websiteName, which save-scrapped-data expects
  // but these rows never had.
  private tagScrapeSource(
    result: { validRows?: any[]; allRows?: any[] } | undefined,
    source: 'facebook' | 'linkedin',
  ) {
    for (const rows of [result?.validRows, result?.allRows]) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        row.source = source;
        if (!row.websiteName) {
          row.websiteName = row.businessName || row.companyName || 'unknown';
        }
      }
    }
  }

  async getScrapeResult(jobId: string, userId: string) {
    const job = await this.gmbCollection.findOne(
      { jobId, userId },
      { projection: { result: 1, _id: 0, status: 1, createdAt: 1, error: 1 } },
    );
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }
}
