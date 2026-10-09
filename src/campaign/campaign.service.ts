import {
  BadRequestException,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import { MONGODB } from '../common/mongo/mongo.module';
import { ImapIdleWatcherService } from './campaign-utils/imapIdleWatcher.service';
import { Collection, Db, ObjectId } from 'mongodb';
import {
  Campaign,
  CAMPAIGNDATA_COLLECTION,
  GMB_COLLECTION,
  GMBData,
} from './schema/campaign.schema';
import {
  CreateCampaignDto,
  TargetEmailLeadsDTO,
} from './dto/createCampaign.dto';
import {
  DATA_SOURCE,
  CAMPAIGN_STATUS,
  CAMPAIGN_SCHEDULER_STATUS,
  DUPLICATE_LEAD_STATUS,
  GPTModels,
  EMAIL_PROCESS_STATUS,
  EMAIL_STATUS,
  CAMPAIGN_TRIGGER_STATUS,
  EMAIL_SERVICE_PROVIDER_NAME,
  EMAIL_AND_PASSKEY_STATUS,
  EMAIL_SERVICE_PROVIDER_STATUS,
  EMAIL_SERVER_TYPE,
  NOTIFICATION_TYPE,
} from './enum/enum';
import { UpdateCampaignDto } from './dto/updateCampaign.dto';
import {
  CampaignScheduled,
  CAMPAIGNSCHEDULED_COLLECTION,
} from './schema/campaignScheduled.schema';
import * as papaparse from 'papaparse';
import {
  CampaignAudience,
  CAMPAIGNAUDIENCE_COLLECTION,
} from './schema/campaignAudience.schema';
import {
  CampaignDuplicateLead,
  CAMPAIGN_DUPLICATELEAD_COLLECTION,
} from './schema/campaignDuplicateLead.schema';
import { GetAllCampaignAudeinceDto } from './dto/getAllCampaignAudience.dto';
import { ProjectService } from '../project/project.service';
import {
  CREDIT_USAGE_COLLECTION,
  CreditUsage,
  User,
  USER_COLLECTION,
  UserSparse,
} from '../user/user.schema';
import { CampaignSchedulerDto } from './dto/campaignScheduler.dto';
import { DuplicateLeadDto } from './dto/duplicateLead.dto';
import {
  CAMPAIGN_PROMPT_AND_GENERATED_EMAIL_COLLECTION,
  CampaignPromptAndGeneratedEmail,
} from './schema/campaignPromptAndGeneratedEmailschema';
import { BullMqService } from './bull/bullMq.service';
import { OpenaiService } from '../openai/openai.service';
import { CampaignScrapeDTO, EditDraftEmailDto } from './dto/campaignScrapeDto';
import {
  CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
  CampaignEmailConversation,
} from './schema/campaignEmailConversation.schema';
import { ImapService } from './campaign-utils/nodeImap.service';
import { AdminPostmarkService } from './postmark/admin-postmark.service';
import {
  CAMPAIGN_EMAIL_SERVER_CONFIG_COLLECTION,
  CampaignEmailServerConfig,
} from './schema/campaignEmailServerConfig.schema';
import {
  CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
  CampaignEmailPasskey,
} from './schema/campaignEmailPasskey.schema';
import {
  CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
  CampaignUserEmailToken,
} from './schema/campaignUserEmailToken.schema';
import { GoogleAuthService } from './email-console/googleconsole.service';
import { CryptoService } from './campaign-utils/crypto.service';
import * as jwt from 'jsonwebtoken';
import { MicrosoftAuthService } from './email-console/microsoftconsole.service';
import { YahooAuthService } from './email-console/yahooconsole.service';
import axios from 'axios';
import {
  CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
  CampaignEmailWarmupCount,
} from './schema/campaignEmailWarmupCount.schema';
import {
  CAMPAIGN_DUPLICATEAUDIENCE_COLLECTION,
  CampaignDuplicateAudience,
} from './schema/campaignDuplicateAudience.schema';
import {
  CAMPAIGNFOLLOWUPS_COLLECTION,
  CampaignFollowUpsSchedule,
} from './schema/campaignFollowUpsSchedule.schema';
import {
  CampaignFollowUpEmailConversation,
  CAMPAIGNFOLLOWUPSEMAILS_COLLECTION,
} from './schema/campaignFollowUpEmails.schema';
import { EmailTemplateService } from '../emailTemplate/email.service';
import {
  COMMON_FOLDER_COLLECTION,
  CommonFolder,
} from '../email-assistance/schema/emailAssistanceCommonFolder.schema';
import {
  Folder,
  FOLDER_COLLECTION,
} from '../email-assistance/schema/emailAssistanceFolder.schema';
import {
  EMAIL_ASSISTANCE_SETTING_COLLECTION,
  EmailAssistanceSetting,
} from '../email-assistance/schema/emailAssitanceSetting.schema';
import {
  CAMPAIGN_DRAFT_COLLECTION,
  CampaignDraft,
} from './schema/campaignDraft.schema';
import { EmailAssistanceService } from '../email-assistance/email-assistance.service';
import {
  CAMPAIGN_UNRESOLVED_COLLECTION,
  CampaignUnresolved,
} from './schema/campaignUnresolved.schema';
import {
  CAMPAIGN_EMAIL_LEAD_COLLECTION,
  CampaignEmailLead,
} from './schema/campaignEmailLead.schema';
import { GmailService } from './email-console/googleGmailApiOperation.service';
import {
  CAMPAIGN_LEAD_GENERATION_COLLECTION,
  CampaignLeadGeneration,
} from './schema/campaignLeadGenerated.schema';
import {
  extractFirstQuotedPrintable,
  parseAndBeautifyEmail,
} from './campaign-utils/nodeImapEmailParser.service';
import { ZapierWebhookService } from '../zapier-webhook/zapier-webhook.service';
import {
  CHAT_SESSION_COLLECTION,
  IsLeadType,
  Knowledgebase,
  KNOWLEDGEBASE_COLLECTION,
  Lead,
  LEADS_COLLECTION,
} from '../knowledgebase/knowledgebase.schema';
import { SmtpService } from '../smtp/smtp.service';
import {
  SMTP_SETUP_COLLECTION,
  SmtpSetting,
} from '../smtp/entities/smtp.entity';
import { NodemailerService } from '../smtp/nodemailer/nodemailer.service';
import { CreateEmailSenderSignatureDto } from './dto/createemailsendersignature.sto';
import stringifyPrompt from './defaultPromptForAutoReply';
import { DATA_SOURCE_FOR_TARGET_AUDIENCE } from '../voicebot/schema/voicebot.campaign.schema';
import { REDIS } from '../common/redis/redis.module';
import Redis from 'ioredis';
import { GoogleCalenderService } from '../knowledgebase/googleCalender/googleCalender.service';
import { EmailService } from '../common/email/email.service';
import { EmailAssistanceController } from '../email-assistance/email-assistance.controller';
import { AssistantType } from '../knowledgebase/chatbot/openaiChatbot.constant';
import { OpenaiChatbotService } from '../knowledgebase/chatbot/openaiChatbotService';
import { UserService } from '../user/user.service';
import { RequestWithUser } from '../common/@types/nest.types';

const CHUNK_FILTER_THRESHOLD = 0.3;
export class CampaignService implements OnModuleInit {
  private readonly logger = new Logger('CampaignService');

  private readonly campaignCollection: Collection<Campaign>;
  private readonly campaignScheduledCollection: Collection<CampaignScheduled>;
  private readonly campaignAudienceCollection: Collection<CampaignAudience>;
  private readonly duplicateLeadCollection: Collection<CampaignDuplicateLead>;
  private readonly campaignPromptAndGenerateEmail: Collection<CampaignPromptAndGeneratedEmail>;
  private readonly userCollection: Collection<User>;
  private readonly campaignImapConversationCollection: Collection<CampaignEmailConversation>;
  private readonly campaignEmailServerConfigCollection: Collection<CampaignEmailServerConfig>;
  private readonly campaignEmailPasskeyCollection: Collection<CampaignEmailPasskey>;
  private readonly campaignUserEmailTokenCollection: Collection<CampaignUserEmailToken>;
  private readonly campaignWarmupCollection: Collection<CampaignEmailWarmupCount>;
  private readonly campaignDuplicateAudienceCollection: Collection<CampaignDuplicateAudience>;
  private readonly campaignFollowUpsScheduleCollection: Collection<CampaignFollowUpsSchedule>;
  private readonly campaignFollowUpEmailConversationCollection: Collection<CampaignFollowUpEmailConversation>;
  private readonly commonFolderCollection: Collection<CommonFolder>;
  private readonly folderCollection: Collection<Folder>;
  private readonly emailAssistanceSetting: Collection<EmailAssistanceSetting>;
  private readonly campaignDraftCollection: Collection<CampaignDraft>;
  private readonly campaignUnresolvedCollection: Collection<CampaignUnresolved>;
  private readonly campaignLeadGeneratedCollection: Collection<CampaignEmailLead>;
  private readonly campaignLeadGenerationCollection: Collection<CampaignLeadGeneration>;
  private readonly leadCollection: Collection<Lead>;
  private readonly knowledgebaseCollection: Collection<Knowledgebase>;
  private readonly smtpCollection: Collection<SmtpSetting>;
  private readonly creditUsageCollection: Collection<CreditUsage>;
  private readonly gmbCollection: Collection<GMBData>;
  constructor(
    @Inject(MONGODB) private db: Db,
    @Inject(REDIS) private redis: Redis,
    private readonly emailQueue: BullMqService,
    private readonly openaiService: OpenaiService,
    private readonly adminEmailService: AdminPostmarkService,
    private readonly dataScrapperService: ProjectService,
    private readonly imapService: ImapService,
    private readonly googleConsoleService: GoogleAuthService,
    private readonly microsoftConsoleService: MicrosoftAuthService,
    private readonly yahooConsoleService: YahooAuthService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailAssistanceService: EmailAssistanceService,
    private readonly gmailServiceApis: GmailService,
    private readonly zapierWebhookService: ZapierWebhookService,
    private readonly smtpService: SmtpService,
    private readonly nodeMailerService: NodemailerService,
    private readonly googleCalenderService: GoogleCalenderService,
    private readonly emailService: EmailService,
    private openaiChatbotService: OpenaiChatbotService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => ImapIdleWatcherService))
    private readonly imapIdleWatcherService: ImapIdleWatcherService,
  ) {
    this.creditUsageCollection = this.db.collection<CreditUsage>(
      CREDIT_USAGE_COLLECTION,
    );
    this.campaignCollection = this.db.collection<Campaign>(
      CAMPAIGNDATA_COLLECTION,
    );

    this.campaignScheduledCollection = this.db.collection<CampaignScheduled>(
      CAMPAIGNSCHEDULED_COLLECTION,
    );

    this.campaignAudienceCollection = this.db.collection<CampaignAudience>(
      CAMPAIGNAUDIENCE_COLLECTION,
    );

    this.duplicateLeadCollection = this.db.collection<CampaignDuplicateLead>(
      CAMPAIGN_DUPLICATELEAD_COLLECTION,
    );

    this.campaignPromptAndGenerateEmail =
      this.db.collection<CampaignPromptAndGeneratedEmail>(
        CAMPAIGN_PROMPT_AND_GENERATED_EMAIL_COLLECTION,
      );

    this.campaignImapConversationCollection =
      this.db.collection<CampaignEmailConversation>(
        CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
      );

    this.userCollection = this.db.collection<User>(USER_COLLECTION);

    this.campaignEmailServerConfigCollection =
      this.db.collection<CampaignEmailServerConfig>(
        CAMPAIGN_EMAIL_SERVER_CONFIG_COLLECTION,
      );

    this.campaignEmailPasskeyCollection =
      this.db.collection<CampaignEmailPasskey>(
        CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
      );

    this.campaignUserEmailTokenCollection =
      this.db.collection<CampaignUserEmailToken>(
        CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
      );

    this.campaignWarmupCollection =
      this.db.collection<CampaignEmailWarmupCount>(
        CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
      );

    this.campaignDuplicateAudienceCollection =
      this.db.collection<CampaignDuplicateAudience>(
        CAMPAIGN_DUPLICATEAUDIENCE_COLLECTION,
      );

    this.campaignFollowUpsScheduleCollection =
      this.db.collection<CampaignFollowUpsSchedule>(
        CAMPAIGNFOLLOWUPS_COLLECTION,
      );

    this.campaignFollowUpEmailConversationCollection =
      this.db.collection<CampaignFollowUpEmailConversation>(
        CAMPAIGNFOLLOWUPSEMAILS_COLLECTION,
      );
    this.commonFolderCollection = this.db.collection<CommonFolder>(
      COMMON_FOLDER_COLLECTION,
    );
    this.folderCollection = this.db.collection<Folder>(FOLDER_COLLECTION);

    this.campaignUnresolvedCollection = this.db.collection<CampaignUnresolved>(
      CAMPAIGN_UNRESOLVED_COLLECTION,
    );
    this.campaignLeadGeneratedCollection =
      this.db.collection<CampaignEmailLead>(CAMPAIGN_EMAIL_LEAD_COLLECTION);

    this.emailAssistanceSetting = this.db.collection<EmailAssistanceSetting>(
      EMAIL_ASSISTANCE_SETTING_COLLECTION,
    );
    this.campaignLeadGenerationCollection =
      this.db.collection<CampaignLeadGeneration>(
        CAMPAIGN_LEAD_GENERATION_COLLECTION,
      );

    this.campaignDraftCollection = this.db.collection<CampaignDraft>(
      CAMPAIGN_DRAFT_COLLECTION,
    );

    this.leadCollection = this.db.collection<Lead>(LEADS_COLLECTION);
    this.knowledgebaseCollection = this.db.collection<Knowledgebase>(
      KNOWLEDGEBASE_COLLECTION,
    );

    this.smtpCollection = this.db.collection<SmtpSetting>(
      SMTP_SETUP_COLLECTION,
    );
    this.gmbCollection = this.db.collection<GMBData>(GMB_COLLECTION);
  }

  // Watchers live only in memory, so every restart/deploy silently drops all of them; this resumes coverage on boot.
  async onModuleInit() {
    try {
      const activeCampaigns = await this.campaignCollection
        .find({
          status: { $nin: [CAMPAIGN_STATUS.PAUSED, CAMPAIGN_STATUS.FAILED] },
        })
        .project({ emailAndSenderLimit: 1 })
        .toArray();

      const senderEmails = Array.from(
        new Set(
          activeCampaigns.flatMap((campaign) =>
            (campaign.emailAndSenderLimit || []).map((sender) => sender.email),
          ),
        ),
      );

      if (senderEmails.length === 0) return;

      this.logger.log(
        `Resuming IMAP IDLE watchers for ${senderEmails.length} sender(s) from ${activeCampaigns.length} campaign(s) on boot`,
      );
      await this.imapIdleWatcherService.startWatchingForSenders(senderEmails);
    } catch (error) {
      this.logger.error(
        `Failed to resume IMAP IDLE watchers on boot: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * @developer : Ankur
   * @param payload : CreateCampaignDto
   * @returns : just inserted Id
   * @working : It is used to create UltimaEmail campaign
   *            which basicaly use mongoDb internal insertOne() method.
   */
  async createCampaign(req, payload: CreateCampaignDto) {
    try {
      // Check limits for all emails before proceeding
      for (const email of payload.emailAndSenderLimit) {
        const emailData = await this.getEmailAndWarmupCount(
          req.user._id.toHexString(),
          email['email'],
        );
        if (
          Number(email['maxLimit']) > Number(emailData.data.updatedMaxLimit)
        ) {
          throw new BadRequestException(
            `Maximum daily limit remaining for the email ${email['email']} is ${emailData.data.updatedMaxLimit}`,
          );
        }
      }

      const data = {
        campaignName: payload.campaignName,
        campaignProject: payload.campaignProject,
        targetAudience: payload.targetAudience,
        painPoints: payload.painPoints,
        solutionOffer: payload.solutionOffer,
        callOfAction: payload.callOfAction,
        campaignLanguage: payload.campaignLanguage,
        emailLength: payload.emailLength,
        maxEmailsPerDay: payload.maxEmailsPerDay, //emails per day for a campaign
        maxEmailsPerLead: payload.maxEmailsPerLead, // max follow up email limit aka max email per lead
        emailAndSenderLimit: payload.emailAndSenderLimit,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: CAMPAIGN_STATUS.INITIATED,
        addedBy: req.user._id.toHexString(),
        isAudienceDuplicated: false,
        followUpFrequency: payload.followUpFrequency,
        totalFollowUps: payload.totalFollowUps,
      };

      const isExistCampaign = await this.campaignCollection.findOne({
        addedBy: req.user._id.toHexString(),
        campaignName: { $regex: `^${payload.campaignName}$`, $options: 'i' },
      });

      if (isExistCampaign) {
        throw new HttpException(
          `Campaign ${payload.campaignName} is already exist`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const createCompaign = await this.campaignCollection.insertOne(data);
      if (!createCompaign) {
        throw new Error('Campaign Creation Failed');
      }

      await this.followUpScheduleCreater(
        req,
        createCompaign.insertedId.toHexString(),
        payload.followUpFrequency,
        payload.totalFollowUps,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign Created Successfully',
        data: {
          campaignId: createCompaign.insertedId.toHexString(),
          campaignName: payload.campaignName,
        },
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param payload : upadateCampaignDto
   * @returns : update Doc as a results
   * @working : It is used to Update or modify UltimaEmail campaign
   *            which basicaly use mongoDb internal updateOne() method.
   */
  async updateCampaign(req, payload: UpdateCampaignDto) {
    try {
      const { campaignId, ...fieldsToUpdate } = payload;
      const campaignID = new ObjectId(campaignId);
      const campaign = await this.campaignCollection.findOne({
        _id: campaignID,
      });
      if (!campaign) {
        throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
      }

      // Filter out undefined fields in `fieldsToUpdate` to update only existing data
      const updateData = Object.entries(fieldsToUpdate).reduce(
        (acc, [key, value]) => {
          if (value !== undefined) acc[key] = value;
          return acc;
        },
        {} as Partial<UpdateCampaignDto>,
      );

      // Set the updatedAt timestamp
      updateData.updatedAt = new Date();
      updateData.status = CAMPAIGN_STATUS.RUNNING;

      const updateResult = await this.campaignCollection.updateOne(
        { _id: campaignID },
        { $set: updateData },
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error('Campaign update failed');
      }

      await this.updateFollowUpSchedule(
        req,
        campaignId,
        payload.followUpFrequency,
        payload.totalFollowUps,
      );

      await this.updateCampaignStatusByAudience(
        req.user._id.toHexString(),
        campaignId,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign updated successfully',
        data: updateResult,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param payload : limit, offset, serchingString if any.
   * @returns : all campaign data in an array.
   * @working : It is used to fetch UltimaEmail all campaign
   *            which basicaly use mongoDb internal find() method.
   */
  async checkCampaignName(userId: string, campaignName: string) {
    try {
      const trimmedName = campaignName.trim();
      if (!trimmedName) {
        throw new HttpException(
          'Campaign name is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const existingCampaign = await this.campaignCollection.findOne({
        addedBy: userId,
        campaignName: { $regex: `^${trimmedName}$`, $options: 'i' },
      });
      if (existingCampaign) {
        throw new HttpException(
          `Campaign "${trimmedName}" already exists`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async getAllCampaign(req, payload: any) {
    try {
      const { limit, searchStr = '' } = payload;
      if (payload.offset < 1)
        throw new BadRequestException('Offset can not be less than 1');
      const page_number = payload?.offset - 1;
      const searchFilter = {
        addedBy: req.user._id.toHexString(),
        ...(searchStr
          ? {
              $or: [
                { campaignName: { $regex: searchStr, $options: 'i' } },
                { status: { $regex: searchStr, $options: 'i' } },
              ],
            }
          : {}),
      };

      const campaignList = await this.campaignCollection
        .find(searchFilter)
        .skip(Number(page_number * limit))
        .limit(Number(limit))
        .sort({ createdAt: -1, id: 1 }) // sorted by recent first
        .toArray(); // Convert cursor to an array for response

      const totalCount = await this.campaignCollection.countDocuments(
        searchFilter,
      );

      if (!campaignList || campaignList.length === 0) {
        return {
          statusCode: HttpStatus.NO_CONTENT,
          message: 'No Campaign Found',
          data: [],
          pagination: {
            totalCount,
            limit,
            offset: payload.offset,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: Math.floor(payload.offset / limit),
          },
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaigns retrieved successfully',
        data: campaignList,
        pagination: {
          totalCount,
          limit,
          offset: payload.offset,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: Math.floor(payload.offset / limit),
        },
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param campaignId : campaignId
   * @returns : particular campaign details with campaignId
   * @working : It is used to fetch UltimaEmail campaign details with campaignId
   *            which basicaly use mongoDb internal findOne() method.
   */
  async getCampaignDetails(req, campaignId: string) {
    try {
      let finalResult: any = {};
      if (!ObjectId.isValid(campaignId)) {
        throw new BadRequestException(
          `Invalid Campaign ID format: ${campaignId}`,
        );
      }

      if (typeof req.user._id === 'string') {
        req.user._id = new ObjectId(req.user._id);
      }

      const campaignID = new ObjectId(campaignId);
      finalResult = await this.campaignCollection.findOne({
        _id: campaignID,
      });
      if (!finalResult) {
        throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
      }
      const settingData = await this.db.collection('calenderSettings').findOne(
        {
          knowledgebaseId: new ObjectId(finalResult.campaignProject.projectId),
        },
        { projection: { timezone: 1 } },
      );
      const timeZone = settingData?.timezone || 'UTC';
      finalResult = { ...finalResult, timeZone };
      const scheduleDateAndTime =
        await this.campaignScheduledCollection.findOne({
          campaignId: campaignId,
          status: CAMPAIGN_SCHEDULER_STATUS.SCHEDULED,
        });

      if (scheduleDateAndTime) {
        finalResult = { ...finalResult, scheduleDateAndTime };
      }

      const campaignIdStr = campaignId.toString();

      // Get all audiences from both collections
      const [regularAudiences, duplicateAudiences] = await Promise.all([
        this.campaignAudienceCollection
          .find({
            campaignId: campaignIdStr,
          })
          .toArray(),
        this.campaignDuplicateAudienceCollection
          .find({
            campaignId: campaignIdStr,
          })
          .toArray(),
      ]);

      // Count total audiences from both collections
      const totalAudience = regularAudiences.length + duplicateAudiences.length;

      // Count failed and successful emails from both collections
      const failedEmails =
        regularAudiences.filter(
          (audience) => audience.emailStatus === EMAIL_STATUS.FAILED,
        ).length +
        duplicateAudiences.filter(
          (audience) => audience.emailStatus === EMAIL_STATUS.FAILED,
        ).length;

      const successEmails =
        regularAudiences.filter(
          (audience) => audience.emailStatus === EMAIL_STATUS.SENT,
        ).length +
        duplicateAudiences.filter(
          (audience) => audience.emailStatus === EMAIL_STATUS.SENT,
        ).length;

      let repliedCount = 0;
      try {
        repliedCount =
          await this.campaignImapConversationCollection.countDocuments({
            campaignId: campaignIdStr,
            emailConversation: {
              $elemMatch: { isAutoReply: true },
            },
          });
      } catch (err) {
        repliedCount = 0;
      }

      finalResult = {
        ...finalResult,
        campaignId: campaignIdStr,
        totalAudience,
        failedEmails,
        successEmails,
        repliedEmails: repliedCount,
      };

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign details retrieved successfully',
        data: finalResult,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur.
   * @param req : for fetching user_id from req.
   * @param payload : campaignId, schedule date and time is required.
   * @returns : success response on successfull schedule creation.
   * @working : It is used to schedule UltimaEmail campaign which basicaly use mongoDb internal insertOne method
   *            which later on we utilise to run scheduledJobs.
   */
  async campaignScheduler(req, payload: CampaignSchedulerDto) {
    try {
      const isAlreadySchedule = await this.campaignScheduledCollection.findOne({
        campaignId: payload.campaignId,
        addedBy: req.user._id.toHexString(),
      });
      if (isAlreadySchedule) {
        throw new BadRequestException('Campaign already scheduled');
      }

      const scheduledDateTime = new Date(
        `${payload.scheduleDate}T${payload.scheduleTime}`,
      );
      const currentDateTime = new Date();

      if (scheduledDateTime <= currentDateTime) {
        throw new BadRequestException(
          'Schedule date and time must be greater than current time',
        );
      }

      const data = {
        campaignId: payload.campaignId,
        campaignName: payload.campaignName,
        scheduleDate: payload.scheduleDate,
        scheduleTime: payload.scheduleTime,
        scheduledDateAndTime: scheduledDateTime,
        createdAt: new Date(),
        updatedAt: new Date(),
        addedBy: req.user._id.toHexString(),
        status: CAMPAIGN_SCHEDULER_STATUS.SCHEDULED,
        user: {
          _id: req.user._id,
          email: req.user.email,
        },
      };
      // Only send necessary user data to avoid circular references
      const queueData = {
        ...data,
        user: {
          _id: req.user._id,
          email: req.user.email,
        },
      };

      await this.emailQueue.scheduleJob(queueData);

      //this schedule campaign get trigger when user schedule with date and time.
      await this.campaignScheduledCollection.insertOne(data);
      await this.campaignCollection.findOneAndUpdate(
        {
          _id: new ObjectId(payload.campaignId),
        },
        {
          $set: {
            status: CAMPAIGN_STATUS.SCHEDULED,
            campaignTrigger: CAMPAIGN_TRIGGER_STATUS.SCHEDULED,
          },
        },
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign Scheduled Successfully',
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur.
   * @param req : for fetching user_id from req.
   * @param payload : file is original csv file uploaded by user.
   * @returns :  return the all csv data uploaded uploaded by user in an array.
   * @working : It is used to parse the csv file for UltimaEmail campaign
   *            which basicaly use npm PAPAPARSE library methods to parse the csv.
   *            and also saving the parse data to a certain format in to CampaignAudience schema
   */

  async csvParser(req, payload: any, file: Express.Multer.File) {
    try {
      const currentUser = req.user._id.toHexString();
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
      const MAX_EMAIL_COUNT = 500;

      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File size exceeds the 10 MB limit');
      }

      const fileContent = file.buffer.toString('utf-8');
      const parsedData: any[] = [];
      const duplicateData: any[] = [];
      let emailCount = 0;

      // Parse the CSV file
      papaparse.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        trimHeaders: true,
        complete: (results) => {
          if (results.data.length < 1) {
            throw new BadRequestException(
              `No data found in the CSV file. Please make sure the file has a header row`,
            );
          }
          results.data.forEach((row) => {
            if (!('Email' in row) || !('WebsiteUrl' in row)) {
              throw new BadRequestException(
                `Invalid CSV format. Please ensure the CSV file has 'Email' and 'WebsiteUrl' columns`,
              );
            }
            if (emailCount >= MAX_EMAIL_COUNT) {
              throw new BadRequestException(
                `Email count exceeds the limit of ${MAX_EMAIL_COUNT}`,
              );
            }
            parsedData.push(row);
            emailCount++;
          });
        },
        error: (error) => {
          throw new BadRequestException(`Parsing error: ${error.message}`);
        },
      });

      // Use for...of to handle async operations in sequence
      for (const pd of parsedData) {
        const checkDuplicate = await this.campaignAudienceCollection.findOne({
          email: pd.Email,
          addedBy: currentUser,
        });

        if (!checkDuplicate) {
          const data = {
            email: pd.Email,
            createdAt: new Date(),
            updatedAt: new Date(),
            websiteName: pd.WebsiteName,
            websiteUrl: pd.WebsiteUrl,
            emailStatus: EMAIL_STATUS.INITIATED,
            processStatus: EMAIL_PROCESS_STATUS.PENDING,
            campaignId: payload.campaignId,
            campaignName: payload.campaignName,
            dataSource: DATA_SOURCE.CSV,
            addedBy: currentUser,
            senderEmailId: payload?.senderEmailId || null, //TODO: provive sender email with max limit
            subscribeStatus: true,
          };
          await this.campaignAudienceCollection.insertOne(data); // await insertion
        } else {
          duplicateData.push(checkDuplicate.email);
          Logger.log('duplicate email found');
        }
      }

      if (parsedData.length === duplicateData.length) {
        throw new BadRequestException(
          'Data not parsed because duplicate emails found in the CSV file',
        );
      }

      // Respond with duplicate data if any were found
      if (duplicateData.length > 0) {
        return {
          statusCode: HttpStatus.EXPECTATION_FAILED,
          message:
            'File parsed and some unique data saved successfully but duplicate emails found',
          data: duplicateData,
        };
      }

      // Respond with parsed data if there were no duplicates
      return {
        statusCode: HttpStatus.OK,
        message: 'File parsed successfully',
        data: parsedData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('An error occurred while parsing the file');
    }
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param payload : currentCampaignId and PreviousCampaignId
   *                  which help us to find older data related to thta campaign.
   * @returns :  return a addition success msg or error.
   * @working : It is used to create duplicateLead which helps to find older campaign and its emails,
   *            which basicaly use mongoDb internal insertOne method.
   */
  async duplicateLeadEntry(req, payload: DuplicateLeadDto) {
    try {
      const userId = req.user._id.toHexString();
      const {
        currentCampaignId,
        previousCampaign,
        newCampaignAudiences,
        oldCampaignAudiences,
      } = payload;

      // Update existing entry if found
      const result = await this.duplicateLeadCollection.updateOne(
        {
          currentCampaignId,
          addedBy: userId,
        },
        {
          $set: {
            previousCampaign,
            updatedAt: new Date(),
          },
        },
      );

      if (result.modifiedCount > 0) {
        const duplicateLeadData = await this.addDuplicateCampaignAudience(
          currentCampaignId,
          oldCampaignAudiences,
          newCampaignAudiences,
          req,
        );
        return {
          statusCode: duplicateLeadData.statusCode,
          message: duplicateLeadData.message,
          data: duplicateLeadData.data,
        };
      }

      // Insert new entry if no existing one found
      const duplicateLeadResult = await this.duplicateLeadCollection.insertOne({
        currentCampaignId,
        previousCampaign,
        createdAt: new Date(),
        updatedAt: new Date(),
        addedBy: userId,
        status: DUPLICATE_LEAD_STATUS.INTIATED,
      });
      await this.campaignCollection.updateOne(
        {
          _id: new ObjectId(currentCampaignId),
          addedBy: userId,
        },
        {
          $set: {
            isAudienceDuplicated: true,
          },
        },
      );

      if (!duplicateLeadResult.acknowledged) {
        throw new Error('Adding Previous Lead Failed');
      }

      const duplicateLeadData = await this.addDuplicateCampaignAudience(
        currentCampaignId,
        oldCampaignAudiences,
        newCampaignAudiences,
        req,
      );

      return {
        statusCode: duplicateLeadData.statusCode,
        message: duplicateLeadData.message,
        data: duplicateLeadData.data,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  // /**
  //  * @developer : Ankur
  //  * @param req : for fetching user_id from req
  //  * @param payload : limit, offset, serchstr = email and weburl.
  //  * @returns : all scrapLead data I am calling it as campaignAudience it is same scrapping lead data.
  //  * @working : It is used to fetch all UltimaEmail campaignAudience
  //  *            which basicaly use mongoDb internal findone() method and count method.
  //  */
  // async getAllCampaignAudience(req, payload: GetAllCampaignAudeinceDto) {
  //   try {
  //     const { searchStr = '' } = payload;
  //     const limit = payload.limit || 10;
  //     const offset = payload.offset || 1;

  //     if (offset < 1) {
  //       throw new BadRequestException('Offset can not be less than 1');
  //     }

  //     const page_number = offset - 1;
  //     const searchFilter = {
  //       addedBy: req.user._id.toHexString(),
  //       ...(searchStr
  //         ? {
  //             $or: [
  //               { campaignName: { $regex: searchStr, $options: 'i' } },
  //               { email: { $regex: searchStr, $options: 'i' } },
  //             ],
  //           }
  //         : {}),
  //     };

  //     // Get data from campaign audience collection
  //     const campaignData = await this.campaignAudienceCollection
  //       .find(searchFilter)
  //       .sort({ createdAt: -1 })
  //       .skip(page_number * limit)
  //       .limit(limit)
  //       .toArray();

  //     // Get total count from campaign audience collection
  //     const totalRecords = await this.campaignAudienceCollection.countDocuments(
  //       searchFilter,
  //     );

  //     if (campaignData.length === 0) {
  //       return {
  //         statusCode: HttpStatus.NO_CONTENT,
  //         message: 'No Campaign Audience Found',
  //         data: [],
  //       };
  //     }

  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: 'Campaign Audience Lead Retrieved Successfully',
  //       data: campaignData,
  //       pagination: {
  //         totalCount: totalRecords,
  //         limit,
  //         offset,
  //         totalPages: Math.ceil(totalRecords / limit),
  //         currentPage: offset,
  //       },
  //     };
  //   } catch (error) {
  //     Logger.log(error);
  //     throw error;
  //   }
  // }

  /**
   * @developer : Ankur
   * @description : Fetch combined paginated results from campaignAudience and campaignDuplicateAudience.
   *                Includes search by email and campaignName. Works even if one of the collections is empty.
   * @param req : Request object (used to get user ID from token/session)
   * @param payload : DTO containing limit, offset (page number), and searchStr
   * @returns : Paginated combined list of campaign leads
   */
  async getAllCampaignAudience(req, payload: GetAllCampaignAudeinceDto) {
    try {
      const { searchStr = '', limit = 10, offset = 1, campaignId } = payload;

      if (offset < 1) {
        throw new BadRequestException('Offset cannot be less than 1');
      }

      const skip = (offset - 1) * limit;

      let baseFilter: any;
      if (campaignId) {
        baseFilter = {
          campaignId: campaignId,
          addedBy: req.user._id.toHexString(),
        };
      } else {
        baseFilter = {
          addedBy: req.user._id.toHexString(),
        };
      }

      if (searchStr) {
        const searchRegex = new RegExp(searchStr, 'i');
        baseFilter.$or = [
          { email: searchRegex },
          { campaignName: searchRegex },
        ];
      }

      // Fetch data from both collections in parallel
      const [campaignData, duplicateData] = await Promise.all([
        this.campaignAudienceCollection.find(baseFilter).toArray(),
        this.campaignDuplicateAudienceCollection.find(baseFilter).toArray(),
      ]);

      // Merge and sort by createdAt descending
      const combinedData = [...campaignData, ...duplicateData].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Paginate in-memory
      const paginatedData = combinedData.slice(skip, skip + limit);

      // Prepare the response
      if (paginatedData.length === 0) {
        return {
          statusCode: HttpStatus.NO_CONTENT,
          message: 'No Campaign Audience Found',
          data: [],
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign Audience Leads Retrieved Successfully',
        data: paginatedData,
        pagination: {
          totalCount: combinedData.length,
          limit,
          offset,
          totalPages: Math.ceil(combinedData.length / limit),
          currentPage: offset,
        },
      };
    } catch (error) {
      Logger.error('Error in getAllCampaignAudience:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve campaign audience',
      );
    }
  }

  async getAllCampaignWithCount(req, payload: GetAllCampaignAudeinceDto) {
    try {
      const { searchStr = '', campaignId } = payload;
      const addedBy = req.user._id.toHexString();

      const searchFilter: any = {
        addedBy,
        ...(campaignId && { campaignId: { $ne: campaignId } }), // exclude current campaign
        ...(searchStr && {
          $or: [
            { websiteUrl: { $regex: searchStr, $options: 'i' } },
            { email: { $regex: searchStr, $options: 'i' } },
          ],
        }),
      };

      // Fetch everything in parallel (better performance)
      const [campaignData, duplicateData, unsubscriptionList] =
        await Promise.all([
          this.campaignAudienceCollection.find(searchFilter).toArray(),
          this.campaignDuplicateAudienceCollection.find(searchFilter).toArray(),
          this.db
            .collection('unsubscriptionsEmails')
            .find(
              { addedBy, isUnsubscriptionForSender: false },
              { projection: { email: 1, campaignId: 1, addedBy: 1 } },
            )
            .toArray(),
        ]);

      // Create map for unsubscriptions
      const unsubscriptionMap = new Map();

      unsubscriptionList.forEach((item) => {
        if (!unsubscriptionMap.has(item.campaignId)) {
          unsubscriptionMap.set(item.campaignId, []);
        }
        unsubscriptionMap.get(item.campaignId).push(item.email);
      });

      // Combine audience + duplicate audience
      const combinedDataMap = new Map();

      const processAudience = (data) => {
        data.forEach((item) => {
          if (!combinedDataMap.has(item.campaignId)) {
            combinedDataMap.set(item.campaignId, {
              campaignId: item.campaignId,
              campaignName: item.campaignName || 'Unknown Campaign',
              count: 1,
              data: [item.email],
            });
          } else {
            const existingData = combinedDataMap.get(item.campaignId);
            existingData.count++;
            existingData.data.push(item.email);
          }
        });
      };

      processAudience(campaignData);
      processAudience(duplicateData);

      // Attach unsubscription info
      const combinedResults = Array.from(combinedDataMap.values())
        .map((campaign) => {
          const unsubscribedEmails =
            unsubscriptionMap.get(campaign.campaignId) || [];

          return {
            ...campaign,
            unsubscriptions: unsubscribedEmails,
            unsubscriptionCount: unsubscribedEmails.length,
          };
        })
        .sort((a, b) => b.count - a.count);

      if (combinedResults.length === 0) {
        return {
          statusCode: HttpStatus.NO_CONTENT,
          message: 'No Campaign Audience Found',
          data: [],
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign Audience Count Retrieved Successfully',
        data: combinedResults,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param user: for fetching _id from user
   * @param data : ScrapeDto structure which taken by outScrapper apis.
   * @returns : success message with scrape data counts
   * @working : It is used to scrape data from Google Maps Bussiness
   *            using outscrapper api for UltimaEmail campaign
   *            which basicaly reuse a modified higher order function
   *            name dataScrapping from project service.
   */
  async dataScrappingFromGMB(
    user: UserSparse,
    data: CampaignScrapeDTO,
    jobId?: string,
  ) {
    try {
      const { campaignId } = data;

      const saveHandler = this.saveDataInCampaignAudienceSchema.bind(this);

      const scrapedData = await this.dataScrapperService.dataScrapping(
        user,
        data,
        saveHandler,
        campaignId,
        data.userToken,
        undefined,
        undefined,
        undefined,
        undefined,
        jobId,
      );

      // this.delay(30);

      // No data found case
      if (!scrapedData?.length) {
        return []; // Return empty array for no data scenario
      }

      const GMBAudience = await this.campaignAudienceCollection
        .find(
          {
            campaignId,
            addedBy: user._id.toHexString(),
            dataSource: DATA_SOURCE.GMB,
            subscribeStatus: true,
          },
          {
            projection: {
              campaignId: 1,
              email: 1,
              isVerified: 1,
            },
          },
        )
        .toArray();

      // Return only the data object since ResponseUtil.success will be used in the controller
      return {
        audiences: GMBAudience,
        uniqueScrapData: scrapedData?.results?.uniqueScrapData,
        uniqueScrapDataCount: scrapedData?.results?.uniqueScrapDataCount,
        duplicateData: scrapedData?.results?.duplicateData,
        duplicateDataCount: scrapedData?.results?.duplicateDataCount,
      };
    } catch (error) {
      Logger.log(error);
      throw new HttpException(
        error.message || 'Failed to scrape GMB data',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async insertScrapJob(user: UserSparse, data: CampaignScrapeDTO) {
    try {
      const jobId = new ObjectId().toHexString();
      const userId = user._id.toHexString();
      await this.gmbCollection.insertOne({
        jobId,
        userId,
        campaignId: data.campaignId,
        status: 'PROCESSING',
        createdAt: new Date(),
      });

      this.processScrapingJob(jobId, user, data);
      return jobId;
    } catch (error) {}
  }

  async getScrapeResult(jobId: string, userId: string) {
    const job = await this.gmbCollection.findOne(
      { jobId, userId },
      {
        projection: {
          result: 1,
          _id: 0,
          status: 1,
          createdAt: 1,
          campaignId: 1,
        },
      },
    );

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const now = Date.now();
    const createdAt = new Date(job.createdAt).getTime();
    const TIMEOUT_LIMIT = 15 * 60 * 1000;
    if (now - createdAt > TIMEOUT_LIMIT && job.status === 'PROCESSING') {
      // Signal the background job to stop at its next batch/chunk checkpoint
      // instead of continuing to run (and burn API calls/credits) for a
      // client that's given up waiting. Thanks to incremental saving, real
      // leads already sit in campaignAudience even though the job document
      // hasn't reached COMPLETED yet - return that as the final result
      // instead of a bare error that discards it.
      this.dataScrapperService.cancelScrapeJob(jobId);

      const partialAudiences = await this.campaignAudienceCollection
        .find(
          {
            campaignId: job.campaignId,
            addedBy: userId,
            dataSource: DATA_SOURCE.GMB,
            subscribeStatus: true,
          },
          {
            projection: {
              campaignId: 1,
              email: 1,
              isVerified: 1,
              websiteName: 1,
            },
          },
        )
        .toArray();

      return {
        status: 'COMPLETED',
        message:
          partialAudiences.length > 0
            ? `Scraping took longer than expected, so it was stopped. Here are the ${partialAudiences.length} lead(s) found before the cutoff.`
            : 'Scraping took longer than expected and was stopped before finding any leads. Please try again with a smaller limit or fewer categories.',
        result: {
          audiences: partialAudiences,
          uniqueScrapDataCount: partialAudiences.length,
        },
      };
    }

    if (job.status === 'FAILED') {
      return {
        success: false,
        message: 'Your scraping job has failed. Please try again.',
        status: job.status,
      };
    }

    if (job.status === 'COMPLETED') {
      const result = job?.result;
      // This changes for UltimaReview sales for returning business name as well
      const emailToWebsiteMap = new Map<string, string>();
      result?.uniqueScrapData?.forEach((item: any) => {
        if (item.email) {
          emailToWebsiteMap.set(
            item.email.toLowerCase(),
            item.websiteName || '',
          );
        }
      });

      const modifiedAudiences = result?.audiences?.map((aud: any) => {
        const email = aud.email?.toLowerCase();
        return {
          ...aud,
          businessName: emailToWebsiteMap.get(email) || null,
        };
      });
      job.result.audiences = modifiedAudiences;
    }

    return job;
  }

  async processScrapingJob(
    jobId: string,
    user: UserSparse,
    data: CampaignScrapeDTO,
  ) {
    try {
      const result = (await this.dataScrappingFromGMB(
        user,
        data,
        jobId,
      )) as any;

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

  /**
   * @developer : Ankur
   * @param user: for fetching _id from user
   * @param validResults : Validresults array
   * @param campaignId : campaignId
   * @returns : internl method calls no response.
   * @working : It is used to check and save data in the campaignAudience
   *            schema making surety that each user have not duplicate emails.
   */

  async saveDataInCampaignAudienceSchema(
    validResults: any,
    user: UserSparse,
    campaignId: string,
  ) {
    Logger.log('Starting saveDataInCampaignAudienceSchema');
    const uniqueScrapData = [];
    const emailResult = [];
    const duplicateData = [];

    Logger.log('Fetching campaign details');
    const campaignDetails = await this.campaignCollection.findOne({
      _id: new ObjectId(campaignId),
    });

    Logger.log('Extracting emails from valid results');
    validResults.forEach((data) => {
      emailResult.push(data.email);
    });

    Logger.log('Verifying emails using outscrapper');
    const emailVerifier = await this.outscrapperEmailsVerifier(emailResult);

    Logger.log('Creating email verification map');
    const emailVerifierMap = new Map();
    emailVerifier['data'].forEach((data) => {
      const email = data.query;
      const isVerified = data.status === 'RECEIVING';
      emailVerifierMap.set(email, isVerified);
    });

    Logger.log('Processing valid results and checking for duplicates');
    for (const dataItem of validResults) {
      const isDuplicate = await this.campaignAudienceCollection.findOne({
        email: dataItem.email,
        websiteUrl: dataItem.websiteUrl,
        addedBy: user._id.toHexString(),
      });
      if (!isDuplicate) {
        // delete dataItem.signUpStatus;
        // delete dataItem.emailContent;
        // delete dataItem.chatbotUrl;
        uniqueScrapData.push({
          ...dataItem,
          addedBy: user?._id.toHexString(),
          campaignId: campaignDetails?._id.toHexString(),
          campaignName: campaignDetails?.campaignName,
          emailStatus: EMAIL_STATUS.INITIATED,
          processStatus: EMAIL_PROCESS_STATUS.PENDING,
          dataSource: DATA_SOURCE.GMB,
          senderEmailId: null,
          subscribeStatus: true,
          isVerified: emailVerifierMap.get(dataItem.email) || false,
        });
      }

      if (isDuplicate) {
        duplicateData.push(dataItem);
      }
    }

    Logger.log(
      `Inserting ${uniqueScrapData.length} unique records into campaign audience collection`,
    );
    if (uniqueScrapData?.length) {
      await this.campaignAudienceCollection.insertMany(uniqueScrapData);
    }
    Logger.log('Completed saveDataInCampaignAudienceSchema');
    return {
      statusCode: HttpStatus.OK,
      message: 'Data saved successfully',
      data: {
        uniqueScrapData,
        uniqueScrapDataCount: uniqueScrapData.length,
        duplicateData,
        duplicateDataCount: duplicateData.length,
      },
    };
  }

  /**
   * @developer : Ankur
   * @param campaignId : campaignId
   * @param req : for fetching user_id from req
   * @returns : all processed emails count
   * @working : It have all the logics to trigger a campaign with all the checks and batch processing.
   *
   */
  async startCampaign(campaignId, req?) {
    Logger.log('Starting campaign with ID:', campaignId, req.user);
    const PAGINATION_LIMIT = 100;
    let skip = 0;
    let totalProcessed = 0;
    let hasMore = true;
    let campaignDetails;
    let gptEmailResponse;

    try {
      Logger.log('Updating campaign status to running');
      await this.campaignCollection.findOneAndUpdate(
        {
          _id: new ObjectId(campaignId),
        },
        {
          $set: {
            status: CAMPAIGN_STATUS.RUNNING,
          },
        },
      );

      Logger.log('Getting campaign details');
      // Get campaign details and initial GPT response
      campaignDetails = await this.getCampaignDetails(req, campaignId);

      // Get existing campaign email template if it exists
      const campaignEmailPrompt =
        await this.campaignPromptAndGenerateEmail.findOne({
          campaignId: campaignId,
        });

      // Generate new template if none exists
      if (!campaignEmailPrompt) {
        Logger.log('Generating campaign email template using GPT');
        gptEmailResponse = await this.generateCampaignEmailTemplateUsingGPT(
          campaignDetails.data,
        );

        gptEmailResponse = {
          data: gptEmailResponse?.data.body,
          subject: gptEmailResponse?.data.subject,
        };
      } else {
        gptEmailResponse = {
          data: campaignEmailPrompt.gptGeneratedEmail,
          subject: campaignEmailPrompt.subject,
        };
      }

      Logger.log('Campaign email template:', gptEmailResponse);

      Logger.log('Checking for duplicate leads');
      const duplicateLeads = await this.duplicateLeadCollection.findOne({
        currentCampaignId: campaignId,
        status: DUPLICATE_LEAD_STATUS.INTIATED,
      });

      Logger.log('duplicate leads', duplicateLeads);

      Logger.log('Preloading sender email counts');
      // Preload sender email counts in parallel
      const senderEmailsAndLimits = await Promise.all(
        campaignDetails.data.emailAndSenderLimit.map(async (data) => ({
          email: data.email,
          maxLimit: data.maxLimit,
          count: await this.campaignAudienceCollection.countDocuments({
            senderEmailId: data.email,
            campaignId: campaignId,
          }),
        })),
      );

      const authToken = await this.campaignEmailServerConfigCollection.findOne({
        userId: req.user._id.toHexString(),
      });

      const decryptedServerToken = CryptoService.decryptPasskey(
        authToken.emailServerApiKey.toString(),
      );

      if (duplicateLeads && duplicateLeads.previousCampaign.length > 0) {
        Logger.log(
          'Processing duplicate leads - Starting duplicate lead processing',
        );
        Logger.log(
          'Number of previous campaigns to process:',
          duplicateLeads.previousCampaign.length,
        );

        for (const previousCampaignId of duplicateLeads.previousCampaign) {
          Logger.log(
            `Processing previous campaign ID: ${JSON.stringify(
              previousCampaignId,
            )}`,
          );
          let hasMore = true;
          let skip = 0;
          const PAGINATION_LIMIT = 100;
          let totalProcessed = 0;

          while (
            hasMore &&
            totalProcessed < campaignDetails.data.maxEmailsPerDay &&
            campaignDetails.data.status !== CAMPAIGN_STATUS.PAUSED
          ) {
            Logger.log(
              `Fetching batch of audiences - Skip: ${skip}, Limit: ${PAGINATION_LIMIT}`,
            );
            // Fetch a new batch of campaign audiences
            const campaignAudiences = await this.fetchDuplicateCampaignAudience(
              req,
              previousCampaignId['campaignId'],
              skip,
              PAGINATION_LIMIT,
            );
            const campaignAudience = await campaignAudiences.toArray();
            Logger.log(
              `Found ${campaignAudience.length} audiences in current batch`,
            );

            if (campaignAudience.length === 0) {
              Logger.log('No more audiences found for this campaign');
              break;
            }

            // Prepare jobs batch per sender email within limits
            const jobs = [];
            const bulkUpdates = [];
            let senderIndex = 0; // Start with the first sender
            let currentSender = senderEmailsAndLimits[senderIndex]; // Initialize with the first sender
            Logger.log(
              `Starting with sender: ${currentSender.email}, limit: ${currentSender.maxLimit}, current count: ${currentSender.count}`,
            );

            while (
              totalProcessed < campaignAudience.length &&
              senderIndex < senderEmailsAndLimits.length
            ) {
              if (currentSender.count >= currentSender.maxLimit) {
                Logger.log(
                  `Sender ${currentSender.email} reached limit. Moving to next sender`,
                );
                senderIndex++; // Move to the next sender
                if (senderIndex < senderEmailsAndLimits.length) {
                  currentSender = senderEmailsAndLimits[senderIndex];
                  Logger.log(`Switched to sender: ${currentSender.email}`);
                } else {
                  Logger.log('No more senders available');
                  break; // No more senders available
                }
              }

              for (const audience of campaignAudience) {
                if (currentSender.count >= currentSender.maxLimit) {
                  Logger.log(
                    `Sender ${currentSender.email} reached limit during audience processing`,
                  );
                  break; // Exit the loop if sender limit exceeded
                }

                Logger.log(
                  `Creating job for audience: ${audience.email} with sender: ${currentSender.email}`,
                );
                jobs.push({
                  name: 'emailProcessingQueue',
                  data: {
                    userId: req.user._id.toHexString(),
                    // campaignId: campaignId,
                    audienceId: audience._id,
                    sender: currentSender.email,
                    receiver: audience.email,
                    campaignDetails,
                    subject: gptEmailResponse.subject,
                    gptEmailResponse: gptEmailResponse.data,
                    serverToken: decryptedServerToken,
                  },
                  options: {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 3000 },
                  },
                });

                bulkUpdates.push({
                  updateOne: {
                    filter: { _id: audience._id },
                    update: {
                      $set: {
                        emailStatus: EMAIL_STATUS.INITIATED,
                        processStatus: EMAIL_PROCESS_STATUS.PROCESSING,
                        senderEmailId: currentSender.email,
                      },
                    },
                  },
                });

                Logger.log(
                  `Checking existing conversation for audience: ${audience.email}`,
                );
                const existingConversation =
                  await this.campaignImapConversationCollection.findOne({
                    campaignId: campaignDetails.data._id.toHexString(),
                    userEmailId: currentSender.email,
                    audienceEmailId: audience.email,
                  });

                const emailSentObj = {
                  isReceivedEmail: false,
                  isSentEmail: true,
                  isAutoReply: false,
                  emailTextContent: gptEmailResponse.data,
                  dateAndTime: new Date(),
                };

                if (!existingConversation) {
                  Logger.log(
                    `Creating new conversation for audience: ${audience.email}`,
                  );
                  const insertData = {
                    campaignId: campaignDetails.data._id.toHexString(),
                    userId: req.user._id.toHexString(),
                    userEmailId: currentSender.email,
                    audienceEmailId: audience.email,
                    subject: gptEmailResponse.subject,
                    emailConversation: [emailSentObj],
                    standAloneAssistant: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                  await this.campaignImapConversationCollection.insertOne(
                    insertData,
                  );
                } else {
                  Logger.log(
                    `Updating existing conversation for audience: ${audience.email}`,
                  );
                  await this.campaignImapConversationCollection.updateOne(
                    { _id: existingConversation._id },
                    {
                      $set: {
                        emailConversation: [emailSentObj],
                        updatedAt: new Date(),
                      },
                    },
                  );
                }

                currentSender.count++;
                totalProcessed++;
                Logger.log(
                  `Processed count - Current sender: ${currentSender.count}, Total: ${totalProcessed}`,
                );

                // if (currentSender.count >= currentSender.maxLimit) {
                //   Logger.log(
                //     `Sender ${currentSender.email} reached limit. Breaking inner loop`,
                //   );
                //   break; // Exit inner loop to check sender limit
                // }
              }
            }

            if (jobs.length > 0) {
              Logger.log(
                `Adding ${jobs.length} jobs to queue and performing ${bulkUpdates.length} bulk updates`,
              );
              await this.emailQueue.addBulkJob(jobs);
              await this.campaignAudienceCollection.bulkWrite(bulkUpdates);
            }

            skip += PAGINATION_LIMIT;
            hasMore = campaignAudience.length === PAGINATION_LIMIT;
            campaignDetails = await this.getCampaignDetails(req, campaignId);
            if (campaignAudience.length < PAGINATION_LIMIT) {
              await this.campaignCollection.findOneAndUpdate(
                {
                  _id: new ObjectId(campaignId),
                },
                {
                  $set: {
                    status: CAMPAIGN_STATUS.COMPLETED,
                  },
                },
              );
              hasMore = false; // No more audience records left
            }
            Logger.log(
              `Batch complete - HasMore: ${hasMore}, Total processed: ${totalProcessed}`,
            );
          }
        }
        Logger.log(
          `Updating duplicate lead status to completed for campaign: ${campaignId}`,
        );
        await this.duplicateLeadCollection.updateOne(
          { currentCampaignId: campaignId },
          {
            $set: {
              status: DUPLICATE_LEAD_STATUS.COMPLETED,
              updatedAt: new Date(),
            },
          },
        );
      } else {
        Logger.log('Processing campaign audiences');
        // Main loop to process audience in batches
        while (
          hasMore &&
          totalProcessed < campaignDetails.data.maxEmailsPerDay &&
          campaignDetails.data.status !== CAMPAIGN_STATUS.PAUSED
        ) {
          // Fetch a new batch of campaign audiences
          Logger.log('Fetching campaign audiences');
          const campaignAudiences = await this.fetchCampaignAudience(
            req,
            campaignId,
            skip,
            PAGINATION_LIMIT,
          );
          const campaignAudience = await campaignAudiences.toArray();

          if (campaignAudience.length === 0) {
            break;
          }
          // Prepare jobs batch per sender email within limits
          const jobs = [];
          const bulkUpdates = [];
          let senderIndex = 0; // Start with the first sender
          let currentSender = senderEmailsAndLimits[senderIndex]; // Initialize with the first sender

          while (
            totalProcessed < campaignAudience.length &&
            senderIndex < senderEmailsAndLimits.length
          ) {
            if (currentSender.count >= currentSender.maxLimit) {
              senderIndex++; // Move to the next sender if the current one's limit is exceeded
              if (senderIndex < senderEmailsAndLimits.length) {
                currentSender = senderEmailsAndLimits[senderIndex];
              } else {
                break; // No more senders available
              }
            }

            for (const audience of campaignAudience) {
              if (currentSender.count >= currentSender.maxLimit) {
                break; // Stop processing with this sender if its limit is reached
              }

              jobs.push({
                name: 'emailProcessingQueue',
                data: {
                  userId: req.user._id.toHexString(),
                  campaignId: campaignId,
                  sender: currentSender.email,
                  receiver: audience.email,
                  campaignDetails,
                  subject: gptEmailResponse.subject,
                  gptEmailResponse: gptEmailResponse.data,
                  serverToken: decryptedServerToken,
                },
                options: {
                  attempts: 3,
                  backoff: { type: 'exponential', delay: 3000 },
                },
              });

              bulkUpdates.push({
                updateOne: {
                  filter: { _id: audience._id },
                  update: {
                    $set: {
                      emailStatus: EMAIL_STATUS.INITIATED,
                      processStatus: EMAIL_PROCESS_STATUS.PROCESSING,
                      senderEmailId: currentSender.email,
                    },
                  },
                },
              });

              const existingConversation =
                await this.campaignImapConversationCollection.findOne({
                  campaignId: campaignDetails.data._id.toHexString(),
                  userEmailId: currentSender.email,
                  audienceEmailId: audience.email,
                });

              const emailSentObj = {
                isReceivedEmail: false,
                isSentEmail: true,
                isAutoReply: false,
                emailTextContent: gptEmailResponse.data,
                dateAndTime: new Date(),
              };

              if (!existingConversation) {
                const insertData = {
                  campaignId: campaignDetails.data._id.toHexString(),
                  userId: req.user._id.toHexString(),
                  userEmailId: currentSender.email,
                  audienceEmailId: audience.email,
                  subject: gptEmailResponse.subject,
                  emailConversation: [emailSentObj],
                  standAloneAssistant: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await this.campaignImapConversationCollection.insertOne(
                  insertData,
                );
              } else {
                await this.campaignImapConversationCollection.updateOne(
                  { _id: existingConversation._id },
                  {
                    $set: {
                      emailConversation: [emailSentObj],
                      updatedAt: new Date(),
                    },
                  },
                );
              }

              currentSender.count++;
              totalProcessed++;
            }
          }

          // Perform bulk database updates
          if (bulkUpdates.length > 0) {
            await this.campaignAudienceCollection.bulkWrite(bulkUpdates);
          }

          // Add jobs to the queue in bulk
          if (jobs.length > 0) {
            await this.emailQueue.addBulkJob(jobs);
          }
          // Prepare for the next batch by updating skip and checking limits
          skip += PAGINATION_LIMIT;
          await this.delay(500);
          campaignDetails = await this.getCampaignDetails(req, campaignId);

          if (campaignAudience.length < PAGINATION_LIMIT) {
            await this.campaignCollection.findOneAndUpdate(
              {
                _id: new ObjectId(campaignId),
              },
              {
                $set: {
                  status: CAMPAIGN_STATUS.COMPLETED,
                },
              },
            );
            hasMore = false; // No more audience records left
          }
        }
      }

      return {
        statusCode: HttpStatus.OK,
        message: `${totalProcessed} Campaign Emails Processed`,
      };
    } catch (error) {
      await this.campaignCollection.findOneAndUpdate(
        {
          _id: new ObjectId(campaignId),
        },
        {
          $set: {
            status: CAMPAIGN_STATUS.FAILED,
          },
        },
      );
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param campaignId : campaignId
   * @returns : immediate trigger response
   * @working : It is used to trigger UltimaEmail campaign.
   *
   */

  async triggerCampaign(campaignId: string, req?: any) {
    Logger.log('Triggering campaign with ID:', campaignId);
    const isScheduled = await this.campaignScheduledCollection.findOne({
      campaignId: campaignId,
      status: CAMPAIGN_SCHEDULER_STATUS.SCHEDULED,
      addedBy: req.user._id.toHexString(),
    });

    if (isScheduled) {
      this.campaignCollection.findOneAndUpdate(
        { _id: new ObjectId(campaignId) },
        {
          $set: {
            status: CAMPAIGN_STATUS.SCHEDULED,
          },
        },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign scheduled.',
      };
    }
    Logger.log('Making campaign as immediate trigger');

    this.campaignCollection.findOneAndUpdate(
      { _id: new ObjectId(campaignId) },
      {
        $set: {
          campaignTrigger: CAMPAIGN_TRIGGER_STATUS.IMMEDIATE,
        },
      },
    );
    Logger.log('Starting campaign');
    // this.startCampaign(campaignId, req); // V1 works till new changes made in duplication flow

    await this.userService.checkBotMaxLimitAndCreate(
      req.user._id,
      'email_outreach',
      new ObjectId(campaignId),
    );

    this.startCampaignV2(campaignId, req);

    return {
      statusCode: HttpStatus.OK,
      message: 'Campaign Triggered Successfully',
    };
  }

  // Helper method to delay (pause for a given amount of time)
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  //helper method to fetch all audience based on conditions
  async fetchCampaignAudience(req, campaignId, skip, limit) {
    return this.campaignAudienceCollection
      .find({
        campaignId: campaignId,
        addedBy: req.user._id.toHexString(),
        emailStatus: {
          $in: [EMAIL_STATUS.INITIATED],
        },
        // processStatus: {
        //   $in: [
        //     EMAIL_PROCESS_STATUS.PENDING,
        //     EMAIL_PROCESS_STATUS.PROCESSING,
        //     EMAIL_PROCESS_STATUS.FAILED,
        //   ],
        // },
        subscribeStatus: true,
      })
      .limit(limit)
      .skip(skip);
  }

  async fetchDuplicateCampaignAudience(req, campaignId, skip, limit) {
    return this.campaignAudienceCollection
      .find({
        campaignId: campaignId,
        addedBy: req.user._id.toHexString(),
        subscribeStatus: true,
      })
      .limit(limit)
      .skip(skip);
  }

  async getCTAandUnsubscribeSection(callOfAction: any) {
    const hasValidCTA = callOfAction && Object.keys(callOfAction)?.length > 0;
    const hasCustomLink =
      hasValidCTA &&
      typeof callOfAction?.customLink === 'string' &&
      callOfAction?.customLink.trim() !== '';

    const hasEmail =
      hasValidCTA &&
      typeof callOfAction?.email === 'string' &&
      callOfAction?.email.trim() !== '';

    const hasPhone =
      hasValidCTA &&
      typeof callOfAction?.phone === 'string' &&
      callOfAction?.phone?.trim() !== '';

    // These will be appended at the very end (after unsubscribe)
    let ctaSection = '';

    if (hasCustomLink) {
      ctaSection += `<div style="text-align:center; margin-top:20px;">
        <a style="color:#2977FF; font-weight:500;" href="${callOfAction?.customLink}/?at={{token}}" target="_blank">
          Visit Us
        </a>
      </div>`;
    }

    if (hasEmail) {
      ctaSection += `<div style="text-align:center; margin-top:10px;">
        <a style="color: #2977FF; font-weight:500;" href="mailto:${callOfAction?.email}?subject={{subject}}">
          Email Us
        </a>
      </div>`;
    }

    if (hasPhone) {
      ctaSection += `<div style="text-align:center; margin-top:10px;">
        <a style="color: #2977FF; font-weight:500;" href="tel:${callOfAction?.phone}">
          Call Us
        </a>
      </div>`;
    }

    const unsubscribeDiv = `
  <div style="text-align: center; margin-top:50px; padding: 20px; background: #efefef;">
    <span style="font-size: 13px;">
      No longer want to receive these emails?

      <br /><br />

      <a style="color: #2977FF; font-weight: 400; margin-right: 10px;" 
         href="{{campaignUnsubscribeLink}}"  target="_blank">
        Unsubscribe from this campaign
      </a>

      |

      <a style="color: #2977FF; font-weight: 400; margin-left: 10px;" 
        href="{{senderUnsubscribeLink}}" target="_blank">
        Unsubscribe from this sender
      </a>
    </span>
  </div>`;

    return { unsubscribeDiv, ctaSection };
  }

  /**
   * @developer : Ankur
   * @param campaignDetails : campaignDetails
   * @returns : gpt response after successful email generation
   * @working : It is used to create email template using gpt with the help of campaign details.
   */

  async generateCampaignEmailTemplateUsingGPT(campaignDetails: any, req?: any) {
    const {
      targetAudience,
      painPoints,
      solutionOffer,
      callOfAction,
      campaignLanguage,
      emailLength,
      _id,
    } = campaignDetails || {};

    const hasValidCTA = callOfAction && Object.keys(callOfAction).length > 0;

    const hasCustomLink =
      hasValidCTA &&
      typeof callOfAction.customLink === 'string' &&
      callOfAction.customLink.trim() !== '';

    const hasEmail =
      hasValidCTA &&
      typeof callOfAction.email === 'string' &&
      callOfAction.email.trim() !== '';

    const hasPhone =
      hasValidCTA &&
      typeof callOfAction.phone === 'string' &&
      callOfAction.phone.trim() !== '';

    // These will be appended at the very end (after unsubscribe)
    let ctaSection = '';

    if (hasCustomLink) {
      ctaSection += `<div style="text-align:center; margin-top:20px;">
        <a style="color:#2977FF; font-weight:500;" href="${callOfAction.customLink}/?at={{token}}" target="_blank">
          Visit Us
        </a>
      </div>`;
    }

    if (hasEmail) {
      ctaSection += `<div style="text-align:center; margin-top:10px;">
        <a style="color: #2977FF; font-weight:500;" href="mailto:${callOfAction.email}?subject={{subject}}">
          Email Us
        </a>
      </div>`;
    }

    if (hasPhone) {
      ctaSection += `<div style="text-align:center; margin-top:10px;">
        <a style="color: #2977FF; font-weight:500;" href="tel:${callOfAction.phone}">
          Call Us
        </a>
      </div>`;
    }

    const prompt = [
      {
        role: 'system',
        content: `You are an expert email marketing copywriter and UI/UX designer. Your task is to generate a visually appealing, modern, and professional HTML email template with a strong, clean UI-based layout. Do NOT use any placeholders like [your name], [your company], etc. Instead, write the email as if it is being sent directly from a real business, using natural, direct language.

          Strict rules:
          - Do NOT include any images, logo, icons, banners, illustrations, or <img> tags in the HTML body.
          - The email must be fully text-based with styled sections only.
          - Do NOT use external assets of any kind.

          Return your response STRICTLY in this JSON format:
          { "subject": "Generated subject line based on the target audience and service", "body": "<html> ... </html>" }

          Do not include any other text or explanations - only return the JSON object.`,
      },
      {
        role: 'user',
        content: `Generate a beautiful, conversion-focused HTML email template in JSON with the keys "subject" and "body".

                  Details:
                  Target Audience: ${JSON.stringify(targetAudience || {})}
                  Pain Points: ${JSON.stringify(painPoints || {})}
                  Solution: ${JSON.stringify(solutionOffer || {})}
                  Call to Action (CTA): ${JSON.stringify(callOfAction || {})}
                  Language: ${campaignLanguage}
                  Length: ${emailLength} in words.

                  Email requirements:
                  - Attention-grabbing subject line
                  - Engaging, conversational opening (no placeholders or generic greetings)
                  - Mention pain points and solutions clearly
                  - Visually appealing HTML (with inline CSS)
                  - Do NOT create any buttons.
                  - Do NOT add any images, logo, icons, banners, illustrations, or <img> tags.
                  - Keep the body fully text-based with styled layouts only.
                  - If CTA has links, emails, or phone numbers, don't mention them in the body; they will be appended automatically.
                  - No salutations or signatures.

                  - Respond ONLY with JSON in this format:
                  { "subject": "Generated subject line based on the target audience and service", "body": "<html> ... </html>" }`,
      },
    ];

    // const prompt = [
    //   {
    //     role: 'system',
    //     content: `You are an elite email marketing designer and copywriter. Generate stunning, conversion-focused HTML email templates with world-class design.

    //     STRICT RULES:
    //     - Return ONLY valid JSON: { "subject": "...", "body": "<html>...</html>" }
    //     - NO logos, NO <img> tags, NO image placeholders, NO [bracket placeholders], NO generic greetings
    //     - Write as a real business sending directly to the reader
    //     - NO buttons, NO signatures, NO salutations
    //     - All CSS must be inline

    //     DESIGN REQUIREMENTS — make the email visually stunning:
    //     - Wrapper: full-width background #f4f6fb, centered container max-width 600px
    //     - Header band: bold gradient background (e.g. linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)), padding 48px 40px, centered white headline in Georgia or serif font, font-size 28px, line-height 1.4, letter-spacing -0.5px
    //     - Accent bar: 4px tall strip using a vivid accent color (e.g. #e94560 or #00b4d8) between header and body
    //     - Body section: white background, padding 40px, font-family 'Helvetica Neue', Arial, sans-serif, color #1a1a2e
    //     - Pain point section: light background #f8f9ff, border-left 4px solid accent color, padding 20px 24px, margin 24px 0, border-radius 0 8px 8px 0
    //     - Solution section: use a subtle gradient background (#eef9f4 to #e8f4fd), border-radius 12px, padding 24px, margin 24px 0
    //     - Paragraph font-size: 16px, line-height 1.8, color #374151
    //     - Section labels: small uppercase letter-spacing 2px, font-size 11px, color accent, font-weight 700, margin-bottom 8px
    //     - Divider: 1px solid #e5e7eb, margin 28px 0
    //     - Footer area background: #1a1a2e, text color #9ca3af, font-size 13px, padding 24px 40px, border-radius 0 0 12px 12px`,
    //   },
    //   {
    //     role: 'user',
    //     content: `Generate a stunning, conversion-focused HTML email in JSON format with keys "subject" and "body".

    //     Campaign Details:
    //     - Target Audience: ${JSON.stringify(targetAudience || {})}
    //     - Pain Points: ${JSON.stringify(painPoints || {})}
    //     - Solution Offered: ${JSON.stringify(solutionOffer || {})}
    //     - Call to Action: ${JSON.stringify(callOfAction || {})}
    //     - Language: ${campaignLanguage}
    //     - Length: ${emailLength} words

    //     Content Rules:
    //     ✗ NO logo, images, or <img> tags of any kind
    //     ✗ NO buttons
    //     ✗ NO placeholder text like [Company Name] or [Your Name]
    //     ✗ NO salutations or sign-offs

    //     Design Rules (follow exactly):
    //     ✓ Full HTML document with inline CSS only
    //     ✓ Outer wrapper: background-color #f4f6fb, padding 24px 0
    //     ✓ Inner container: max-width 600px, margin 0 auto, border-radius 12px, overflow hidden, box-shadow 0 4px 24px rgba(0,0,0,0.08)
    //     ✓ Header: dark gradient (linear-gradient 135deg, #1a1a2e → #0f3460), padding 48px 40px, white serif headline, centered
    //     ✓ Vivid 4px accent bar (color #e94560) beneath the header
    //     ✓ White content area: padding 40px, 16px body text, line-height 1.8
    //     ✓ Pain points styled in a highlighted sidebar block (border-left accent, light bg)
    //     ✓ Solution styled in a soft gradient card with border-radius
    //     ✓ Use uppercase labeled sections ("THE CHALLENGE", "OUR SOLUTION") in small accent-colored text
    //     ✓ Footer: dark background (#1a1a2e), muted text, padding 24px 40px
    //     Return ONLY JSON: { "subject": "...", "body": "<html>...</html>" }`,
    //   },
    // ];

    const gptEmailResponse = await this.openaiService.getChatGptCompletion(
      {
        messages: prompt as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_5_MINI,
      },
      [],
      new ObjectId(campaignDetails?.addedBy),
      'campaign-email-template',
    );

    // Update token usage
    this.updateTokenUsage(
      req.user._id,
      gptEmailResponse.tokenUsage.total,
      campaignDetails?.campaignProject?.projectId,
    );

    const gptEmailResponseData = gptEmailResponse.response
      ? JSON.parse(gptEmailResponse.response)
      : {};

    const unsubscribeDiv = `
  <div style="text-align: center; margin-top:50px; padding: 20px; background: #efefef;">
    <span style="font-size: 13px;">
      No longer want to receive these emails?

      <br /><br />

      <a style="color: #2977FF; font-weight: 400; margin-right: 10px;" 
         href="{{campaignUnsubscribeLink}}"  target="_blank">
        Unsubscribe from this campaign
      </a>

      |

      <a style="color: #2977FF; font-weight: 400; margin-left: 10px;" 
        href="{{senderUnsubscribeLink}}" target="_blank">
        Unsubscribe from this sender
      </a>
    </span>
  </div>`;

    let finalBody = gptEmailResponseData.body;

    // Append CTA if exists
    if (hasValidCTA && ctaSection.trim() !== '') {
      finalBody += ctaSection;
    }

    // ALWAYS append unsubscribe section
    finalBody += unsubscribeDiv;

    gptEmailResponseData.body = finalBody;

    const data = {
      campaignId: campaignDetails?._id.toHexString(),
      campaignPrompt: prompt,
      subject: gptEmailResponseData['subject'],
      gptGeneratedEmail: finalBody,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.campaignPromptAndGenerateEmail.insertOne(data);

    return {
      statusCode: HttpStatus.OK,
      message: 'GPT Generated Email',
      data: gptEmailResponseData,
    };
  }

  /**
   * @developer : Ankur
   * @param campaignId : campaignId
   * @returns : pause success response object.
   * @working : It is used to pause a ongoing campaign with campaignId,
   *            it will getAll jobs from same campaign id and remove it synchronously.
   */
  async pauseCampaign(campaignId: string) {
    const jobs = await this.emailQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.campaignId === campaignId) {
        await job.remove();
      }
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Campaign Paused',
    };
  }

  /**
   * @developer : Ankur
   * @param campaignId : campaign id to pause
   * @returns : pause success response object
   * @working : It is version2 of pauseCampaign with some improvements.
   */
  async pauseCampaignV2(campaignId: string) {
    try {
      // First update campaign status to prevent new jobs from being added

      const campaignState = await this.campaignCollection.findOne({
        _id: new ObjectId(campaignId),
      });

      if (campaignState.status === CAMPAIGN_STATUS.COMPLETED) {
        throw new BadRequestException('Oops!! Campaign got completed');
      }

      await this.campaignCollection.updateOne(
        { _id: new ObjectId(campaignId) },
        { $set: { status: CAMPAIGN_STATUS.PAUSED } },
      );

      // Get and remove existing jobs
      const jobs = await this.emailQueue.getJobs([
        'waiting',
        'delayed',
        'active',
      ]);

      const removePromises = jobs?.map(async (job) => {
        if (job.data.campaignId === campaignId) {
          await job.remove();
        }
      });

      Promise.all(removePromises);

      // Not stopping the watcher here: already-sent recipients can still reply while paused.

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign Paused Successfully',
      };
    } catch (error) {
      throw new Error(`Failed to pause campaign: ${error.message}`);
    }
  }

  async resumeCampaign(campaignId: string, req?: any) {
    try {
      const campaign = await this.campaignCollection.findOne({
        _id: new ObjectId(campaignId),
      });

      if (!campaign) {
        throw new BadRequestException('Campaign not found');
      }

      if (campaign.status === CAMPAIGN_STATUS.COMPLETED) {
        throw new BadRequestException('Cannot resume completed campaign');
      }

      if (campaign.status !== CAMPAIGN_STATUS.PAUSED) {
        throw new BadRequestException('Only paused campaigns can be resumed');
      }

      // Update status to RUNNING
      await this.campaignCollection.updateOne(
        { _id: new ObjectId(campaignId) },
        {
          $set: {
            status: CAMPAIGN_STATUS.RUNNING,
            campaignTrigger: CAMPAIGN_TRIGGER_STATUS.IMMEDIATE,
          },
        },
      );

      // Restart campaign job creation
      this.startCampaignV2(campaignId, req);

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign Resumed Successfully',
      };
    } catch (error) {
      throw new Error(`Failed to resume campaign: ${error.message}`);
    }
  }

  /**
   * @developer : Ankur
   * @param payload : limit, offset, for batch processing
   * @returns : all campaign data in an array.
   * @working : It is used to fetch UltimaEmail all campaign
   *            which basicaly use mongoDb internal find() method.
   */
  async getAllCampaignForCron(payload: any) {
    try {
      const { limit, offset } = payload;
      const campaignList = await this.campaignCollection
        .find({
          status: {
            $in: [
              CAMPAIGN_STATUS.INITIATED,
              CAMPAIGN_STATUS.COMPLETED,
              CAMPAIGN_STATUS.RUNNING,
            ],
          },
        })
        .skip(Number(offset))
        .limit(Number(limit))
        .sort({ createdAt: -1, id: 1 }) // sorted by recent first
        .toArray(); // Convert cursor to an array for response

      if (!campaignList || campaignList.length === 0) {
        return {
          data: [],
        };
      }
      return {
        data: campaignList,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  async fetchAllCampaignForAUser(payload: any, userId: string) {
    try {
      const { limit, offset } = payload;
      const campaignList = await this.campaignCollection
        .find({
          status: {
            $in: [
              CAMPAIGN_STATUS.INITIATED,
              CAMPAIGN_STATUS.RUNNING,
              CAMPAIGN_STATUS.COMPLETED,
            ],
          },
          addedBy: userId,
        })
        .skip(Number(offset))
        .limit(Number(limit))
        .sort({ createdAt: -1, id: 1 }) // sorted by recent first
        .toArray(); // Convert cursor to an array for response

      if (!campaignList || campaignList.length === 0) {
        return {
          data: [],
        };
      }
      return {
        data: campaignList,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  async updateCampaignRelatedCollections(
    campaignId: string,
    collectionName: string,
    data: any,
    email?: string,
    audienceId?: string,
  ) {
    try {
      switch (collectionName) {
        case 'campaignScheduled':
          await this.campaignScheduledCollection.updateOne(
            { campaignId },
            { $set: data },
          );
          break;

        case 'campaign':
          await this.campaignCollection.updateOne(
            { _id: new ObjectId(campaignId) },
            { $set: data },
          );
          break;

        case 'campaignAudience':
          const filter = audienceId
            ? { _id: new ObjectId(audienceId) }
            : { campaignId: campaignId, email: email };

          await this.campaignAudienceCollection.updateOne(filter, {
            $set: data,
          });

        case 'campaignDuplicateAudience':
          const filterDuplicate = audienceId
            ? { _id: new ObjectId(audienceId) }
            : { campaignId: campaignId, email: email };

          await this.campaignDuplicateAudienceCollection.updateOne(
            filterDuplicate,
            {
              $set: data,
            },
          );
          break;

        default:
          throw new Error(`Invalid collection name: ${collectionName}`);
      }
    } catch (error) {
      Logger.log(`Error updating ${collectionName}: `, error);
      throw error;
    }
  }

  async updateManyCampaignRelatedCollections(
    campaignId: string,
    collectionName: string,
    data: any,
    filter: any = {},
  ) {
    try {
      switch (collectionName) {
        case 'campaignScheduled':
          await this.campaignScheduledCollection.updateMany(
            { campaignId, ...filter },
            { $set: data },
          );
          break;

        case 'campaign':
          await this.campaignCollection.updateMany(
            { _id: new ObjectId(campaignId), ...filter },
            { $set: data },
          );
          break;

        case 'campaignAudience':
          await this.campaignAudienceCollection.updateMany(
            { campaignId, ...filter },
            { $set: data },
          );
          break;

        default:
          throw new Error(`Invalid collection name: ${collectionName}`);
      }
    } catch (error) {
      Logger.log(
        `Error updating multiple documents in ${collectionName}: `,
        error,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @returns : autoReply and its logs
   * @working : It is used to auto reply and follow ups to the emails and save the conversation in db running by cron job.
   */

  async fetchAllAdminUsersAndAutoReplyToEmails() {
    try {
      // TODO: Fetch all paid users only
      const limit = 10;
      let offset = 0;
      let hasMoreUsers = true;

      while (hasMoreUsers) {
        const allUsers = await this.userCollection
          .find({
            isActive: 1,
          })
          .skip(offset)
          .limit(limit)
          .sort({ createdAt: -1, id: 1 })
          .toArray();
        if (allUsers.length === 0) {
          hasMoreUsers = false;
          break;
        }

        // console.log(`allUsers ${offset}`, allUsers);
        // for (const user of allUsers) {
        //   this.emailsAutoFollowbackByLLM(user._id.toHexString());
        // }
        await Promise.allSettled(
          allUsers.map(async (user) => {
            const emailSetting = await this.emailAssistanceSetting.findOne({
              userId: user._id.toHexString(),
            });
            // Added this line to check if auto reply is disabled for user then skip that user By Nidhi Sharma
            // Default to manual reply ON for accounts that have never configured this
            // setting at all (no document, or no autoReply block yet) — an explicit
            // false from an existing setting is still respected and not overridden.
            const hasNeverConfiguredAutoReply =
              !emailSetting || emailSetting.autoReply === undefined;
            if (
              hasNeverConfiguredAutoReply ||
              emailSetting?.autoReply?.isAutoReply === true ||
              emailSetting?.autoReply?.manualReply === true
            ) {
              await this.emailsAutoFollowbackByLLMV2(user._id.toHexString());
            }
          }),
        );
        offset += limit;
      }
      return;
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  private async buildMailBotReturningUserSummary(
    email: string | undefined,
    userId: string,
  ): Promise<string> {
    try {
      if (!email?.trim()) {
        Logger.warn('[ReturningUser] No email provided — skipping lookup');
        return '';
      }

      if (!userId) {
        Logger.warn('[ReturningUser] No userId provided — skipping lookup');
        return '';
      }

      // Find the most recent lead for this email + userId
      let existingLead: any = null;
      try {
        const leads = await this.leadCollection
          .find(
            { $or: [{ email }], userId },
            { sort: { createdAt: -1 }, limit: 2 },
          )
          .toArray();
        existingLead = leads[1] || null; // Get the second most recent lead, or null if not available
      } catch (dbErr) {
        Logger.warn(
          '[ReturningUser] DB error during lead lookup (non-blocking):',
          dbErr?.message || dbErr,
        );
        return '';
      }

      if (!existingLead) {
        Logger.debug('[ReturningUser] No existing lead found - new user');
        return '';
      }

      Logger.log(
        `[ReturningUser] Found existing lead - IsLeadType: ${existingLead.IsLeadType}, createdAt: ${existingLead.createdAt}`,
      );

      const summaryLines: string[] = [];

      // ── Channel / Lead type — mapped to a human-friendly label ───────────
      if (existingLead.IsLeadType) {
        const channelLabel: Record<string, string> = {
          voiceBot: 'VoiceBot',
          chatBot: 'ChatBot',
          mailBot: 'EmailBot',
          zapierCrm: 'Zapier CRM',
        };
        const label =
          channelLabel[existingLead.IsLeadType] || existingLead.IsLeadType;
        summaryLines.push(`Previously interacted via: ${label}`);
      }

      // ── Visit timestamps ─────────────────────────────────────────────────
      if (existingLead.name) {
        summaryLines.push(`Name: ${existingLead.name}`);
      }
      if (existingLead?.firstName || existingLead?.lastName) {
        summaryLines.push(
          `Full Name: ${[existingLead?.firstName, existingLead?.lastName]
            .filter(Boolean)
            .join(' ')}`,
        );
      }
      if (existingLead?.email) {
        summaryLines.push(`Email: ${existingLead.email}`);
      }

      if (existingLead.phone) {
        summaryLines.push(`Phone: ${existingLead.phone}`);
      }

      if (existingLead.createdAt) {
        summaryLines.push(
          `First visited on: ${new Date(
            existingLead.createdAt,
          ).toLocaleString()}`,
        );
      }
      if (existingLead.updatedAt) {
        summaryLines.push(
          `Last visited on: ${new Date(
            existingLead.updatedAt,
          ).toLocaleString()}`,
        );
      }
      if (existingLead.isAppointmentBooked && existingLead.meetingDateAndTime) {
        summaryLines.push(
          `Last Appointment booked on: ${new Date(
            existingLead.meetingDateAndTime,
          ).toLocaleString()}`,
        );
      }
      if (existingLead.campaignDetails?.campaignName) {
        summaryLines.push(
          `Previous campaign: ${existingLead.campaignDetails.campaignName}`,
        );
      }

      // ── Conversation summary — routed inline by IsLeadType ───────────────
      let conversationSummary = '';
      try {
        if (!existingLead.IsLeadType) {
          conversationSummary = '';
        } else if (existingLead.IsLeadType === IsLeadType.voiceBot) {
          // voiceBot: callSummery is a plain string stored directly on the lead
          conversationSummary = existingLead.callSummery?.trim() || '';
        } else if (existingLead.IsLeadType === IsLeadType.chatBot) {
          // chatBot: fetch messages[] from linked chat session via chatSessionId
          if (!existingLead.chatSessionId) {
            Logger.warn('[ReturningUser] chatBot lead missing chatSessionId');
          } else {
            let chatSession: any = null;
            try {
              chatSession = await this.db
                .collection(CHAT_SESSION_COLLECTION)
                .findOne({ _id: new ObjectId(existingLead.chatSessionId) });
            } catch (dbErr) {
              Logger.warn(
                `[ReturningUser] DB error fetching chatSession (${existingLead.chatSessionId}):`,
                dbErr?.message || dbErr,
              );
            }

            if (!chatSession) {
              Logger.warn(
                `[ReturningUser] chatSession not found for id: ${existingLead.chatSessionId}`,
              );
            } else if (!Array.isArray(chatSession.messages)) {
              Logger.warn(
                '[ReturningUser] chatSession.messages is not an array',
              );
            } else {
              conversationSummary = chatSession.messages
                .filter((m: any) => {
                  if (!m || typeof m !== 'object') return false;
                  try {
                    const p = JSON.parse(m.a);
                    if (
                      p &&
                      typeof p === 'object' &&
                      !Array.isArray(p) &&
                      Object.keys(p).length === 1 &&
                      'date' in p
                    ) {
                      return false;
                    }
                  } catch {
                    // m.a is not JSON → it's a real bot reply → keep it
                  }
                  return true;
                })
                .slice(0, 20) // cap at 20 turns to avoid token overflow
                .map((m: any, i: number) => {
                  try {
                    return `  Turn ${i + 1} — User: ${m.q || ''} | Bot: ${
                      m.a || ''
                    }`;
                  } catch {
                    return '';
                  }
                })
                .filter(Boolean)
                .join('\n');
            }
          }
        } else if (existingLead.IsLeadType === IsLeadType.mailBot) {
          // mailBot: fetch emailConversation[] via emailConversationId
          if (!existingLead.emailConversationId) {
            Logger.warn(
              '[ReturningUser] mailBot lead missing emailConversationId',
            );
          } else {
            let emailConvDoc: any = null;
            try {
              emailConvDoc = await this.db
                .collection(CAMPAIGN_EMAIL_CONVERSATION_COLLECTION)
                .findOne({
                  _id: new ObjectId(existingLead.emailConversationId),
                });
            } catch (dbErr) {}

            if (!emailConvDoc) {
              Logger.warn(
                `[ReturningUser]  ${existingLead.emailConversationId}`,
              );
            } else {
              const turns = emailConvDoc.emailConversation;
              if (!Array.isArray(turns) || turns.length === 0) {
                Logger.warn('[ReturningUser] t an array');
              } else {
                const lines: string[] = [];
                if (emailConvDoc.subject) {
                  lines.push(`Subject: ${emailConvDoc.subject}`);
                }
                turns
                  .filter(
                    (t: any) =>
                      t !== null && t !== undefined && typeof t === 'object',
                  )
                  .slice(0, 20)
                  .forEach((turn: any, i: number) => {
                    try {
                      // Strip HTML tags from emailTextContent for clean readable text
                      const rawText = (turn.emailTextContent || '')
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                      if (!rawText) return;
                      const direction = turn.isReceivedEmail
                        ? 'User'
                        : turn.isAutoReply
                        ? 'Bot (auto-reply)'
                        : 'Bot';
                      lines.push(`  Email ${i + 1} — ${direction}: ${rawText}`);
                    } catch {
                      // skip malformed turn silently
                    }
                  });
                conversationSummary = lines.join('\n');
              }
            }
          }
        } else if (existingLead.IsLeadType === IsLeadType.zapierCrm) {
          // zapierCrm: chatMessage[] on the lead itself, shape: { query }
          // NOTE: chatMessage can be null even if the field exists on the document
          if (
            !existingLead.chatMessage ||
            !Array.isArray(existingLead.chatMessage) ||
            existingLead.chatMessage.length === 0
          ) {
            conversationSummary = '';
          } else {
            conversationSummary = existingLead.chatMessage
              .filter(
                (m: any) =>
                  m !== null && m !== undefined && typeof m === 'object',
              )
              .slice(0, 20)
              .map((m: any, i: number) => {
                try {
                  // ZapierCrm uses 'query' key instead of 'q'
                  const q = m.query || m.q || '';
                  return q ? `  Message ${i + 1} — User: ${q}` : '';
                } catch {
                  return '';
                }
              })
              .filter(Boolean)
              .join('\n');
          }
        }
      } catch (summaryErr) {
        // Non-blocking — conversation summary failure never breaks the context block
        Logger.warn(
          '[ReturningUser] Error building conversation summary (non-blocking):',
          summaryErr?.message || summaryErr,
        );
        conversationSummary = '';
      }

      if (conversationSummary) {
        summaryLines.push(`\nPrevious conversation:\n${conversationSummary}`);
      }

      if (summaryLines.length === 0) return '';
      const contextBlock = [
        '[RETURNING CUSTOMER CONTEXT]',
        summaryLines.join('\n'),
        '',
        'Instructions for AI (EmailBot):',
        '- This is a returning customer. You MUST greet them warmly by name if name is available.',
        '- If previous interaction is available, you MUST mention it. Example: "I can see you previously reached out to us via our VoiceBot."',
        '- If first visit date is available, you MUST mention it. Example: "You first reached out to us on [date]."',
        '- If last visit date is available, you MUST mention it. Example: "We last heard from you on [date]."',
        '- If phone is available, you MUST reference it. Example: "We have your contact number on file."',
        '- If email is available, you MUST confirm it. Example: "We will send the details to [email]."',
        '- If a previous appointment is available, you MUST mention it. Example: "I can see you had a meeting with us on [date]."',
        '- If a previous campaign is available, you MUST reference it. Example: "I see you were part of our [campaign name]."',
        '- If a previous conversation summary is available, you MUST include a brief summary of it in the reply so the user knows we remember their previous interaction. Example: "Last time you were asking about [topic] and we discussed [key points] — let me continue from there."',
        '- You MUST explicitly tell the user what was discussed or asked in the previous conversation, so they feel acknowledged and recognized.',
        '- If any previous question or issue was unresolved, you MUST proactively bring it up. Example: "I noticed your previous query about [topic] may not have been fully resolved — let me help with that now."',
        '- ONLY mention fields that are actually present in the context above. Do NOT assume or fabricate anything.',
        '- Do NOT expose raw field names, JSON, enum values, or ISO timestamps in the email.',
        '- Convert all dates to human-readable format.',
        '- Keep tone warm, professional, and natural.',
        '- IMPORTANT IF ANY of the above context is present in older conversation then do not add these information again',
        '[END CONTEXT]',
      ].join('\n');

      Logger.log(
        '[ReturningUser] Context block built successfully for returning mailbot user',
      );
      return contextBlock;
    } catch (err) {
      Logger.warn(
        '[ReturningUser] Unexpected error in buildMailbotReturningUserSummary (non-blocking):',
        err?.message || err,
      );
      return '';
    }
  }

  /**
   * @developer : Ankur
   * @param data : emailId, campaignId
   * @returns : auto reply and its logs
   * @working : It is used to auto reply and follow ups to the emails and save the conversation in db.
   */
  async autoReplyToEmails(data: any, req?: any) {
    // '===================================LeadExtractionFromAutoReplyIn=====================================',
    const extractedData = await this.extractLeadInformationFromEmail(data, req);

    const { isMeetingBooked = null, google_meet_event = null } =
      extractedData?.appointmentDetails || {};
    // '===================================LeadExtractionFromAutoReplyOut====================================',

    const emailSetting = data.emailAssistanceSetting || null;
    const leadCollectionFields =
      emailSetting?.emailSetting?.leadCollectionInputFields;
    const defaultFields = ['meeting date and time'];
    const userDefinedFields: string[] = [];
    if (leadCollectionFields) {
      if (leadCollectionFields.isName) userDefinedFields.push('name');
      if (leadCollectionFields.isPhone) userDefinedFields.push('phone');
      if (leadCollectionFields.isAddress) userDefinedFields.push('address');
    }
    const fieldsToExtract = Array.from(
      new Set([
        ...(userDefinedFields.length ? userDefinedFields : defaultFields),
        'meeting date and time',
      ]),
    );
    let returningUserContext = '';
    if (data?.receiverEmail) {
      returningUserContext = await this.buildMailBotReturningUserSummary(
        data?.receiverEmail,
        data.campaignDetails?.addedBy || data?.addedBy || data?.userId,
      );
    }

    // Get CTA and unsubscribe sections using your existing function
    const { unsubscribeDiv, ctaSection } =
      await this.getCTAandUnsubscribeSection(
        data?.campaignDetails?.callOfAction || {},
      );

    const prompt = [
      {
        role: 'system',
        content: `You are a professional assistant who writes thoughtful and contextual email replies while also gathering important information. Your responses must strictly adhere to the context of the provided email conversation. Avoid generating random or unrelated content—focus only on the details provided in the previous and current email exchanges.

                  Each response must feel natural, conversational, and aligned with the tone of the ongoing discussion. Use friendly yet professional language, showing genuine understanding and empathy where appropriate. When information is missing for the requested fields, naturally incorporate questions to gather that information.

                  Always format the response as a JSON object in this structure: 
                  {
                    "reply": "<div>Your crafted reply in HTML format with proper paragraphs and line breaks</div>"
                  }

                  Do not include any placeholders, variables, or generic content. Respond only to the specifics of the conversation provided, and format the email in HTML for proper readability.
                  
                  IMPORTANT RULES FOR YOUR RESPONSE:
                  - Do NOT include ANY call-to-action links (like "Visit Us", "Email Us", "Call Us") in your reply.
                  - Do NOT include ANY unsubscribe links or unsubscribe messages in your reply.
                  - Do NOT include any buttons in your reply.
                  - Do NOT include any signatures, "Best regards", "Warm regards", or any closing statements - these will be added automatically.
                  - Do NOT include any sender details, company name, website, phone number, or branding.
                  - If the previous conversation contains an unsubscribe button or link, do not include it in your reply.
                  - Focus ONLY on the main email content that directly addresses the conversation and naturally asks for missing information.
                  
                  CRITICAL SIGNATURE RULE:
                  ${returningUserContext ? `\n\n${returningUserContext}` : ''}
                  Never reuse, reconstruct, infer, or repeat any email signature, footer, or sender details (such as name, designation, company name, website, phone number, or branding) that appear in the previous or current email conversation.
                  Even if a signature exists in the prior emails, you must NOT include it in your reply unless the user explicitly provides a new signature to include.`,
      },
      {
        role: 'user',
        content: `Here is the email conversation you need to respond to. First, carefully understand the context of the previous conversation, then read the current email, and write a reply that directly relates to the discussion while naturally asking for any missing information from these fields: **${fieldsToExtract.join(
          ', ',
        )}**,
        )}. Do not generate random or unrelated responses.

                  Previous Email Conversation for Context: ${JSON.stringify(
                    data?.previousEmailConversation,
                  )}

             NOTE: ${
               isMeetingBooked
                 ? `Your meeting has been successfully booked.  
                    Meeting Date and Time: ${google_meet_event?.startTime}  
                    Meeting End Time: ${google_meet_event?.endTime}  
                    Meeting Link: ${google_meet_event?.meetingLink}`
                 : `Your appointment request is noted. Someone from our team will reach out to you and help you book the appointment.`
             }

                 IMPORTANT: Do NOT include ANY call-to-action links, unsubscribe links, buttons, signatures, or closing statements like "Best regards" in your reply. Focus ONLY on the main content that addresses the conversation.

                  Current Email Conversation to Reply To: ${data?.emailContent},
                  Language Of the email reply: ${
                    emailSetting?.emailSetting?.language ||
                    data?.campaignDetails?.campaignLanguage
                  }

                  Strictly follow this content if available else default as you like it: ${
                    emailSetting?.emailSetting?.content ||
                    'use your default writing style'
                  }

                  Tone: 'friendly and professional'
                  Strictly follow the length in words: ${
                    emailSetting?.emailSetting?.size ||
                    data?.campaignDetails?.emailLength
                  }
                  Format: 'HTML with proper tags and formatting'

                  Your reply must:
                  1. Strictly adhere to the context of the email thread
                  2. Be well-written, personal, and align with the ongoing discussion
                  3. Naturally incorporate questions for any missing information from the specified fields
                  4. Format the response in HTML with proper paragraphs and line breaks
                  5. Return as a JSON object with "reply" key
                  6. Do NOT include any CTA links, unsubscribe links, buttons, or signatures
                  7. Do NOT include "Best regards" or any closing statement
                  8. Focus ONLY on the main content that addresses the conversation
                  
                  Do not include placeholders or generic responses.`,
      },
    ];
    // Sent the chunk data to find the better reply from GPT
    const kbId =
      data.campaignDetails?.campaignProject?.projectId || data?.knowledgebaseId;
    Logger.log(`Getting top chunks for knowledgebase: ${kbId}`);
    if (kbId) {
      const query = data.emailContent;
      const topChunks = await this.openaiChatbotService.getTopNChunks(
        new ObjectId(kbId),
        query,
        CHUNK_FILTER_THRESHOLD,
        undefined,
        data.campaignDetails?.addedBy || data?.addedBy || data?.userId,
        AssistantType.EMAIL_ASSISTANT,
      );
      Logger.debug('Top chunks:', topChunks);

      // Inject KB context into system prompt
      if (topChunks.length > 0) {
        const kbContext = topChunks
          .map((chunk, index) => `(${index + 1}) ${chunk.content}`)
          .join('\n\n');

        prompt.unshift({
          role: 'system',
          content: `
  Use the following knowledgebase information to answer the email.
  Only use it if relevant. Do not hallucinate.

    Knowledgebase Context:
    ${kbContext}
          `,
        });
      }
    }

    // end of the function
    const gptEmailReplyResponse = await this.openaiService.getChatGptCompletion(
      {
        messages: prompt as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_5_MINI,
      },
      [],
      req?.user._id,
      'email-auto-reply',
    );

    const gptEmailReplyResponseData = JSON.parse(
      gptEmailReplyResponse.response,
    );
    // Build the final email body by appending signature, CTA, and unsubscribe
    let finalBody = gptEmailReplyResponseData.reply;

    // Strip any closing salutation the LLM may have added despite instructions
    // (e.g. "Warm regards, Monu" or "Best regards") before we append our standard one
    finalBody = finalBody
      .replace(
        /\s*(?:<br\s*\/?>|<\/p>\s*(?:<p[^>]*>)?|\s+)*(?:warm regards|best regards|kind regards|regards|sincerely)[,.]?[\s\S]*$/gi,
        '',
      )
      .replace(/(?:\s*<br\s*\/?>)+\s*$/, '')
      .trim();

    // Add "Best regards," line with sender name
    const senderName = req?.user?.name || '';
    finalBody += `<br>Best regards,<br>${senderName}`;

    // Append CTA section if exists
    if (ctaSection && ctaSection.trim() !== '') {
      finalBody += ctaSection;
    }

    // ALWAYS append unsubscribe section at the very end
    finalBody += unsubscribeDiv;

    // Update the response with the final body
    const modifiedGptEmailReplyResponseData = {
      ...gptEmailReplyResponseData,
      reply: finalBody,
    };

    // Update user token usage
    this.updateTokenUsage(
      req.user._id,
      gptEmailReplyResponse.tokenUsage.total,
      data.campaignDetails?.campaignProject?.projectId || data?.knowledgebaseId,
    );

    data.leadInfo = extractedData?.data?.extractedInfo || {};

    // 'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN=======IN MANUAL REPLY==========NNNNNNNNNNNNNNNNNNNN',
    if (
      emailSetting.autoReply.manualReply === true ||
      emailSetting.autoReply.autoReply === false
    ) {
      const emailRecievedObj = {
        isReceivedEmail: true,
        isSentEmail: false,
        isAutoReply: false,
        subject: data.subject,
        emailTextContent: data.emailContent,
        dateAndTime: new Date(data.emailResponseReplyDate) || new Date(),
      };

      const emailSentObj = {
        isReceivedEmail: false,
        isSentEmail: true,
        isAutoReply: true,
        subject: data.subject,
        emailTextContent: modifiedGptEmailReplyResponseData.reply,
        dateAndTime: new Date(),
      };

      data.emailConversation = [emailSentObj];
      await this.saveConversationsToDraft(data, data.campaignDetails);

      const oauthToken = await this.campaignUserEmailTokenCollection.findOne({
        email: data.senderEmail,
      });

      if (oauthToken) {
        const emailServerConfig = {
          access_token: CryptoService.decryptPasskey(oauthToken.accessToken),
          refresh_token: CryptoService.decryptPasskey(oauthToken.refreshToken),
          token_type: oauthToken.tokenType,
          scope: oauthToken.scope,
          expiry_date: new Date(oauthToken.tokenExpiryDate).getTime(),
        };

        const emailData = {
          senderEmail: data.senderEmail,
          receiverEmail: data.receiverEmail,
          subject: data.subject,
          emailConversation: [emailSentObj],
        };

        if (data?.emailServerConfig?.emailServerApiKey) {
          this.gmailServiceApis.createDraft(
            data.senderEmail,
            emailServerConfig,
            emailData,
          );
        } else if (data?.smtpServerConfig) {
          const emailDraftMail = {
            to: data.receiverEmail,
            subject: data.subject,
            body: modifiedGptEmailReplyResponseData.reply,
            attachments: [],
          };
          this.imapService.createDraftEmail(
            data.senderEmail,
            emailDraftMail,
            data.imapServerConfig,
          );
        } else {
        }
      }

      if (extractedData.data.isLeadInfo) {
        data.emailConversation = [emailRecievedObj];
        await this.saveLeadGenerationConversationsToDB(
          data,
          data.campaignDetails,
        );
      }

      data.emailConversation = [emailRecievedObj];
      await this.saveConversationsToDB(data, data.campaignDetails);

      //Notification added from here.
      await this.emailAssistanceService.createEmailAssistanceNotification(
        data?.campaignDetails?.addedBy || data?.addedBy || data?.userId,
        data.receiverEmail,
        NOTIFICATION_TYPE.MANUAL,
        data,
      );

      // 'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN=======OUT MANUAL REPLY==========NNNNNNNNNNNNNNNNNNNN',
      return {
        statusCode: HttpStatus.OK,
        message: 'generated email added in the draft folder successfully',
      };
    }

    const emailRecievedObj = {
      isReceivedEmail: true,
      isSentEmail: false,
      isAutoReply: false,
      emailTextContent: data.emailContent,
      dateAndTime: new Date(data.emailResponseReplyDate) || new Date(),
    };

    const emailSentObj = {
      isReceivedEmail: false,
      isSentEmail: true,
      isAutoReply: true,
      emailTextContent: modifiedGptEmailReplyResponseData.reply,
      dateAndTime: new Date(),
    };

    data.emailConversation = [emailRecievedObj, emailSentObj];
    await this.saveConversationsToDB(data, data.campaignDetails);

    let decryptedApiKey = '';
    if (data?.emailServerConfig && !data?.smtpServerConfig) {
      decryptedApiKey = CryptoService.decryptPasskey(
        data?.emailServerConfig?.emailServerApiKey,
      );
    }

    if (data?.smtpServerConfig && !data?.emailServerConfig) {
      decryptedApiKey = '';
    }

    if (data?.smtpServerConfig && data?.emailServerConfig) {
      const emailAndPassKey = await this.campaignEmailPasskeyCollection.findOne(
        {
          userId: data?.addedBy,
          email: data?.senderEmail,
        },
      );

      if (emailAndPassKey) {
        decryptedApiKey = CryptoService.decryptPasskey(
          data.emailServerConfig?.emailServerApiKey,
        );
      }
    }

    if (decryptedApiKey && decryptedApiKey !== '') {
      await this.adminEmailService.sendCampaignEmailToLeads(
        data?.senderEmail,
        data?.receiverEmail,
        modifiedGptEmailReplyResponseData.reply,
        data?.subject,
        modifiedGptEmailReplyResponseData.reply,
        decryptedApiKey,
        req.user._id.toHexString(),
      );
    } else if (data?.smtpServerConfig && data.smtpServerConfig.host) {
      await this.nodeMailerService.sendEmail(
        data?.userId,
        data?.receiverEmail,
        data?.subject,
        modifiedGptEmailReplyResponseData.reply,
        '',
        [],
        data?.senderEmail,
        data,
      );
    } else {
    }

    if (extractedData.data.isLeadInfo) {
      data.emailConversation = [emailRecievedObj];
      await this.saveLeadGenerationConversationsToDB(
        data,
        data.campaignDetails,
      );
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Email sent successfully',
    };
  }

  /**
   * @developer : Ankur
   * @param data : email, date, limit, offset
   * @param campaignDetails : campaignDetails
   * @returns : emails
   * @working : handler method to fetch emails from imap and save the conversation in db.
   */

  async getEmailsFromImap(data: any, imapConfig?: any) {
    try {
      const { email, date, limit, offset } = data || {};
      const emails = await this.imapService.fetchEmails(
        email,
        date,
        limit,
        offset,
        imapConfig,
      );
      const parsedEmails = await this.imapService.parsedData(
        emails.inbox,
        emails.sent,
      );

      return parsedEmails;
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  async getEmailsFromImapV2(data: any, imapConfig?: any) {
    try {
      const { email, date, limit, offset } = data || {};
      const emails = await this.imapService.fetchEmailsV2(
        email,
        date,
        limit,
        offset,
        imapConfig,
      );
      const parsedEmails = await this.imapService.parsedDataV2(
        emails.inbox,
        emails.sent,
        emails.drafts,
      );

      return parsedEmails;
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param res : for sending response
   * @param payload : emails, campaignDetails
   * @returns : conversations
   * @working : helper method to save the conversation in db.
   */
  async saveConversationsToDB(data: any, campaignDetails: any) {
    try {
      let filter;
      // Standalone Assistant Conversation
      if (data?.standAloneAssistant) {
        filter = {
          userId: data.userId,
          knowledgebaseId: data.knowledgebaseId,
          userEmailId: data.senderEmail,
          audienceEmailId: data.receiverEmail,
          subject: data.subject,
          standAloneAssistant: true,
        };
      }
      //Campaign Conversation (unchanged)
      else {
        const existingConversation =
          await this.campaignImapConversationCollection.findOne({
            campaignId: campaignDetails._id.toHexString(),
            audienceEmailId: data.receiverEmail,
          });

        if (existingConversation) {
          filter = {
            campaignId: campaignDetails._id.toHexString(),
            audienceEmailId: data.receiverEmail,
          };
        } else {
          filter = {
            campaignId: campaignDetails._id.toHexString(),
            userEmailId: data.senderEmail,
            receiverEmail: data.receiverEmail,
            audienceEmailId: data.receiverEmail,
            subject: data.subject,
            userId: data.userId,
          };
        }
      }

      const update = {
        $addToSet: {
          emailConversation: { $each: data.emailConversation },
        },
        $set: {
          updatedAt: new Date(),
        },
      };

      const result = await this.campaignImapConversationCollection.updateOne(
        filter,
        update,
      );

      // If no document matched, insert a new one
      if (result.matchedCount === 0) {
        const insertData = {
          ...filter,
          emailConversation: data.emailConversation,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(data?.standAloneAssistant
            ? {
                standAloneAssistant: true,
                knowledgebaseId: data.knowledgebaseId,
                userId: data.userId,
                subject: data.subject,
                userEmailId: data.senderEmail,
                audienceEmailId: data.receiverEmail,
                receiverEmail: data.receiverEmail,
              }
            : {
                campaignId: campaignDetails._id.toHexString(),
                userId: data.userId,
                userEmailId: data.senderEmail,
                audienceEmailId: data.receiverEmail,
                receiverEmail: data.receiverEmail,
                knowledgebaseId: data.knowledgebaseId,
                subject: data.subject,
                standAloneAssistant: false,
              }),
        };
        await this.campaignImapConversationCollection.insertOne(insertData);
      }

      return { message: 'Conversation saved successfully' };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  async saveSyncDraftConversationsToDB(data: any, campaignDetails: any) {
    try {
      const filter = {
        userId: campaignDetails.user,
        userEmailId: data.senderEmail,
        audienceEmailId: data.receiverEmail,
        subject: data.subject,
      };
      const update = {
        $addToSet: { emailConversation: { $each: data.emailConversation } },
        $set: { updatedAt: new Date() },
      };
      const options = { upsert: true };
      const result = await this.campaignImapConversationCollection.updateOne(
        filter,
        update,
        options,
      );
      if (result.upsertedId) {
        return { message: 'New conversation inserted successfully' };
      } else {
        return { message: 'Conversation updated successfully' };
      }
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param data : email conversation data
   * @param campaignDetails : campaign details
   * @returns : status message
   * @working : helper method to save the lead generation conversation in db
   */
  async saveLeadGenerationConversationsToDB(data: any, campaignDetails: any) {
    try {
      let filter: any = {};
      const update: any = {
        $addToSet: { emailConversation: { $each: data.emailConversation } },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      };

      // ================== CASE 1: Standalone Assistant ==================
      if (data.standAloneAssistant && data.knowledgebaseId) {
        filter = {
          userId: data.userId,
          knowledgebaseId: data.knowledgebaseId,
          userEmailId: data.senderEmail,
          receiverEmail: data.receiverEmail,
          audienceEmailId: data.receiverEmail,
          standAloneAssistant: true,
        };

        // Add standalone-only fields on first insert
        update.$setOnInsert = {
          ...update.$setOnInsert,
          standAloneAssistant: true,
          knowledgebaseId: data.knowledgebaseId,
          receiverEmail: data.receiverEmail,
          audienceEmailId: data.receiverEmail,
          senderEmail: data.senderEmail,
          userId: data.userId,
          addedBy: data?.addedBy || data?.userId,
        };
      }
      // ================== CASE 2: Campaign Conversation ==================
      else if (campaignDetails?._id) {
        filter = {
          campaignId: campaignDetails._id.toHexString(),
          receiverEmail: data.receiverEmail,
        };

        // Add campaign-only fields on first insert
        update.$setOnInsert = {
          ...update.$setOnInsert,
          senderEmail: data.senderEmail,
          receiverEmail: data.receiverEmail,
          campaignId: campaignDetails._id.toHexString(),
          audienceEmailId: data.receiverEmail,
          addedBy: campaignDetails?.addedBy || data?.userId,
        };
      } else {
        throw new Error(
          'Cannot determine if conversation is Standalone or Campaign. Missing identifiers.',
        );
      }

      // ================== UPSERT ==================
      const options = { upsert: true };
      const result = await this.campaignLeadGenerationCollection.updateOne(
        filter,
        update,
        options,
      );

      const isNewDocument = Boolean(result.upsertedId);

      return {
        success: true,
        isNewDocument,
        message: isNewDocument
          ? 'New lead generation conversation inserted successfully'
          : 'Lead generation conversation updated successfully',
      };
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param data : emailId, campaignId
   * @returns : conversations
   * @working : will fetch all the conversations with endUser email id
   *            it is for client admin he/she can see all the conversations with endUser email id.
   */
  async getAllEmailConversationsWithCampaignAndEmailId(data: any) {
    try {
      const { emailId, campaignId } = data;
      const conversations = await this.campaignImapConversationCollection.find({
        receiverEmail: emailId,
        campaignId: campaignId,
      });
      return conversations.map(
        (conversation) => conversation.emailConversation,
      );
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /** ===================================================================================================================================== */

  /**
   * @developer : Ankur
   * @param userId : User ID to fetch config for
   * @returns : Email server configuration for the user
   * @working : Retrieves email server configuration for a specific user
   */
  async getAllEmailServerConfig(userId: string) {
    try {
      const emailServerConfig = await this.campaignEmailServerConfigCollection
        .find({ userId })
        .toArray();
      if (emailServerConfig.length === 0) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Email server config not found',
        };
      }
      const user = await this.userCollection.findOne(
        {
          _id: new ObjectId(userId),
        },
        { projection: { email: 1 } },
      );
      emailServerConfig.forEach((config) => {
        config['adminEmail'] = user.email;
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Email server config fetched successfully',
        data: emailServerConfig,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID to fetch configs for
   * @returns : Array of email server configurations
   * @working : Retrieves all email server configurations for an admin user
   */
  async getAllAdminEmailServerConfig(userId: string) {
    try {
      const emailServerConfig = await this.campaignEmailServerConfigCollection
        .find({ userId })
        .toArray();
      if (emailServerConfig.length === 0) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Email server config not found',
        };
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Email server config fetched successfully',
        data: emailServerConfig,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID to fetch verified config for
   * @returns : Verified email server configuration
   * @working : Retrieves verified email server configuration for an admin user
   */
  async getAllAdminEmailServerConfigVerified(userId: string) {
    try {
      const emailServerConfig =
        await this.campaignEmailServerConfigCollection.findOne({
          userId,
          status: EMAIL_SERVICE_PROVIDER_STATUS.VERIFIED,
        });
      if (!emailServerConfig) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Email server config not found',
        };
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Email server config fetched successfully',
        data: emailServerConfig,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param emailPasskeyConfig : userId and email passkey configuration details
   * @returns : Object with status code, message and updated/created config data
   * @working : Creates or updates email passkey configuration for a user
   *           If config exists, updates it, otherwise creates new config
   */
  async createOrUpdateEmailPasskeyConfig(
    userId: string,
    emailPasskeyConfig: any,
  ) {
    try {
      const existingConfig = await this.campaignEmailPasskeyCollection.findOne({
        userId: userId,
      });

      if (existingConfig) {
        const updatedConfig =
          await this.campaignEmailPasskeyCollection.findOneAndUpdate(
            { userId: userId },
            { $set: { ...emailPasskeyConfig, updatedAt: new Date() } },
            { returnDocument: 'after' },
          );

        return {
          statusCode: HttpStatus.OK,
          message: 'Email passkey config updated successfully',
          data: updatedConfig.value,
        };
      }

      const newEmailPasskeyConfig =
        await this.campaignEmailPasskeyCollection.insertOne({
          ...emailPasskeyConfig,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: userId,
        });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Email passkey config created successfully',
        data: newEmailPasskeyConfig,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID to fetch configs for
   * @param campaignEmailServerId : Campaign email server ID to filter by
   * @param page : Page number for pagination (starts from 1)
   * @param limit : Number of items per page
   * @returns : Paginated array of email and passkey configurations sorted by creation date
   * @working : Retrieves paginated email and passkey configurations for an admin user
   */
  async getAllAdminEmailAndPasskeyConfig(
    userId: string,
    campaignEmailServerId: string,
    page = 1,
    limit = 10,
  ) {
    try {
      // Calculate skip value based on page number (1-based)
      const skip = (page - 1) * limit;

      const authToken = await this.campaignEmailServerConfigCollection.findOne({
        userId,
      });
      // Get total count for pagination
      const totalCount =
        await this.campaignEmailPasskeyCollection.countDocuments({
          userId,
          campaignEmailServerId,
        });

      // Get paginated results
      const emailAndPasskeyConfig = await this.campaignEmailPasskeyCollection
        .find({ userId, campaignEmailServerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      if (emailAndPasskeyConfig.length === 0) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Email and passkey config not found',
          data: [],
          authToken,
        };
      }

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / limit);

      return {
        statusCode: HttpStatus.OK,
        message: 'Email and passkey config fetched successfully',
        data: emailAndPasskeyConfig,
        authToken,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID to fetch config for
   * @returns : Email and passkey configuration for the user
   * @working : Retrieves email and passkey configuration for a specific user
   */
  async getEmailAndPasskeyConfig(userId: string) {
    try {
      const emailAndPasskeyConfig =
        await this.campaignEmailPasskeyCollection.findOne({ userId });
      if (!emailAndPasskeyConfig) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Email and passkey config not found',
        };
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Email and passkey config fetched successfully',
        data: emailAndPasskeyConfig,
      };
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID to delete config for
   * @param emailId : Email ID to delete config for
   * @returns : Status of deletion operation
   * @working : Deletes email and passkey configuration for a specific user and email, and also removes the same email as a sender signature from Postmark
   */
  async deleteEmailAndPasskeyConfig(
    id: string,
    userId: string,
    emailId: string,
    res: any,
    authKey: string,
  ) {
    try {
      const decryptedAuthKey = CryptoService.decryptPasskey(authKey);
      // Remove the email as a sender signature from Postmark
      const senderSignature = await this.campaignEmailPasskeyCollection.findOne(
        {
          userId,
          email: emailId,
        },
      );
      await axios.delete(
        `${process.env.POSTMARK_API_URL}/senders/${senderSignature.senderSignatureId}`,
        {
          headers: {
            'X-Postmark-Account-Token': decryptedAuthKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      // if (removeSignatureResponse.status !== 200) {
      //   throw new Error('Failed to remove sender signature from Postmark');
      // }

      const result = await this.campaignEmailPasskeyCollection.deleteOne({
        _id: new ObjectId(id),
        userId,
        email: emailId,
      });

      await this.campaignWarmupCollection.deleteOne({
        userId,
        email: emailId,
      });

      if (result.deletedCount === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Email passkey configuration not found',
        });
      }

      return res.status(HttpStatus.OK).json({
        message:
          'Email passkey configuration and sender signature deleted successfully',
      });
    } catch (error) {
      Logger.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message:
          'Error deleting email passkey configuration or sender signature',
        error: error.message,
      });
    }
  }

  /**
   * @developer : Ankur
   * @param authKey : Postmark auth key to verify
   * @param secretKey : Postmark secret key to verify
   * @param userId : User ID to associate with config
   * @returns : Object with verification status and sender signatures if successful
   * @working : Verifies Postmark API keys and saves configuration if valid
   *           Also fetches and saves sender signatures on successful verification
   */
  async verifyPostmarkKey(
    authKey: string,
    secretKey: string,
    userId: string,
    res: any,
  ) {
    try {
      // Make request to Postmark API to verify both keys

      const decryptedSecretKey = CryptoService.decryptPasskey(secretKey);
      const decryptedAuthKey = CryptoService.decryptPasskey(authKey);
      const authResponse = await axios.get(
        `${process.env.POSTMARK_API_URL}/${process.env.POSTMARK_API_SLUG_SERVER}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-Postmark-Server-Token': decryptedSecretKey,
          },
        },
      );

      const secretResponse = await axios
        .get(`${process.env.POSTMARK_API_URL}/senders?count=50&offset=0`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-Postmark-Account-Token': decryptedAuthKey,
          },
        })
        .catch((error) => {
          this.logger.error(
            'Error verifying Postmark account token:',
            error.response?.data || error.message,
          );
          throw error;
        });

      if (authResponse.status === 200 && secretResponse.status === 200) {
        // Check if config exists

        const { exists, message } = await this.checkPostmarkKeysExistence(
          authKey,
          secretKey,
          userId,
        );

        if (exists) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            message,
          });
        }
        const existingConfig =
          await this.campaignEmailServerConfigCollection.findOne({
            userId: userId,
          });

        const configData = {
          emailServiceProviderName: EMAIL_SERVICE_PROVIDER_NAME.POSTMARK,
          updatedAt: new Date(),
          userId: userId,
          emailAccountAuthKey: authKey,
          emailServerApiKey: secretKey,
        };

        let configId;
        if (existingConfig) {
          // Update existing config
          const updatedDoc =
            await this.campaignEmailServerConfigCollection.findOneAndUpdate(
              { userId: userId },
              { $set: configData },
              { returnDocument: 'after' },
            );
          configId = updatedDoc.value._id.toString();
        } else {
          // Create new config
          const insertResult =
            await this.campaignEmailServerConfigCollection.insertOne({
              ...configData,
              createdAt: new Date(),
              status: EMAIL_SERVICE_PROVIDER_STATUS.VERIFIED,
            });
          configId = insertResult.insertedId.toString();
        }

        // const insertResult =
        //   await this.campaignEmailServerConfigCollection.insertOne({
        //     ...configData,
        //     createdAt: new Date(),
        //     status: EMAIL_SERVICE_PROVIDER_STATUS.VERIFIED,
        //   });
        // const configId = insertResult.insertedId.toString();

        // Fetch and save sender signatures since keys are verified
        try {
          const senderSignature =
            await this.fetchAndSavePostmarkSenderSignatures(
              userId,
              decryptedAuthKey,
              configId,
            );

          if (senderSignature.data) {
            this.addWarmupCount(userId); //this will help to maintain status of warmup collection

            //add default Setting for email assistance
            await this.addDefaultEmailAssistanceSetting(userId);

            return res.status(HttpStatus.OK).json({
              message: 'Postmark keys verified and saved successfully',
              isValid: true,
              campaignEmailServerId: configId,
              data: senderSignature.data,
            });
          }

          return res.status(HttpStatus.BAD_REQUEST).json({
            message: 'Failed to fetch sender signatures',
            isValid: false,
          });
        } catch (error) {
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'Error fetching sender signatures',
            isValid: false,
            error: error.message,
          });
        }
      }

      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid Postmark keys',
        isValid: false,
      });
    } catch (error) {
      Logger.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error verifying Postmark keys',
        isValid: false,
        error: error.message,
      });
    }
  }

  //Added by Nidhi Sharma for Default Prompt for Auto Reply
  private async addDefaultEmailAssistanceSetting(userId: string) {
    try {
      try {
        const result = await this.emailAssistanceSetting.updateOne(
          { userId }, // Filter by userId
          {
            $set: {
              autoReply: {
                isAutoReply: false,
                manualReply: false,
                noReplyAutoFollowup: true,
              },
              emailSetting: {
                size: 500,
                language: 'English',
                content: stringifyPrompt,
                isLeadCollection: true,
                leadCollectionInputFields: {
                  isName: true,
                  isPhone: true,
                  isAddress: true,
                },
              },
              ruleSetup: {
                customizeSettings: {
                  keywords: [],
                  emailExclusion: [],
                },
                fallbackMechanism: {
                  FALLBACK_MECHANISM_1: false,
                  FALLBACK_MECHANISM_2: false,
                  FALLBACK_MECHANISM_3: {
                    isForward: false,
                    forwardTo: [],
                  },
                },
                archiveManaged: {
                  timebasedArchive: false,
                  timebasedArchiveValue: {
                    from: '' as any,
                    to: '' as any,
                  },
                  emails: [],
                },
              },
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() }, // only when inserted for the first time
          },
          { upsert: true },
        );

        if (result.upsertedCount > 0) {
        } else if (result.modifiedCount > 0) {
        } else {
        }
      } catch (error) {
        this.logger.error(
          '❌ Failed to upsert email assistant settings:',
          error,
        );
        throw new Error('Error performing upsert operation');
      }
    } catch (error) {
      this.logger.error(
        '❌ Failed to add default email assistance settings:',
        error,
      );
    }
  }
  /**
   * @developer : AI Assistant
   * @param authKey : Postmark auth key to check
   * @param secretKey : Postmark secret key to check
   * @param userId : User ID to check against
   * @returns : Boolean indicating if keys already exist in a different account
   * @working : Checks if the provided Postmark keys already exist in the database
   *           for a different user account
   */
  async checkPostmarkKeysExistence(
    authKey: string,
    secretKey: string,
    userId: string,
  ): Promise<{ exists: boolean; message?: string }> {
    try {
      // Decrypt the keys for comparison
      const decryptedAuthKey = CryptoService.decryptPasskey(authKey);
      const decryptedSecretKey = CryptoService.decryptPasskey(secretKey);

      // Find all configurations with Postmark as the provider
      const existingConfigs = await this.campaignEmailServerConfigCollection
        .find({
          emailServiceProviderName: EMAIL_SERVICE_PROVIDER_NAME.POSTMARK,
          userId: { $ne: userId }, // Exclude the current user
        })
        .toArray();

      // Check each configuration to see if the keys match
      for (const config of existingConfigs) {
        const existingDecryptedAuthKey = CryptoService.decryptPasskey(
          config.emailAccountAuthKey,
        );
        const existingDecryptedSecretKey = CryptoService.decryptPasskey(
          config.emailServerApiKey,
        );

        if (
          existingDecryptedAuthKey === decryptedAuthKey ||
          existingDecryptedSecretKey === decryptedSecretKey
        ) {
          return {
            exists: true,
            message:
              'These Postmark keys are already in use by another account.',
          };
        }
      }

      // If no match found
      return { exists: false, message: 'Keys are unique' };
    } catch (error) {
      Logger.log('Error checking Postmark keys existence:', error);
      throw new Error('Failed to check if Postmark keys already exist');
    }
  }

  /**
   * @developer : Ankur
   * @param authKey : Postmark auth key to verify
   * @param secretKey : Postmark secret key to verify
   * @param userId : User ID to associate with config
   * @returns : Object with verification status and sender signatures if successful
   * @working : Verifies Postmark API keys and saves configuration if valid
   *           Also fetches and saves sender signatures on successful verification
   */
  async verifyPostmarkKeyV2(
    authKey: string,
    secretKey: string,
    userId: string,
    res: any,
  ) {
    try {
      const decryptedSecretKey = CryptoService.decryptPasskey(secretKey);
      const decryptedAuthKey = CryptoService.decryptPasskey(authKey);
      // Verify both keys in parallel
      const [authResponse, secretResponse] = await Promise.all([
        axios.get(
          `${process.env.POSTMARK_API_URL}/${process.env.POSTMARK_API_SLUG_SERVER}`,
          {
            headers: {
              Accept: 'application/json',
              'X-Postmark-Server-Token': decryptedSecretKey,
            },
          },
        ),
        axios.get(`${process.env.POSTMARK_API_URL}/senders?count=50&offset=0`, {
          headers: {
            Accept: 'application/json',
            'X-Postmark-Account-Token': decryptedAuthKey,
          },
        }),
      ]);

      if (authResponse.status === 200 && secretResponse.status === 200) {
        const configData = {
          emailServiceProviderName: EMAIL_SERVICE_PROVIDER_NAME.POSTMARK,
          updatedAt: new Date(),
          userId,
          emailAccountAuthKey: authKey,
          emailServerApiKey: secretKey,
        };

        // Upsert config
        const result =
          await this.campaignEmailServerConfigCollection.findOneAndUpdate(
            { userId },
            {
              $set: configData,
              $setOnInsert: {
                createdAt: new Date(),
                status: EMAIL_SERVICE_PROVIDER_STATUS.VERIFIED,
              },
            },
            { upsert: true, returnDocument: 'after' },
          );

        const configId = result.value._id.toString();

        // Fetch and save sender signatures
        const senderSignature = await this.fetchAndSavePostmarkSenderSignatures(
          userId,
          decryptedAuthKey,
          configId,
        );

        if (!senderSignature.data) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            message: 'Failed to fetch sender signatures',
            isValid: false,
          });
        }

        return res.status(HttpStatus.OK).json({
          message: 'Postmark keys verified and saved successfully',
          isValid: true,
          data: senderSignature.data,
        });
      }

      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid Postmark keys',
        isValid: false,
      });
    } catch (error) {
      Logger.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error verifying Postmark keys',
        isValid: false,
        error: error.message,
      });
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID to associate signatures with
   * @param authKey : Postmark auth key for API access
   * @returns : Object with status and fetched sender signatures
   * @working : Fetches sender signatures from Postmark API and saves them to database
   */
  async fetchAndSavePostmarkSenderSignatures(
    userId: string,
    authKey: string,
    configId: string,
  ) {
    try {
      // Fetch sender signatures from Postmark API
      const response = await axios.get(
        `${process.env.POSTMARK_API_URL}/senders?count=50&offset=0`,
        {
          method: 'GET',
          headers: {
            'X-Postmark-Account-Token': authKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status !== 200) {
        throw new Error('Failed to fetch sender signatures from Postmark');
      }

      const senderSignatures = response.data.SenderSignatures;

      // Save each sender signature to database, but skip if email already exists in SMTP settings
      // First, fetch all emails from the SMTP settings collection for this user
      const smtpSettings = await this.smtpCollection
        .find({ userId: userId })
        .project({ email: 1 })
        .toArray();
      const smtpEmails = new Set(
        smtpSettings.map((s) => s.email?.toLowerCase()),
      );

      // Filter out sender signatures whose email already exists in SMTP settings
      const filteredSenderSignatures = senderSignatures.filter(
        (signature) => !smtpEmails.has(signature.EmailAddress?.toLowerCase()),
      );

      const bulkOps = filteredSenderSignatures.map((signature) => ({
        updateOne: {
          filter: {
            userId: userId,
            email: signature.EmailAddress,
          },
          update: {
            $set: {
              userId: userId,
              email: signature.EmailAddress,
              name: signature.Name,
              replyToEmail: signature.ReplyToEmailAddress,
              confirmed: signature.Confirmed,
              domain: signature.Domain,
              emailServiceProviderName: EMAIL_SERVICE_PROVIDER_NAME.POSTMARK,
              updatedAt: new Date(),
              isVerified: signature.Confirmed,
              isPasskeyAdded: false,
              senderSignatureId: signature.ID,
              status: signature.Confirmed
                ? EMAIL_AND_PASSKEY_STATUS.VERIFIED
                : EMAIL_AND_PASSKEY_STATUS.PENDING,
              campaignEmailServerId: configId,
            },
            $setOnInsert: {
              createdAt: new Date(),
              passkey: signature?.PassKey || '',
              emailHost: signature?.EmailHost || '',
            },
          },
          upsert: true,
        },
      }));

      if (bulkOps.length > 0) {
        await this.campaignEmailPasskeyCollection.bulkWrite(bulkOps);
      }

      const signatures = await this.campaignEmailPasskeyCollection
        .find({
          userId: userId,
          campaignEmailServerId: configId,
        })
        .sort({ createdAt: -1 })
        .toArray();

      return {
        statusCode: HttpStatus.OK,
        message: 'Sender signatures fetched successfully',
        data: signatures,
      };
    } catch (error) {
      Logger.log(error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error fetching sender signatures',
        error: error.message,
      };
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID associated with signature
   * @param senderSignatureId : ID of sender signature to resend verification for
   * @param authKey : Postmark auth key for API access
   * @returns : Object with status of resend request
   * @working : Resends verification request for a Postmark sender signature
   */
  async resendEmailSenderSignatureRequest(
    userId: string,
    senderSignatureId: string,
    authKey: string,
    res: any,
  ) {
    try {
      const decryptedAuthKey = CryptoService.decryptPasskey(authKey);
      const response = await axios({
        method: 'POST',
        url: `${process.env.POSTMARK_API_URL}/senders/${senderSignatureId}/resend`,
        headers: {
          'X-Postmark-Account-Token': decryptedAuthKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) {
        throw new Error(
          `Failed to send verification request: ${response.statusText}`,
        );
      }

      if (response.status === 200) {
        await this.campaignEmailPasskeyCollection.updateOne(
          { userId, senderSignatureId },
          {
            $set: {
              isVerified: false,
              status: EMAIL_AND_PASSKEY_STATUS.PENDING,
              updatedAt: new Date(),
            },
          },
        );
      }

      return res.status(HttpStatus.OK).json({
        message: 'Verification request sent successfully',
      });
    } catch (error) {
      Logger.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to send verification request',
        error: error.message,
      });
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID to associate signature with
   * @param fromEmail : Email address for sender signature
   * @param accountAuthToken : Postmark account auth token
   * @param name : Optional name for sender signature
   * @param replyToEmail : Optional reply-to email address
   * @param personalNote : Optional personal note for verification email
   * @returns : Object with status and created sender signature data
   * @working : Creates a new sender signature in Postmark and saves to database
   */
  async createEmailSenderSignature(
    userId: string,
    data: CreateEmailSenderSignatureDto,
  ) {
    try {
      const {
        email,
        name,
        replyToEmail,
        personalNote,
        postmarkEmailAppPassword,
      } = data;

      // 1. Ensure user has a verified email server config
      const emailConfig =
        await this.campaignEmailServerConfigCollection.findOne({
          userId,
          status: EMAIL_SERVICE_PROVIDER_STATUS.VERIFIED,
        });

      if (!emailConfig) {
        throw new HttpException(
          {
            success: false,
            message: 'Email server configuration not found',
            statusCode: HttpStatus.NOT_FOUND,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const decryptedAuthKey = CryptoService.decryptPasskey(
        emailConfig.emailAccountAuthKey,
      );

      // 2. Prevent duplicate signature for the same email
      const existingSignature =
        await this.campaignEmailPasskeyCollection.findOne({
          userId,
          email,
        });

      if (existingSignature) {
        throw new BadRequestException({
          message:
            'Email already exists in SMTP/Postmark settings. Please use a different email.',
        });
      }

      // 3. Create sender signature in Postmark
      const response = await axios.post(
        `${process.env.POSTMARK_API_URL}/senders`,
        {
          FromEmail: email,
          Name: name || email,
          ReplyToEmail: replyToEmail || email,
          ConfirmationPersonalNote:
            personalNote ||
            'Please verify your email sender signature for Postmark integration.',
        },
        {
          headers: {
            'X-Postmark-Account-Token': decryptedAuthKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      const signature = response.data;

      // 4. Store sender signature details in DB
      const campaignEmailServer =
        await this.campaignEmailServerConfigCollection.findOne({
          _id: emailConfig._id,
        });

      await this.campaignEmailPasskeyCollection.insertOne({
        userId,
        email,
        name,
        replyToEmail: replyToEmail || email,
        domain: signature.Domain,
        passkey: signature.PassKey || '',
        emailHost: signature.EmailHost || '',
        isVerified: signature.Confirmed || false,
        isPasskeyAdded: false,
        senderSignatureId: signature.ID,
        status: signature.Confirmed
          ? EMAIL_AND_PASSKEY_STATUS.VERIFIED
          : EMAIL_AND_PASSKEY_STATUS.PENDING,
        updatedAt: new Date(),
        createdAt: new Date(),
        campaignEmailServerId: campaignEmailServer?._id.toHexString(),
        postmarkEmailAppPassword: postmarkEmailAppPassword || '',
      });

      // 5. Trigger warmup counter
      await this.addWarmupCount(userId);

      return signature;
    } catch (error) {
      Logger.error(
        `Error creating Postmark sender signature for user ${userId}: ${error.message}`,
      );

      throw new HttpException(
        error.response?.data?.Message || error.message || 'Unknown error',
        error.status,
      );
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID associated with email config
   * @param email : Email address to update
   * @param passkey : New passkey to set
   * @param emailHost : New email host to set
   * @returns : Object with update status
   * @working : Updates passkey and email host for a specific email configuration
   */
  async updatePasskeyAndEmailHost(
    userId: string,
    id: string,
    emailHost: string,
    res: any,
  ) {
    try {
      // Check if id and userId are valid
      if (!id || !userId) {
        throw new Error('Invalid id or userId');
      }

      // Verify the document exists before updating
      const existingDoc = await this.campaignEmailPasskeyCollection.findOne({
        _id: new ObjectId(id),
        userId: userId,
      });

      if (!existingDoc) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Document not found',
        });
      }

      const result = await this.campaignEmailPasskeyCollection.updateOne(
        { _id: new ObjectId(id), userId: userId },
        {
          $set: {
            emailHost: emailHost,
            isPasskeyAdded: true,
            updatedAt: new Date(),
          },
        },
      );

      if (result.matchedCount === 0) {
        throw new Error('No document matched the query criteria');
      }

      if (result.modifiedCount === 0) {
        throw new Error('Document was found but not modified');
      }

      return res.status(HttpStatus.OK).json({
        message: 'Passkey and email host updated successfully',
      });
    } catch (error) {
      Logger.log(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to update passkey and email host',
        error: error.message,
      });
    }
  }

  /**
   * @developer : Ankur
   * @param userId : User ID associated with signature
   * @param senderSignatureId : ID of sender signature to check
   * @param authKey : Postmark auth key for API access
   * @returns : Object with signature verification status
   * @working : Checks and updates verification status of a sender signature
   */
  async getEmailSenderSignatureStatus(
    userId: string,
    senderSignatureId: string,
    authKey: string,
  ) {
    try {
      const client = await axios.get(
        `${process.env.POSTMARK_API_URL}/senders/${senderSignatureId}`,
        {
          headers: {
            'X-Postmark-Account-Token': authKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      const data = client.data;

      await this.campaignEmailPasskeyCollection.updateOne(
        { userId, senderSignatureId },
        {
          $set: {
            ...(data?.Confirmed !== undefined && {
              isVerified: data.Confirmed,
            }),
            ...(data?.Confirmed !== undefined && {
              status: data.Confirmed
                ? EMAIL_AND_PASSKEY_STATUS.VERIFIED
                : EMAIL_AND_PASSKEY_STATUS.PENDING,
            }),
            ...(data?.Name && { name: data.Name }),
            ...(data?.Domain && { domain: data.Domain }),
            updatedAt: new Date(),
          },
        },
      );

      this.addWarmupCount(userId); //this will help to maintain status of warmup collection

      return {
        statusCode: HttpStatus.OK,
        message: 'Sender signature status fetched successfully',
        data: {
          isVerified: data?.Confirmed,
          status: data?.Confirmed
            ? EMAIL_AND_PASSKEY_STATUS.VERIFIED
            : EMAIL_AND_PASSKEY_STATUS.PENDING,
        },
      };
    } catch (error) {
      Logger.log(error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch sender signature status',
        error: error.message,
      };
    }
  }

  /**
   * @developer : Ankur
   * @param params : Object containing limit and offset for pagination
   * @returns : Array of pending email signatures
   * @working : Retrieves paginated list of email signatures with pending or failed status
   */
  async getPendingEmailSignatures(params: { limit: number; offset: number }) {
    try {
      const { limit, offset } = params;
      const statusFilter = {
        $in: [
          EMAIL_AND_PASSKEY_STATUS.FAILED,
          EMAIL_AND_PASSKEY_STATUS.PENDING,
        ],
      };
      const pendingEmails = await this.campaignEmailPasskeyCollection
        .find({ status: statusFilter })
        .skip(offset)
        .limit(limit)
        .toArray();

      return pendingEmails;
    } catch (error) {
      Logger.log(error);
      return [];
    }
  }

  /**
   * @developer : Ankur
   * @returns : Object containing status, message and data
   * @working : Adds warmup count for verified email signatures by counting associated audience records
   */
  async addWarmupCount(userId: string) {
    try {
      Logger.log('Starting addWarmupCount for userId:', userId);

      // Fetch all emails in one query
      const [emails] = await Promise.all([
        this.campaignEmailPasskeyCollection
          .find({ userId })
          .project({ email: 1, userId: 1, status: 1, _id: 0 })
          .toArray(),
      ]);

      // Process both regular and SMTP emails
      const allEmails = [...emails];

      if (allEmails.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDate = new Date();

        const operations = allEmails.map(async (email) => {
          // Find existing warmup document
          const existingDoc = await this.campaignWarmupCollection.findOne({
            userId: email.userId,
            email: email.email,
          });

          const warmupCount = existingDoc?.warmupCount || 0;

          // Determine if it's a new day
          const lastUpdateDate = new Date(existingDoc?.updatedAt || new Date());
          const isNewDay =
            lastUpdateDate.getTime() <
            new Date(currentDate.setHours(0, 0, 0, 0)).getTime();

          // Calculate max limit based on warmup count
          let maxLimit = 100; // Default limit
          if (warmupCount >= 1000 && isNewDay) {
            maxLimit = 3000;
          } else if (warmupCount >= 500 && isNewDay) {
            maxLimit = 1000;
          } else if (warmupCount >= 100 && isNewDay) {
            maxLimit = 500;
          }

          // Prepare warmup data
          const warmupData = {
            userId: email.userId,
            email: email.email,
            status: email.status,
            warmupCount,
            updatedMaxLimit:
              existingDoc && existingDoc.maxLimit > warmupCount
                ? existingDoc.maxLimit - warmupCount
                : existingDoc?.maxLimit || maxLimit,
          };

          // Update or insert document
          if (existingDoc) {
            await this.campaignWarmupCollection.updateOne(
              { userId: email.userId, email: email.email },
              {
                $set: {
                  ...(warmupData.warmupCount !== existingDoc.warmupCount &&
                  warmupData.warmupCount > existingDoc.warmupCount
                    ? { ...warmupData, updatedAt: new Date() }
                    : {}),
                  ...(maxLimit !== existingDoc.maxLimit ? { maxLimit } : {}),
                  status: warmupData.status, // Update status field
                },
              },
            );
          } else {
            await this.campaignWarmupCollection.insertOne({
              ...warmupData,
              isWarmUpEnabled: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              maxLimit,
            });
          }
        });

        await Promise.all(operations);
      }

      Logger.log('All warmup counts processed successfully');
      return {
        statusCode: HttpStatus.OK,
        message: 'Warmup counts processed successfully',
      };
    } catch (error) {
      Logger.error('Error processing warmup counts:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to process warmup counts',
        error: error.message,
      };
    }
  }

  /**
   * @developer : Ankur
   * @returns : Object containing status, message and data
   * @working : Adds warmup count for verified email signatures by incrementing count by one each time
   */
  async addWarmupCountV2(userId: string, email: string) {
    try {
      Logger.log('Starting addWarmupCountV2 for userId:', userId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = new Date();
      const existingDoc = await this.campaignWarmupCollection.findOne({
        userId: userId,
        email: email,
      });

      const lastUpdateDate = new Date(existingDoc?.updatedAt || new Date());
      const isNewDay =
        lastUpdateDate.getTime() <
        new Date(currentDate.setHours(0, 0, 0, 0)).getTime();
      const warmupCount = existingDoc ? existingDoc.warmupCount + 1 : 1;

      let maxLimit = 100;
      if (warmupCount >= 1000 && isNewDay) {
        maxLimit = 3000;
      } else if (warmupCount >= 500 && isNewDay) {
        maxLimit = 1000;
      } else if (warmupCount >= 100 && isNewDay) {
        maxLimit = 500;
      }

      // Prepare warmup data
      const warmupData = {
        userId: userId,
        email: email,
        status: EMAIL_AND_PASSKEY_STATUS.VERIFIED,
        warmupCount,
        updatedMaxLimit:
          (existingDoc && existingDoc.maxLimit > warmupCount
            ? existingDoc.maxLimit - warmupCount
            : existingDoc?.maxLimit) || maxLimit,
      };

      // Update or insert document
      if (existingDoc) {
        await this.campaignWarmupCollection.updateOne(
          { userId: userId, email: email },
          {
            $set: {
              ...warmupData,
              updatedAt: new Date(),
              status: warmupData.status,
              ...(maxLimit !== existingDoc.maxLimit ? { maxLimit } : {}),
            },
          },
        );
      } else {
        await this.campaignWarmupCollection.insertOne({
          ...warmupData,
          isWarmUpEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          maxLimit,
        });
      }

      Logger.log('All warmup counts processed successfully');
      return {
        statusCode: HttpStatus.OK,
        message: 'Warmup counts processed successfully',
      };
    } catch (error) {
      Logger.error('Error processing warmup counts:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to process warmup counts',
        error: error.message,
      };
    }
  }
  /**
   * @developer : Ankur
   * @param userId : User ID for which emails are to be fetched
   * @returns : Object containing status, message and data
   * @working : Retrieves all emails related to a particular user
   */
  async getEmailsByUserId(userId: string) {
    try {
      // Use Promise.all to run all countDocuments queries in parallel
      const emailsWithWarmupCount = await this.campaignWarmupCollection
        .find(
          {
            userId: userId,
            status: EMAIL_AND_PASSKEY_STATUS.VERIFIED,
          },
          {
            projection: {
              email: 1,
              warmupCount: 1,
              updatedMaxLimit: 1,
              _id: 0,
            },
          },
        )
        .toArray();

      return {
        statusCode: HttpStatus.OK,
        message: 'Emails fetched successfully',
        data: emailsWithWarmupCount, // Returns array of {email, warmupCount} objects
      };
    } catch (error) {
      Logger.log(error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch emails',
        error: error.message,
      };
    }
  }

  /**
   * @developer : Ankur
   * @param email : Email address to unsubscribe
   * @param token : Token to decrypt email
   * @returns : Object with update status
   * @working : Unsubscribes from a campaign
   */
  async unsubscribeFromCampaign(token: string, res: any) {
    try {
      const updateTime = new Date();
      let email: string;
      let campaignId: string;
      let addedBy: string;
      let isUnsubscriptionForSender = false;
      // Case 1: Token-based unsubscription
      if (token) {
        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
        email = decodedToken['email'];
        campaignId = decodedToken['campaignId'];
        addedBy = decodedToken['addedBy'];
        isUnsubscriptionForSender =
          decodedToken['isUnsubscriptionForSender'] || false;

        await this.db.collection('unsubscriptionsEmails').updateOne(
          { email, campaignId, isUnsubscriptionForSender },
          {
            $set: { updatedAt: updateTime },
            $setOnInsert: {
              email,
              campaignId,
              addedBy,
              isUnsubscriptionForSender,
              createdAt: updateTime,
              unsubscribedAt: updateTime,
            },
          },
          { upsert: true },
        );

        return res.status(HttpStatus.OK).json({
          message: 'Unsubscribed from campaign successfully',
        });
      }

      // Case 2: Manual unsubscription (no token)
      if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Email is required when token is not provided',
        });
      }

      // Update in audience collections
      const audience = await this.campaignAudienceCollection.findOne({ email });
      if (!audience) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Email not found',
        });
      }

      await this.campaignAudienceCollection.updateOne(
        { email },
        { $set: { subscribeStatus: false } },
      );

      const duplicateAudience =
        await this.campaignDuplicateAudienceCollection.findOne({ email });
      if (duplicateAudience) {
        await this.campaignDuplicateAudienceCollection.updateOne(
          { email },
          { $set: { subscribeStatus: false } },
        );
      }

      // Log in unsubscriptions collection
      await this.db.collection('unsubscriptionsEmails').updateOne(
        { email, campaignId, addedBy, isUnsubscriptionForSender },
        {
          $set: { updatedAt: updateTime },
          $setOnInsert: {
            email,
            unsubscribedAt: updateTime,
            createdAt: updateTime,
          },
        },
        { upsert: true },
      );

      return res.status(HttpStatus.OK).json({
        message: 'Unsubscribed from campaign successfully',
      });
    } catch (error) {
      this.logger.error('Error unsubscribing:', error);
      return res.status(HttpStatus.BAD_REQUEST).json({
        message:
          error.name === 'TokenExpiredError'
            ? 'Link has expired'
            : 'Something went wrong',
      });
    }
  }
  // Real-time reply pipeline used by ImapIdleWatcherService; mirrors the IMAP-poll path below (emailsAutoFollowbackByLLMV2) but keyed on campaignId + audienceEmailId instead of exact-subject matching.
  async processInboundReply(input: {
    senderEmail: string;
    receiverEmail: string;
    subject?: string;
    emailContent: string;
    receivedDate: Date;
    source: string;
  }) {
    const {
      senderEmail,
      receiverEmail,
      subject,
      emailContent,
      receivedDate,
      source,
    } = input;
    try {
      if (!senderEmail || !receiverEmail) {
        this.logger.log(
          `processInboundReply (${source}): missing To/From, cannot process`,
        );
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: missing addresses',
        };
      }

      const [passkeyOwner, smtpOwner] = await Promise.all([
        this.campaignEmailPasskeyCollection.findOne({ email: senderEmail }),
        this.smtpCollection.findOne({ email: senderEmail }),
      ]);
      const userId: string = passkeyOwner?.userId || smtpOwner?.userId;

      if (!userId) {
        this.logger.log(
          `processInboundReply (${source}): no account owns sending inbox ${senderEmail}`,
        );
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: unrecognized inbox',
        };
      }

      // Same lead on 2+ campaigns sharing a sender is still ambiguous; tie-break to most recent (proper fix: match In-Reply-To to a stored Message-ID, not implemented).
      const campaignAudience = await this.campaignAudienceCollection
        .find({
          email: receiverEmail,
          addedBy: userId,
          senderEmailId: senderEmail,
        })
        .sort({ createdAt: -1 })
        .limit(1)
        .next();

      if (!campaignAudience) {
        this.logger.log(
          `processInboundReply (${source}): ${receiverEmail} is not a known audience member of any campaign sent from ${senderEmail}`,
        );
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: unrecognized audience',
        };
      }

      const campaign = await this.campaignCollection.findOne({
        _id: new ObjectId(campaignAudience.campaignId),
      });

      if (!campaign) {
        this.logger.log(
          `processInboundReply (${source}): campaign ${campaignAudience.campaignId} not found`,
        );
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: campaign not found',
        };
      }

      const emailConversationDuplicate =
        await this.campaignImapConversationCollection.findOne({
          campaignId: campaignAudience.campaignId,
          audienceEmailId: receiverEmail,
        });

      if (!emailConversationDuplicate) {
        this.logger.log(
          `processInboundReply (${source}): no existing conversation for ${receiverEmail} on campaign ${campaignAudience.campaignId}`,
        );
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: no existing conversation',
        };
      }

      const sentEmailsCount =
        emailConversationDuplicate.emailConversation?.filter(
          (conversation) => conversation.isSentEmail === true,
        ).length || 0;

      const isExistingEmail = emailConversationDuplicate.emailConversation.some(
        (conversation) => conversation.emailTextContent === emailContent,
      );
      if (isExistingEmail) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: duplicate content',
        };
      }

      const [emailAssistanceSetting, emailServerConfig, smtpConfig] =
        await Promise.all([
          this.emailAssistanceSetting.findOne({ userId }),
          this.campaignEmailServerConfigCollection.findOne({ userId }),
          this.smtpCollection.findOne({ userId, email: senderEmail }),
        ]);

      let smtpServerConfig;
      let imapServerConfig;
      if (smtpConfig) {
        smtpServerConfig = {
          email: senderEmail,
          host: smtpConfig?.host,
          password: CryptoService.decryptPasskey(smtpConfig?.password),
          port: smtpConfig?.port,
          secure: smtpConfig?.secure,
          authTimeout: smtpConfig?.timeout,
          tlsOptions: { rejectUnauthorized: false },
        };
        imapServerConfig = {
          host: smtpConfig?.imapHost || smtpConfig?.host,
          user: senderEmail,
          password: CryptoService.decryptPasskey(smtpConfig?.password),
          port: 993,
          secure: true,
          authTimeout: smtpConfig?.timeout,
          tlsOptions: { rejectUnauthorized: false },
        };
      }

      const data = {
        campaignDetails: campaign,
        campaignId: campaign._id.toHexString(),
        senderEmail,
        receiverEmail,
        subject: subject || emailConversationDuplicate.subject,
        emailContent,
        emailServerConfig,
        previousEmailConversation: emailConversationDuplicate.emailConversation,
        emailResponseReplyDate: receivedDate,
        emailAssistanceSetting,
        smtpServerConfig,
        imapServerConfig,
        addedBy: userId,
        userId,
        emailConversationId: emailConversationDuplicate._id.toHexString(),
      };

      const req = { user: { _id: new ObjectId(userId) } };

      const emailContentDetectionAndRuleExecution =
        await this.handleEmailContentDetectionAndRuleExecution(data, req);

      if (
        emailContentDetectionAndRuleExecution?.data
          ?.keywordDetectionAndMarkEmailAsSpam?.['data']?.isSpam ||
        emailContentDetectionAndRuleExecution?.data
          ?.keywordDetectionAndMarkEmailAsSpam?.['data']?.isRestrictedToReply ||
        emailContentDetectionAndRuleExecution?.data?.markEmailAsUnresolved?.[
          'data'
        ]?.isUnresolved
      ) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: spam/restricted/unresolved',
        };
      }

      const emailIdExclusion =
        emailAssistanceSetting?.ruleSetup?.customizeSettings?.emailExclusion;
      if (
        emailIdExclusion?.length > 0 &&
        emailIdExclusion.some((emailId) => emailId === senderEmail)
      ) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Skipped: excluded sender',
        };
      }

      if (sentEmailsCount >= campaign.maxEmailsPerLead) {
        this.logger.log(
          `processInboundReply (${source}): maxEmailsPerLead reached for ${receiverEmail} on campaign ${campaignAudience.campaignId} — recording reply and extracting lead info, but not sending another auto-reply`,
        );
        await this.recordReplyWithoutAutoReply(data, req);
        return {
          statusCode: HttpStatus.OK,
          message: 'Processed: maxEmailsPerLead reached, no auto-reply sent',
        };
      }

      await this.autoReplyToEmails(data, req);

      return { statusCode: HttpStatus.OK, message: 'Processed' };
    } catch (error) {
      this.logger.error(
        `Error in processInboundReply (${source}): ${error.message}`,
        error.stack,
      );
      return { statusCode: HttpStatus.OK, message: 'Error logged, no-op' };
    }
  }

  // Records a reply and extracts lead info past maxEmailsPerLead, without sending another auto-reply.
  private async recordReplyWithoutAutoReply(data: any, req: any) {
    const extractedData = await this.extractLeadInformationFromEmail(data, req);

    const emailReceivedObj = {
      isReceivedEmail: true,
      isSentEmail: false,
      isAutoReply: false,
      subject: data.subject,
      emailTextContent: data.emailContent,
      dateAndTime: new Date(data.emailResponseReplyDate) || new Date(),
    };

    if (extractedData?.data?.isLeadInfo) {
      data.leadInfo = extractedData?.data?.extractedInfo || {};
      data.emailConversation = [emailReceivedObj];
      await this.saveLeadGenerationConversationsToDB(
        data,
        data.campaignDetails,
      );
    }

    data.emailConversation = [emailReceivedObj];
    await this.saveConversationsToDB(data, data.campaignDetails);
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @returns : auto reply and its logs
   * @working : It is used to auto reply V2 with admin rule executio and follow ups to the emails and save the conversation in db.
   */
  async emailsAutoFollowbackByLLMV2(userId: string) {
    try {
      const limit = 10;
      let offset = 0;
      let hasMoreCampaigns = true;
      const emailAssistanceSetting = await this.emailAssistanceSetting.findOne({
        userId: userId,
      });

      while (hasMoreCampaigns) {
        const { data: campaigns } = await this.fetchAllCampaignForAUser(
          { limit, offset },
          userId,
        );
        if (campaigns.length === 0) {
          hasMoreCampaigns = false;
          break;
        }

        for (const campaign of campaigns) {
          const { emailAndSenderLimit } = campaign;
          const req = { user: { _id: new ObjectId(userId) } };

          await Promise.allSettled(
            emailAndSenderLimit.map(async (email) => {
              try {
                const [
                  emailServerConfig,
                  emailServerTokenConfig,
                  emailToken,
                  smtpConfig,
                ] = await Promise.all([
                  this.campaignEmailPasskeyCollection.findOne({
                    email: email.email,
                  }),
                  this.campaignEmailServerConfigCollection.findOne({
                    userId,
                    emailServiceProviderName:
                      EMAIL_SERVICE_PROVIDER_NAME.POSTMARK,
                  }),
                  this.campaignUserEmailTokenCollection.findOne({
                    email: email.email,
                  }), //bug found server can not be provided

                  this.smtpCollection.findOne({
                    userId: userId,
                    email: email.email,
                  }),
                ]);

                if (!emailToken && !smtpConfig) {
                  return { status: 404, message: 'Email token not found' };
                }

                //====================================================================================
                // if (
                //   emailToken?.refreshToken &&
                //   emailToken?.refreshToken !== ''
                // ) {
                //   //TODO: change is required with smtp flow
                //   if (emailToken?.server === EMAIL_SERVER_TYPE.GOOGLE) {
                //     refreshAccessToken =
                //       await this.googleConsoleService.refreshAccessToken(
                //         emailToken.email,
                //         emailToken.refreshToken,
                //       );
                //   } else if (
                //     emailToken?.server === EMAIL_SERVER_TYPE.MICROSOFT
                //   ) {
                //     refreshAccessToken =
                //       await this.microsoftConsoleService.refreshAccessToken(
                //         emailToken?.refreshToken,
                //         emailToken?.email,
                //       );
                //   } else {
                //     refreshAccessToken =
                //       await this.yahooConsoleService.refreshAccessToken(
                //         emailToken?.refreshToken,
                //         emailToken?.email,
                //       );
                //   }
                // }

                let smtpServerConfig;
                let imapServerConfig;
                if (smtpConfig) {
                  smtpServerConfig = {
                    email: email.email,
                    host: smtpConfig?.host,
                    password: CryptoService.decryptPasskey(
                      smtpConfig?.password,
                    ),
                    port: smtpConfig?.port,
                    secure: smtpConfig?.secure,
                    authTimeout: smtpConfig?.timeout,
                    tlsOptions: {
                      rejectUnauthorized: false,
                    },
                  };

                  imapServerConfig = {
                    host: smtpConfig?.imapHost || smtpConfig?.host, //TODO: change to imapHost when smtp flow is implemented
                    user: email.email,
                    password: CryptoService.decryptPasskey(
                      smtpConfig?.password,
                    ),
                    port: 993,
                    secure: true,
                    authTimeout: smtpConfig?.timeout,
                    tlsOptions: {
                      rejectUnauthorized: false,
                    },
                  };
                }
                //====================================================================================

                let accessToken;
                let imapConfig;
                // if (emailToken) {
                //   accessToken =
                //     refreshAccessToken ||
                //     CryptoService.decryptPasskey(emailToken?.accessToken);

                //   const _build_XOAuth2_token = (user = '', access_token = '') =>
                //     Buffer.from(
                //       `user=${user}\x01auth=Bearer ${access_token}\x01\x01`,
                //       'utf-8',
                //     ).toString('base64');

                //   imapConfig = {
                //     user: email.email,
                //     xoauth2: _build_XOAuth2_token(email.email, accessToken),
                //     host: emailServerConfig?.emailHost || 'imap.gmail.com',
                //     port: 993,
                //     tls: true,
                //     authType: 'XOAUTH2',
                //     tlsOptions: {
                //       rejectUnauthorized: false,
                //     },
                //   };
                // }

                //todo: new config object for smtp read flow.
                // const previousDay = new Date(
                //   new Date().setDate(new Date().getDate() - 1),
                // );

                const currentDay = new Date().setDate(new Date().getDate());
                const payload = {
                  emailAssistanceSetting: emailAssistanceSetting,
                  token: emailToken,
                  email: email.email,
                  date: currentDay,
                  limit: 100, // TODO: drive from constant or some conditioned value.
                  offset: 0,
                };

                //============================================================================================
                let currentDayConversation;
                // if (
                //   emailToken &&
                //   emailToken?.server !== EMAIL_SERVER_TYPE.MICROSOFT
                // ) {
                //   //todo: add the new way to fetch email using google gmail apis.
                //   currentDayConversation = await this.getEmailsFromImap(
                //     payload,
                //     imapConfig,
                //   );
                // } else
                if (smtpConfig && smtpConfig?.host) {
                  currentDayConversation = await this.getEmailsFromImapV2(
                    payload,
                    imapServerConfig,
                  );
                }
                // else {
                //   currentDayConversation =
                //     await this.microsoftConsoleService.fetchEmails(
                //       accessToken,
                //       '',
                //       payload.limit,
                //       payload.offset,
                //     );
                // }
                //===============================================================================================
                if (
                  currentDayConversation &&
                  currentDayConversation.length > 0
                ) {
                  await Promise.all(
                    currentDayConversation.map(async (emailImap) => {
                      try {
                        const extractEmails = (text) => {
                          const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
                          return text.match(emailRegex) || []; // Returns an array of emails or empty array if none found
                        };
                        const emails = extractEmails(emailImap.from);
                        const [previousEmailConversation, campaignAudience] =
                          await Promise.all([
                            this.campaignImapConversationCollection.findOne({
                              campaignId: campaign._id.toHexString(),
                              // userEmailId: email.email,
                              audienceEmailId: emails[0],
                            }),

                            this.campaignAudienceCollection.findOne({
                              email: emails[0],
                              addedBy: userId,
                            }),
                          ]);

                        const sentEmailsCount =
                          previousEmailConversation?.emailConversation?.filter(
                            (conversation) => conversation.isSentEmail === true,
                          ).length || 0;

                        if (campaignAudience) {
                          const subject = emailImap.subject
                            .replace(/^Re:\s*/i, '')
                            .trim();

                          const emailConversationDuplicate =
                            await this.campaignImapConversationCollection.findOne(
                              {
                                campaignId: campaign._id.toHexString(),
                                // userEmailId: email.email,
                                audienceEmailId: emails[0],
                                subject: subject,
                              },
                            );

                          if (emailConversationDuplicate) {
                            const isExistingEmail =
                              emailConversationDuplicate.emailConversation.some(
                                (conversation) =>
                                  conversation.emailTextContent ===
                                    emailImap.htmlContent ||
                                  conversation.emailTextContent ===
                                    emailImap.textContent,
                              );

                            if (!isExistingEmail) {
                              const data = {
                                ...payload,
                                campaignDetails: campaign,
                                campaignId: campaign._id.toHexString(),
                                senderEmail: email.email,
                                receiverEmail: emails[0],
                                subject: emailImap.subject,
                                emailContent:
                                  emailImap.htmlContent ||
                                  emailImap.textContent,
                                emailServerConfig: emailServerTokenConfig,
                                previousEmailConversation:
                                  emailConversationDuplicate.emailConversation,
                                emailResponseReplyDate: emailImap.date,
                                emailAssistanceSetting: emailAssistanceSetting,
                                smtpServerConfig: smtpServerConfig,
                                imapServerConfig: imapServerConfig,
                                addedBy: userId,
                                userId: userId,
                                emailConversationId:
                                  emailConversationDuplicate?._id.toHexString() ||
                                  previousEmailConversation?._id.toHexString(),
                                accessToken,
                              };
                              const emailContentDetectionAndRuleExecution =
                                await this.handleEmailContentDetectionAndRuleExecution(
                                  data,
                                  req,
                                );
                              if (
                                !emailContentDetectionAndRuleExecution?.data
                                  .keywordDetectionAndMarkEmailAsSpam['data']
                                  ?.isSpam &&
                                !emailContentDetectionAndRuleExecution?.data
                                  .keywordDetectionAndMarkEmailAsSpam['data']
                                  ?.isRestrictedToReply &&
                                !emailContentDetectionAndRuleExecution?.data
                                  .markEmailAsUnresolved['data'].isUnresolved
                              ) {
                                const emailIdExclusion =
                                  emailAssistanceSetting?.ruleSetup
                                    ?.customizeSettings?.emailExclusion;
                                if (emailIdExclusion?.length > 0) {
                                  const isEmailExcluded = emailIdExclusion.some(
                                    (emailId) => emailId === email.email,
                                  );
                                  if (isEmailExcluded) {
                                    return;
                                  }
                                }
                                if (
                                  sentEmailsCount >= campaign.maxEmailsPerLead
                                ) {
                                  this.logger.log(
                                    `emailsAutoFollowbackByLLMV2: maxEmailsPerLead reached for ${
                                      emails[0]
                                    } on campaign ${campaign._id.toHexString()} — recording reply and extracting lead info, but not sending another auto-reply`,
                                  );
                                  await this.recordReplyWithoutAutoReply(
                                    data,
                                    req,
                                  );
                                } else {
                                  await this.autoReplyToEmails(data, req);
                                }
                              }
                            }
                          }
                        }
                      } catch (error) {
                        this.logger.error(
                          `Error processing email conversation: ${error.message}`,
                        );
                        return {
                          status: 500,
                          message: 'Error processing email conversation',
                          error,
                        };
                      }
                    }),
                  );
                }
              } catch (error) {
                this.logger.error(
                  `Error processing email ${email.email}: ${error.message}`,
                );
                return {
                  status: 500,
                  message: 'Error processing email',
                  error,
                };
              }
            }),
          );
        }
        offset += limit;
      }
      return { status: 200, message: 'Successfully processed all emails' };
    } catch (error) {
      this.logger.error(`Error in emailsAutoFollowbackByLLM: ${error.message}`);
      return { status: 500, message: 'Internal server error', error };
    }
  }

  /**
   * @developer : Ankur
   * @param emails : array of emails to verify
   * @returns : verification results for all emails
   * @working : It is used to verify multiple emails in batches using the Outscrapper API
   */
  async outscrapperEmailsVerifier(emails: string[]) {
    const headers = {
      'X-API-KEY': process.env.OUTSCRAPPER_AUTH_KEY,
    };

    const batchSize = 100;
    const allResults: any[] = [];

    // Process emails in batches if more than 100
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const queryString = batch.map((email) => `query=${email}`).join('&');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        let response: Response;
        try {
          response = await fetch(
            `https://api.app.outscraper.com/validators/email?${queryString}&async=false`,
            {
              method: 'GET',
              headers: headers,
              signal: controller.signal,
            },
          );
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          this.logger.error(
            `Email verification batch failed with status ${response.status}, skipping this batch`,
          );
          continue;
        }

        const data = await response.json();
        allResults.push(...(data?.data ?? []));
      } catch (error) {
        // Email verification is a "nice to have" enrichment on top of leads
        // that were already found - a single batch hitting a network error,
        // a timeout, or a non-JSON (e.g. HTML error page) response should
        // not discard every lead the scrape already found. Skip this batch
        // and keep going instead of throwing.
        this.logger.error(
          'Error verifying emails for a batch, skipping:',
          error?.message,
        );
      }
    }

    return { data: allResults };
  }
  /**
   * @developer : Deepanshu
   * @param queries : array of search queries to execute
   * @param async : boolean to determine if the search should be asynchronous
   * @param pagesPerQuery : number of pages to return per query (default: 1)
   * @returns : search results from Google Search API
   * @working : It is used to perform Google searches using the Outscrapper API
   */
  async outscrapperGoogleSearch(
    queries: string[],
    async: boolean,
    pagesPerQuery?: number,
  ) {
    try {
      const headers = {
        'X-API-KEY': process.env.OUTSCRAPPER_AUTH_KEY,
        'Content-Type': 'application/json',
      };

      const queryParams = new URLSearchParams();

      queries.forEach((query) => {
        queryParams.append('query', query);
      });

      if (pagesPerQuery) {
        queryParams.append('pagesPerQuery', pagesPerQuery.toString());
      }
      queryParams.append('async', async.toString());

      const URL = `https://api.app.outscraper.com/google-search-v3?${queryParams.toString()}`;
      const response = await fetch(URL, {
        method: 'GET',
        headers: headers,
      });

      const data = await response.json();
      Logger.log('Google Search API Response:', data);
      return data;
    } catch (error) {
      Logger.error('Error in Google Search API:', error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param email : single email to verify
   * @returns : verification result for the email
   * @working : It is used to verify a single email using the Outscrapper API
   */
  async outscrapperEmailVerifier(email: string) {
    try {
      const headers = {
        'X-API-KEY': process.env.OUTSCRAPPER_AUTH_KEY,
      };

      const response = await fetch(
        `https://api.app.outscraper.com/validators/email?query=${email}&async=false`,
        {
          method: 'GET',
          headers: headers,
        },
      );

      const data = await response.json();
      return data;
    } catch (error) {
      this.logger.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param req : Request object containing user details
   * @param payload : Contains campaign details and sender email info
   * @param file : CSV file containing email data
   * @returns : Object containing parsed and duplicate emails with verification status
   * @working : Parses CSV file and saves email data with verification status
   *
   * Changes from V1:
   * - Added email verification using Outscraper API
   * - Verifies emails in bulk for better performance
   * - Includes verification status in response
   * - Improved error handling and validation
   * - Added size limit checks for file and email count
   * - Stricter CSV format validation
   */
  async csvParserV2(req, payload: any, file: Express.Multer.File) {
    try {
      const currentUser = req.user._id.toHexString();
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
      const MAX_EMAIL_COUNT = 500;

      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File size exceeds the 10 MB limit');
      }

      const fileContent = file.buffer.toString('utf-8');
      const parsedEmails = [];
      const duplicateEmails = [];
      let emailCount = 0;
      const emailsToVerify = [];
      const unsubscribedEmails = [];
      const seenEmails = new Set();

      // Parse the CSV file
      return new Promise((resolve, reject) => {
        papaparse.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          trimHeaders: true,
          complete: async (results) => {
            try {
              if (results.data.length < 1) {
                throw new BadRequestException(
                  `No data found in the CSV file. Please make sure the file has a header row`,
                );
              }

              // Collect all unique emails for verification
              results.data.forEach((row) => {
                if (!('Email' in row) || !('WebsiteUrl' in row)) {
                  throw new BadRequestException(
                    `Invalid CSV format. Please ensure the CSV file has 'Email' and 'WebsiteUrl' columns`,
                  );
                }
                if (!seenEmails.has(row.Email)) {
                  emailsToVerify.push(row.Email);
                  seenEmails.add(row.Email);
                }
              });

              // 1️⃣ Remove unsubscribed emails first
              // Sender-level (isUnsubscriptionForSender: true) blocks across all campaigns.
              // Campaign-level (isUnsubscriptionForSender: false) only blocks this specific campaign.
              const unsubscribedDocs = await this.db
                .collection('unsubscriptionsEmails')
                .find({
                  email: { $in: emailsToVerify },
                  $or: [
                    { isUnsubscriptionForSender: true },
                    {
                      isUnsubscriptionForSender: false,
                      campaignId: payload.campaignId,
                    },
                  ],
                })
                .toArray();
              const unsubscribedSet = new Set(
                unsubscribedDocs.map((d) => d.email),
              );
              unsubscribedDocs.forEach((doc) => {
                unsubscribedEmails.push({
                  email: doc.email,
                  unsubscribed: true,
                });
              });

              // Filter emailsToVerify to remove unsubscribed
              const filteredEmails = emailsToVerify.filter(
                (email) => !unsubscribedSet.has(email),
              );

              // 2️⃣ Get emails already in DB (these are already verified or have a status)
              const existingDocs = await this.campaignAudienceCollection
                .find({ email: { $in: filteredEmails } })
                .toArray();
              const existingEmailsSet = new Set(
                existingDocs.map((d) => d.email),
              );

              // 3️⃣ Emails to send to Outscraper (only new emails)
              const emailsForVerification = filteredEmails.filter(
                (email) => !existingEmailsSet.has(email),
              );

              const emailVerificationMap = new Map();

              // 4️⃣ Add existing DB emails to the map with their verification status
              existingDocs.forEach((doc) => {
                emailVerificationMap.set(doc.email, {
                  isVerified: doc.isVerified,
                  verificationStatus: doc.isVerified
                    ? 'receiving'
                    : 'not_receiving',
                });
              });

              // 5️⃣ Call Outscraper only for new emails
              if (emailsForVerification.length > 0) {
                const verificationResults =
                  await this.outscrapperEmailsVerifier(emailsForVerification);

                verificationResults['data'].forEach((result) => {
                  const email = result.query;
                  const isVerified = result.status === 'RECEIVING';
                  emailVerificationMap.set(email, {
                    isVerified,
                    verificationStatus: isVerified
                      ? 'receiving'
                      : 'not_receiving',
                  });
                });
              }

              // 🔹 Step 4: Process each row
              for (const pd of results.data) {
                emailCount++;
                if (emailCount > MAX_EMAIL_COUNT) {
                  throw new BadRequestException(
                    `CSV file contains more than ${MAX_EMAIL_COUNT} emails`,
                  );
                }

                // Skip unsubscribed emails
                if (unsubscribedSet.has(pd.Email)) continue;

                // Check if duplicate **within same campaign**
                const duplicateInCampaign =
                  await this.campaignAudienceCollection.findOne({
                    email: pd.Email,
                    campaignId: payload.campaignId,
                  });

                const verificationInfo = emailVerificationMap.get(pd.Email) || {
                  isVerified: false,
                  verificationStatus: 'not_receiving',
                };

                if (duplicateInCampaign) {
                  duplicateEmails.push({
                    email: pd.Email,
                    verificationStatus: verificationInfo.verificationStatus,
                    isValid: verificationInfo.isVerified,
                    duplicate: true,
                  });
                  continue;
                }
                //Added by Nidhi Because we can not insert Audience while parsing
                // Insert new email
                // const data = {
                //   email: pd.Email,
                //   createdAt: new Date(),
                //   updatedAt: new Date(),
                //   websiteName: pd.WebsiteName,
                //   websiteUrl: pd.WebsiteUrl,
                //   emailStatus: EMAIL_STATUS.INITIATED,
                //   processStatus: EMAIL_PROCESS_STATUS.PENDING,
                //   campaignId: payload.campaignId,
                //   campaignName: payload.campaignName,
                //   dataSource: DATA_SOURCE.CSV,
                //   addedBy: currentUser,
                //   senderEmailId: payload?.senderEmailId || null,
                //   subscribeStatus: true,
                //   isVerified: verificationInfo.isVerified,
                // };
                // await this.campaignAudienceCollection.insertOne(data);

                parsedEmails.push({
                  email: pd.Email,
                  verificationStatus: verificationInfo.verificationStatus,
                  isValid: verificationInfo.isVerified,
                  duplicate: false,
                });
              }

              const validEmailsCount = parsedEmails.filter(
                (i) => i.isValid,
              ).length;
              const invalidEmailsCount = parsedEmails.filter(
                (i) => !i.isValid,
              ).length;

              const responseData = {
                allEmails: [...parsedEmails, ...duplicateEmails],
                parsedEmails,
                duplicateEmails,
                unsubscribedEmails,
                parsedEmailsCount: parsedEmails.length,
                duplicateEmailCount: duplicateEmails.length,
                validEmailsCount,
                invalidEmailsCount,
                unsubscribedCount: unsubscribedEmails.length,
              };

              resolve({
                statusCode: HttpStatus.OK,
                message:
                  duplicateEmails.length > 0
                    ? 'File parsed and some unique data saved successfully but duplicate emails found'
                    : 'File parsed successfully',
                data: responseData,
              });
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => reject(error),
        });
      });
    } catch (error) {
      this.logger.error('Error in csvParserV2:', error);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('An error occurred while parsing the file');
    }
  }
  async csvParserV3(req, payload: any, file: Express.Multer.File) {
    try {
      const currentUser = req.user._id.toHexString();
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
      const MAX_EMAIL_COUNT = 500;

      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File size exceeds the 10 MB limit');
      }

      const fileContent = file.buffer.toString('utf-8');
      const validEmails = [];
      const invalidEmails = [];
      const duplicateEmails = [];
      const seenEmails = new Set();

      // Email regex (RFC 5322 simplified)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      return new Promise((resolve, reject) => {
        papaparse.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          trimHeaders: true,

          complete: async (results) => {
            try {
              if (results.data.length < 1) {
                throw new BadRequestException(
                  'No data found. CSV file must include headers',
                );
              }

              if (
                !('Email' in results.data[0]) ||
                !('WebsiteUrl' in results.data[0])
              ) {
                throw new BadRequestException(
                  "CSV must contain 'Email' and 'WebsiteUrl' columns",
                );
              }

              let processedCount = 0;

              for (const row of results.data) {
                processedCount++;

                if (processedCount > MAX_EMAIL_COUNT) {
                  throw new BadRequestException(
                    `CSV file contains more than ${MAX_EMAIL_COUNT} emails`,
                  );
                }

                const email = row.Email?.trim();
                const websiteUrl = row.WebsiteUrl?.trim();

                if (!email) {
                  invalidEmails.push({
                    email: '',
                    reason: 'Missing email field',
                  });
                  continue;
                }

                // Duplicate within the same CSV upload
                if (seenEmails.has(email)) {
                  duplicateEmails.push({
                    email,
                    websiteUrl,
                  });
                  continue;
                }
                seenEmails.add(email);

                // Invalid format
                if (!emailRegex.test(email)) {
                  invalidEmails.push({
                    email,
                    websiteUrl,
                    reason: 'Invalid email format',
                  });
                  continue;
                }

                // Valid email
                validEmails.push({
                  email,
                  websiteUrl,
                });
              }

              const response = {
                allEmails: [
                  ...validEmails,
                  ...duplicateEmails,
                  ...invalidEmails,
                ],
                validEmails,
                invalidEmails,
                duplicateEmails,
                count: {
                  total:
                    validEmails.length +
                    invalidEmails.length +
                    duplicateEmails.length,
                  valid: validEmails.length,
                  invalid: invalidEmails.length,
                  duplicate: duplicateEmails.length,
                },
              };

              resolve({
                statusCode: HttpStatus.OK,
                message: 'CSV parsed successfully',
                data: response,
              });
            } catch (err) {
              reject(err);
            }
          },

          error: (err) => reject(err),
        });
      });
    } catch (error) {
      this.logger.error('Error in csvParserV2:', error);
      throw new BadRequestException('An error occurred while parsing the file');
    }
  }

  async addEmailAsAudience(
    email: string,
    websiteName: string,
    websiteUrl: string,
    campaignId: string,
    campaignName: string,
    req: any,
  ) {
    const currentUser = req.user._id.toHexString();
    const emailVerifier = await this.outscrapperEmailVerifier(email);
    const data = {
      email: email,
      createdAt: new Date(),
      updatedAt: new Date(),
      websiteName: websiteName || '',
      websiteUrl: websiteUrl || '',
      emailStatus: EMAIL_STATUS.INITIATED,
      processStatus: EMAIL_PROCESS_STATUS.PENDING,
      campaignId: campaignId,
      campaignName: campaignName || '',
      dataSource: DATA_SOURCE.MANUAL,
      addedBy: currentUser,
      senderEmailId: null,
      subscribeStatus: true,
      isVerified: emailVerifier.data.status == 'RECEIVING' || false,
    };
    await this.campaignAudienceCollection.insertOne(data);
    return {
      statusCode: HttpStatus.OK,
      message: 'Audience Email Added Successfully For This Campaign',
    };
  }

  async deleteAudienceFromCampaign(
    campaignId: string,
    email: string,
    req: any,
  ) {
    let audienceList;
    let audienceListOld;
    try {
      const addedyBy = req.user._id.toHexString();
      audienceListOld = await this.campaignAudienceCollection
        .find({
          campaignId: campaignId,
          addedBy: addedyBy,
        })
        .toArray();

      const result = await this.campaignAudienceCollection.deleteOne({
        email: email,
        campaignId: campaignId,
        addedBy: addedyBy,
      });

      if (result.deletedCount === 0) {
        throw new BadRequestException('Email not found in campaign');
      }

      audienceList = await this.campaignAudienceCollection
        .find({
          campaignId: campaignId,
          addedBy: addedyBy,
        })
        .toArray();

      return {
        statusCode: HttpStatus.OK,
        message: 'Email successfully deleted from campaign',
        data: audienceList,
      };
    } catch (error) {
      // add the case in which if deletionn faild data should go there in response.
      this.logger.error('Error deleting email from campaign:', error);
      if (error instanceof BadRequestException) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad Request',
          data: audienceListOld,
        };
      }
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error deleting email from campaign',
        data: audienceListOld,
      };
    }
  }

  async getEmailAndWarmupCount(userId: string, email: string) {
    try {
      const emailsWithWarmupCount = await this.campaignWarmupCollection.findOne(
        {
          userId: userId,
          email: email,
          status: EMAIL_AND_PASSKEY_STATUS.VERIFIED,
        },
        {
          projection: {
            email: 1,
            warmupCount: 1,
            updatedMaxLimit: 1,
            _id: 0,
          },
        },
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Email fetched successfully',
        data: emailsWithWarmupCount,
      };
    } catch (error) {
      Logger.log(error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch emails',
        error: error.message,
      };
    }
  }

  async getCampaignAudience(campaignId: string, req: any) {
    try {
      const addedBy = req.user._id.toHexString();
      const audienceList = await this.campaignAudienceCollection
        .find({
          campaignId: campaignId,
          addedBy: addedBy,
        })
        .toArray();

      const duplicateAudienceList =
        await this.campaignDuplicateAudienceCollection
          .find({
            campaignId: campaignId,
            addedBy: addedBy,
          })
          .toArray();

      const verifiedDuplicateList = duplicateAudienceList.map((audience) => ({
        ...audience,
        isVerified: true,
      }));

      const combinedAudienceList = [...audienceList, ...verifiedDuplicateList];

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign audience fetched successfully',
        data: combinedAudienceList,
      };
    } catch (error) {
      this.logger.error('Error fetching campaign audience:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error fetching campaign audience',
        data: [],
      };
    }
  }

  async getCampaignAudiences(data: any, req: any) {
    try {
      const addedBy = req.user._id.toHexString();
      const audienceList = await this.campaignAudienceCollection
        .find({
          campaignId: { $in: data.campaignIds },
          addedBy: addedBy,
        })
        .toArray();

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign audience fetched successfully',
        data: audienceList,
      };
    } catch (error) {
      this.logger.error('Error fetching campaign audience:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error fetching campaign audience',
        data: [],
      };
    }
  }
  async addDuplicateCampaignAudience(
    campaignId: string,
    oldCampaignAudiences: any[],
    newCampaignAudiences: any[],
    req: any,
  ) {
    try {
      Logger.log('Starting addDuplicateCampaignAudience', {
        campaignId,
        oldCampaignAudiencesCount: oldCampaignAudiences?.length,
        newCampaignAudiencesCount: newCampaignAudiences?.length,
      });

      // Validate inputs
      if (!campaignId) {
        throw new BadRequestException('Campaign ID is required');
      }

      if (!req?.user?._id) {
        throw new BadRequestException('User information is missing');
      }

      // Find campaign
      Logger.log('Finding campaign with ID:', campaignId);
      const campaign = await this.campaignCollection.findOne({
        _id: new ObjectId(campaignId),
      });

      if (!campaign) {
        Logger.log('Campaign not found for ID:', campaignId);
        throw new BadRequestException('Campaign not found');
      }
      Logger.log('Found campaign:', campaign.campaignName);

      // Process new audiences
      Logger.log('Processing new campaign audiences');
      if (
        Array.isArray(newCampaignAudiences) &&
        newCampaignAudiences.length > 0
      ) {
        for (const audience of newCampaignAudiences) {
          if (!audience) {
            Logger.warn('Skipping invalid audience entry - missing email');
            continue;
          }

          Logger.log('Adding new audience:', {
            email: audience.email,
            websiteName: audience?.websiteName,
            websiteUrl: audience?.websiteUrl,
          });

          await this.addEmailAsAudience(
            audience,
            'manualUpload',
            'manualUpload',
            campaignId,
            campaign?.campaignName || '',
            req,
          );
        }
      }

      // Process old audiences
      Logger.log('Processing old campaign audiences');
      const duplicateEmails = [];

      if (
        Array.isArray(oldCampaignAudiences) &&
        oldCampaignAudiences.length > 0
      ) {
        for (const audience of oldCampaignAudiences) {
          if (!audience) {
            Logger.warn('Skipping invalid old audience entry');
            continue;
          }

          Logger.log('Checking for duplicate audience:', audience);

          const existingAudience =
            await this.campaignDuplicateAudienceCollection.findOne({
              campaignId: campaignId,
              email: audience,
            });

          if (existingAudience) {
            duplicateEmails.push(audience);
          } else {
            await this.campaignDuplicateAudienceCollection.insertOne({
              campaignId: campaignId,
              campaignName: campaign?.campaignName,
              email: audience,
              websiteUrl: 'duplicateUpload',
              dataSource: DATA_SOURCE.DUPLICATE,
              emailStatus: EMAIL_STATUS.INITIATED,
              processStatus: EMAIL_PROCESS_STATUS.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
              addedBy: req.user._id.toHexString(),
              subscribeStatus: true,
            });
          }
        }

        if (duplicateEmails.length > 0 && newCampaignAudiences.length > 0) {
          return {
            statusCode: HttpStatus.OK,
            message:
              'New Email added but duplicate emails exist for this campaign',
            data: duplicateEmails,
          };
        }

        if (duplicateEmails.length > 0) {
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Duplicate emails exist for this campaign',
            data: duplicateEmails,
          };
        }
      }

      // Validate if any audiences were processed
      if (
        (!oldCampaignAudiences?.length || oldCampaignAudiences.length === 0) &&
        (!newCampaignAudiences?.length || newCampaignAudiences.length === 0)
      ) {
        throw new BadRequestException('No audience to add');
      }

      Logger.log('Successfully processed all audiences');
      return {
        statusCode: HttpStatus.OK,
        message: 'Audience added successfully',
      };
    } catch (error) {
      Logger.error('Error in addDuplicateCampaignAudience:', error);
      throw error;
    }
  }
  /**
   * V2 : Starts a campaign by processing audience members in batches and sending emails
   *
   * @param campaignId - ID of the campaign to start
   * @param req - Request object containing user info
   * @returns Object containing status code and number of processed emails
   *
   */
  async startCampaignV2(campaignId, req?) {
    Logger.log('Starting campaign with ID:', campaignId, req.user);
    Logger.log(
      '=====================>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>Campaign ID:',
      campaignId,
    );
    const PAGINATION_LIMIT = 100;
    let skip = 0;
    let totalProcessed = 0;
    let hasMore = true;
    let campaignDetails;
    let gptEmailResponse;
    let senderEmailsAndLimits: {
      email: string;
      maxLimit: number;
      count: number;
    }[] = [];

    try {
      Logger.log('Updating campaign status to running');
      await this.campaignCollection.findOneAndUpdate(
        {
          _id: new ObjectId(campaignId),
        },
        {
          $set: {
            status: CAMPAIGN_STATUS.RUNNING,
          },
        },
      );

      Logger.log('Getting campaign details');
      // Get campaign details and initial GPT response
      campaignDetails = await this.getCampaignDetails(req, campaignId);

      const campaignEmailPrompt =
        await this.campaignPromptAndGenerateEmail.findOne({
          campaignId: campaignId,
        });

      // Generate new template if none exists
      if (!campaignEmailPrompt) {
        Logger.log('Generating campaign email template using GPT');
        gptEmailResponse = await this.generateCampaignEmailTemplateUsingGPT(
          campaignDetails.data,
          req,
        );

        gptEmailResponse = {
          data: gptEmailResponse?.data.body,
          subject: gptEmailResponse?.data.subject,
        };
      } else {
        gptEmailResponse = {
          data: campaignEmailPrompt.gptGeneratedEmail,
          subject: campaignEmailPrompt.subject,
        };
      }

      Logger.log('Campaign email template:', gptEmailResponse);

      Logger.log('Checking for duplicate leads');
      const duplicateLeads = await this.duplicateLeadCollection.findOne({
        currentCampaignId: campaignId,
        status: DUPLICATE_LEAD_STATUS.INTIATED,
      });

      Logger.log('duplicate leads', duplicateLeads);

      Logger.log('Preloading sender email counts');
      // Preload sender email counts in parallel
      senderEmailsAndLimits = await Promise.all(
        campaignDetails.data.emailAndSenderLimit.map(async (data) => ({
          email: data.email,
          maxLimit: data.maxLimit,
          count:
            (await this.campaignAudienceCollection.countDocuments({
              senderEmailId: data.email,
              campaignId: campaignId,
            })) +
            (await this.campaignDuplicateAudienceCollection.countDocuments({
              senderEmailId: data.email,
              campaignId: campaignId,
            })),
        })),
      );

      // Watch every sender for real-time replies; no-ops if already watched by another campaign.
      await this.imapIdleWatcherService.startWatchingForSenders(
        senderEmailsAndLimits.map((sender) => sender.email),
      );

      //Roundrobin Logic to select the next available sender email with remaining capacity
      let senderRotationPointer = 0;
      const getNextAvailableSender = () => {
        for (let i = 0; i < senderEmailsAndLimits.length; i++) {
          const idx =
            (senderRotationPointer + i) % senderEmailsAndLimits.length;
          if (
            senderEmailsAndLimits[idx].count <
            senderEmailsAndLimits[idx].maxLimit
          ) {
            senderRotationPointer = (idx + 1) % senderEmailsAndLimits.length;
            return senderEmailsAndLimits[idx];
          }
        }
        return null; // No sender has remaining capacity
      };

      if (duplicateLeads && duplicateLeads.previousCampaign.length > 0) {
        Logger.log('Duplicate leads found, processing duplicate audiences');

        // Fetch both duplicate and new audiences in parallel for efficiency
        const [duplicateAudience, newCampaignAudiences] = await Promise.all([
          this.campaignDuplicateAudienceCollection
            .find({
              campaignId: campaignId,
              addedBy: req.user._id.toHexString(),
              subscribeStatus: true,
              emailStatus: {
                $in: [EMAIL_STATUS.INITIATED],
              },
            })
            .toArray(),
          this.campaignAudienceCollection
            .find({
              campaignId: campaignId,
              addedBy: req.user._id.toHexString(),
              subscribeStatus: true,
              emailStatus: {
                $in: [EMAIL_STATUS.INITIATED],
              },
            })
            .toArray(),
        ]);

        Logger.log('Combining duplicateAudience and newCampaignAudiences');
        const combinedAudiences = [
          ...duplicateAudience,
          ...newCampaignAudiences,
        ];

        Logger.log(`Processing ${combinedAudiences.length} combined audiences`);

        // Process audiences in batches
        for (
          let skip = 0;
          skip < combinedAudiences.length &&
          totalProcessed < campaignDetails.data.maxEmailsPerDay &&
          campaignDetails.data.status !== CAMPAIGN_STATUS.PAUSED;
          skip += PAGINATION_LIMIT
        ) {
          const batch = combinedAudiences.slice(skip, skip + PAGINATION_LIMIT);
          Logger.log(
            `Processing batch of combined audiences - Skip: ${skip}, Limit: ${PAGINATION_LIMIT}`,
          );

          const jobs = [];
          const bulkUpdates = [];

          for (const audience of batch) {
            // Round-robin to the next sender with available capacity
            const currentSender = getNextAvailableSender();

            if (!currentSender) {
              Logger.log(
                'No senders with available limits - stopping batch processing',
              );
              break;
            }

            // Validate required data
            if (!audience.email || !currentSender.email) {
              Logger.log(`Skipping invalid audience record: ${audience._id}`);
              continue;
            }

            Logger.log(
              `Creating job for audience: ${audience.email} with sender: ${currentSender.email}`,
            );

            const authToken =
              await this.campaignEmailServerConfigCollection.findOne({
                userId: req.user._id.toHexString(),
              });

            const smtpSettings = await this.smtpCollection.findOne({
              userId: req.user._id.toHexString(),
              email: currentSender.email,
            });

            let decryptedServerToken;
            if (authToken && !smtpSettings) {
              decryptedServerToken = CryptoService.decryptPasskey(
                authToken?.emailServerApiKey.toString(),
              );
            }

            if (smtpSettings && !authToken) {
              decryptedServerToken = '';
            }

            if (smtpSettings && authToken) {
              const emailAndPassKey =
                await this.campaignEmailPasskeyCollection.findOne({
                  userId: req.user._id.toHexString(),
                  email: currentSender.email,
                });

              if (emailAndPassKey) {
                decryptedServerToken = CryptoService.decryptPasskey(
                  authToken?.emailServerApiKey.toString(),
                );
              }
            }

            jobs.push({
              name: 'emailProcessingQueue',
              data: {
                userId: req.user._id.toHexString(),
                campaignId: campaignId,
                audienceId: audience._id,
                sender: currentSender.email,
                receiver: audience.email,
                campaignDetails,
                subject: gptEmailResponse.subject,
                gptEmailResponse: gptEmailResponse.data,
                serverToken: decryptedServerToken,
              },
              options: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 3000 },
              },
            });

            bulkUpdates.push({
              updateOne: {
                filter: { _id: audience._id },
                update: {
                  $set: {
                    emailStatus: EMAIL_STATUS.INITIATED,
                    processStatus: EMAIL_PROCESS_STATUS.PROCESSING,
                    senderEmailId: currentSender.email,
                  },
                },
              },
            });

            const existingConversation =
              await this.campaignImapConversationCollection.findOne({
                campaignId: campaignDetails.data._id.toHexString(),
                userEmailId: currentSender.email,
                audienceEmailId: audience.email,
              });

            const emailSentObj = {
              isReceivedEmail: false,
              isSentEmail: true,
              isAutoReply: false,
              emailTextContent: gptEmailResponse.data,
              dateAndTime: new Date(),
            };

            if (!existingConversation) {
              const insertData = {
                campaignId: campaignDetails.data._id.toHexString(),
                userEmailId: currentSender.email,
                audienceEmailId: audience.email,
                subject: gptEmailResponse.subject,
                userId: req.user._id.toHexString(),
                emailConversation: [emailSentObj],
                standAloneAssistant: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              await this.campaignImapConversationCollection.insertOne(
                insertData,
              );
            } else {
              await this.campaignImapConversationCollection.updateOne(
                { _id: existingConversation._id },
                {
                  $set: {
                    emailConversation: [emailSentObj],
                    updatedAt: new Date(),
                  },
                },
              );
            }

            currentSender.count++;
            totalProcessed++;

            if (totalProcessed >= campaignDetails.data.maxEmailsPerDay) {
              Logger.log('Reached maximum emails per day limit');
              break;
            }
          }
          if (jobs.length > 0) {
            Logger.log(
              `Adding ${jobs.length} jobs to queue and performing ${bulkUpdates.length} bulk updates`,
            );
            try {
              await Promise.all([
                this.emailQueue.addBulkJob(jobs),
                this.campaignAudienceCollection.bulkWrite(bulkUpdates),
                this.campaignDuplicateAudienceCollection.bulkWrite(bulkUpdates),
              ]);
            } catch (error) {
              Logger.error('Error processing batch:', error);
              // Continue with next batch even if current fails
            }
          }
        }

        // Mark campaign as completed if all combined audiences processed in one batch
        if (combinedAudiences.length < PAGINATION_LIMIT) {
          // await this.campaignCollection.findOneAndUpdate(
          //   {
          //     _id: new ObjectId(campaignId),
          //   },
          //   {
          //     $set: {
          //       status: CAMPAIGN_STATUS.COMPLETED,
          //     },
          //   },
          // );
          await this.updateCampaignStatusByAudience(
            req.user._id.toHexString(),
            campaignId,
          );
        }

        Logger.log(
          `Audience processing completed. Total processed: ${totalProcessed}`,
        );
      } else {
        Logger.log('Processing campaign audiences');
        // Main loop to process audience in batches
        while (
          hasMore &&
          totalProcessed < campaignDetails.data.maxEmailsPerDay &&
          campaignDetails.data.status !== CAMPAIGN_STATUS.PAUSED
        ) {
          // Fetch a new batch of campaign audiences
          Logger.log('Fetching campaign audiences');
          const campaignAudiences = await this.fetchCampaignAudience(
            req,
            campaignId,
            skip,
            PAGINATION_LIMIT,
          );
          const campaignAudience = await campaignAudiences.toArray();

          if (campaignAudience.length === 0) {
            break;
          }
          // Prepare jobs batch per sender email within limits
          const jobs = [];
          const bulkUpdates = [];

          // Round-robin across senders per audience member. The previous
          // senderIndex-based rotation restarted its inner loop at
          // campaignAudience[0] every time it switched senders, so switching
          // senders caused duplicate emails to early audience members while
          // later ones were never reached.
          for (const audience of campaignAudience) {
            const currentSender = getNextAvailableSender();
            if (!currentSender) {
              break; // No sender has remaining capacity
            }

            {
              const authToken =
                await this.campaignEmailServerConfigCollection.findOne({
                  userId: req.user._id.toHexString(),
                });

              const smtpSettings = await this.smtpCollection.findOne({
                userId: req.user._id.toHexString(),
                email: currentSender.email,
              });

              let decryptedServerToken;
              if (authToken && !smtpSettings) {
                decryptedServerToken = CryptoService.decryptPasskey(
                  authToken?.emailServerApiKey.toString(),
                );
              }

              if (smtpSettings && !authToken) {
                decryptedServerToken = '';
              }

              if (smtpSettings && authToken) {
                const emailAndPassKey =
                  await this.campaignEmailPasskeyCollection.findOne({
                    userId: req.user._id.toHexString(),
                    email: currentSender.email,
                  });

                if (emailAndPassKey) {
                  decryptedServerToken = CryptoService.decryptPasskey(
                    authToken?.emailServerApiKey.toString(),
                  );
                }
              }

              jobs.push({
                name: 'emailProcessingQueue',
                data: {
                  userId: req.user._id.toHexString(),
                  campaignId: campaignId,
                  audienceId: audience._id,
                  sender: currentSender.email,
                  receiver: audience.email,
                  campaignDetails,
                  subject: gptEmailResponse.subject,
                  gptEmailResponse: gptEmailResponse.data,
                  serverToken: decryptedServerToken,
                },
                options: {
                  attempts: 3,
                  backoff: { type: 'exponential', delay: 3000 },
                },
              });

              bulkUpdates.push({
                updateOne: {
                  filter: { _id: audience._id },
                  update: {
                    $set: {
                      emailStatus: EMAIL_STATUS.INITIATED,
                      processStatus: EMAIL_PROCESS_STATUS.PROCESSING,
                      senderEmailId: currentSender.email,
                    },
                  },
                },
              });

              const existingConversation =
                await this.campaignImapConversationCollection.findOne({
                  campaignId: campaignDetails.data._id.toHexString(),
                  userEmailId: currentSender.email,
                  audienceEmailId: audience.email,
                });

              const emailSentObj = {
                isReceivedEmail: false,
                isSentEmail: true,
                isAutoReply: false,
                emailTextContent: gptEmailResponse.data,
                dateAndTime: new Date(),
              };

              if (!existingConversation) {
                const insertData = {
                  campaignId: campaignDetails.data._id.toHexString(),
                  userEmailId: currentSender.email,
                  audienceEmailId: audience.email,
                  subject: gptEmailResponse.subject,
                  userId: req.user._id.toHexString(),
                  emailConversation: [emailSentObj],
                  standAloneAssistant: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await this.campaignImapConversationCollection.insertOne(
                  insertData,
                );
              } else {
                await this.campaignImapConversationCollection.updateOne(
                  { _id: existingConversation._id },
                  {
                    $set: {
                      emailConversation: [emailSentObj],
                      updatedAt: new Date(),
                    },
                  },
                );
              }

              currentSender.count++;
              totalProcessed++;
            }
          }

          // Perform bulk database updates
          if (bulkUpdates.length > 0) {
            await this.campaignAudienceCollection.bulkWrite(bulkUpdates);
          }

          // Add jobs to the queue in bulk
          if (jobs.length > 0) {
            await this.emailQueue.addBulkJob(jobs);
          }
          // Prepare for the next batch by updating skip and checking limits
          skip += PAGINATION_LIMIT;
          await this.delay(500);
          campaignDetails = await this.getCampaignDetails(req, campaignId);

          if (campaignAudience.length < PAGINATION_LIMIT) {
            // await this.campaignCollection.findOneAndUpdate(
            //   {
            //     _id: new ObjectId(campaignId),
            //   },
            //   {
            //     $set: {
            //       status: CAMPAIGN_STATUS.COMPLETED,
            //     },
            //   },
            // );
            await this.updateCampaignStatusByAudience(
              req.user._id.toHexString(),
              campaignId,
            );
            hasMore = false; // No more audience records left
          }
        }
      }

      await this.updateCampaignStatusByAudience(
        req.user._id.toHexString(),
        campaignId,
      );

      // Not stopping watchers here: COMPLETED doesn't mean replies have stopped.

      return {
        statusCode: HttpStatus.OK,
        message: `${totalProcessed} Campaign Emails Processed`,
      };
    } catch (error) {
      await this.campaignCollection.findOneAndUpdate(
        {
          _id: new ObjectId(campaignId),
        },
        {
          $set: {
            status: CAMPAIGN_STATUS.FAILED,
          },
        },
      );
      await this.stopWatchersForFinishedCampaign(
        campaignId,
        senderEmailsAndLimits.map((sender) => sender.email),
      );
      Logger.log(error);
      throw error;
    }
  }

  // Stops a campaign's sender watchers, but only for a sender no other running/scheduled campaign still needs.
  private async stopWatchersForFinishedCampaign(
    campaignId: string,
    senderEmails: string[],
  ): Promise<void> {
    try {
      const currentCampaign = await this.campaignCollection.findOne({
        _id: new ObjectId(campaignId),
      });
      if (
        !currentCampaign ||
        currentCampaign.status === CAMPAIGN_STATUS.RUNNING
      ) {
        return;
      }

      const uniqueEmails = Array.from(new Set(senderEmails.filter(Boolean)));
      await Promise.allSettled(
        uniqueEmails.map(async (email) => {
          const stillInUse = await this.campaignCollection.findOne({
            _id: { $ne: new ObjectId(campaignId) },
            status: {
              $in: [CAMPAIGN_STATUS.RUNNING, CAMPAIGN_STATUS.SCHEDULED],
            },
            'emailAndSenderLimit.email': email,
          });
          if (!stillInUse) {
            this.imapIdleWatcherService.stopWatching(email);
            this.logger.log(
              `[${email}] Stopped IMAP IDLE watcher — no other active campaign uses this sender`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to evaluate IMAP IDLE watcher stop for campaign ${campaignId}: ${error.message}`,
        error.stack,
      );
    }
  }
  /**
   * Updates the campaign status based on the audience's email statuses.
   * - If any audience (including duplicates) is in INITIATED status, set campaign to RUNNING.
   * - If all audience (including duplicates) are in FAILED status, set campaign to FAILED.
   * @param req - The request object containing user info.
   * @param campaignId - The campaign's ID.
   */
  async updateCampaignStatusByAudience(userId: any, campaignId: string) {
    // Prepare queries for both collections
    const baseQuery = { campaignId, addedBy: userId };

    const audience = await this.campaignAudienceCollection
      .find(baseQuery)
      .toArray();

    const duplicateAudience = await this.campaignDuplicateAudienceCollection
      .find(baseQuery)
      .toArray();

    if (audience?.length == 0 && duplicateAudience?.length == 0) {
      await this.campaignCollection.findOneAndUpdate(
        { _id: new ObjectId(campaignId) },
        { $set: { status: CAMPAIGN_STATUS.FAILED } },
      );
      return;
    }

    // Count INITIATED status in both collections
    const [initiatedCount, initiatedDupCount] = await Promise.all([
      this.campaignAudienceCollection.countDocuments({
        ...baseQuery,
        emailStatus: { $in: [EMAIL_STATUS.INITIATED] },
      }),
      this.campaignDuplicateAudienceCollection.countDocuments({
        ...baseQuery,
        emailStatus: { $in: [EMAIL_STATUS.INITIATED] },
      }),
    ]);
    const campaignAudienceProcessedCount = initiatedCount + initiatedDupCount;

    if (campaignAudienceProcessedCount > 0) {
      await this.campaignCollection.findOneAndUpdate(
        { _id: new ObjectId(campaignId) },
        { $set: { status: CAMPAIGN_STATUS.RUNNING } },
      );
      // If any are initiated, no need to check for failed
      return;
    }

    // Count total and failed in both collections in parallel
    const [audienceCount, duplicateCount, failedCount, failedDupCount] =
      await Promise.all([
        this.campaignAudienceCollection.countDocuments(baseQuery),
        this.campaignDuplicateAudienceCollection.countDocuments(baseQuery),
        this.campaignAudienceCollection.countDocuments({
          ...baseQuery,
          emailStatus: EMAIL_STATUS.FAILED,
        }),
        this.campaignDuplicateAudienceCollection.countDocuments({
          ...baseQuery,
          emailStatus: EMAIL_STATUS.FAILED,
        }),
      ]);
    const campaignAudienceCount = audienceCount + duplicateCount;
    const campaignAudienceStatusCount = failedCount + failedDupCount;

    if (
      campaignAudienceCount > 0 &&
      campaignAudienceCount === campaignAudienceStatusCount
    ) {
      await this.campaignCollection.findOneAndUpdate(
        { _id: new ObjectId(campaignId) },
        { $set: { status: CAMPAIGN_STATUS.FAILED } },
      );
    }

    if (
      campaignAudienceProcessedCount === 0 &&
      campaignAudienceCount > 0 &&
      campaignAudienceCount !== campaignAudienceStatusCount
    ) {
      await this.campaignCollection.findOneAndUpdate(
        { _id: new ObjectId(campaignId) },
        { $set: { status: CAMPAIGN_STATUS.COMPLETED } },
      );
    }

    const campaignAudienceSentCount =
      await this.campaignAudienceCollection.countDocuments({
        ...baseQuery,
        emailStatus: EMAIL_STATUS.SENT,
      });

    if (campaignAudienceCount === campaignAudienceSentCount) {
      await this.campaignCollection.findOneAndUpdate(
        { _id: new ObjectId(campaignId) },
        { $set: { status: CAMPAIGN_STATUS.COMPLETED } },
      );
    }
  }

  //=========================================================================================================================================================
  //Follow-up Schedule flow
  //=========================================================================================================================================================
  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param campaignId : campaign id for which schedule needs to be created
   * @param followUpFrequency : number of days between follow-ups
   * @param totalFollowUps : total number of follow-ups to schedule
   * @returns : status and message for schedule creation
   * @working : Creates follow-up schedules for a campaign based on frequency and total count
   */
  async followUpScheduleCreater(
    req: any,
    campaignId: string,
    followUpFrequency: number,
    totalFollowUps: number,
  ) {
    const campaignDetails = await this.campaignCollection.findOne({
      _id: new ObjectId(campaignId),
      addedBy: req.user._id.toHexString(),
    });

    if (!campaignDetails) {
      throw new Error('Campaign not found');
    }

    const followUpSchedule =
      await this.campaignFollowUpsScheduleCollection.findOne({
        campaignId: campaignId,
        addedBy: req.user._id.toHexString(),
      });

    if (followUpSchedule) {
      throw new Error('Follow-up Schedule already exists');
    }
    const countToIncrease = followUpFrequency;

    for (let i = 0; i < totalFollowUps; i++) {
      const currentDate = new Date();
      const followUpScheduleDate = new Date(currentDate);
      followUpScheduleDate.setDate(currentDate.getDate() + followUpFrequency);
      followUpScheduleDate.setHours(0, 0, 0, 0);

      const followUpScheduleData = {
        campaignId: campaignId,
        addedBy: req.user._id.toHexString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        scheduleDate: followUpScheduleDate,
      };

      await this.campaignFollowUpsScheduleCollection.insertOne(
        followUpScheduleData,
      );

      followUpFrequency = countToIncrease + followUpFrequency;
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Follow-up Schedule created',
    };
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param campaignId : campaign id for which schedules need to be deleted
   * @returns : status and message for schedule deletion
   * @working : Deletes all follow-up schedules for a given campaign
   */
  async deleteFollowUpSchedule(req: any, campaignId: string) {
    const result = await this.campaignFollowUpsScheduleCollection.deleteMany({
      campaignId: campaignId,
      addedBy: req.user._id.toHexString(),
    });

    if (result.deletedCount === 0) {
      throw new Error('No follow-up schedules found to delete');
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Follow-up schedules deleted successfully',
    };
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param campaignId : campaign id for which schedules need to be updated
   * @param followUpFrequency : new frequency for follow-ups
   * @param totalFollowUps : new total number of follow-ups
   * @returns : status and message for schedule update
   * @working : Updates existing follow-up schedules with new frequency and count
   *            by deleting old ones and creating new schedules
   */
  async updateFollowUpSchedule(
    req: any,
    campaignId: string,
    followUpFrequency: number,
    totalFollowUps: number,
  ) {
    const campaignDetails = await this.campaignCollection.findOne({
      _id: new ObjectId(campaignId),
      addedBy: req.user._id.toHexString(),
    });

    if (!campaignDetails) {
      throw new Error('Campaign not found');
    }

    // Delete existing schedules
    await this.deleteFollowUpSchedule(req, campaignId);

    // Create new schedules with updated frequency and total follow-ups
    const currentDate = new Date();
    const bulkOperations = [];
    let frequency = followUpFrequency;

    for (let i = 0; i < totalFollowUps; i++) {
      const followUpScheduleDate = new Date(currentDate);
      followUpScheduleDate.setDate(currentDate.getDate() + frequency);
      followUpScheduleDate.setHours(0, 0, 0, 0);

      bulkOperations.push({
        insertOne: {
          document: {
            campaignId: campaignId,
            addedBy: req.user._id.toHexString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            scheduleDate: followUpScheduleDate,
          },
        },
      });

      frequency += followUpFrequency;
    }

    if (bulkOperations.length > 0) {
      await this.campaignFollowUpsScheduleCollection.bulkWrite(bulkOperations);
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Follow-up Schedule updated successfully',
    };
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @returns : void
   * @working : It is used to fetch today's active follow-up schedules and trigger follow-ups for missed leads
   */
  async startFollowUps() {
    const todayCampaignFollowupsSchedule =
      await this.campaignFollowUpsScheduleCollection
        .find({
          scheduleDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: 'active',
        })
        .toArray();
    todayCampaignFollowupsSchedule.forEach(async (campaign) => {
      await this.followUpsOnMissedLeads(campaign.campaignId);
    });
  }

  /**
   * @developer : Ankur
   * @param req : for fetching user_id from req
   * @param campaignId : campaign id for which follow-ups need to be sent
   * @returns : status and message for follow-up process
   * @working : It is used to send follow-up emails to leads who haven't responded
   *            based on configured frequency and total follow-ups
   */
  async followUpsOnMissedLeads(campaignId: string) {
    const campaignDetails = await this.campaignCollection.findOne({
      _id: new ObjectId(campaignId),
    });

    const emailServerConfig =
      await this.campaignEmailServerConfigCollection.findOne({
        userId: campaignDetails.addedBy,
      });

    const [audienceList, duplicateAudienceList] = await Promise.all([
      this.campaignAudienceCollection
        .find({
          campaignId: campaignId,
          addedBy: campaignDetails.addedBy,
          emailStatus: EMAIL_STATUS.SENT,
        })
        .toArray(),
      this.campaignDuplicateAudienceCollection
        .find({
          campaignId: campaignId,
          addedBy: campaignDetails.addedBy,
        })
        .toArray(),
    ]);

    const allAudienceList = [...audienceList, ...duplicateAudienceList];

    //TODO: Dynamic template selection for follow up emails is left.
    let fetchEmailTemplate;
    allAudienceList.forEach(async (audience) => {
      const conversation =
        await this.campaignImapConversationCollection.findOne({
          campaignId: campaignId,
          audienceEmailId: audience.email,
          addedBy: campaignDetails.addedBy,
          emailConversation: {
            $elemMatch: {
              isReceivedEmail: true,
            },
          },
        });

      if (!conversation) {
        const conversationDetails =
          await this.campaignImapConversationCollection.findOne({
            campaignId: campaignId,
            audienceEmailId: audience.email,
          });

        const smtpServerConfig = await this.smtpCollection.findOne({
          userId: campaignDetails.addedBy,
          email: conversationDetails?.userEmailId,
        });

        const followUpEmailText =
          await this.campaignFollowUpEmailConversationCollection.findOne({
            campaignId: campaignId,
            addedBy: campaignDetails.addedBy,
            receiverEmail: audience.email,
          });

        let followUpAttemptCount = 0;
        if (followUpEmailText?.emailConversation) {
          followUpAttemptCount =
            followUpEmailText?.emailConversation?.length || 0;
        }

        if (followUpAttemptCount < 2) {
          fetchEmailTemplate =
            await this.emailTemplateService.fetchEmailContent(
              'follow_up_template_1',
            );
        } else if (followUpAttemptCount >= 2) {
          fetchEmailTemplate =
            await this.emailTemplateService.fetchEmailContent(
              'follow_up_template_2',
            );
        }

        const data = {
          campaignId: campaignId,
          addedBy: campaignDetails.addedBy,
          userId: campaignDetails.addedBy,
          emailConversation: conversationDetails?.emailConversation || [],
          campaignDetails: campaignDetails,
          senderEmail: conversationDetails?.userEmailId,
          receiverEmail: audience.email,
          subject: conversationDetails?.subject,
          emailServerConfig: emailServerConfig,
          emailContent:
            conversationDetails?.emailConversation?.[0]?.emailTextContent || '',
          followUpAttempt: followUpAttemptCount + 1,
          previousFollowUpEmails: followUpEmailText?.emailConversation || [],
          fetchEmailTemplate: fetchEmailTemplate,
          smtpServerConfig: smtpServerConfig,
          callOfAction: campaignDetails.callOfAction,
        };

        await this.generateFollowUpEmailWithGpt(data);
      }
    });
    return {
      statusCode: HttpStatus.OK,
      message: 'Follow-ups on missed leads',
      data: {
        campaignId,
      },
    };
  }

  /**
   * @developer : Ankur
   * @param data : emailId, campaignId
   * @returns : auto reply and its logs
   * @working : It is used to auto reply and follow ups to the emails and save the conversation in db.
   */
  async generateFollowUpEmailWithGpt(data: any) {
    // Get CTA and unsubscribe sections using your existing function
    const { unsubscribeDiv, ctaSection } =
      await this.getCTAandUnsubscribeSection(data?.callOfAction);

    const prompt = [
      {
        role: 'system',
        content: `You are an expert follow-up email writer. Your task is to create highly relatable, professional, and human-like follow-up emails that re-engage the recipient with attentive, thoughtful language.

        Email Template Format:
        ${data.fetchEmailTemplate}

        Key Parameters:
        - Days since last email: ${data?.campaignDetails?.campaignFrequency}
        - Previous follow-ups: ${data?.previousFollowUpEmails?.length}
        - Campaign context: ${data?.campaignDetails?.solutionOffer}

        IMPORTANT RULES:
        - Do NOT include ANY call-to-action links (like "Visit Us", "Email Us", "Call Us") in the email body.
        - Do NOT include ANY unsubscribe links in the email body.
        - Do NOT use or generate any placeholders (such as {{name}}, {{unsubscribe}}, {{token}}, etc.) anywhere in the email or subject line.
        - Do NOT include any signatures or "Best regards" - these will be added automatically.
        - Do NOT generate any buttons in the email.
        - Do NOT include any images, icons, banners, or <img> tags.
        - Reference previous emails in a natural, conversational way.
        - Each follow-up must add new, relevant value and insight.
        - Use a clear, actionable call-to-action statement in text form only (not as a link/button).

        Output must be in this JSON format:
        {
          "reply": "<html>Follow-up email body with proper HTML/CSS. No CTA links, no unsubscribe links, no signatures, no 'Best regards'. Just the main email content.</html>",
          "subject": "Engaging subject line (no placeholders)"
        }

        The subject line must be professional, personalized, and free of spam words or placeholders. The email should be highly relatable, written in a professional, attentive, and human tone that encourages the recipient to re-engage.`,
      },
      {
        role: 'user',
        content: `Generate a follow-up email using the following details.

        Template: ${data.fetchEmailTemplate}
        Previous Campaign Emails: ${JSON.stringify(data?.emailConversation)}
        Previous Follow-ups: ${JSON.stringify(data?.previousFollowUpEmails)}
        Original Message: ${data?.emailContent}

        Details:
        - Attempt #: ${data?.followUpAttempt}
        - Focus: ${data?.campaignDetails?.solutionOffer}

        STRICT REQUIREMENTS:
        - Do NOT include ANY call-to-action links (Visit Us, Email Us, Call Us) in the email body.
        - Do NOT include ANY unsubscribe links in the email body.
        - Do NOT include "Best regards" or any signature.
        - Do NOT include any images or buttons.
        - Do NOT use any placeholders.
        - Generate ONLY the main email content. CTA links, unsubscribe links, and "Best regards" will be added automatically after your response.
        - Keep the tone professional, attentive, and human-like.`,
      },
    ];

    const gptEmailReplyResponse = await this.openaiService.getChatGptCompletion(
      {
        messages: prompt as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_5_MINI,
      },
      [],
      new ObjectId(data.addedBy),
      'campaign-followup-email',
    );

    const gptEmailReplyResponseData = JSON.parse(
      gptEmailReplyResponse.response,
    );

    // Build the final email body by appending CTA, signature, and unsubscribe
    let finalBody = gptEmailReplyResponseData.reply;

    // Strip any closing salutation the LLM may have added despite instructions
    finalBody = finalBody
      .replace(
        /\s*(?:<br\s*\/?>|<\/p>\s*(?:<p[^>]*>)?|\s+)*(?:warm regards|best regards|kind regards|regards|sincerely)[,.]?[\s\S]*$/gi,
        '',
      )
      .replace(/(?:\s*<br\s*\/?>)+\s*$/, '')
      .trim();

    // Add "Best regards," line with sender name
    const senderUser = await this.userCollection.findOne(
      { _id: new ObjectId(data.addedBy) },
      { projection: { name: 1 } },
    );
    const senderName = senderUser?.name || '';
    finalBody += `<br><br>Best regards,<br>${senderName}`;

    // Append CTA section if exists
    if (ctaSection && ctaSection.trim() !== '') {
      finalBody += ctaSection;
    }

    // ALWAYS append unsubscribe section at the very end
    finalBody += unsubscribeDiv;

    // Update the response with the final body
    const modifiedgptEmailResponseData = {
      ...gptEmailReplyResponseData,
      reply: finalBody,
    };

    // Update user token usage
    this.updateTokenUsage(
      new ObjectId(data.addedBy),
      gptEmailReplyResponse.tokenUsage.total,
      data.campaignDetails?.campaignProject?.projectId,
    );

    const dataToSend = {
      data: data.campaignDetails,
      gptEmailResponse: modifiedgptEmailResponseData,
    };

    let decryptedApiKey = '';
    if (data?.emailServerConfig && !data?.smtpServerConfig) {
      decryptedApiKey = CryptoService.decryptPasskey(
        data?.emailServerConfig?.emailServerApiKey,
      );
    }

    if (data?.smtpServerConfig && !data?.emailServerConfig) {
      decryptedApiKey = '';
    }

    if (data?.smtpServerConfig && data?.emailServerConfig) {
      const emailAndPassKey = await this.campaignEmailPasskeyCollection.findOne(
        {
          userId: data?.addedBy,
          email: data?.senderEmail,
        },
      );

      if (emailAndPassKey) {
        decryptedApiKey = CryptoService.decryptPasskey(
          data.emailServerConfig?.emailServerApiKey,
        );
      }
    }

    if (decryptedApiKey && decryptedApiKey !== '') {
      await this.adminEmailService.sendCampaignEmailToLeads(
        data.senderEmail,
        data.receiverEmail,
        dataToSend,
        gptEmailReplyResponseData.subject,
        modifiedgptEmailResponseData.reply,
        decryptedApiKey,
        data.addedBy,
      );
    } else if (data?.smtpServerConfig && data.smtpServerConfig.host) {
      await this.nodeMailerService.sendEmail(
        data.addedBy,
        data.receiverEmail,
        gptEmailReplyResponseData.subject,
        modifiedgptEmailResponseData.reply,
        '',
        [],
        data?.smtpServerConfig?.email,
        { data: data.campaignDetails },
      );
    } else {
    }
    const emailSentObj = {
      isReceivedEmail: false,
      isSentEmail: true,
      isFollowUpEmail: true,
      subject: gptEmailReplyResponseData.subject,
      emailTextContent: modifiedgptEmailResponseData.reply,
      dateAndTime: new Date(),
    };

    data.emailConversation = [emailSentObj];
    await this.saveConversationsToDB(data, data.campaignDetails);
    await this.saveFollowUpConversationsToDB(data);
    //Notification added from here.
    await this.emailAssistanceService.createEmailAssistanceNotification(
      data.campaignDetails.addedBy,
      data.receiverEmail,
      NOTIFICATION_TYPE.FOLLOWUP,
      data,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Follow-up email sent successfully',
      data: modifiedgptEmailResponseData,
    };
  }

  /**
   * @developer : Ankur
   * @param data : Contains campaignId, senderEmail, receiverEmail, addedBy and emailConversation details
   * @returns : Success message for conversation insert/update
   * @working : It is used to save or update follow-up email conversations in the database. If conversation exists,
   *           it appends new messages, otherwise creates a new conversation record.
   */
  async saveFollowUpConversationsToDB(data: any) {
    try {
      const filter = {
        campaignId: data.campaignId,
        senderEmail: data.senderEmail,
        receiverEmail: data.receiverEmail,
        addedBy: data.addedBy,
      };

      let update;
      const existingConversation =
        await this.campaignFollowUpEmailConversationCollection.findOne(filter);

      if (existingConversation) {
        update = {
          $addToSet: { emailConversation: { $each: data.emailConversation } },
          $set: { updatedAt: new Date() },
        };
      } else {
        update = {
          $set: {
            campaignId: data.campaignId,
            senderEmail: data.senderEmail,
            receiverEmail: data.receiverEmail,
            addedBy: data.addedBy,
            emailConversation: data.emailConversation,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      }

      const options = { upsert: true };
      const result =
        await this.campaignFollowUpEmailConversationCollection.updateOne(
          filter,
          update,
          options,
        );

      if (result.upsertedId) {
        return { message: 'New Follow-up conversation inserted successfully' };
      } else {
        return { message: 'Follow-up conversation updated successfully' };
      }
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * Saves email conversations to draft collection
   * @param data - Email conversation data
   * @param campaignDetails - Campaign details
   * @returns Message indicating success or throws error
   */
  async saveConversationsToDraft(data: any, campaignDetails: any) {
    try {
      const newDraft: CampaignDraft = {
        campaignId: data?.standAloneAssistant
          ? null
          : campaignDetails._id.toHexString(),
        standAloneAssistant: data?.standAloneAssistant || false,
        knowledgebaseId: data?.knowledgebaseId || null,
        senderEmail: data.senderEmail,
        receiverEmail: data.receiverEmail,
        emailConversation: data.emailConversation || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        addedBy: campaignDetails.addedBy || data.userId,
      };

      const result = await this.campaignDraftCollection.insertOne(newDraft);

      if (result.insertedId) {
        return { message: 'Campaign draft created successfully' };
      } else {
        throw new Error('Failed to create campaign draft');
      }
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  /**
   * Moves emails between different folders/collections
   * @param emails - Array of emails to move
   * @param currentFolder - Source folder name
   * @param moveToFolder - Destination folder name
   * @param req - Request object containing user info
   * @returns Status message
   */
  async moveEmailsToFolder(
    emails: [],
    currentFolder: string,
    moveToFolder: string,
    req: any,
  ) {
    Logger.log('Starting moveEmailsToFolder method');

    if (emails.length === 0) {
      Logger.log('No emails provided to move');
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'It seems there are no emails available to move at the moment.',
      };
    }

    const moveToCollectionMap = {
      chatsummary: this.campaignImapConversationCollection,
      draft: this.campaignDraftCollection,
      unresolved: this.campaignUnresolvedCollection,
    };

    const currentCollectionMap = {
      unresolved: this.campaignUnresolvedCollection,
      draft: this.campaignDraftCollection,
      chatsummary: this.campaignImapConversationCollection,
    };

    const moveToCollection = moveToCollectionMap[moveToFolder];
    const currentCollection = currentCollectionMap[currentFolder];

    if (!moveToCollection) {
      Logger.log(`Invalid folder type: ${moveToFolder}`);
      throw new BadRequestException('Invalid folder type');
    }

    if (!currentCollection) {
      Logger.log(`Invalid folder type: ${currentFolder}`);
      throw new BadRequestException('Invalid folder type');
    }

    Logger.log(
      `Moving ${emails.length} emails from ${currentFolder} to ${moveToFolder}`,
    );

    for (const email of emails) {
      Logger.log(`Moving email ${email['_id']}`);
      await moveToCollection.insertOne(email);

      const deleteFilter = {
        _id: email['_id'],
        addedBy: req.user._id.toHexString(),
      };

      if (currentFolder === 'chatsummary') {
        Logger.log('Adjusting delete filter for chatsummary folder');
        deleteFilter['userId'] = req.user._id.toHexString();
        delete deleteFilter['addedBy'];
      }

      await currentCollection.findOneAndDelete(deleteFilter);
      Logger.log(`Successfully moved email ${email['_id']}`);
    }

    Logger.log('Email move operation completed successfully');
    return {
      statusCode: HttpStatus.OK,
      message: 'Emails moved successfully',
    };
  }

  /**
   * Rejects draft emails from approval
   * @param draftEmailId - ID of draft email to reject
   * @returns Status message
   */
  async rejectEmailsFromApproval(draftEmailId: string, req: any) {
    try {
      const draftEmail = await this.campaignDraftCollection.findOne({
        _id: new ObjectId(draftEmailId),
      });

      const emailUserOauthToken =
        await this.campaignUserEmailTokenCollection.findOne({
          userId: req.user._id.toHexString(),
          email: draftEmail.senderEmail,
        });

      const smtpServerConfig = await this.smtpCollection.findOne({
        userId: req.user._id.toHexString(),
        email: draftEmail.senderEmail,
      });

      if (!emailUserOauthToken || !smtpServerConfig) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: `Email user oauth token or smtp server config not found for the email ${draftEmail.senderEmail}`,
        };
      }

      if (emailUserOauthToken) {
        const gmailToken = {
          access_token: emailUserOauthToken.accessToken,
          refresh_token: emailUserOauthToken.refreshToken,
          scope: emailUserOauthToken.scope,
          token_type: emailUserOauthToken.tokenType,
          expiry_date: new Date(emailUserOauthToken.tokenExpiryDate).getTime(),
        };

        const deleteFromGmailDraft =
          await this.gmailServiceApis.deleteDraftByEmailSubjectAndContent(
            draftEmail.senderEmail || 'me',
            gmailToken,
            draftEmail.emailConversation[0].subject,
            draftEmail.emailConversation[0].emailTextContent,
          );
      } else if (smtpServerConfig) {
        const imapServerConfig = {
          host: smtpServerConfig.host,
          user: draftEmail.senderEmail,
          password: CryptoService.decryptPasskey(smtpServerConfig.password),
          port: smtpServerConfig.port,
          secure: smtpServerConfig.secure,
        };

        const emailContent = {
          to: draftEmail.receiverEmail,
          subject: draftEmail.emailConversation[0].subject,
          body: draftEmail.emailConversation[0].emailTextContent,
        };

        await this.imapService.deleteDraftEmail(
          draftEmail.senderEmail,
          emailContent,
          imapServerConfig,
        );
      } else {
      }

      const deleteDraft = await this.campaignDraftCollection.deleteOne({
        _id: new ObjectId(draftEmailId),
      });

      if (!deleteDraft) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Draft email not found',
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Rejected',
      };
    } catch (error) {
      Logger.error(`Error rejecting draft email: ${error.message}`);
    }
  }

  /**
   * Approves and sends draft emails
   * @param emails - Array of emails to approve and send
   * @param req - Request object containing user info
   * @returns Status message
   */
  async approveEmailsAndSend(emails: [], req: any) {
    if (!emails?.length) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No emails to process',
      };
    }

    Logger.log('Starting approveEmailsAndSend method');
    const emailServer = await this.campaignEmailServerConfigCollection.findOne({
      userId: req.user._id.toHexString(),
      emailServiceProviderName: EMAIL_SERVICE_PROVIDER_NAME.POSTMARK,
    });

    try {
      let decryptedApiKey = '';
      await Promise.all(
        emails.map(async (email: any) => {
          const smtpServerConfig = await this.smtpCollection.findOne({
            userId: req.user._id.toHexString(),
            email: email.senderEmail,
          });

          if (emailServer && !smtpServerConfig) {
            decryptedApiKey = CryptoService.decryptPasskey(
              emailServer?.emailServerApiKey,
            );
          }

          if (smtpServerConfig && !emailServer) {
            decryptedApiKey = '';
          }

          if (smtpServerConfig && emailServer) {
            const emailAndPassKey =
              await this.campaignEmailPasskeyCollection.findOne({
                userId: req.user._id.toHexString(),
                email: email?.senderEmail,
              });

            if (emailAndPassKey) {
              decryptedApiKey = CryptoService.decryptPasskey(
                emailServer?.emailServerApiKey,
              );
            }
          }

          const campaignDetails = await this.campaignCollection.findOne({
            _id: new ObjectId(email.campaignId),
            addedBy: req.user._id.toHexString(),
          });

          if (!campaignDetails) {
            throw new Error(`Campaign not found for ID: ${email.campaignId}`);
          }

          const emailContent = email.emailConversation[0];

          if (decryptedApiKey && decryptedApiKey !== '') {
            await this.adminEmailService.sendCampaignEmailToLeads(
              email.senderEmail,
              email.receiverEmail,
              { data: campaignDetails },
              emailContent.subject,
              emailContent.emailTextContent,
              decryptedApiKey,
              req.user._id.toHexString(),
            );
          } else if (smtpServerConfig) {
            await this.nodeMailerService.sendEmail(
              req.user._id.toHexString(),
              email.receiverEmail,
              emailContent.subject,
              emailContent.emailTextContent,
              '',
              [],
              smtpServerConfig.email,
              { data: campaignDetails },
            );
          } else {
          }

          const emailSentObj = {
            isReceivedEmail: false,
            isSentEmail: true,
            isAutoReply: true,
            emailTextContent: emailContent.emailTextContent,
            dateAndTime: new Date(),
          };

          const updatedEmail = {
            ...email,
            subject: emailContent.subject,
            emailConversation: [emailSentObj],
            addedBy: req.user._id.toHexString(),
          };

          await Promise.all([
            this.saveConversationsToDB(updatedEmail, campaignDetails),
            this.rejectEmailsFromApproval(email._id, req),
            this.campaignDraftCollection.deleteOne({
              _id: new ObjectId(email._id),
            }),
          ]);
        }),
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Sent successfully',
      };
    } catch (error) {
      Logger.error(`Error in approveEmailsAndSend: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to send emails',
        error: error.message,
      };
    }
  }

  /**
   * Edits a draft email
   * @param data - Data containing draftEmailId, subject, and emailTextContent
   * @returns Status message and updated draft email data
   **/

  async editDraftEmail(data: EditDraftEmailDto) {
    const { draftEmailId, subject, emailTextContent } = data;

    if (!draftEmailId) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'draftEmailId is required',
      };
    }

    const draft = await this.campaignDraftCollection.findOne({
      _id: new ObjectId(draftEmailId),
    });

    if (!draft) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Draft email not found',
      };
    }

    const updatedEmailObj = {
      ...draft,
      emailConversation: [
        {
          ...draft.emailConversation?.[0],
          subject,
          emailTextContent,
          dateAndTime: new Date(),
        },
      ],
      subject,
      updatedAt: new Date(),
    };

    await this.campaignDraftCollection.updateOne(
      { _id: new ObjectId(draftEmailId) },
      { $set: updatedEmailObj },
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Draft email updated successfully',
      data: updatedEmailObj,
    };
  }

  /**
   * Generates email summary for email conversations using OpenAI
   * @param emails - Array of emails to summarize
   * @param req - Request object containing user info
   * @returns Generated summary
   */
  async chatSummaryForEmails(emails: any[], req: any) {
    const prompt = [
      {
        role: 'system',
        content: `You are a professional business analyst summarizing email conversations.

        Each email message in the thread has two direction flags:
        - "isSentEmail": true  → this message was SENT by our user (outgoing)
        - "isReceivedEmail": true  → this message was RECEIVED from the contact (incoming)

        Your job is to summarize the FULL two-way conversation — both outgoing and incoming messages — in chronological order, capturing the back-and-forth exchange.

        Guidelines:
        - Cover BOTH sent and received messages — do not skip either direction
        - Write in a natural, flowing narrative style (not bullet points)
        - Clearly reflect who initiated what and how the other party responded
        - Include specific details, proposals, questions, and answers
        - Highlight key decisions, action items, or next steps
        - Keep the language professional but conversational
        - Avoid phrases like "the conversation shows" or "the participants discussed"

        For example:
        "We reached out regarding the Q4 proposal, outlining the pricing and timeline. The contact replied asking for a revised quote with a shorter delivery window. We responded with an updated offer..."

        Return the response as a valid JSON object with the key "summary".`,
      },
      {
        role: 'user',
        content: JSON.stringify(emails),
      },
    ];

    try {
      const chatSummaryResponse = await this.openaiService.getChatGptCompletion(
        {
          messages: prompt as any,
          temperature: 0.5,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
          top_p: 0.9,
          model: GPTModels.GPT_4O_MINI,
        },
        [],
        new ObjectId(req.user._id.toHexString()),
        'email-chat-summary',
      );

      // Update user token usage
      this.updateTokenUsage(req.user._id, chatSummaryResponse.tokenUsage.total);

      let summary;
      try {
        summary = JSON.parse(chatSummaryResponse.response);
      } catch (parseError) {
        Logger.error(`Error parsing OpenAI response: ${parseError.message}`);
        throw new Error('Invalid JSON response from OpenAI');
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Summary generated successfully',
        data: summary,
      };
    } catch (error) {
      Logger.error(`Error in chatSummaryForEmails: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate summary',
        error: error.message,
      };
    }
  }

  /**
   * Parses a GPT JSON response, stripping markdown code fences (```json ... ```)
   * that models sometimes wrap raw JSON in, which otherwise throws
   * "Unexpected token '`'" on a plain JSON.parse.
   * @param raw - Raw response string from the GPT completion
   * @returns Parsed JSON object
   */
  private parseGptJsonResponse(raw: string): any {
    let cleaned = (raw || '').trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }
    return JSON.parse(cleaned);
  }

  /**
   * Extracts lead information from email content using OpenAI
   * @param data - Email data containing content and settings
   * @param req - Request object containing user info
   * @returns Extracted lead information
   */
  async extractLeadInformationFromEmail(data: any, req?: any) {
    const emailSetting = data.emailAssistanceSetting || null;
    const leadCollectionFields =
      emailSetting?.emailSetting?.leadCollectionInputFields;
    const defaultFields = ['meeting date and time'];
    const userDefinedFields: string[] = [];
    if (leadCollectionFields) {
      if (leadCollectionFields.isName) userDefinedFields.push('name');
      if (leadCollectionFields.isPhone) userDefinedFields.push('phone');
      if (leadCollectionFields.isAddress) userDefinedFields.push('address');
    }
    const fieldsToExtract = Array.from(
      new Set([
        ...(userDefinedFields.length ? userDefinedFields : defaultFields),
        'meeting date and time',
      ]),
    );

    const prompt = [
      {
        role: 'system',
        content: `You are a professional data extraction assistant. Your task is to analyze email content and extract specific lead information based on the requested fields. Extract information that is explicitly mentioned in the email content as provided by the sender.

        IMPORTANT RULES:
        - The email content below may contain, below the sender's own new reply, a QUOTED copy of the previous outbound message (usually after "On [date], X wrote:" or inside a blockquote/nested reply). That quoted portion is OUR OWN prior email being echoed back — ALWAYS ignore any name, phone, address, footer, or "Call Us"/"Email Us" content found inside it.
        - Everything the sender wrote ABOVE that quoted portion is their own new content — including their own signature (e.g. "Best regards, Name", or a fuller signature with job title, company name, and phone number). If that new content shows genuine interest or buying intent (asking about enrollment, pricing, next steps, scheduling, expressing interest, etc.), extract any requested field (name, phone, address) found anywhere in the sender's own new content, including their own signature — job titles and company names in the sender's OWN signature don't disqualify the name/phone/address next to them.
        - Do not extract information from the QUOTED/forwarded portion under any circumstance, even if it looks like contact info
        - Look for patterns like "name is X", "name: X", "my name is X", "I am X", etc.
        - Look for phone numbers, addresses, and emails in various formats
        - Do not make assumptions or generate random data
        - Do NOT extract or reuse any email address, phone number, URL, or contact detail that appears in a "Call Us" / "Email Us" / "Contact Us" labeled section or an unsubscribe footer, wherever it appears
        - Only extract and return contact or lead information if it is explicitly provided by the sender in their own new content; do NOT invent, infer, or pull details from the quoted/forwarded portion or from system-generated sections
            
        - STRICTLY IGNORE any HTML content, including:
          • <a> tags, buttons, links, or clickable elements
          • href="tel:..." or href="mailto:..."
        - DO NOT extract any phone number or email found inside HTML attributes or anchor tags
        - DO NOT extract any contact info shown with labels like:
          "Call Us", "Email Us", "Contact Us", "Support", "Help"
        - Treat such content as SYSTEM GENERATED, NOT user input
        - Even if the data looks valid, IGNORE if it is inside HTML or UI elements
        - If a phone number or email appears anywhere near labels like "Call Us", "Email Us", "Contact Us", ALWAYS IGNORE it even if it looks like valid contact information

        Return the response as a JSON object with these properties:
        - extractedInfo: Object containing the requested fields (only include fields that were found)
        - isLeadInfo: Boolean indicating if any requested information was found
        - confidence: Object containing confidence scores (0-1) for each extracted field
        - analyze if demanding for a possible meeting or online appointment in this case make isMeetingDemanded: boolean also isAppointmentDemanded boolean.
  
        Format example:
        {
          "extractedInfo": {
            "name": "John Smith",
            "phone": "+1-555-0123",
            "address": "123 Main St, Anytown, USA",
            "meeting_date_and_time": "2025-10-15T14:00"
          },
          "isLeadInfo": true,
          "isMeetingDemanded": true,
          "isAppointmentDemanded": true,
          "confidence": {
            "name": 0.95,
            "phone": 0.85,
            "address": 0.75,
            "meeting_date_and_time": 0.80
          }
        }
  
        If no requested information is found, return:
        {
          "extractedInfo": {},
          "isLeadInfo": false,
          "isMeetingDemanded": false,
          "isAppointmentDemanded": false,
          "confidence": {}
        }`,
      },
      {
        role: 'user',
        content: `Please analyze the following email content and extract information for these specific fields which value have true: ${fieldsToExtract.join(
          ',',
        )}. Extract information from the sender's own new content only — never from the quoted/forwarded portion of the message (see rule below).
  
        Previous Email Conversation for Context do not extract information from this its for your context: ${
          data?.previousEmailConversation
        }

        Current Email Content => extract the information from this email only: ${
          data?.emailContent
        }
  
        Instructions:
        1. Search for the requested fields which value have true: ${fieldsToExtract.join(
          ',',
        )}
        2. Look for patterns like "name is X", "name: X", "my name is X", "I am X", "phone: X", "address: X", "email: X", etc.
        3. Be thorough in identifying information even if it's not explicitly labeled (e.g., if someone writes "you can reach me at 555-1234" identify this as a phone number)
        4. DO NOT extract anything from the quoted/forwarded portion of the message (after "On [date], X wrote:" or inside a blockquote). Within the sender's own new content, their signature IS fair game — if the message shows genuine interest or buying intent, extract any of the requested fields (name, phone, address) found there, even in a full signature with job title/company name
        5. Only extract information that appears to be provided by the sender in their own new content
        6. Assign confidence scores based on how clearly the information is presented
        7. Set isLeadInfo to true only if at least one requested field is found
        8. Format the response as specified in the system message,
        9. If any contact detail appears near phrases like "Call Us", "Email Us", or inside HTML, IGNORE it completely`,
      },
    ];

    const gptLeadExtractionResponse =
      await this.openaiService.getChatGptCompletion(
        {
          messages: prompt as any,
          temperature: 0.1,
          frequency_penalty: 0,
          presence_penalty: 0,
          top_p: 1,
          model: GPTModels.GPT_5_MINI,
        },
        [],
        req?.user._id,
        'email-lead-extraction',
      );

    const extractedData = this.parseGptJsonResponse(
      gptLeadExtractionResponse.response,
    );

    let appointmentDetails = null;
    try {
      if (extractedData.isLeadInfo) {
        if (data?.receiverEmail === data?.senderEmail) {
          return {
            statusCode: HttpStatus.OK,
            message:
              'Extracted lead information belongs to the sender email, skipping saving to DB and lead collection',
            data: {},
            appointmentDetails: null,
          };
        }
        // Run these operations in parallel
        const [saveToDBResult, saveToLeadCollectionResult, zapierWebhookUrl] =
          await Promise.all([
            this.saveLeadInformationToDB({
              ...data,
              leadInfo: extractedData.extractedInfo,
              confidence: extractedData.confidence,
              extractionDate: new Date(),
              emailId: data.receiverEmail,
              //  campaignId: data.campaignDetails?.campaignId,
              campaignId:
                data.campaignId || data.campaignDetails?._id?.toHexString(),
            }),
            this.saveLeadInformationToLeadCollection({
              ...data,
              leadInfo: extractedData.extractedInfo,
            }),
            this.zapierWebhookService.getUserZapierWebhook(
              data.campaignDetails?.addedBy,
            ),
          ]);
        appointmentDetails = saveToLeadCollectionResult.data;
        // Handle Zapier webhooks if available
        if (zapierWebhookUrl.data.length > 0) {
          // Create an array of promises for all webhook calls
          const webhookPromises = zapierWebhookUrl.data.map((webhook) =>
            this.zapierWebhookService.sendLeadViaWebhookPayloadToZapier(
              webhook.webhookUrl,
              webhook.webhookRequestType,
              {
                ...extractedData.extractedInfo,
                email: data.receiverEmail,
              },
            ),
          );

          // Execute all webhook calls in parallel
          await Promise.all(webhookPromises);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error saving lead information (campaignId: ${
          data.campaignId || data.campaignDetails?._id?.toHexString()
        }, senderEmail: ${data?.senderEmail}): ${error.message}`,
        error.stack,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      message: extractedData.isLeadInfo
        ? 'Lead information extracted successfully'
        : 'No lead information found',
      data: extractedData,
      appointmentDetails: appointmentDetails,
    };
  }

  /**
   * Saves extracted lead information to database
   * @param data - Lead information data
   * @returns Status message
   */
  async saveLeadInformationToDB(data: any) {
    const existingLead = await this.campaignLeadGeneratedCollection.findOne({
      addedBy: data?.userId || data?.addedBy || data?.campaignDetails?.addedBy,
      email: data?.receiverEmail,
    });

    if (existingLead) {
      // Update existing lead
      const updateResult = await this.campaignLeadGeneratedCollection.updateOne(
        { _id: existingLead._id },
        {
          $set: {
            campaignId:
              data?.campaignId ||
              data?.campaignDetails?._id?.toHexString() ||
              existingLead.campaignId ||
              null,
            knowledgebaseId:
              data?.knowledgebaseId ||
              data?.campaignDetails?.campaignProject?.projectId ||
              existingLead.knowledgebaseId ||
              null,
            standAloneAssistant: data?.standAloneAssistant || null,
            email: data?.receiverEmail || existingLead.email,
            name: data?.leadInfo?.name || existingLead.name,
            phoneNumber: data?.leadInfo?.phone || existingLead.phoneNumber,
            address: data?.leadInfo?.address || existingLead.address,
            updatedAt: new Date(),
            addedBy:
              data?.campaignDetails?.addedBy || data?.userId || data?.addedBy,
          },
        },
      );

      if (!updateResult.modifiedCount) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lead update failed',
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Lead updated successfully',
      };
    } else {
      // Create new lead
      const campaignLeadCollection =
        await this.campaignLeadGeneratedCollection.insertOne({
          campaignId:
            data?.campaignId ||
            data?.campaignDetails?._id?.toHexString() ||
            null,
          knowledgebaseId:
            data?.knowledgebaseId ||
            data?.campaignDetails?.campaignProject?.projectId ||
            null,
          standAloneAssistant: data?.standAloneAssistant || null,
          email: data?.receiverEmail || '',
          name: data?.leadInfo?.name || '',
          phoneNumber: data?.leadInfo?.phone || '',
          address: data?.leadInfo?.address || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          addedBy:
            data?.campaignDetails?.addedBy || data?.userId || data?.addedBy,
        });

      if (!campaignLeadCollection.insertedId) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lead creation failed',
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Lead created successfully',
      };
    }
  }

  /**
   * Handles email content detection and executes rules
   * @param data - Email data
   * @param req - Request object containing user info
   * @returns Results of rule execution
   */
  async handleEmailContentDetectionAndRuleExecution(data: any, req: any) {
    try {
      const [
        keywordDetectionAndMarkEmailAsSpam,
        markEmailAsUnresolved,
        // syncWithGmailDraft,
        // markEmailAsArchived,
        // fallbackMeachanismAndRuleExecution,
      ] = await Promise.all([
        this.keywordDetectionAndMarkEmailAsSpam(data, req),
        this.markEmailAsUnresolved(data, req),
        // this.syncWithGmailDraft(data, req),
        // this.markEmailAsArchived(data, req),
        // this.fallbackMeachanismAndRuleExecution(data, req),
      ]);

      return {
        statusCode: HttpStatus.OK,
        message: 'Email content detection and rule execution completed',
        data: {
          keywordDetectionAndMarkEmailAsSpam,
          markEmailAsUnresolved,
          // syncWithGmailDraft,
          // markEmailAsArchived,
          // fallbackMeachanismAndRuleExecution,
        },
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Detects keywords and marks email as spam if needed
   * @param data - Email data
   * @param req - Request object containing user info
   * @returns Detection results
   */
  async keywordDetectionAndMarkEmailAsSpam(data: any, req: any) {
    const emailAssistanceSetting = data.emailAssistanceSetting;

    const prompt = [
      {
        role: 'system',
        content: `You are an AI assistant tasked with detecting keywords in an email and determining if it should be marked as spam or restricted from replies. You must respond with a JSON object containing "isSpam" and "isRestrictedToReply" boolean flags. Both flags must always be either true or false, never null or omitted.`,
      },
      {
        role: 'user',
        content: `Analyze this email content and check if it contains any of the provided keywords or if it contains abusive language or any type of unwanted email. If found, mark appropriate flags as true. If not found, mark both as false.

        Email Content: ${data.emailContent}

        Keywords to check: ${emailAssistanceSetting?.ruleSetup?.customizeSettings?.keywords.join(
          ', ',
        )}

        Respond only with a JSON object in this format:
        {
          "isSpam": true or false,
          "isRestrictedToReply": true or false
        }
        Both "isSpam" and "isRestrictedToReply" must always be present and must be either true or false.`,
      },
    ];

    const gptResponse = await this.openaiService.getChatGptCompletion(
      {
        messages: prompt as any,
        model: GPTModels.GPT_4O_MINI,
      },
      [],
      req.user._id,
      'email-spam-detection',
    );

    const response = this.parseGptJsonResponse(gptResponse.response);

    // Update user token usage
    this.updateTokenUsage(
      req.user._id,
      gptResponse.tokenUsage.total,
      data.campaignDetails?.campaignProject?.projectId || data?.knowledgebaseId,
    );

    if (response?.isSpam || response?.isRestrictedToReply) {
      const oauthToken = await this.campaignUserEmailTokenCollection.findOne({
        email: data.senderEmail,
      });

      if (oauthToken) {
        const emailServerConfig = {
          access_token: CryptoService.decryptPasskey(oauthToken.accessToken),
          refresh_token: CryptoService.decryptPasskey(oauthToken.refreshToken),
          token_type: oauthToken.tokenType,
          scope: oauthToken.scope,
          expiry_date: new Date(oauthToken.tokenExpiryDate).getTime(),
        };

        const emailContentData = {
          senderEmail: data.senderEmail,
          receiverEmail: data.receiverEmail,
          subject: data.subject,
          emailContent: data.emailContent,
        };

        this.gmailServiceApis.createSpam(
          data.senderEmail,
          emailServerConfig,
          emailContentData,
        );
      }

      if (data?.smtpServerConfig && data.smtpServerConfig.host) {
        await this.imapService.createSpamEmail(
          data.senderEmail,
          {
            to: data.receiverEmail,
            subject: data.subject,
            body: data.emailContent,
            attachments: [],
          },
          data.imapServerConfig,
        );
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Email marked as spam on user gmail account',
      };
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Email content detection and rule execution completed',
      data: response,
    };
  }

  /**
   * Marks email as unresolved if needed
   * @param data - Email data
   * @param req - Request object containing user info
   * @returns Status of unresolved marking
   */
  async markEmailAsUnresolved(data: any, req: any) {
    data.emailAssistanceSetting;

    const prompt = [
      {
        role: 'system',
        content: `You are an AI assistant tasked with analyzing an email and determining if it should be marked as unresolved. You must respond with a JSON object containing only the "isUnresolved" boolean flag. Note that emails with clear questions about services, pricing, or features that can be answered with available campaign information should NOT be marked as unresolved.`,
      },
      {
        role: 'user',
        content: `Analyze this email content and determine if it should be marked as unresolved based on the following criteria:

        1. Email Purpose Clarity:
          - Is the email completely incomprehensible or impossible to understand?
          - Is there absolutely no way to determine what the sender wants?
        
        2. Campaign Relevance:
          - Is the email completely unrelated to our business or services?
          - Does it contain spam or malicious content?
        
        3. Response Generation Feasibility:
          - Does the email require access to strictly confidential information?
          - Does the email require complex technical implementations or custom development work?
          - Does the request require in-person meetings or physical services?
        
        4. Technical Limitations:
          - Are there corrupted attachments or unreadable content?
          - Does the email require integration with systems we cannot access?

        5. Content Appropriateness:
          - Does the email contain text like "aabra ka dabra" or abusive language?
        
        Note: Do NOT mark as unresolved if:
        - The email asks about pricing, features, or service details
        - The sender requests more information or clarification
        - The questions can be answered using campaign information
        - The email shows interest but needs more details
        
        Email Content: ${data.emailContent}

        campaign details: ${JSON.stringify(data.campaignDetails)}
        
        previous email conversation: ${JSON.stringify(
          data.previousEmailConversation,
        )}
        
        Respond only with a JSON object in this format:
        {
          "isUnresolved": boolean
        }`,
      },
    ];

    const gptResponse = await this.openaiService.getChatGptCompletion(
      {
        messages: prompt as any,
        model: GPTModels.GPT_4O_MINI,
      },
      [],
      req.user._id,
      'email-unresolved-check',
    );

    const response = this.parseGptJsonResponse(gptResponse.response);

    // Update user token usage
    this.updateTokenUsage(
      req.user._id,
      gptResponse.tokenUsage.total,
      data.campaignDetails?.campaignProject?.projectId,
    );

    if (response.isUnresolved) {
      const emailConversation = {
        isSentEmail: false,
        isReceivedEmail: true,
        isUnresolvedEmail: true,
        subject: data.subject,
        emailTextContent: data.emailContent,
        dateAndTime: new Date(),
      };

      // await this.campaignUnresolvedCollection.insertOne({
      //   campaignId: data.campaignDetails._id.toHexString(),
      //   receiverEmail: data.receiverEmail,
      //   senderEmail: data.senderEmail,
      //   emailConversation: [emailConversation],
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      //   addedBy: req.user._id.toHexString(),
      // });

      data.emailConversation = [emailConversation];

      await this.fallbackMeachanismAndRuleExecution(data, req);
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Unresolved email detection completed',
      data: response,
    };
  }

  /**
   * Syncs with Gmail drafts run by cron jobs every 2 hours
   * @param data - Email data
   * @returns Sync status
   */
  async syncWithGmailDraft() {
    try {
      const now = new Date();
      const twoHoursBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const beforeTime = twoHoursBefore.toISOString();
      const afterTime = now.toISOString();

      // Get all users in parallel
      const users = await this.userCollection.find().toArray();

      // Process users concurrently with Promise.all
      await Promise.all(
        users.map(async (user) => {
          try {
            const senderVerifiedEmails = await this.getEmailsByUserId(
              user._id.toHexString(),
            );

            // Process verified emails concurrently
            await Promise.all(
              senderVerifiedEmails.data.map(async (item: any) => {
                try {
                  const oauthToken =
                    await this.campaignUserEmailTokenCollection.findOne({
                      email: item.email,
                    });

                  const smtpServerConfig = await this.smtpCollection.findOne({
                    userId: user._id.toHexString(),
                    email: item.email,
                  });

                  if (!oauthToken && !smtpServerConfig) {
                    throw new Error(
                      `OAuth token or smtp server config not found for email: ${item.email}`,
                    );
                  }

                  let mailbox;
                  let draftEmails;
                  if (oauthToken) {
                    const emailServerConfig = {
                      access_token: CryptoService.decryptPasskey(
                        oauthToken.accessToken,
                      ),
                      refresh_token: CryptoService.decryptPasskey(
                        oauthToken.refreshToken,
                      ),
                      token_type: oauthToken.tokenType,
                      scope: oauthToken.scope,
                      expiry_date: new Date(
                        oauthToken.tokenExpiryDate,
                      ).getTime(),
                    };

                    mailbox = await this.gmailServiceApis.listMessagesV2(
                      item.email,
                      emailServerConfig,
                      beforeTime,
                      afterTime,
                    );
                  }

                  if (smtpServerConfig) {
                    draftEmails = await this.imapService.fetchDraftEmail({
                      email: item.email,
                      password: CryptoService.decryptPasskey(
                        smtpServerConfig.password,
                      ),
                      dateAfter: beforeTime,
                      dateBefore: afterTime,
                    });
                  }

                  if (!mailbox?.sent?.length && !draftEmails?.sent?.length) {
                    return;
                  }

                  // Process mailbox items concurrently
                  await Promise.all(
                    [...mailbox.sent, ...draftEmails.sent].map(
                      async (mailItem: any) => {
                        try {
                          const draftEmails = await this.campaignDraftCollection
                            .find({
                              addedBy: user._id.toHexString(),
                              receiverEmail: mailItem.to,
                              senderEmail: mailItem.from,
                              emailConversation: {
                                $elemMatch: {
                                  emailTextContent: mailItem.body,
                                },
                              },
                            })
                            .toArray();

                          const emailSentObj = {
                            isReceivedEmail: false,
                            isSentEmail: true,
                            isAutoReply: true,
                            subject: mailItem.subject,
                            emailTextContent: mailItem.body,
                            dateAndTime: new Date(),
                          };

                          const data = {
                            senderEmail: mailItem.from,
                            receiverEmail: mailItem.to,
                            subject: mailItem.subject,
                            emailContent: mailItem.body,
                            emailConversation: [emailSentObj],
                            campaignDetails: {
                              _id: new ObjectId(),
                              user: user._id.toHexString(),
                            },
                          };

                          const saveConversation =
                            await this.saveSyncDraftConversationsToDB(
                              data,
                              data.campaignDetails,
                            );

                          if (draftEmails.length > 0 && saveConversation) {
                            await this.campaignDraftCollection.deleteOne({
                              addedBy: user._id.toHexString(),
                              receiverEmail: mailItem.to,
                              senderEmail: mailItem.from,
                              emailContent: mailItem.body,
                            });
                          }
                        } catch (mailItemError) {
                          this.logger.error(
                            `Error processing mail item: ${mailItemError.message}`,
                          );
                        }
                      },
                    ),
                  );
                } catch (emailError) {
                  this.logger.error(
                    `Error processing verified email: ${emailError.message}`,
                  );
                }
              }),
            );
          } catch (userError) {
            this.logger.error(
              `Error processing user ${user._id}: ${userError.message}`,
            );
          }
        }),
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Email sync completed successfully',
      };
    } catch (error) {
      this.logger.error('Error in syncWithGmailDraft:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to sync with Gmail drafts',
        error: error.message,
      };
    }
  }

  /**
   * Executes fallback mechanism based on rules
   * @param data - Email data
   * @param req - Request object containing user info
   * @returns Fallback execution status
   */

  async fallbackMeachanismAndRuleExecution(data: any, req: any) {
    const emailAssistanceSetting = data?.emailAssistanceSetting;
    const fallbackMechanism_1 =
      emailAssistanceSetting?.ruleSetup?.fallbackMechanism
        ?.FALLBACK_MECHANISM_1;
    const fallbackMechanism_2 =
      emailAssistanceSetting?.ruleSetup?.fallbackMechanism
        ?.FALLBACK_MECHANISM_2;
    const fallbackMechanism_3 =
      emailAssistanceSetting?.ruleSetup?.fallbackMechanism
        ?.FALLBACK_MECHANISM_3;

    if (fallbackMechanism_1) {
      //   FALLBACK_MECHANISM_1 = "Don't answer but add mail in a specific map/folder",
      const existingUnresolved =
        await this.campaignUnresolvedCollection.findOne({
          campaignId: data.campaignDetails.campaignId,
          receiverEmail: data.receiverEmail,
          senderEmail: data.senderEmail,
        });

      let unresolved;
      if (existingUnresolved) {
        unresolved = await this.campaignUnresolvedCollection.updateOne(
          { _id: existingUnresolved._id },
          {
            $push: { emailConversation: data.emailConversation },
            $set: { updatedAt: new Date() },
          },
        );
      } else {
        unresolved = await this.campaignUnresolvedCollection.insertOne({
          campaignId: data.campaignDetails.campaignId,
          receiverEmail: data.receiverEmail,
          senderEmail: data.senderEmail,
          emailConversation: [data.emailConversation],
          createdAt: new Date(),
          updatedAt: new Date(),
          addedBy: req.user._id.toHexString(),
        });
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Fallback mechanism 1 executed successfully',
        data: {
          isUnresolved: true,
          unresolved,
        },
      };
    }

    if (fallbackMechanism_2) {
      //   FALLBACK_MECHANISM_2 = 'Answer but reply that someone will reach out',
      const prompt = [
        {
          role: 'system',
          content: `You are a friendly customer service representative responding to inquiries.`,
        },
        {
          role: 'user',
          content: `Write a warm, personalized response acknowledging receipt of their email and informing them that a team member will be in touch shortly. Use this context:
          Email: ${data.emailContent}
          Campaign: ${data.campaignDetails}
          History: ${data.previousEmailConversation}
          Format response as: {"generatedReply": "message"}`,
        },
      ];

      const gptResponse = await this.openaiService.getChatGptCompletion(
        {
          messages: prompt as any,
          temperature: 0.5,
          frequency_penalty: 0,
          presence_penalty: 0,
          top_p: 1,
          model: GPTModels.GPT_5_MINI,
        },
        [],
        req.user._id,
        'email-fallback-reply',
      );

      const response = this.parseGptJsonResponse(gptResponse.response);

      let decryptedApiKey = '';
      if (data?.emailServerConfig && !data?.smtpServerConfig) {
        decryptedApiKey = CryptoService.decryptPasskey(
          data?.emailServerConfig?.emailServerApiKey,
        );
      }

      if (data?.smtpServerConfig && !data?.emailServerConfig) {
        decryptedApiKey = '';
      }

      if (data?.smtpServerConfig && data?.emailServerConfig) {
        const emailAndPassKey =
          await this.campaignEmailPasskeyCollection.findOne({
            userId: data?.addedBy,
            email: data?.senderEmail,
          });

        if (emailAndPassKey) {
          decryptedApiKey = CryptoService.decryptPasskey(
            data.emailServerConfig?.emailServerApiKey,
          );
        }
      }

      if (decryptedApiKey && decryptedApiKey !== '') {
        await this.adminEmailService.sendCampaignEmailToLeads(
          data.senderEmail,
          data.receiverEmail,
          data,
          data.subject,
          response?.generatedReply,
          data.emailServerConfig,
          data?.addedBy,
        );
      } else if (data.smtpServerConfig && data.smtpServerConfig.host) {
        await this.nodeMailerService.sendEmail(
          data.userId,
          data.receiverEmail,
          data.subject,
          response.generatedReply,
          '',
          [],
          data.senderEmail,
          { data: data.campaignDetails },
        );
      } else {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'No email server config found',
        };
      }
      await this.saveConversationsToDB(data, data.campaignDetails);
      return {
        statusCode: HttpStatus.OK,
        message: 'Fallback mechanism 2 executed successfully',
        data: {
          isReply: true,
        },
      };
    }

    if (fallbackMechanism_3?.isForward) {
      //   FALLBACK_MECHANISM_3 = 'Forward mail to specific mail Id',
      if (data.emailServerConfig && data.emailServerConfig.emailServerApiKey) {
        await this.adminEmailService.sendCampaignEmailToLeads(
          data.senderEmail,
          fallbackMechanism_3?.forwardTo,
          data,
          data.subject,
          data.emailContent,
          data.emailServerConfig,
          data?.addedBy,
        );
      } else if (data.smtpServerConfig && data.smtpServerConfig.host) {
        await this.nodeMailerService.sendEmail(
          data.userId,
          fallbackMechanism_3?.forwardTo,
          data.subject,
          data.emailContent,
          '',
          [],
          data.senderEmail,
          { data: data.campaignDetails },
        );
      }
      await this.saveConversationsToDB(data, data.campaignDetails);
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Fallback mechanism executed successfully',
    };
  }

  /**
   * Saves extracted lead information to leadCollection
   * @param data - Lead information data
   * @returns Status message
   */
  async saveLeadInformationToLeadCollection(data: any) {
    const email = data?.receiverEmail;
    let isMeetingBooked = false;
    let google_meet_event = null;

    const userId =
      data?.campaignDetails?.addedBy || data?.userId || data?.addedBy;

    let existingLead;

    // ✅ Standalone Assistant Lead Check
    if (data?.standAloneAssistant) {
      existingLead = await this.leadCollection.findOne({
        email,
        knowledgebaseId:
          data?.knowledgebaseId && ObjectId.isValid(data.knowledgebaseId)
            ? new ObjectId(data.knowledgebaseId)
            : null,
        IsLeadType: IsLeadType.mailBot,
        standAloneAssistant: true,
      });
    }
    // ✅ Campaign Lead Check (unchanged)
    else {
      existingLead = await this.leadCollection.findOne({
        $and: [
          { email },
          { userId },
          { IsLeadType: IsLeadType.mailBot },
          {
            campaignId:
              data?.campaignId ||
              data?.campaignDetails?._id?.toHexString() ||
              null,
          },
        ],
      });
    }

    const zapierWebhook = await this.zapierWebhookService.getUserZapierWebhook(
      userId,
    );

    if (existingLead) {
      let firstName = '';
      let lastName = '';

      if (data?.leadInfo?.name) {
        const nameParts = data?.leadInfo?.name?.trim()?.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      const updateResult = await this.leadCollection.updateOne(
        { _id: existingLead._id },
        {
          $set: {
            ...(data?.standAloneAssistant
              ? {
                  knowledgebaseId:
                    data?.knowledgebaseId &&
                    ObjectId.isValid(data.knowledgebaseId)
                      ? new ObjectId(data.knowledgebaseId)
                      : null,
                }
              : {
                  knowledgebaseId:
                    (data?.knowledgebaseId ||
                      data?.campaignDetails?.campaignProject?.projectId) &&
                    ObjectId.isValid(
                      data?.knowledgebaseId ||
                        data?.campaignDetails?.campaignProject?.projectId,
                    )
                      ? new ObjectId(
                          data.knowledgebaseId ||
                            data.campaignDetails.campaignProject.projectId,
                        )
                      : null,
                  campaignId:
                    data?.campaignId ||
                    data?.campaignDetails?._id?.toHexString() ||
                    null,
                }),
            email,
            firstName: firstName || existingLead.firstName,
            lastName: lastName || existingLead.lastName,
            phone: data?.leadInfo?.phone || existingLead.phone,
            address: data?.leadInfo?.address || existingLead.address,
            updatedAt: new Date(),
            userId,
            emailConversationId: existingLead.emailConversationId,
          },
        },
      );

      if (!updateResult.modifiedCount) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lead update failed',
        };
      }

      if (
        data?.accessToken &&
        data?.leadInfo?.meeting_date_and_time &&
        !existingLead.isAppointmentBooked &&
        !existingLead.calendarEventId
      ) {
        const meetingResponse = await this.safeMeetingBooking(
          existingLead._id,
          data,
          email,
        );
        isMeetingBooked = meetingResponse.isMeetingBooked;
        google_meet_event = meetingResponse.google_meet_event;
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Lead updated successfully',
        data: { isMeetingBooked, google_meet_event },
      };
    }
    let firstName = '';
    let lastName = '';

    if (data?.leadInfo?.name?.trim()) {
      const nameParts = data?.leadInfo?.name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const isSyncedToCrm = zapierWebhook.data.length > 0;

    const leadInsertResult = await this.leadCollection.insertOne({
      email,
      campaignId: data?.standAloneAssistant
        ? null
        : data.campaignId || data?.campaignDetails?._id?.toHexString() || null,
      firstName,
      lastName,
      name: data?.leadInfo?.name || '',
      phone: data?.leadInfo?.phone || '',
      address: data?.leadInfo?.address || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      knowledgebaseId:
        (data?.standAloneAssistant
          ? data?.knowledgebaseId
          : data?.campaignDetails?.campaignProject?.projectId) &&
        ObjectId.isValid(
          data?.standAloneAssistant
            ? data?.knowledgebaseId
            : data?.campaignDetails?.campaignProject?.projectId,
        )
          ? new ObjectId(
              data?.standAloneAssistant
                ? data?.knowledgebaseId
                : data?.campaignDetails?.campaignProject?.projectId,
            )
          : null,
      standAloneAssistant: data?.standAloneAssistant || false,
      emailConversationId:
        data?.emailConversationId && ObjectId.isValid(data.emailConversationId)
          ? new ObjectId(data.emailConversationId)
          : null,
      emailStatus: true,
      fieldStatus: 0,
      chatbotType: null,
      IsLeadType: IsLeadType.mailBot,
      isSyncedToCrm,
      isAppointmentBooked: false,
      calendarEventId: null,
      meetingDateAndTime: null,
    });

    if (!leadInsertResult.insertedId) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Lead creation failed',
      };
    }

    const newlyCreatedLeadId = leadInsertResult.insertedId;

    if (data?.accessToken && data?.leadInfo?.meeting_date_and_time) {
      const meetingResponse = await this.safeMeetingBooking(
        newlyCreatedLeadId,
        data,
        email,
      );
      isMeetingBooked = meetingResponse.isMeetingBooked;
      google_meet_event = meetingResponse.google_meet_event;
    }

    if (email && data?.senderEmail) {
      await this.emailService.sendPotentialLeadMailToAdminEMailBot(
        data?.senderEmail,
        email,
        data?.leadInfo?.name || '',
        data?.leadInfo?.phone || '',
        data?.leadInfo?.address || '',
        null,
        true,
        {
          startTime: google_meet_event?.startTime,
          endTime: google_meet_event?.endTime,
          isMeetingBookedOnGoogleMeet: isMeetingBooked,
        },
        userId,
      );
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Lead created successfully',
      data: { isMeetingBooked, google_meet_event },
    };
  }

  private async safeMeetingBooking(leadId: ObjectId, data: any, email: string) {
    let google_meet_event = null;
    let isMeetingBooked = false;

    try {
      const raw = (data.leadInfo.meeting_date_and_time || '').trim();
      if (!raw) return { isMeetingBooked, google_meet_event };

      const isoLike = raw.includes('T') ? raw : raw.replace(' ', 'T');
      const requestedStartTime = new Date(isoLike);

      if (isNaN(requestedStartTime.getTime())) {
        throw new Error('Invalid meeting_date_and_time format');
      }

      const lead = await this.leadCollection.findOne({ _id: leadId });

      if (lead.calendarEventId && lead.meetingDateAndTime) {
        const existingMeetingTime = new Date(lead.meetingDateAndTime);

        if (existingMeetingTime.getTime() === requestedStartTime.getTime()) {
          Logger.log(
            'Meeting already booked at same time — returning old details.',
          );
          return {
            isMeetingBooked: true,
            google_meet_event: {
              id: lead.calendarEventId,
              startTime: existingMeetingTime,
              meetingLink: lead.calendarEventId || null, // if stored
            },
          };
        }
      }

      const accessToken = data?.accessToken || '';
      const duration = Number(data?.leadInfo?.duration) || 30;
      const timezone =
        data?.leadInfo?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone;

      google_meet_event = await this.googleCalenderService.bookSlot(
        accessToken,
        requestedStartTime,
        email,
        duration,
        'Lead from email campaign',
        timezone,
      );

      await this.leadCollection.updateOne(
        { _id: leadId },
        {
          $set: {
            isAppointmentBooked: true,
            calendarEventId: google_meet_event?.id || null,
            meetingDateAndTime: requestedStartTime,
            meetingLink: google_meet_event?.meetingLink || null,
          },
        },
      );

      isMeetingBooked = true;
    } catch (err) {
      Logger.log('Meeting booking failed:', err.message);
    }

    return { isMeetingBooked, google_meet_event };
  }

  /**
   * Updates token usage for a user and knowledgebase
   * @param userId - The ID of the user
   * @param totalTokens - The number of tokens to add to the user's usage
   * @param knowledgebaseId - Optional knowledgebase ID to update
   */
  async updateTokenUsage(
    userId: ObjectId,
    totalTokens: number,
    knowledgebaseId?: string,
  ) {
    try {
      const currentDate = new Date();
      const currentMonth = `${
        currentDate.getMonth() + 1
      }/${currentDate.getFullYear()}`;

      await this.userCollection.updateOne({ _id: userId }, [
        {
          $set: {
            monthUsage: {
              $cond: {
                if: { $eq: ['$monthUsage.month', currentMonth] },
                then: {
                  month: '$monthUsage.month',
                  count: { $add: ['$monthUsage.count', totalTokens] },
                },
                else: {
                  month: currentMonth,
                  count: totalTokens,
                },
              },
            },
            updatedAt: new Date(),
          },
        },
      ]);

      if (knowledgebaseId) {
        const knowledgebase = new ObjectId(knowledgebaseId);
        await this.knowledgebaseCollection.updateOne({ _id: knowledgebase }, [
          {
            $set: {
              monthUsage: {
                $cond: {
                  if: { $eq: ['$monthUsage.month', currentMonth] },
                  then: {
                    month: '$monthUsage.month',
                    count: { $add: ['$monthUsage.count', totalTokens] },
                  },
                  else: {
                    month: currentMonth,
                    count: totalTokens,
                  },
                },
              },
              updatedAt: new Date(),
            },
          },
        ]);
      }

      return {
        success: true,
        message: 'Token usage updated successfully',
      };
    } catch (error) {
      this.logger.error('Error updating token usage', error);
      return {
        success: false,
        message: 'Failed to update token usage',
        error: error.message,
      };
    }
  }

  /**
   * Generates chat summary for message conversations using OpenAI
   * @param messages - Array of messages containing Q&A pairs
   * @param req - Request object containing user info
   * @returns Generated summary
   */
  async chatSummaryForMessages(messages: any[], req: any) {
    const prompt = [
      {
        role: 'system',
        content: `You are a professional business analyst summarizing chat conversations.
      Analyze the Q&A thread and create a natural, flowing summary that captures the essence of the discussion.
      
      Guidelines:
      - Write in first person perspective using active voice
      - Focus on the key questions asked and answers provided
      - Maintain the original tone and style of communication
      - Include specific details and important points discussed
      - Highlight key decisions or next steps
      - Keep the language professional but conversational
      
      For example, instead of:
      "The user asked about pricing and received information about different plans"
      
      Write like:
      "The discussion began with questions about our pricing structure. I explained our tiered pricing model, highlighting the features included in each plan..."
      
      IMPORTANT: You must return a valid JSON object with exactly this structure:
      {
        "summary": "Your summary text here"
      }
      
      Do not include any other text or formatting outside this JSON structure.`,
      },
      {
        role: 'user',
        content: JSON.stringify(messages),
      },
    ];

    try {
      const chatSummaryResponse = await this.openaiService.getChatGptCompletion(
        {
          messages: prompt as any,
          temperature: 0.3, // Reduced temperature for more consistent output
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
          top_p: 1,
          model: GPTModels.GPT_4O_MINI,
        },
        [],
        new ObjectId(req.user._id.toHexString()),
        'email-message-summary',
      );

      // Update user token usage
      this.updateTokenUsage(req.user._id, chatSummaryResponse.tokenUsage.total);

      let summary;
      try {
        const response = chatSummaryResponse.response.trim();
        // Ensure response is valid JSON
        if (!response.startsWith('{') || !response.endsWith('}')) {
          throw new Error('Response is not a valid JSON object');
        }

        const parsedResponse = JSON.parse(response);
        if (
          !parsedResponse.summary ||
          typeof parsedResponse.summary !== 'string'
        ) {
          throw new Error('Response missing required summary field');
        }

        summary = parsedResponse.summary;
      } catch (parseError) {
        Logger.error(`Error parsing OpenAI response: ${parseError.message}`);
        // Retry with a more explicit prompt if parsing fails
        return await this.retryChatSummary(messages, req);
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Summary generated successfully',
        data: summary,
      };
    } catch (error) {
      Logger.error(`Error in chatSummaryForMessages: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate summary',
        error: error.message,
      };
    }
  }

  /**
   * Retry method for generating chat summary with a more explicit prompt
   */
  private async retryChatSummary(messages: any[], req: any) {
    const retryPrompt = [
      {
        role: 'system',
        content: `You must return a valid JSON object with exactly this structure:
        {
          "summary": "Your summary text here"
        }
        
        Do not include any other text or formatting. The summary should be a string containing the conversation summary.`,
      },
      {
        role: 'user',
        content: JSON.stringify(messages),
      },
    ];

    try {
      const retryResponse = await this.openaiService.getChatGptCompletion(
        {
          messages: retryPrompt as any,
          temperature: 0.1, // Even lower temperature for retry
          frequency_penalty: 0,
          presence_penalty: 0,
          top_p: 1,
          model: GPTModels.GPT_4O_MINI,
        },
        [],
        new ObjectId(req.user._id.toHexString()),
        'email-message-summary',
      );

      const parsedResponse = JSON.parse(retryResponse.response);
      return {
        statusCode: HttpStatus.OK,
        message: 'Summary generated successfully',
        data: parsedResponse.summary,
      };
    } catch (retryError) {
      Logger.error(`Error in retryChatSummary: ${retryError.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate summary after retry',
        error: retryError.message,
      };
    }
  }

  /**
   * @working : Enhanced version of getAllCampaign that includes additional campaign statistics
   *            including total audience count, failed emails, and successful emails
   */
  async getAllCampaignV2(req, payload: any) {
    try {
      const { limit, searchStr = '' } = payload;
      if (payload.offset < 1)
        throw new BadRequestException('Offset can not be less than 1');
      const page_number = payload?.offset - 1;
      const searchFilter = {
        addedBy: req.user._id.toHexString(),
        ...(searchStr
          ? {
              $or: [
                { campaignName: { $regex: searchStr, $options: 'i' } },
                { status: { $regex: searchStr, $options: 'i' } },
              ],
            }
          : {}),
      };

      const campaignList = await this.campaignCollection
        .find(searchFilter)
        .skip(Number(page_number * limit))
        .limit(Number(limit))
        .sort({ createdAt: -1, id: 1 })
        .toArray();

      const totalCount = await this.campaignCollection.countDocuments(
        searchFilter,
      );

      if (!campaignList || campaignList.length === 0) {
        return {
          statusCode: HttpStatus.NO_CONTENT,
          message: 'No Campaign Found',
          data: [],
          pagination: {
            totalCount,
            limit,
            offset: payload.offset,
          },
        };
      }

      // Get campaign IDs for batch processing
      const campaignIds = campaignList.map((campaign) => campaign._id);

      // Get all audiences and their statuses in one go for each campaign
      const campaignStats = await Promise.all(
        campaignIds.map(async (campaignId) => {
          const campaignIdStr = campaignId.toString();

          // Get all audiences from both collections
          const [regularAudiences, duplicateAudiences] = await Promise.all([
            this.campaignAudienceCollection
              .find({
                campaignId: campaignIdStr,
              })
              .toArray(),
            this.campaignDuplicateAudienceCollection
              .find({
                campaignId: campaignIdStr,
              })
              .toArray(),
          ]);

          // Count total audiences from both collections
          const totalAudience =
            regularAudiences.length + duplicateAudiences.length;

          // Count failed and successful emails from both collections
          const failedEmails =
            regularAudiences.filter(
              (audience) => audience.emailStatus === EMAIL_STATUS.FAILED,
            ).length +
            duplicateAudiences.filter(
              (audience) => audience.emailStatus === EMAIL_STATUS.FAILED,
            ).length;

          const successEmails =
            regularAudiences.filter(
              (audience) => audience.emailStatus === EMAIL_STATUS.SENT,
            ).length +
            duplicateAudiences.filter(
              (audience) => audience.emailStatus === EMAIL_STATUS.SENT,
            ).length;

          // Calculate the number of replies (auto replies) for this campaign
          // Query the campaignImapConversationCollection for this campaignId
          // and count the number of documents where any emailConversation entry has isAutoReply === true

          let repliedCount = 0;
          try {
            repliedCount =
              await this.campaignImapConversationCollection.countDocuments({
                campaignId: campaignIdStr,
                emailConversation: {
                  $elemMatch: { isAutoReply: true },
                },
              });
          } catch (err) {
            repliedCount = 0;
          }

          return {
            campaignId: campaignIdStr,
            totalAudience,
            failedEmails,
            successEmails,
            repliedEmails: repliedCount,
          };
        }),
      );

      // Combine all statistics with campaign data
      const enhancedCampaignList = campaignList.map((campaign) => {
        const stats = campaignStats.find(
          (stat) => stat.campaignId === campaign._id.toString(),
        );

        return {
          ...campaign,
          totalAudience: stats?.totalAudience || 0,
          failedEmails: stats?.failedEmails || 0,
          successEmails: stats?.successEmails || 0,
          repliedEmails: stats?.repliedEmails || 0,
        };
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Campaigns fetched successfully',
        data: enhancedCampaignList,
        pagination: {
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          limit,
          offset: payload.offset,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async emailWarmupCountRefresher() {
    const allWarmupEmails = await this.campaignWarmupCollection
      .find()
      .toArray();

    allWarmupEmails.forEach((warmupEmail) => {
      this.addWarmupCountRefresher(warmupEmail?.userId, warmupEmail?.email);
    });
  }

  async addWarmupCountRefresher(userId: string, email: string) {
    try {
      Logger.log('Starting addWarmupCountRefresher for userId:', userId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = new Date();
      const existingDoc = await this.campaignWarmupCollection.findOne({
        userId: userId,
        email: email,
      });

      const lastUpdateDate = new Date(existingDoc?.updatedAt || new Date());
      const isNewDay =
        lastUpdateDate.getTime() <
        new Date(currentDate.setHours(0, 0, 0, 0)).getTime();
      const warmupCount = existingDoc ? existingDoc.warmupCount : 0;

      let maxLimit = 100;
      if (warmupCount >= 1000 && isNewDay) {
        maxLimit = 3000;
      } else if (warmupCount >= 500 && isNewDay) {
        maxLimit = 1000;
      } else if (warmupCount >= 100 && isNewDay) {
        maxLimit = 500;
      }

      // Prepare warmup data
      const warmupData = {
        userId: userId,
        email: email,
        status: EMAIL_AND_PASSKEY_STATUS.VERIFIED,
        warmupCount,
        updatedMaxLimit:
          (existingDoc && existingDoc.maxLimit > warmupCount
            ? existingDoc.maxLimit
            : maxLimit) || maxLimit,
      };

      // Update or insert document
      if (existingDoc) {
        await this.campaignWarmupCollection.updateOne(
          { userId: userId, email: email },
          {
            $set: {
              ...warmupData,
              updatedAt: new Date(),
              status: warmupData.status,
              ...(maxLimit !== existingDoc.maxLimit ? { maxLimit } : {}),
            },
          },
        );
      } else {
        await this.campaignWarmupCollection.insertOne({
          ...warmupData,
          isWarmUpEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          maxLimit,
        });
      }

      Logger.log('All warmup counts processed successfully');
      return {
        statusCode: HttpStatus.OK,
        message: 'Warmup counts processed successfully',
      };
    } catch (error) {
      Logger.error('Error processing warmup counts:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to process warmup counts',
        error: error.message,
      };
    }
  }

  /**
   * Fetch leads from the leadCollection by zapierWebhookId and userId.
   * @param zapierWebhookId - The Zapier Webhook ID to filter leads.
   * @param userId - The user ID to filter leads.
   * @returns An object with statusCode, message, and data (array of leads).
   */
  async getLeadsByZapierWebhookIdAndUserId(
    zapierWebhookId: string,
    userId: string,
  ) {
    try {
      if (!zapierWebhookId || !userId) {
        throw new Error('zapierWebhookId and userId are required');
      }

      const leads = await this.leadCollection
        .find({ zapierWebhookId, userId })
        .toArray();

      return {
        statusCode: HttpStatus.OK,
        message: leads.length
          ? 'Leads fetched successfully'
          : 'No leads found for the given zapierWebhookId and userId',
        data: leads,
      };
    } catch (error) {
      Logger.error(
        `Error fetching leads for zapierWebhookId: ${zapierWebhookId}, userId: ${userId}`,
        error,
      );
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch leads',
        error: error.message,
        data: [],
      };
    }
  }

  async addEmailToSuppressionList(email: string, userId: string) {
    try {
      const updateTime = new Date();
      const result = await this.db
        .collection('unsubscriptionsEmails')
        .updateOne(
          { email: email },
          {
            $set: {
              updatedAt: updateTime,
            },
            $setOnInsert: {
              addedBy: userId,
              email: email,
              isUnsubscriptionForSender: true,
              unsubscribedAt: updateTime,
              createdAt: updateTime,
            },
          },
          { upsert: true },
        );
      return result;
    } catch (error) {
      Logger.error('Error adding email to suppression list:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to add email to suppression list',
        error: error.message,
      };
    }
  }

  async getSuppressionEmailList(
    page: number | string = 1,
    limit: number | string = 10,
    searchStr = '',
    userId: string,
  ) {
    try {
      const pageNum = Math.max(Number(page) || 1, 1);
      const limitNum = Math.max(Number(limit) || 10, 1);
      const skip = (pageNum - 1) * limitNum;

      if (isNaN(pageNum) || isNaN(limitNum)) {
        throw new BadRequestException('Invalid pagination parameters');
      }

      const collection = this.db.collection('unsubscriptionsEmails');

      //  Ensure ObjectId match
      const filter: Record<string, any> = {
        addedBy: userId,
      };

      //  Optimized search (case-insensitive but controlled)
      if (searchStr?.trim()) {
        const escaped = searchStr
          .toLowerCase()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        filter.email = { $regex: `^${escaped}` }; // prefix search
      }

      // Use aggregation for better performance (single DB hit)
      const [result] = await collection
        .aggregate([
          { $match: filter },
          {
            $facet: {
              data: [
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limitNum },
              ],
              totalCount: [{ $count: 'count' }],
            },
          },
        ])
        .toArray();

      const unsubscriptionList = result?.data || [];
      const totalCount = result?.totalCount?.[0]?.count || 0;

      return {
        statusCode: HttpStatus.OK,
        message: 'Unsubscription list fetched successfully',
        data: unsubscriptionList,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      };
    } catch (error) {
      Logger.error(
        'Error fetching unsubscription list:',
        error?.message || error,
      );
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch unsubscription list',
        error: error?.message || 'Unknown error',
      };
    }
  }

  async removeEmailFromSuppressionList(email: string, userId: string) {
    try {
      const collection = this.db.collection('unsubscriptionsEmails');

      const result = await collection.deleteOne({ email: email });

      if (result.deletedCount === 0) {
        throw new BadRequestException('Email not found in suppression list');
      }
      return 'Email removed from suppression list successfully';
    } catch (error) {
      Logger.error(
        'Error removing email from suppression list:',
        error?.message || error,
      );

      throw new HttpException(
        error.message || 'Failed to remove email from suppression list',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async mergeLeadsFromMultipleSources(
    targetEmailLeads: TargetEmailLeadsDTO,
    userId: string,
  ) {
    try {
      const {
        csvUploadLeads,
        linkedinLeads,
        facebookLeads,
        gmbLeads,
        yellowpageLeads,
        previousCampaigns,
        campaignId,
        forceContinue,
        skipDuplicatesFromActiveCampaigns,
        unsubscriptions,
      } = targetEmailLeads;

      const redisKey = `merge-leads:${userId}:${campaignId}`;

      // Check if second request
      const saved = await this.redis.get(redisKey);
      let allLeads;

      if (saved) {
        allLeads = JSON.parse(saved);
      } else {
        // Normalize
        const normalizeLead = (lead, leadType) => {
          if (typeof lead === 'string') {
            return { email: lead.trim().toLowerCase(), leadType };
          }
          return {
            ...lead,
            email: lead.email?.trim().toLowerCase(),
            leadType,
          };
        };

        // FIRST CALL – merge all sources
        allLeads = [
          ...(csvUploadLeads || []).map((l) =>
            normalizeLead(l, DATA_SOURCE_FOR_TARGET_AUDIENCE.CSV),
          ),
          ...(linkedinLeads || []).map((l) =>
            normalizeLead(l, DATA_SOURCE_FOR_TARGET_AUDIENCE.LINKEDIN),
          ),
          ...(facebookLeads || []).map((l) =>
            normalizeLead(l, DATA_SOURCE_FOR_TARGET_AUDIENCE.FACEBOOK),
          ),
          ...(gmbLeads || []).map((l) =>
            normalizeLead(l, DATA_SOURCE_FOR_TARGET_AUDIENCE.GMB),
          ),
          ...(yellowpageLeads || []).map((l) =>
            normalizeLead(l, DATA_SOURCE_FOR_TARGET_AUDIENCE.YELLOW_PAGES),
          ),
          ...(previousCampaigns || []).map((l) =>
            normalizeLead(
              l,
              DATA_SOURCE_FOR_TARGET_AUDIENCE.PREVIOUS_CAMPAIGNS,
            ),
          ),
          ...(unsubscriptions || []).map((l) =>
            normalizeLead(l, DATA_SOURCE_FOR_TARGET_AUDIENCE.UNSUBSCRIPTIONS),
          ),
        ];

        if (!allLeads.length) {
          throw new BadRequestException('No leads found.');
        }
      }

      // Detect duplicates *within sources*
      const emailMap = new Map();
      const duplicateEmailsInSources = [];

      for (const lead of allLeads) {
        if (!lead.email) continue;

        if (emailMap.has(lead.email)) {
          duplicateEmailsInSources.push(lead.email);
        } else {
          emailMap.set(lead.email, { ...lead });
        }
      }

      // Deduped set
      let uniqueLeads = Array.from(emailMap.values());

      // Campaign validation
      const campaignDetails = await this.campaignCollection.findOne({
        _id: new ObjectId(campaignId),
        addedBy: userId,
        status: { $ne: CAMPAIGN_STATUS.PAUSED },
      });

      if (!campaignDetails) {
        throw new BadRequestException('Campaign not found or is paused.');
      }

      const emails = uniqueLeads.map((l) => l.email).filter(Boolean);

      // Check duplicates in other active campaigns
      const duplicatesInOtherCampaigns = await this.checkEmailInActiveCampaigns(
        userId,
        emails,
        campaignId,
      );

      if (duplicatesInOtherCampaigns.length > 0) {
        if (!forceContinue && !skipDuplicatesFromActiveCampaigns) {
          // FIRST CALL → Save original leads

          await this.redis.set(redisKey, JSON.stringify(allLeads), 'EX', 600);

          throw new HttpException(
            {
              message:
                'Some leads already exist in other active campaigns. Do you want to skip them?',
              duplicates: duplicatesInOtherCampaigns,
              requireConfirmation: true,
            },
            HttpStatus.CONFLICT,
          );
        }

        // Second call skip logic
        if (skipDuplicatesFromActiveCampaigns) {
          uniqueLeads = uniqueLeads.filter(
            (l) =>
              !duplicatesInOtherCampaigns.includes(
                l.email.trim().toLowerCase(),
              ),
          );
        }
      }

      if (!uniqueLeads.length) {
        throw new BadRequestException(
          'All provided leads are duplicates or already exist in active campaigns.',
        );
      }

      // Verify emails
      const ypEmails = new Set(
        uniqueLeads
          .filter((l) => l.leadType === DATA_SOURCE_FOR_TARGET_AUDIENCE.YELLOW_PAGES)
          .map((l) => l.email),
      );

      const nonYpLeads = uniqueLeads.filter((l) => !ypEmails.has(l.email));
      const verifiedEmailsMap = await this.verifyEmails(
        nonYpLeads.map((l) => l.email),
      );

      const freshLeads = uniqueLeads.map((lead) => {
        if (ypEmails.has(lead.email)) {
          const isVerified = lead.isEmailInvalid === false;
          return {
            ...lead,
            isVerified,
            verificationStatus: isVerified ? 'receiving' : 'not_receiving',
            isValid: isVerified,
            duplicate: false,
          };
        }

        const v = verifiedEmailsMap.get(lead.email) || {
          isVerified: false,
          verificationStatus: 'not_receiving',
        };

        return {
          ...lead,
          isVerified: v.isVerified,
          verificationStatus: v.verificationStatus,
          isValid: v.isVerified,
          duplicate: false,
        };
      });

      const validLeads = freshLeads.filter((l) => l.isVerified);
      const invalidLeads = freshLeads.filter((l) => !l.isVerified);

      // Clean Redis now that the second step is complete
      await this.redis.del(redisKey);

      return {
        message: 'Lead verification and filtering completed successfully.',
        campaignName: campaignDetails?.campaignName || '',

        totalLeads: emails.length,
        allEmails: freshLeads,
        freshLeads,

        duplicateEmails: duplicateEmailsInSources,
        duplicateEmailsInSources,

        validEmailsCount: validLeads.length,
        invalidEmailsCount: invalidLeads.length,

        duplicateEmailCount: duplicateEmailsInSources.length,
        duplicatesInOtherCampaignsCount: duplicatesInOtherCampaigns.length,
      };
    } catch (error) {
      Logger.error('Error in mergeLeadsFromMultipleSources:', error);
      throw new HttpException(
        error.message || 'Error in mergeLeadsFromMultipleSources',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async insertVerifiedLeadsToCampaign(
    leads: any[],
    campaignId: string,
    userId: string,
    req: RequestWithUser,
  ) {
    try {
      if (!Array.isArray(leads) || leads.length === 0) {
        throw new BadRequestException('No leads provided for insertion.');
      }

      // Fetch campaign details
      const campaignDetails = await this.campaignCollection.findOne({
        _id: new ObjectId(campaignId),
        addedBy: userId,
      });

      if (!campaignDetails) {
        throw new BadRequestException('Campaign not found.');
      }

      // Get existing campaign emails to avoid duplicates
      const existingEmails = await this.campaignAudienceCollection
        .find({ campaignId })
        .project({ email: 1 })
        .toArray();

      const existingEmailSet = new Set(
        existingEmails.map((e) => e.email?.trim().toLowerCase()),
      );

      // Filter out leads already existing in this campaign
      const filteredLeads = leads.filter(
        (lead) =>
          lead?.email && !existingEmailSet.has(lead.email.trim().toLowerCase()),
      );

      if (filteredLeads.length === 0) {
        throw new BadRequestException(
          'No valid leads found to insert (all duplicates).',
        );
      }

      const now = new Date();
      const bulkOps = filteredLeads.map((lead) => ({
        insertOne: {
          document: {
            email: lead.email.trim().toLowerCase(),
            createdAt: now,
            updatedAt: now,
            websiteName:
              lead?.websiteName || lead?.websiteUrl || lead?.WebsiteName || '',
            websiteUrl: lead?.websiteUrl || '',
            emailStatus: EMAIL_STATUS.INITIATED,
            processStatus: EMAIL_PROCESS_STATUS.PENDING,
            campaignId,
            campaignName: campaignDetails?.campaignName || '',
            dataSource: null,
            leadType: lead.leadType,
            addedBy: userId,
            senderEmailId: null,
            subscribeStatus: true,
            isVerified: lead.isVerified ?? false,
          },
        },
      }));

      // Insert leads in bulk
      const result = await this.campaignAudienceCollection.bulkWrite(bulkOps);
      if (campaignDetails.status === CAMPAIGN_STATUS.FAILED) {
        await this.campaignCollection.updateOne(
          { _id: new ObjectId(campaignId) },
          {
            $set: {
              status: CAMPAIGN_STATUS.RUNNING,
              campaignTrigger: CAMPAIGN_TRIGGER_STATUS.IMMEDIATE,
            },
          },
        );
        this.startCampaignV2(campaignId, req);
      }
      const insertedCount = result?.insertedCount || filteredLeads.length;

      return {
        insertedCount,
        status: 'success',
        message: `${insertedCount} leads inserted successfully.`,
      };
    } catch (error) {
      Logger.error('Error in insertVerifiedLeadsToCampaign:', error);
      throw new HttpException(
        error.message || 'Error inserting verified leads.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkEmailInActiveCampaigns(
    userId: string,
    emails: string[],
    currentCampaignId: string,
  ) {
    const activeCampaigns = await this.campaignCollection
      .find({
        addedBy: userId,
        status: { $in: [CAMPAIGN_STATUS.RUNNING, CAMPAIGN_STATUS.SCHEDULED] },
        _id: { $ne: new ObjectId(currentCampaignId) }, // exclude current campaign
      })
      .project({ _id: 1 })
      .toArray();

    if (!activeCampaigns.length) return [];

    const activeCampaignIds = activeCampaigns.map((c) => c._id.toHexString());
    const existingDocs = await this.campaignAudienceCollection
      .find({
        campaignId: { $in: activeCampaignIds },
        email: { $in: emails },
        addedBy: userId,
      })
      .project({ email: 1 })
      .toArray();

    return Array.from(new Set(existingDocs.map((d) => d.email)));
  }

  // Helper to verify emails (cached + Outscraper)
  async verifyEmails(emails: string[]) {
    const verifiedMap = new Map<
      string,
      { isVerified: boolean; verificationStatus: string }
    >();

    const existingDocs = await this.campaignAudienceCollection
      .find({ email: { $in: emails } })
      .project({ email: 1, isVerified: 1 })
      .toArray();

    existingDocs.forEach((doc) =>
      verifiedMap.set(doc.email, {
        isVerified: doc.isVerified,
        verificationStatus: doc.isVerified ? 'receiving' : 'not_receiving',
      }),
    );

    const newEmails = emails.filter((e) => !verifiedMap.has(e));
    if (newEmails.length > 0) {
      const results = (await this.outscrapperEmailsVerifier(newEmails)) as any;
      results.data.forEach((r) => {
        verifiedMap.set(r.query, {
          isVerified: r.status === 'RECEIVING',
          verificationStatus:
            r.status === 'RECEIVING' ? 'receiving' : 'not_receiving',
        });
      });
    }

    return verifiedMap;
  }
}
