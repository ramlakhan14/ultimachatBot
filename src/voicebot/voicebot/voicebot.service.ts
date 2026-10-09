import {
  Injectable,
  Logger,
  Inject,
  HttpStatus,
  HttpException,
  BadRequestException,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { Collection, Db, ObjectId } from 'mongodb';
import { MONGODB } from '../../common/mongo/mongo.module';
import {
  VoiceCampaignServerConfig,
  CAMPAIGN_VOICE_SERVER_CONFIG_COLLECTION,
  ToolData,
} from '../schema/voicecampaign.schema';
import { VOICE_SERVICE_PROVIDER_STATUS } from '../constant/voicebot.constants';
import { CreatePhoneNumberDTO } from '../dto/create-phonenumber';
import { KeyVerificationDTO } from '../dto/createtool.dto';
import { VapiService } from './vapi.service';
import {
  TwilioPhoneNumber,
  InUseStatus,
  TWILIO_PHONE_NUMBER_COLLECTION,
} from '../schema/phonenumber.schema';
import {
  CampaignStatus,
  CrwalStatus,
  DATA_SOURCE_FOR_TARGET_AUDIENCE,
  TARGET_AUDIENCES_SCHEMA,
  TargetAudienceSchema,
  targetCrawledDataStore,
  VOICE_BOT_CAMPAIGN_SCHEMA,
  VoiceBotCampaignSchema,
} from '../schema/voicebot.campaign.schema';
import {
  CallStatus,
  CallType,
  CAMPAIGN_RECORDINGS_SCHEMA,
  CampaignRecordingsSchema,
} from '../schema/campaign.recordings.schema';
import { BullMqService } from '../../campaign/bull/bullMq.service';
import {
  DataStoreType,
  IsLeadType,
  KB_DATASTORE_COLLECTION,
  KnowledgebaseStatus,
} from '../../knowledgebase/knowledgebase.schema';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import { REDIS } from '../../common/redis/redis.module';
import Redis from 'ioredis';
import {
  ChangeMeetingStatus,
  CreateVoicebotCampaignDTO,
  TargetAudienceCsvDTO,
  TargetLeadsDTO,
  UpdateVoicebotCampaignDTO,
  VoicebotCampaignScrapeDTO,
} from '../dto/create-Voicebot-campaign';
import {
  VOICE_BOT_CAMPAIGN_DASHBOARD_SCHEMA,
  VoiceBotCampaignDashboardSchema,
} from '../schema/dashboard.schema';
import {
  CREDIT_USAGE_COLLECTION,
  CreditUsage,
  User,
  USER_COLLECTION,
  UserSparse,
} from '../../user/user.schema';
import { subscriptionPlanData } from '../../subscription/subscription.const';

import {
  GOOGLE_CALENDER_MEETING,
  GoogleCalendarMeeting,
  meetingStatus,
} from '../../knowledgebase/google-calender-meeting.schema';
import {
  VOICEBOT_SETTING_COLLECTION,
  VoicebotSetting,
} from '../schema/voicebot-setting.schema';
import {
  CELERY_CLIENT,
  CeleryClientQueue,
  CeleryClientService,
} from '../../common/celery/celery-client.module';
import { CrawlConfig } from '../../importers/crawler/crawlee/crawler.types';
import {
  CAMPAIGN_SCHEDULER_STATUS,
  EMAIL_AND_PASSKEY_STATUS,
} from '../../campaign/enum/enum';
import { ProjectService } from '../../project/project.service';
import { SettingsService } from '../settings/settings.service';
import {
  CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
  CampaignEmailWarmupCount,
} from '../../campaign/schema/campaignEmailWarmupCount.schema';
import { GOOGLECALENDER_COLLECTION } from '../../knowledgebase/googleCalender/googleCalender.schema';
import {
  CampaignScheduled,
  CAMPAIGNSCHEDULED_COLLECTION,
} from '../../campaign/schema/campaignScheduled.schema';
import { ModuleRef } from '@nestjs/core';
import * as moment from 'moment';
import {
  BLOCK_SUPPRESSION_SCHEMA,
  BlockSuppressionSchema,
} from '../schema/block.suppression.schema';
import { validateLeads } from '../utils/ValidatorLeads';
import { CallType as CallBoundType } from '../schema/phonenumber.schema';
import {
  BotStatus,
  INBOUND_BOT_SCHEMA,
} from '../inbound-bot/schema/inbound.bot.schema';
import * as FormData from 'form-data';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AssistantType } from '../../knowledgebase/chatbot/openaiChatbot.constant';
import { UserService } from '../../user/user.service';
import { GMB_COLLECTION, GMBData } from '../../campaign/schema/campaign.schema';
import { INBOUND_BOT_LEADS_RECORDING_SCHEMA } from '../inbound-bot/schema/inbound.bot.leads.schema';

@Injectable()
export class VoicebotService implements OnModuleInit {
  private bullMqService: BullMqService;
  private readonly logger = new Logger(VoicebotService.name);
  private readonly campaignScheduledCollection: Collection<CampaignScheduled>;
  private userVoiceCampaignServerConfigCollection: Collection<VoiceCampaignServerConfig>;
  private twilioPhoneNumberCollection: Collection<TwilioPhoneNumber>;
  private voiceBotCampaignSchema: Collection<VoiceBotCampaignSchema>;
  private targetAudienceSchema: Collection<TargetAudienceSchema>;
  private campaignRecordingSchema: Collection<CampaignRecordingsSchema>;
  private voiceBotDashboardSchema: Collection<VoiceBotCampaignDashboardSchema>;
  private readonly userCollection: Collection<User>;
  private readonly googleCalenderMeetingCollection: Collection<GoogleCalendarMeeting>;
  private readonly voicebotSettings: Collection<VoicebotSetting>;
  private readonly emailAndWarmupCountCollection: Collection<CampaignEmailWarmupCount>;
  private readonly blockSuppressionCollection: Collection<BlockSuppressionSchema>;
  private readonly creditUsageCollection: Collection<CreditUsage>;
  private readonly gmbCollection: Collection<GMBData>;
  constructor(
    @Inject(MONGODB) private db: Db,
    @Inject(REDIS) private readonly redisClient: Redis,
    @Inject(CELERY_CLIENT) private celeryClient: CeleryClientService,
    private readonly settingsService: SettingsService,
    private readonly vapiService: VapiService,
    private readonly dataScrapperService: ProjectService,
    private readonly moduleRef: ModuleRef,
    private readonly userService: UserService,
  ) {
    this.userVoiceCampaignServerConfigCollection =
      this.db.collection<VoiceCampaignServerConfig>(
        CAMPAIGN_VOICE_SERVER_CONFIG_COLLECTION,
      );
    this.creditUsageCollection = this.db.collection<CreditUsage>(
      CREDIT_USAGE_COLLECTION,
    );
    // Initialize collections
    this.twilioPhoneNumberCollection = this.db.collection<TwilioPhoneNumber>(
      TWILIO_PHONE_NUMBER_COLLECTION,
    );
    this.voiceBotCampaignSchema = this.db.collection<VoiceBotCampaignSchema>(
      VOICE_BOT_CAMPAIGN_SCHEMA,
    );
    this.targetAudienceSchema = this.db.collection<TargetAudienceSchema>(
      TARGET_AUDIENCES_SCHEMA,
    );
    this.campaignRecordingSchema = this.db.collection<CampaignRecordingsSchema>(
      CAMPAIGN_RECORDINGS_SCHEMA,
    );
    this.voiceBotDashboardSchema =
      this.db.collection<VoiceBotCampaignDashboardSchema>(
        VOICE_BOT_CAMPAIGN_DASHBOARD_SCHEMA,
      );
    this.userCollection = this.db.collection<User>(USER_COLLECTION);
    this.googleCalenderMeetingCollection =
      this.db.collection<GoogleCalendarMeeting>(GOOGLE_CALENDER_MEETING);
    this.voicebotSettings = this.db.collection<VoicebotSetting>(
      VOICEBOT_SETTING_COLLECTION,
    );
    this.emailAndWarmupCountCollection =
      this.db.collection<CampaignEmailWarmupCount>(
        CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
      );

    this.campaignScheduledCollection = this.db.collection<CampaignScheduled>(
      CAMPAIGNSCHEDULED_COLLECTION,
    );
    this.blockSuppressionCollection =
      this.db.collection<BlockSuppressionSchema>(BLOCK_SUPPRESSION_SCHEMA);
    this.gmbCollection = this.db.collection<GMBData>(GMB_COLLECTION);
  }

  async onModuleInit() {
    this.bullMqService = this.moduleRef.get(BullMqService, { strict: false });
  }
  private async fetchTwilioNumbers(authToken: string, accountSid: string) {
    try {
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?voiceEnabledTrue=true`,
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
        },
      );

      // Map to a simpler format
      return response.data.incoming_phone_numbers.map((number: any) => ({
        phoneNumber: number.phone_number,
        friendlyName: number.friendly_name,
      }));
    } catch (error) {
      this.logger.error('Error fetching Twilio numbers:', error);
      // For network or other errors
      throw new HttpException(
        'Network error while fetching Twilio numbers',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async validateUserConfig(
    userId: string,
  ): Promise<VoiceCampaignServerConfig> {
    const userConfig =
      await this.userVoiceCampaignServerConfigCollection.findOne({
        userId: userId,
        status: VOICE_SERVICE_PROVIDER_STATUS.VERIFIED,
      });

    if (!userConfig) {
      throw new HttpException(
        'Please verify your VAPI API key first',
        HttpStatus.BAD_REQUEST,
      );
    }
    return userConfig;
  }

  private async validateExistingConfig(userId: string, vapiKey: string) {
    // First check if this VAPI key is already used by any user
    const allConfigs = await this.userVoiceCampaignServerConfigCollection
      .find({
        status: VOICE_SERVICE_PROVIDER_STATUS.VERIFIED,
      })
      .toArray();

    // Check if the VAPI key exists in any config
    for (const config of allConfigs) {
      const decryptedKey = await CryptoService.decryptPasskey(
        config.vapiServerAPIkey,
      );
      if (decryptedKey === vapiKey) {
        throw new HttpException(
          'This VAPI key is already in use by another user',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Now check if the current user already has a verified key
    const userConfig =
      await this.userVoiceCampaignServerConfigCollection.findOne({
        userId,
        status: VOICE_SERVICE_PROVIDER_STATUS.VERIFIED,
      });

    if (userConfig) {
      throw new HttpException(
        'You already have a verified VAPI key. Please revoke it first to add a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getTwilioNumbers(userId: string) {
    try {
      const userConfig = await this.validateUserConfig(userId);

      if (!userConfig?.twilioAuthToken || !userConfig?.twilioAccountSid) {
        throw new HttpException(
          'Twilio configuration not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const [decryptedTwilioAuthToken, decryptedTwilioAccountSid] =
        await Promise.all([
          CryptoService.decryptPasskey(userConfig.twilioAuthToken),
          CryptoService.decryptPasskey(userConfig.twilioAccountSid),
        ]);

      const numbers = await this.fetchTwilioNumbers(
        decryptedTwilioAuthToken,
        decryptedTwilioAccountSid,
      );

      return numbers;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error fetching Twilio numbers from Twilio console',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verifyTwilioCredentials(authToken: string, accountSid: string) {
    try {
      // Make a test API call to verify credentials
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
        },
      );

      if (response.status === 200) {
        return response.data;
      } else {
        throw new HttpException(
          'Invalid Twilio credentials',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error('Error verifying Twilio credentials:', error);
      throw new HttpException(
        'Error verifying Twilio credentials',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async markAllPhoneNumbersAsUnused(userId: string) {
    try {
      await this.twilioPhoneNumberCollection.updateMany(
        { userId, status: InUseStatus.YES },
        { $set: { status: InUseStatus.NO } },
      );
    } catch (error) {}
  }

  async validateElevenLabsApiKey(elevenLabsAPIKey) {
    try {
      await axios.get('https://api.elevenlabs.io/v2/voices', {
        headers: {
          'xi-api-key': elevenLabsAPIKey,
        },
        timeout: 10000,
      });

      return true;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new HttpException(
            `Invalid ElevenLabs API key ${error.response.data.detail.message}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new HttpException(
          `ElevenLabs API validation failed: ${error.response.status} ${error.response.statusText}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        `ElevenLabs connection error: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verifyVAPIApiKey(
    payload: KeyVerificationDTO,
    userId: string,
    email: string,
  ) {
    try {
      let {
        serverConfigId,
        vapiKey,
        twilioAuthToken,
        twilioAccountSid,
        elevenLabsAPIKey,
      } = payload;

      if (!vapiKey && !serverConfigId) {
        throw new HttpException(
          'VAPI key is required for initial setup',
          HttpStatus.BAD_REQUEST,
        );
      }

      const [
        decryptedVapiKey,
        decryptedTwilioAuthToken,
        decryptedTwilioAccountSid,
      ] = await Promise.all([
        CryptoService.decryptPasskey(vapiKey),
        CryptoService.decryptPasskey(twilioAuthToken),
        CryptoService.decryptPasskey(twilioAccountSid),
      ]);

      const decryptedElevenLabsAPIKey = elevenLabsAPIKey
        ? await CryptoService.decryptPasskey(elevenLabsAPIKey)
        : null;

      if (decryptedElevenLabsAPIKey) {
        await this.validateElevenLabsApiKey(decryptedElevenLabsAPIKey);
      }

      let prevConfig = null;
      // Fetch config by serverConfigId if provided
      prevConfig = await this.userVoiceCampaignServerConfigCollection.findOne({
        _id: new ObjectId(serverConfigId),
        userId,
      });

      let assistantData = prevConfig?.vapiAssistantData;
      let toolData = prevConfig?.vapiToolsData;

      // Handle Twilio verification
      const decryptedPrevTwilioAuthToken = prevConfig?.twilioAuthToken
        ? await CryptoService.decryptPasskey(prevConfig.twilioAuthToken)
        : null;
      const decryptedPrevTwilioAccountSid = prevConfig?.twilioAccountSid
        ? await CryptoService.decryptPasskey(prevConfig.twilioAccountSid)
        : null;

      const isSameTwilio =
        prevConfig &&
        decryptedPrevTwilioAuthToken === decryptedTwilioAuthToken &&
        decryptedPrevTwilioAccountSid === decryptedTwilioAccountSid;

      // Verify new Twilio credentials first before making any changes
      if (!isSameTwilio) {
        try {
          const twilioResponse = await this.verifyTwilioCredentials(
            decryptedTwilioAuthToken,
            decryptedTwilioAccountSid,
          );

          if (!twilioResponse?.incoming_phone_numbers) {
            throw new HttpException(
              'Invalid Twilio credentials',
              HttpStatus.BAD_REQUEST,
            );
          }
        } catch (error) {
          // If verification fails, keep the old credentials
          twilioAuthToken = prevConfig?.twilioAuthToken;
          twilioAccountSid = prevConfig?.twilioAccountSid;
          throw error;
        }
      }

      // Handle VAPI key verification
      const decryptedPrevVapiKey = prevConfig?.vapiServerAPIkey
        ? await CryptoService.decryptPasskey(prevConfig.vapiServerAPIkey)
        : null;

      const isSameVapiKey =
        prevConfig && decryptedPrevVapiKey === decryptedVapiKey;

      // Verify new VAPI key first before making any changes
      if (!isSameVapiKey) {
        try {
          await this.vapiService.checkVapiKey(decryptedVapiKey);

          // Only create new tools and assistant after successful verification
          toolData = await this.vapiService.createTool(
            userId,
            decryptedVapiKey,
          );
          await this.db
            .collection('campaignVoiceServerConfig')
            .updateOne({ userId }, { $unset: { inboundToolsData: '' } });

          const toolIds = toolData.map((tool: ToolData) => tool.toolId);
          assistantData = [
            await this.vapiService.createAssistant(decryptedVapiKey, toolIds),
          ];

          const phoneData = await this.db
            .collection('twiliophonenumberlist')
            .find({ userId, status: InUseStatus.YES })
            .toArray();
          if (decryptedPrevTwilioAuthToken && phoneData.length > 0) {
            // If there are existing phone numbers, delete them from VAPI
            //loop on the phoneData length and delete every prev phoneNumber
            for (const phon of phoneData) {
              if (!phon.phoneNumberId) {
                this.logger.warn(
                  `Phone number ${phon.phoneNumber} does not have a phoneNumberId, skipping deletion from VAPI.`,
                );
                continue;
              }
              await this.vapiService.deletePhoneNumberFromVapi(
                decryptedPrevVapiKey,
                phon.phoneNumberId,
              );
            }
          }
          await this.markAllPhoneNumbersAsUnused(userId);
        } catch (error) {
          // If verification fails, keep the old VAPI key and data
          vapiKey = prevConfig?.vapiServerAPIkey;
          assistantData = prevConfig?.vapiAssistantData;
          toolData = prevConfig?.vapiToolsData;
          throw error;
        }
      }

      // Only update configuration if all verifications passed
      const finalConfig: VoiceCampaignServerConfig = {
        userId,
        vapiServerAPIkey: vapiKey,
        twilioAuthToken,
        twilioAccountSid,
        status: VOICE_SERVICE_PROVIDER_STATUS.VERIFIED,
        createdAt: prevConfig?.createdAt || new Date(),
        updatedAt: new Date(),
        vapiAssistantData: assistantData,
        vapiToolsData: toolData,
        elevenLabsAPIKey: elevenLabsAPIKey,
      };

      // Save final config
      if (serverConfigId) {
        await this.userVoiceCampaignServerConfigCollection.updateOne(
          { _id: new ObjectId(serverConfigId) },
          { $set: finalConfig },
        );
      } else {
        await this.userVoiceCampaignServerConfigCollection.updateOne(
          { userId },
          { $set: finalConfig },
          { upsert: true },
        );
      }

      // Update phone number status only after successful Twilio verification
      if (!isSameTwilio && prevConfig) {
        await this.markAllPhoneNumbersAsUnused(userId);
      }

      // Update app settings
      await this.settingsService.updateSettings(userId, email);

      return {
        message: 'Verification and setup completed successfully',
      };
    } catch (error) {
      this.logger.error(`Error verifying VAPI API key: ${error.message}`);
      throw new HttpException(
        `Error verifying VAPI API key: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAssistant(userId: string): Promise<any> {
    try {
      const userConfig = await this.validateUserConfig(userId);
      if (userConfig instanceof HttpException) {
        throw new HttpException('Please verify your key', HttpStatus.FORBIDDEN);
      }

      const assistantData = userConfig.vapiAssistantData.map(
        (assistant: any) => ({
          assistantId: assistant.id,
          assistantName: assistant.name,
        }),
      );

      return assistantData;
    } catch (error) {
      this.logger.error(
        `Error getting assistants for user ${userId}: ${error.message}`,
      );
      throw new HttpException(
        error.response?.data?.message || 'Error getting assistants',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async registerPhoneNumber(userId: string, body: CreatePhoneNumberDTO) {
    try {
      const userConfig = await this.validateUserConfig(userId);
      const { phoneNumber, assistantId, callType } = body;

      const existingPhoneNumber =
        await this.twilioPhoneNumberCollection.findOne(
          { phoneNumber, status: InUseStatus.YES, userId },
          { projection: { _id: 1, callType: 1, phoneNumberId: 1 } },
        );

      let assistantExists;
      if (callType === CallBoundType.OUTBOUND) {
        assistantExists =
          await this.userVoiceCampaignServerConfigCollection.findOne(
            {
              userId,
              vapiAssistantData: {
                $elemMatch: {
                  id: assistantId,
                },
              },
            },
            { projection: { _id: 1 } },
          );
      } else if (callType === CallBoundType.INBOUND) {
        assistantExists = await this.db.collection(INBOUND_BOT_SCHEMA).findOne({
          userId: new ObjectId(userId),
          'vapiAssistantData.id': assistantId,
        });
      }

      if (!assistantExists) {
        throw new HttpException('Assistant not found', HttpStatus.BAD_REQUEST);
      }

      let phoneNumberId: string | undefined;
      const vapiKey = await CryptoService.decryptPasskey(
        userConfig.vapiServerAPIkey,
      );

      if (existingPhoneNumber) {
        if (existingPhoneNumber.callType === callType) {
          throw new HttpException(
            'Phone number already exists for this call type',
            HttpStatus.CONFLICT,
          );
        }

        // Same phone number but different call type – reuse the existing VAPI phoneNumberId.
        // VAPI's assistantId on a phone number only governs INBOUND routing, so only
        // touch it in VAPI when the number is now being set up for inbound.
        phoneNumberId = existingPhoneNumber.phoneNumberId;
        if (callType === CallBoundType.INBOUND && phoneNumberId) {
          try {
            await this.vapiService.updatePhoneNumberInVapi(
              vapiKey,
              phoneNumberId,
              { assistantId },
            );
          } catch (error) {
            this.logger.error(
              `Error updating phone number in VAPI: ${error.message}`,
            );
            throw new HttpException(
              `Error updating phone number in VAPI: ${error.message}`,
              error.status || HttpStatus.BAD_GATEWAY,
            );
          }
        }
      } else {
        const twilioAuthToken = await CryptoService.decryptPasskey(
          userConfig.twilioAuthToken,
        );
        const twilioAccountSid = await CryptoService.decryptPasskey(
          userConfig.twilioAccountSid,
        );

        try {
          const vapiPhoneResponse = await this.vapiService.addPhoneNumnerInVapi(
            vapiKey,
            {
              twilioAccountSid,
              twilioAuthToken,
              phoneNumber,
              // Only wire the assistant into VAPI for inbound — outbound calls pass
              // their assistant per-call via /call, and setting it here would make
              // any inbound call to this number get answered by the outbound assistant.
              assistantId:
                callType === CallBoundType.INBOUND ? assistantId : undefined,
            },
          );
          phoneNumberId = vapiPhoneResponse?.id;
        } catch (error) {
          this.logger.error(
            `Error adding phone number in VAPI: ${error.message}`,
          );
          throw new HttpException(
            error.message,
            error.status || HttpStatus.BAD_GATEWAY,
          );
        }
      }

      const payload: Omit<TwilioPhoneNumber, '_id'> = {
        userId,
        phoneNumber,
        assistantId,
        assistantName: body.assistantName ?? 'VANI',
        callType,
        status: InUseStatus.YES,
        phoneNumberId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.twilioPhoneNumberCollection.insertOne(
        payload as TwilioPhoneNumber,
      );

      return {
        id: result.insertedId,
        ...payload,
      };
    } catch (error) {
      this.logger.error(`Error registering phone number: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Error registering phone number',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchPhoneNumber(userId: string, allNumbers: boolean): Promise<any[]> {
    try {
      const userConfig = await this.validateUserConfig(userId);

      const query: any = { userId, status: InUseStatus.YES };

      if (!allNumbers) {
        query.callType = 'Outbound';
      }

      // Fetch phone numbers based on filters
      const phoneNumbers = await this.twilioPhoneNumberCollection
        .find(query)
        .toArray();

      const phoneNumbersWithAssistants = phoneNumbers.map((phone) => {
        const matchingAssistant = userConfig.vapiAssistantData?.find(
          (assistant) => assistant.id === phone.assistantId?.toString(),
        );

        return {
          ...phone,
          assistantName:
            matchingAssistant?.name ?? phone?.assistantName ?? 'NA',
        };
      });

      return phoneNumbersWithAssistants;
    } catch (error) {
      this.logger.error(`Error fetching phone numbers: ${error.message}`);
      throw new HttpException(
        error.message || 'Error fetching phone numbers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchConfigKey(userId: string): Promise<any> {
    try {
      const userConfig = await this.validateUserConfig(userId);

      return {
        _id: userConfig._id.toHexString(),
        configKey: userConfig.vapiServerAPIkey,
        userId: userConfig.userId,
        twilioAuthToken: userConfig.twilioAuthToken,
        twilioAccountSid: userConfig.twilioAccountSid,
        elevenLabsAPIKey: userConfig.elevenLabsAPIKey,
      };
    } catch (error) {
      this.logger.error(`Error fetching config key: ${error.message}`);
      throw new HttpException(error.message, error.status);
    }
  }

  // Create voice bot campaign
  async createVoiceBotCampaign(
    userId: string,
    email: string,
    body: CreateVoicebotCampaignDTO,
  ) {
    try {
      let { scheduleDate, scheduleTime, targetAudienceCsv } = body;
      let IsSchedule = false;
      let scheduledDateTime = null;
      // Prepare campaign data
      const campaignName = body.campaignName.trim();

      const isAvailableCampaign = await this.campaignRecordingSchema.findOne({
        userId,
        campaignName: { $regex: `^${campaignName}$`, $options: 'i' },
      });

      if (isAvailableCampaign) {
        throw new HttpException(
          `Campaign ${campaignName} is already exist`,
          HttpStatus.BAD_REQUEST,
        );
      }

      let adminTimeZone = null;
      if (scheduleDate && scheduleTime) {
        IsSchedule = true;

        // Get timezone from settings
        const settingData = await this.db
          .collection('calenderSettings')
          .findOne(
            { knowledgebaseId: new ObjectId(body.campaignProject.projectId) },
            { projection: { timezone: 1 } },
          );

        adminTimeZone = settingData?.timezone || 'UTC';

        // Parse schedule date and time in admin timezone
        scheduledDateTime = moment.tz(
          `${scheduleDate} ${scheduleTime}`,
          'YYYY-MM-DD HH:mm',
          adminTimeZone,
        );

        const currentDateTime = moment().tz(adminTimeZone);

        if (scheduledDateTime.isSameOrBefore(currentDateTime)) {
          throw new BadRequestException(
            'Schedule date and time must be greater than current time',
          );
        }
      }

      const campaignData = {
        userId,
        campaignName,
        // scheduledAt: scheduledDateTime ? scheduledDateTime.format() : null,
        scheduledAt: scheduledDateTime ? scheduledDateTime.toDate() : null,
        voiceCharacter: body.voiceCharacter,
        language: body.language || 'en',
        maxPerDayCall: body.maxPerDayCall,
        campaignProject: {
          projectId: body.campaignProject.projectId,
          projectName: body.campaignProject.projectName,
        },
        phoneNumbers: body.phoneNumbers,
        painPointSolution: body.painPointSolution,
        customQuestions: body.customQuestions,
        targetAudience: body.targetAudience,
        status: IsSchedule
          ? CampaignStatus.Scheduled
          : CampaignStatus.Initiated,
        prompt: JSON.stringify(body.prompt),
        toneOfVoice: body.toneOfVoice,
        emailToTeam: body.emailToTeam ?? null,
        createdAt: moment().toDate(),
        updatedAt: moment().toDate(),
      };

      const result = await this.voiceBotCampaignSchema.insertOne(campaignData);

      // Added By Nidhi Sharma on 23-01-2026 to entry the Bot in Bot Collection
      await this.userService.checkBotMaxLimitAndCreate(
        new ObjectId(userId),
        'outbound_voicebot',
        result.insertedId,
      );

      if (IsSchedule) {
        // Only send necessary user data to avoid circular references
        const queueData = {
          campaignId: result.insertedId.toHexString(),
          scheduledDateAndTime: scheduledDateTime.toDate(),
          ...campaignData,
          user: {
            _id: userId,
            email: email,
          },
          IsCampaignScheduledFor: 'voicebot',
          adminTimezone: adminTimeZone,
        };

        //this schedule campaign get trigger when user schedule with date and time.
        await this.bullMqService.scheduleJob(queueData);
        await this.campaignScheduledCollection.insertOne({
          campaignId: result.insertedId.toHexString(),
          campaignName,
          scheduleDate,
          scheduleTime,
          scheduledDateAndTime: scheduledDateTime.toDate(),
          createdAt: moment().toDate(),
          updatedAt: moment().toDate(),
          addedBy: userId,
          status: CAMPAIGN_SCHEDULER_STATUS.SCHEDULED,
          IsCampaignScheduledFor: 'voicebot',
        });
      }

      const { blockedNumbers, suppressedNumbers } =
        await this.checkBlockedSuppressionPhoneNumbers(
          targetAudienceCsv,
          new ObjectId(userId),
        );

      // Prepare target audience data
      const newTargetAudienceData = targetAudienceCsv.map((audience) => ({
        callCompleted: false,
        campaignId: result.insertedId.toHexString(),
        userId,
        phoneNumber: audience.phoneNumber,
        email: audience.email ?? null,
        websiteUrl: audience.websiteUrl || 'N/A',
        audienceCompanyName: audience.companyName,
        dataSource: audience?.leadType,
        retryCount: 0,
        isFollowUpEmailSent: false,
        createdAt: moment().toDate(),
        updatedAt: moment().toDate(),
      }));

      if (newTargetAudienceData.length === 0) {
        await this.voiceBotCampaignSchema.deleteOne({
          _id: result.insertedId,
        });
        throw new HttpException(
          'No valid phone numbers available',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.targetAudienceSchema.insertMany(newTargetAudienceData);

      const knowledgebaseDetails = await this.generateAndUploadKnowledgebase(
        userId,
        body.campaignProject.projectId,
      );

      const updatedCampaignData =
        await this.voiceBotCampaignSchema.findOneAndUpdate(
          { _id: new ObjectId(result.insertedId) },
          {
            $set: {
              totalAudience: newTargetAudienceData.length,
              totalBlocked: blockedNumbers.length,
              totalSuppressed: suppressedNumbers.length,
              knowledgebaseDetails: knowledgebaseDetails,
            },
          },
          { returnDocument: 'after' },
        );
      const allTargetAudience = await this.targetAudienceSchema
        .find({ campaignId: result.insertedId.toHexString() })
        .toArray();

      // Process audiences in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < allTargetAudience.length; i += batchSize) {
        const batch = allTargetAudience.slice(i, i + batchSize);
        await Promise.all(
          batch.map((audience) =>
            this.createPromptAndSave(audience._id.toHexString()),
          ),
        );
      }

      if (!IsSchedule) {
        await this.voiceBotCampaignSchema.updateOne(
          { _id: result.insertedId },
          { $set: { status: CampaignStatus.Running } },
        );
        await this.bullMqService.startVoiceBotJob({
          campaignId: result.insertedId.toHexString(),
        });
      }

      return updatedCampaignData.value;
    } catch (error) {
      throw error;
    }
  }

  async generateAndUploadKnowledgebase(userId: string, projectId: string) {
    // PREVIOUS APPROACH — grouped fallback logic (kept for reference):
    // The old code split KB types into three groups (WEBPAGE, DOCUMENT, CUSTOM) and
    // iterated through them in preferred order, breaking on the first group that had
    // results. This meant if any WEBPAGE entries existed the loop stopped there, and
    // VIDEO, PDF, DOCX, IMAGE, CSV content was never included in the VAPI knowledge
    // base file. The voicebot was effectively blind to all non-webpage KB content.
    //
    // const preferredKB = await this.db
    //   .collection('preferredknbbybots')
    //   .findOne({ botName: AssistantType.VOICEBOT });
    // const kbTypeMap = {
    //   WEBPAGE: ['WEBPAGE'],
    //   DOCUMENT: [
    //     'DOCUMENT',
    //     DataStoreType.DOCX,
    //     DataStoreType.PPTX,
    //     DataStoreType.HTML,
    //     DataStoreType.PDF,
    //     DataStoreType.TEXT,
    //     DataStoreType.IMAGE,
    //     DataStoreType.VIDEO,
    //   ],
    //   CUSTOM: ['CUSTOM'],
    // };
    // const fallbackOrderMap = {
    //   WEBPAGE: ['WEBPAGE', 'DOCUMENT', 'CUSTOM'],
    //   DOCUMENT: ['DOCUMENT', 'CUSTOM'],
    //   CUSTOM: ['CUSTOM', 'WEBPAGE', 'DOCUMENT'],
    // };
    // const preferredType = preferredKB?.preferredKNB ?? 'DOCUMENT';
    // const fallbackOrder = fallbackOrderMap[preferredType];
    // let knowledgebase: any[] = [];
    // for (const type of fallbackOrder) {
    //   knowledgebase = await this.db
    //     .collection(KB_DATASTORE_COLLECTION)
    //     .find({
    //       knowledgebaseId: new ObjectId(projectId),
    //       type: { $in: kbTypeMap[type] },
    //     })
    //     .toArray();
    //   if (knowledgebase.length) break;
    // }

    // NEW APPROACH — fetch all data types in a single query so the VAPI knowledge base
    // file always includes every content type (web scraped, PDF, DOCX, video, image, CSV,
    // custom text, etc.) that belongs to the KB, regardless of which types are present.
    const allTypes = Object.values(DataStoreType);

    const knowledgebase = await this.db
      .collection(KB_DATASTORE_COLLECTION)
      .find({
        knowledgebaseId: new ObjectId(projectId),
        type: { $in: allTypes },
      })
      .toArray();

    if (!knowledgebase.length) return null;

    // VAPI enforces a 10 MB file upload limit. We cap at 8 MB to leave a safe buffer,
    // since combining all KB types can produce a file larger than the old single-group
    // approach ever could. Entries are appended in DB order; if the cap is hit, later
    // entries are silently dropped rather than causing the entire bot creation to fail.
    const VAPI_FILE_SIZE_LIMIT_BYTES = 9 * 1024 * 1024; // 9 MB
    let fileContent = '';
    for (const kb of knowledgebase) {
      const entry = `Title: ${kb.title}\nContent: ${kb.content}\n\n`;
      if (
        Buffer.byteLength(fileContent + entry, 'utf-8') >
        VAPI_FILE_SIZE_LIMIT_BYTES
      ) {
        break;
      }
      fileContent += entry;
    }

    const fileName = `knowledgebase_${projectId}_${Date.now()}.txt`;
    const filePath = path.join(process.cwd(), fileName);

    await fs.writeFile(filePath, fileContent, 'utf-8');
    const buffer = await fs.readFile(filePath);

    try {
      const allowedMimeTypes = ['text/plain'];
      if (!allowedMimeTypes.includes('text/plain')) {
        throw new BadRequestException('Unsupported file format');
      }

      const campaignVoiceServerConfig = await this.db
        .collection('campaignVoiceServerConfig')
        .findOne({ userId });

      const vapi_key = CryptoService.decryptPasskey(
        campaignVoiceServerConfig.vapiServerAPIkey,
      );

      const formData = new FormData();
      formData.append('file', buffer, {
        filename: fileName,
        contentType: 'text/plain',
      });

      const result = await this.vapiService.uploadKnowledgeBase(
        vapi_key,
        formData,
      );
      return {
        id: result?.id,
        fileUrl: result?.url,
        fileName: result?.name,
      };
    } finally {
      await fs.unlink(filePath).catch(() => null);
    }
  }

  // Check blocked and suppressed phone numbers
  async checkBlockedSuppressionPhoneNumbers(
    targetAudience: TargetAudienceCsvDTO[],
    userId: ObjectId,
  ): Promise<{
    validNumbers: TargetAudienceCsvDTO[];
    blockedNumbers: TargetAudienceCsvDTO[];
    suppressedNumbers: TargetAudienceCsvDTO[];
  }> {
    try {
      const doc: BlockSuppressionSchema | null =
        await this.blockSuppressionCollection.findOne({ userId });

      const blockedSet = new Set(doc?.blockedNumbers || []);
      const suppressedSet = new Set(doc?.suppressNumbers || []);
      const validNumbers: TargetAudienceCsvDTO[] = [];
      const blockedNumbers: TargetAudienceCsvDTO[] = [];
      const suppressedNumbers: TargetAudienceCsvDTO[] = [];

      for (const audience of targetAudience) {
        const phone = audience.phoneNumber;
        if (blockedSet.has(phone)) {
          blockedNumbers.push(audience);
        } else if (suppressedSet.has(phone)) {
          suppressedNumbers.push(audience);
        } else {
          validNumbers.push(audience);
        }
      }

      return { validNumbers, blockedNumbers, suppressedNumbers };
    } catch (error) {
      this.logger.error(
        'Error checking blocked/suppressed phone numbers:',
        error,
      );
      return { validNumbers: [], blockedNumbers: [], suppressedNumbers: [] };
    }
  }

  // Get all voice bot campaigns
  async getAllCampaigns(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;

      if (isNaN(limitNum) || limitNum <= 0) {
        throw new Error('Limit must be a positive integer');
      }

      const skip = (pageNum - 1) * limitNum;
      const searchFilter = {
        userId,
        ...(search && {
          $or: [{ campaignName: { $regex: search.trim(), $options: 'i' } }],
        }),
      };

      // Fetch campaigns
      const campaigns = await this.voiceBotCampaignSchema
        .find(searchFilter)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .toArray();

      const totalCount = await this.voiceBotCampaignSchema.countDocuments(
        searchFilter,
      );

      const campaignIds = campaigns.map((c) => c._id.toString());

      const callsData = await this.targetAudienceSchema
        .aggregate([
          {
            $match: {
              callCompleted: true,
              campaignId: { $in: campaignIds },
            },
          },
          {
            $group: {
              _id: {
                campaignId: '$campaignId',
                vapiId: '$vapiId',
              },
              callEndedReason: { $first: '$callEndedReason' },
            },
          },
          {
            $group: {
              _id: '$_id.campaignId',
              totalCalls: { $sum: 1 },
              customerDidNotAnswer: {
                $sum: {
                  $cond: [
                    { $eq: ['$callEndedReason', 'customer-did-not-answer'] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray();

      // Create map for quick lookup
      const callsMap = {};
      callsData.forEach((item) => {
        callsMap[item._id] = {
          totalCalls: item.totalCalls,
          customerDidNotAnswer: item.customerDidNotAnswer,
        };
      });

      // Calculate failedCalls = customerDidNotAnswer
      const updatedCampaigns = campaigns.map((campaign) => {
        const campaignId = campaign._id.toString();
        const stats = callsMap[campaignId] || {
          totalCalls: 0,
          customerDidNotAnswer: 0,
        };

        return {
          ...campaign,
          totalCalls: stats.totalCalls || 0,
          failedCalls: stats.customerDidNotAnswer || 0,
        };
      });

      return {
        campaigns: updatedCampaigns,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        totalCount,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get campaign details
  async getCampaignDetails(userId: string, campaignId: string) {
    try {
      // Find the campaign by ID and userId
      const campaign = await this.voiceBotCampaignSchema.findOne({
        _id: new ObjectId(campaignId),
        userId,
      });

      if (!campaign) {
        throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
      }

      const settingData = await this.db
        .collection('calenderSettings')
        .findOne(
          { knowledgebaseId: new ObjectId(campaign.campaignProject.projectId) },
          { projection: { timezone: 1 } },
        );

      const timeZone = settingData?.timezone || 'UTC';

      // Single aggregation to get all call statistics
      const callStats = await this.targetAudienceSchema
        .aggregate([
          {
            $match: {
              campaignId,
              callCompleted: true,
            },
          },
          {
            $group: {
              _id: '$vapiId',
              callEndedReason: { $first: '$callEndedReason' },
            },
          },
          {
            $lookup: {
              from: CAMPAIGN_RECORDINGS_SCHEMA,
              localField: '_id',
              foreignField: 'vapiId',
              as: 'recording',
            },
          },
          {
            $addFields: {
              // Convert missing/null to 'N/A' for easier handling
              normalizedCallEndedReason: {
                $ifNull: ['$callEndedReason', 'N/A'],
              },
              hasValidRecording: {
                $cond: {
                  if: {
                    $and: [
                      { $gt: [{ $size: '$recording' }, 0] },
                      {
                        $ne: [
                          { $arrayElemAt: ['$recording.recordingUrl', 0] },
                          'N/A',
                        ],
                      },
                      {
                        $ne: [
                          { $arrayElemAt: ['$recording.recordingUrl', 0] },
                          null,
                        ],
                      },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $facet: {
              totalCalls: [{ $count: 'count' }],
              connectedCalls: [
                {
                  $match: {
                    hasValidRecording: true,
                    normalizedCallEndedReason: 'N/A', // Only when callEndedReason is missing/null
                  },
                },
                { $count: 'count' },
              ],
              callStatusBreakdown: [
                {
                  $match: {
                    normalizedCallEndedReason: { $ne: 'N/A' }, // Only where callEndedReason exists
                  },
                },
                {
                  $group: {
                    _id: '$normalizedCallEndedReason',
                    count: { $sum: 1 },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    callEndedReason: '$_id',
                    count: 1,
                  },
                },
              ],
            },
          },
        ])
        .toArray();

      const stats = callStats[0] || {};

      const rawConnectedCalls = stats.connectedCalls?.[0]?.count || 0;

      const callByStatus = {
        leadGenerated: 0,
        customerBusy: 0,
        customerDidNotAnswer: 0,
        totalCalls: stats.totalCalls?.[0]?.count || 0,
        connectedCalls: rawConnectedCalls,
      };

      // Process call status breakdown
      stats.callStatusBreakdown?.forEach((item: any) => {
        const reason = item.callEndedReason?.toLowerCase();
        if (reason === 'completed') {
          callByStatus['leadGenerated'] = item.count;
        } else if (reason === 'customer-busy') {
          callByStatus['customerBusy'] = item.count;
        } else if (reason === 'customer-did-not-answer') {
          callByStatus['customerDidNotAnswer'] = item.count;
        }
      });
      callByStatus['notConnected'] = Math.max(
        0,
        callByStatus.totalCalls -
          (rawConnectedCalls +
            callByStatus.leadGenerated +
            callByStatus.customerBusy +
            callByStatus.customerDidNotAnswer),
      );

      callByStatus['connectedCalls'] =
        rawConnectedCalls + callByStatus.leadGenerated;

      return {
        ...campaign,
        timeZone,
        ...callByStatus,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get campaign recordings
  async getCampaignRecordings(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;

      if (isNaN(limitNum) || limitNum <= 0) {
        throw new Error('Limit must be a positive integer');
      }

      const skip = (pageNum - 1) * limitNum;

      const searchFilter = search
        ? {
            $or: [
              { campaignName: { $regex: search.trim(), $options: 'i' } },
              { phoneNumber: { $regex: search.trim(), $options: 'i' } },
              { botNumber: { $regex: search.trim(), $options: 'i' } },
            ],
          }
        : {};

      const recordings = await this.campaignRecordingSchema
        .aggregate([
          { $match: { userId, ...searchFilter } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$campaignId', // Group by campaignId
              latestRecord: { $first: '$$ROOT' },
            },
          },
          { $replaceRoot: { newRoot: '$latestRecord' } },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
        ])
        .toArray();

      const countAggregation = await this.campaignRecordingSchema
        .aggregate([
          { $match: { userId, ...searchFilter } },
          {
            $group: {
              _id: '$campaignId',
            },
          },
          {
            $count: 'total',
          },
        ])
        .toArray();

      const totalCount = countAggregation[0]?.total || 0;

      return {
        recordings,
        total: totalCount,
        currentPage: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      };
    } catch (error) {
      throw error;
    }
  }

  async getCampaignPhoneRecordings(
    userId: string,
    campaignId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      if (isNaN(limitNum) || limitNum <= 0) {
        throw new Error('Limit must be a positive integer');
      }

      const skip = (pageNum - 1) * limitNum;

      // Pivot off targetAudiences (one doc per lead, updated in place on
      // every retry) instead of campaignRecordings (one doc per call
      // attempt, retries just accumulate more rows). campaign-details'
      // counts are derived from targetAudiences — sourcing the list from
      // the same place guarantees the two endpoints always agree on which
      // attempt is "current" for a given lead, and on every status count.
      const matchStage = {
        userId,
        campaignId,
        callCompleted: true, // matches the same scope as campaign-details' totalCalls
        ...(search
          ? { phoneNumber: { $regex: search.trim(), $options: 'i' } }
          : {}),
      };

      const statusStage = {
        $addFields: {
          status: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$callEndedReason', 'completed'] },
                  then: CallStatus.LEAD_GENERATED,
                },
                {
                  case: { $eq: ['$callEndedReason', 'customer-busy'] },
                  then: CallStatus.CUSTOMER_BUSY,
                },
                {
                  case: {
                    $eq: ['$callEndedReason', 'customer-did-not-answer'],
                  },
                  then: CallStatus.CUSTOMER_DID_NOT_ANSWER,
                },
                {
                  case: {
                    $and: [
                      { $ne: ['$recording.recordingUrl', 'N/A'] },
                      { $ne: ['$recording.recordingUrl', null] },
                      {
                        $or: [
                          { $eq: ['$callEndedReason', null] },
                          { $not: ['$callEndedReason'] },
                        ],
                      },
                    ],
                  },
                  then: CallStatus.CONNECTED,
                },
              ],
              // No matching callEndedReason and no recording — the call
              // never connected. Map this (and any other/blank/unrecognized
              // raw status) to "Not connected" instead of showing "N/A".
              default: CallStatus.NOT_CONNECTED,
            },
          },
        },
      };

      const uniqueCalls = await this.targetAudienceSchema
        .aggregate([
          { $match: matchStage },
          // One row per lead — targetAudiences.vapiId is the current,
          // authoritative attempt for this lead (overwritten on retries).
          { $sort: { updatedAt: -1 } },
          { $group: { _id: '$vapiId', doc: { $first: '$$ROOT' } } },
          { $replaceRoot: { newRoot: '$doc' } },
          {
            $lookup: {
              from: CAMPAIGN_RECORDINGS_SCHEMA,
              localField: 'vapiId',
              foreignField: 'vapiId',
              as: 'recordings',
            },
          },
          {
            $unwind: { path: '$recordings', preserveNullAndEmptyArrays: true },
          },
          // A single vapiId can have 2 campaignRecordings rows (the
          // status-update and end-of-call-report webhooks each insert
          // one) — prefer whichever actually has a recording.
          {
            $addFields: {
              'recordings.hasValidRecording': {
                $and: [
                  { $ne: ['$recordings.recordingUrl', 'N/A'] },
                  { $ne: ['$recordings.recordingUrl', null] },
                ],
              },
            },
          },
          {
            $sort: {
              'recordings.hasValidRecording': -1,
              'recordings.createdAt': -1,
            },
          },
          { $group: { _id: '$_id', doc: { $first: '$$ROOT' } } },
          { $replaceRoot: { newRoot: '$doc' } },
          { $addFields: { recording: '$recordings' } },
          statusStage,
          {
            $project: {
              _id: { $ifNull: ['$recording._id', '$_id'] },
              vapiId: 1,
              status: 1,
              campaignId: 1,
              userId: 1,
              campaignName: '$recording.campaignName',
              phoneNumber: 1,
              botNumber: '$recording.botNumber',
              callType: '$recording.callType',
              callSummery: '$recording.callSummery',
              callDuration: '$recording.callDuration',
              recordingUrl: '$recording.recordingUrl',
              createdAt: { $ifNull: ['$recording.createdAt', '$createdAt'] },
              updatedAt: { $ifNull: ['$recording.updatedAt', '$updatedAt'] },
            },
          },
          // $group does not guarantee output order, so without this the
          // same lead can land on different pages across separate requests.
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
        ])
        .toArray();

      const totalResult = await this.targetAudienceSchema
        .aggregate([
          { $match: matchStage },
          { $group: { _id: '$vapiId' } },
          { $count: 'total' },
        ])
        .toArray();
      const totalCount = totalResult[0]?.total || 0;
      return {
        recordings: uniqueCalls,
        total: totalCount,
        currentPage: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      };
    } catch (error) {
      throw error;
    }
  }

  async getCallDetails(userId: string, phoneNumber: string) {
    try {
      const data = await this.campaignRecordingSchema
        .aggregate([
          { $match: { userId, phoneNumber } },
          { $sort: { createdAt: -1 } },
        ])
        .toArray();

      return data;
    } catch (error) {
      throw error;
    }
  }

  async getLeads(
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
    isMeetingBookedOnGoogleMeet?: string,
    startDate?: string,
    endDate?: string,
    exportData?: boolean,
  ) {
    try {
      page = Math.max(1, Number(page) || 1);
      limit = Math.max(1, Number(limit) || 10);
      const skip = (page - 1) * limit;

      const query: any = { userId: userId, IsLeadType: IsLeadType.voiceBot };

      // If no date range given but export is true, default to last 1 year
      if (exportData && !startDate && !endDate) {
        const end = new Date();
        const start = new Date();
        start.setFullYear(end.getFullYear() - 1); // 1 year ago
        startDate = start.toISOString();
        endDate = end.toISOString();
      }

      const searchKey = (search || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

      const redisKey = `leads:${userId}:${page}:${limit}:${searchKey}:${isMeetingBookedOnGoogleMeet}:${
        startDate || ''
      }:${endDate || ''}:${exportData || false}`;

      // Try Redis first (skip caching for export)
      if (!exportData) {
        const cached = await this.redisClient.get(redisKey);
        if (cached) return JSON.parse(cached);
      }

      // 🔍 Apply Date Range Filtering
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        query.updatedAt = { $gte: start, $lte: end };
      }

      // Build search query
      if (searchKey) {
        query.$or = [
          { firstName: { $regex: searchKey, $options: 'i' } },
          { lastName: { $regex: searchKey, $options: 'i' } },
          { name: { $regex: searchKey, $options: 'i' } },
          { email: { $regex: searchKey, $options: 'i' } },
        ];
      }

      // Meeting filter
      if (isMeetingBookedOnGoogleMeet === 'true') {
        query.$or = [
          { isMeetingBookedOnGoogleMeet: true },
          { isMeetingBookedOnGoogleMeet: { $exists: false } },
        ];
      } else if (isMeetingBookedOnGoogleMeet === 'false') {
        query.isMeetingBookedOnGoogleMeet = false;
      }

      // Base query builder
      let leadsCursor = this.db.collection('leads').aggregate([
        { $match: query },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            address: 1,
            campaignId: 1,
            updatedAt: 1,
            createdAt: 1,
            name: 1,
            IsLeadType: 1,
            customQuestions: 1,
            isMeetingBookedOnGoogleMeet: 1,
          },
        },
        { $sort: { updatedAt: -1 } },
        {
          $lookup: {
            from: 'voiceBotCampaigns',
            let: { cid: { $trim: { input: '$campaignId' } } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', { $toObjectId: '$$cid' }],
                  },
                },
              },
              { $project: { campaignName: 1 } },
            ],
            as: 'campaignInfo',
          },
        },
        {
          $addFields: {
            campaignName: { $arrayElemAt: ['$campaignInfo.campaignName', 0] },
          },
        },
        {
          $project: {
            firstName: 1,
            name: 1,
            address: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            campaignId: 1,
            campaignName: 1,
            updatedAt: 1,
            createdAt: 1,
            IsLeadType: 1,
            customQuestions: 1,
            isMeetingBookedOnGoogleMeet: 1,
          },
        },
      ]);

      // Apply pagination only when not exporting
      if (!exportData) {
        leadsCursor = leadsCursor.skip(skip).limit(limit);
      }

      const [totalLeads, leads] = await Promise.all([
        this.db.collection('leads').countDocuments(query),
        leadsCursor.toArray(),
      ]);

      // 🧾 Handle export request (Excel generation)
      if (exportData) {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Leads');

        worksheet.columns = [
          { header: 'Name', key: 'name', width: 25 },
          { header: 'First Name', key: 'firstName', width: 20 },
          { header: 'Last Name', key: 'lastName', width: 20 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Phone', key: 'phone', width: 20 },
          { header: 'Address', key: 'address', width: 30 },
          { header: 'Campaign Name', key: 'campaignName', width: 25 },
          {
            header: 'Meeting Booked (Google Meet)',
            key: 'isMeetingBookedOnGoogleMeet',
            width: 25,
          },
          { header: 'Created At', key: 'createdAt', width: 25 },
          { header: 'Updated At', key: 'updatedAt', width: 25 },
        ];

        leads.forEach((lead) => {
          worksheet.addRow({
            name: lead?.name ?? '',
            firstName: lead?.firstName ?? '',
            lastName: lead?.lastName ?? '',
            email: lead?.email ?? '',
            phone: lead?.phone ?? '',
            address: lead?.address ?? '',
            campaignName: lead?.campaignName ?? '',
            isMeetingBookedOnGoogleMeet: lead?.isMeetingBookedOnGoogleMeet
              ? 'Yes'
              : 'No',
            createdAt: lead?.createdAt
              ? new Date(lead.createdAt).toLocaleString()
              : '',
            updatedAt: lead?.updatedAt
              ? new Date(lead.updatedAt).toLocaleString()
              : '',
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return {
          status: HttpStatus.OK,
          message: 'Leads exported successfully',
          fileName: `leads_${startDate || '1year_ago'}_${
            endDate || 'today'
          }.xlsx`,
          fileBuffer: buffer,
        };
      }

      // 📄 Normal paginated JSON response
      const result = {
        leads,
        total: totalLeads,
        page,
        limit,
        totalPages: Math.ceil(totalLeads / limit),
        search: searchKey || null,
        dateRange: startDate || endDate ? { startDate, endDate } : null,
      };

      // Cache for 60 seconds
      await this.redisClient.set(redisKey, JSON.stringify(result), 'EX', 60);

      return result;
    } catch (error) {
      this.logger.error(error.message || 'Error fetching leads');
      throw new HttpException(
        error.message || 'Error fetching leads',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get base prompt
  async getBasePrompt(userId: string) {
    try {
      const voicebotSetting: any = await this.db
        .collection('voicebotsetting')
        .findOne({ userId });
      return (
        JSON.parse(voicebotSetting?.outBoundSettings?.defaultPrompt) || null
      );
    } catch (error) {
      throw error;
    }
  }

  // Get dashboard data
  async Dashboard(userId: string) {
    try {
      let lowBalance = false;
      const userData = await this.userCollection.findOne({
        _id: new ObjectId(userId),
      });

      if (userData?.activeSubscription) {
        const remainingBalance = userData.balanceAfterUsage || 0;
        const maxTokens = userData.tokenCredits || 0;

        const usedTokens = maxTokens - remainingBalance;

        const usageRatio = maxTokens > 0 ? usedTokens / maxTokens : 0;

        // If used 90% or more
        if (usageRatio >= 0.9) {
          lowBalance = true;
        }
      }

      const totalAppointments = await this.googleCalenderMeetingCollection
        .find({ userId })
        .toArray();

      const query: any = { userId: userId, IsLeadType: IsLeadType.voiceBot };
      const totalLeads = await this.db
        .collection('leads')
        .countDocuments(query);

      const completedAppointments = totalAppointments.filter(
        (appt) => appt.status === meetingStatus.Completed,
      );

      const appointmentCompletetionRate = totalAppointments.length
        ? `${completedAppointments.length}/${totalAppointments.length}`
        : '0/0';

      // Single aggregation for all call statistics
      const callStats = await this.targetAudienceSchema
        .aggregate([
          {
            $match: {
              userId,
              callCompleted: true,
            },
          },
          {
            $group: {
              _id: '$vapiId',
              callEndedReason: { $first: '$callEndedReason' },
            },
          },
          {
            $lookup: {
              from: CAMPAIGN_RECORDINGS_SCHEMA,
              localField: '_id',
              foreignField: 'vapiId',
              as: 'recording',
            },
          },
          {
            $addFields: {
              hasValidRecording: {
                $cond: {
                  if: {
                    $and: [
                      { $gt: [{ $size: '$recording' }, 0] },
                      {
                        $ne: [
                          { $arrayElemAt: ['$recording.recordingUrl', 0] },
                          'N/A',
                        ],
                      },
                      {
                        $ne: [
                          { $arrayElemAt: ['$recording.recordingUrl', 0] },
                          null,
                        ],
                      },
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              // Connected only when: has valid recording AND callEndedReason is null
              isConnected: {
                $and: [
                  { $eq: ['$hasValidRecording', true] },
                  { $eq: ['$callEndedReason', null] },
                ],
              },
            },
          },
          {
            $facet: {
              totalCalls: [{ $count: 'count' }],
              connectedCalls: [
                { $match: { isConnected: true } },
                { $count: 'count' },
              ],
              callStatusBreakdown: [
                {
                  $match: { callEndedReason: { $ne: null } }, // Only count calls with callEndedReason
                },
                {
                  $group: {
                    _id: '$callEndedReason',
                    count: { $sum: 1 },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    callEndedReason: '$_id',
                    count: 1,
                  },
                },
              ],
            },
          },
        ])
        .toArray();

      const stats = callStats[0] || {};

      const callByStatus = {
        leadGenerated: totalLeads,
        customerBusy: 0,
        customerDidNotAnswer: 0,
        connectedCalls: stats.connectedCalls?.[0]?.count || 0,
        totalCalls: 0,
      };

      // Process call status breakdown
      stats.callStatusBreakdown?.forEach((item: any) => {
        const reason = item.callEndedReason?.toLowerCase();
        if (reason === 'customer-busy') {
          callByStatus['customerBusy'] = item.count;
        } else if (reason === 'customer-did-not-answer') {
          callByStatus['customerDidNotAnswer'] = item.count;
        } else if (reason === 'completed') {
          // completed calls are counted as connected
          callByStatus.connectedCalls += item.count;
        }
      });

      // totalCalls = sum of all categorised calls so it always stays in sync
      callByStatus.totalCalls =
        callByStatus.connectedCalls +
        callByStatus.customerBusy +
        callByStatus.customerDidNotAnswer;

      let totalCampaigns = await this.voiceBotCampaignSchema.countDocuments({
        userId,
      });
      let totalCampaignsCompleted =
        await this.voiceBotCampaignSchema.countDocuments({
          userId,
          status: CampaignStatus.Completed,
        });
      let totalAudience = await this.targetAudienceSchema.countDocuments({
        userId,
      });
      return {
        callByStatus,
        appointmentCompletetionRate,
        totalAudience: totalAudience,
        totalCampaigns,
        totalCampaignsCompleted,
        lowBalance,
        totalLeads,
      };
    } catch (error) {
      throw error;
    }
  }

  async checkProjectAndNumber(userId: string): Promise<{
    projectExists: boolean;
    phoneExists: boolean;
    emailExists: boolean;
    isVapiVerified: boolean;
  }> {
    try {
      const isProject = await this.db.collection('knowledgebase').findOne({
        owner: new ObjectId(userId),
        status: KnowledgebaseStatus.READY,
      });

      const isPhoneNumber = await this.twilioPhoneNumberCollection.findOne({
        userId,
        callType: 'Outbound',
      });
      const isEmail = await this.emailAndWarmupCountCollection.findOne({
        userId,
        status: EMAIL_AND_PASSKEY_STATUS.VERIFIED,
      });

      const isVapiVerified = await this.db
        .collection('campaignVoiceServerConfig')
        .findOne({ userId, status: 'verified' });

      return {
        projectExists: Boolean(isProject),
        phoneExists: Boolean(isPhoneNumber),
        emailExists: Boolean(isEmail),
        isVapiVerified: Boolean(isVapiVerified),
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error checking project, number and email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get calendar data
  async getCalenderData(userId: string, date?: string, month?: string) {
    try {
      const selectedMonth = month ?? moment().format('YYYY-MM');
      const startOfMonth = moment
        .utc(selectedMonth, 'YYYY-MM')
        .startOf('month')
        .toDate();
      const endOfMonth = moment
        .utc(selectedMonth, 'YYYY-MM')
        .endOf('month')
        .toDate();

      // Always fetch all meetings for the month
      const monthFilter = {
        userId: userId,
        startTime: { $gte: startOfMonth, $lte: endOfMonth },
      };

      let monthlyMeetings = await this.googleCalenderMeetingCollection
        .find(monthFilter)
        .toArray();

      // Build dotData using monthly meeting dates
      const meetingDates = new Set(
        monthlyMeetings.map((meeting) =>
          moment.utc(meeting.startTime).format('YYYY-MM-DD'),
        ),
      );

      const totalDays = moment(selectedMonth, 'YYYY-MM').daysInMonth();
      const dotData = [];
      const start = moment.utc(startOfMonth);

      for (let i = 1; i <= totalDays; i++) {
        const day = start.clone().date(i).format('YYYY-MM-DD');
        dotData.push({
          date: day,
          dot: meetingDates.has(day),
        });
      }

      // Filter meetings to selected date if provided
      let meetingsData = monthlyMeetings;
      if (date) {
        const selectedDate = moment.utc(date, 'YYYY-MM-DD');
        const startOfDay = selectedDate.startOf('day').toDate();
        const endOfDay = selectedDate.endOf('day').toDate();

        meetingsData = monthlyMeetings.filter((meeting) => {
          const startTime = new Date(meeting.startTime).getTime();
          return (
            startTime >= startOfDay.getTime() && startTime <= endOfDay.getTime()
          );
        });
      }

      // Convert timezones if admin email is found
      const adminEmail = monthlyMeetings[0]?.attendees?.[0]?.email;
      const admin = adminEmail
        ? await this.db
            .collection(GOOGLECALENDER_COLLECTION)
            .findOne({ email: adminEmail })
        : null;

      if (admin?.timezone) {
        meetingsData = meetingsData.map((meeting) => ({
          ...meeting,
          startTime: moment
            .utc(meeting.startTime)
            .tz(admin.timezone)
            .format('YYYY-MM-DD HH:mm:ss'),
          endTime: moment
            .utc(meeting.endTime)
            .tz(admin.timezone)
            .format('YYYY-MM-DD HH:mm:ss'),
        }));
      }

      return {
        month: selectedMonth,
        dotData,
        meetingsData,
      };
    } catch (error) {
      throw error;
    }
  }

  async checkCampaignName(userId: string, campaignName: string) {
    try {
      const trimmedName = campaignName.trim();
      const existingCampaign = await this.voiceBotCampaignSchema.findOne({
        userId,
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

  async changeGoogleMeetingStatusOfAll() {
    try {
      await this.googleCalenderMeetingCollection.updateMany(
        {
          status: meetingStatus.Scheduled,
          startTime: { $lt: new Date() },
        },
        { $set: { status: meetingStatus.Completed, updatedAt: new Date() } },
      );
    } catch (error) {
      throw error;
    }
  }
  async changeVoicebotCampaignStatus(): Promise<void> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const result = await this.voiceBotCampaignSchema.updateMany(
        {
          status: CampaignStatus.Scheduled,
          scheduledAt: { $lte: oneHourAgo },
        },
        {
          $set: {
            status: CampaignStatus.Failed,
            updatedAt: new Date(),
          },
        },
      );

      this.logger.log(
        `✅ Scheduled → Completed campaigns updated: ${result.modifiedCount}`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Error in changeVoicebotCampaignStatus:',
        error.message,
      );
    }
  }
  async crawlWebsiteForCampaignLead(
    websiteURL: string,
    audienceId: ObjectId,
    useAlternateParser = false,
  ) {
    try {
      this.logger.log(`Starting crawl for website: ${websiteURL}`);

      const baseUrl = new URL(websiteURL).origin;
      const data: CrawlConfig = {
        urls: [websiteURL],
        include: [websiteURL],
        exclude: [`${baseUrl}/**/*.mp3`],
        maxPages: 1,
      };

      this.logger.log('Updating audience status to CRAWLING');
      await this.targetAudienceSchema.updateOne(
        { _id: audienceId },
        { $set: { status: CrwalStatus.CRAWLING } },
      );

      this.logger.log('Creating celery task for crawling');
      const client = this.celeryClient.get(CeleryClientQueue.CRAWLER);
      const task = client.createTask('tasks.crawl_v2');

      // Start the task and wait for initial response
      const taskResult = await task.applyAsync([
        data,
        audienceId.toString(),
        1,
        useAlternateParser,
      ]);
      this.logger.log('Crawl task started successfully');

      return { success: true, message: 'Crawl task initiated successfully' };
    } catch (error) {
      this.logger.error('Error in crawlWebsiteForCampaignLead:', error);
      await this.targetAudienceSchema.updateOne(
        { _id: audienceId },
        {
          $set: {
            status: CrwalStatus.CRAWL_ERROR,
            updatedAt: new Date(),
          },
        },
      );
      throw new Error(`Failed to crawl website: ${error.message}`);
    }
  }

  async insertSummaryIntoAudience(
    audienceId: string,
    data: targetCrawledDataStore,
  ) {
    const res = await this.targetAudienceSchema.updateOne(
      { _id: new ObjectId(audienceId) },
      {
        $set: {
          summary: {
            content: data.content,
            url: data.url,
            title: data.title,
            type: data.type,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
        },
      },
    );
    await this.createPromptAndSave(audienceId);
    return res as any;
  }

  async setTargetAudienceWebsiteCrawlData(
    id: ObjectId,
    crawlData,
    status?: CrwalStatus,
  ) {
    const update: any = { crawlData, updatedAt: new Date() };
    if (status) {
      update.status = status;
    }
    await this.targetAudienceSchema.updateOne({ _id: id }, { $set: update });
  }

  async updatetargetAudienceStatus(id: ObjectId, status: CrwalStatus) {
    await this.targetAudienceSchema.updateOne(
      { _id: id },
      { $set: { status, updatedAt: new Date() } },
    );
  }

  async changeMeetingStatus(body: ChangeMeetingStatus) {
    try {
      const meeting = await this.googleCalenderMeetingCollection.findOne({
        _id: new ObjectId(body.id),
      });

      if (!meeting) {
        throw new BadRequestException('Meeting not found');
      }

      const currentTime = moment.utc(); // current time in UTC
      const meetingStartTime = moment.utc(meeting.startTime); // ensure stored UTC time is parsed correctly

      // Optional: log for debugging
      if (
        body.status === meetingStatus.Cancelled &&
        currentTime.isSameOrAfter(meetingStartTime)
      ) {
        throw new BadRequestException(
          'Cannot cancel the meeting as the start time has already passed',
        );
      }

      await this.googleCalenderMeetingCollection.findOneAndUpdate(
        { _id: new ObjectId(body.id) },
        {
          $set: {
            status: body.status,
            updatedAt: moment.utc().toDate(),
          },
        },
      );
    } catch (error) {
      throw error;
    }
  }

  // async NotificationWebhook(adminEmail, payload) {
  //   try {
  //     const { toolCalls } = payload.message;

  //     const toolCall = toolCalls[0];

  //     const userId = payload.message?.call?.metadata?.userId;
  //     let settingData;
  //     if (userId) {
  //       settingData = await this.db
  //         .collection('voicebotsetting')
  //         .findOne({ userId }, { projection: { setReminderBeforeMeeting: 1 } });
  //     }
  //     const { name, arguments: toolCallParameters } = toolCall.function;

  //     settingData = await this.db
  //       .collection('voicebotsetting')
  //       .findOne(
  //         { email: adminEmail },
  //         { projection: { setReminderBeforeMeeting: 1 } },
  //       );
  //     // get the email of the host
  //     const meetingData = await this.db
  //       .collection('calenderMeetings')
  //       .findOne({ hostEmail: adminEmail });

  //     const reminderTimes = settingData.setReminderBeforeMeeting;
  //     const meetingStartMs = new Date(meetingData.startTime).getTime();

  //     const userData = meetingData.attendees.filter(
  //       (x) => x.role === 'Participant',
  //     );
  //     for (const delayInMinutes of reminderTimes) {
  //       // convert minutes → milliseconds
  //       const offsetMs = delayInMinutes * 60 * 1000;

  //       // subtract offset to get the reminder time in ms
  //       const reminderTimeMs = meetingStartMs - offsetMs;

  //       await this.voiceBotCampaignQueue.addMeetingNotification({
  //         delayInMinutes,
  //         email: userData[0]?.email,
  //         name: userData[0]?.name,
  //         meetDate: new Date(reminderTimeMs), // correct reminder Date object
  //       });
  //     }

  //     return {
  //       results: [
  //         {
  //           toolCallId: toolCalls[0].id,
  //           result: `Notification is also scheduled for the user`,
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     throw new HttpException('Internal Server Error', HttpStatus.BAD_REQUEST);
  //   }
  // }
  // Interpolate prompt with variables
  interpolatePrompt(prompt: string, variables: Record<string, string>): string {
    return prompt.replace(/{{(.*?)}}/g, (_, key) => {
      const trimmedKey = key.trim();
      return variables.hasOwnProperty(trimmedKey)
        ? variables[trimmedKey]
        : `{{${trimmedKey}}}`;
    });
  }

  // Create prompt and save to target audience
  async createPromptAndSave(audienceId: string) {
    try {
      const targetAudience = await this.targetAudienceSchema.findOne({
        _id: new ObjectId(audienceId),
      });
      const campaigns = await this.voiceBotCampaignSchema.findOne({
        _id: new ObjectId(targetAudience.campaignId),
      });

      const { painPointSolution, phoneNumbers, campaignProject, userId } =
        campaigns;
      const userDetails = await this.userCollection.findOne({
        _id: new ObjectId(userId),
      });

      const targetAudienceDetails = campaigns?.targetAudience.map(
        (x) => x.value,
      );
      const settings = await this.voicebotSettings.findOne({ userId });

      const leadCollectionData =
        settings?.outBoundSettings?.leadCollectionData || {};
      // const IsContactEnable = !!leadCollectionData.contactNumber === true;
      const IsAddressEnable = !!leadCollectionData.address === true;

      const callForwardingNumbers =
        settings?.outBoundSettings?.callForwardingNumbers || [];

      // Build call forwarding instructions for the prompt
      let callForwardingInstructions = '';
      if (
        Array.isArray(callForwardingNumbers) &&
        callForwardingNumbers.length > 0
      ) {
        callForwardingInstructions =
          'If the caller requests to speak with a specific person or department, use the following instructions:\n' +
          callForwardingNumbers
            .map(
              (entry, idx) =>
                `- If the caller asks for "${entry.name}", the assistant should call the transferCall function with "${entry.number}".`,
            )
            .join('\n') +
          '\n';
      }

      let prompt = campaigns?.prompt;

      const firstQuestion = campaigns?.customQuestions?.firstQuestion;
      const secondQuestion = campaigns?.customQuestions?.secondQuestion;
      const thirdQuestion = campaigns?.customQuestions?.thirdQuestion;

      const customQuestions: string[] = [];

      if (firstQuestion) {
        customQuestions.push(
          `1. "${firstQuestion}"\n Save the answer as: _firstQuestion`,
        );
      }
      if (secondQuestion) {
        customQuestions.push(
          `2. "${secondQuestion}"\n Save the answer as: _secondQuestion`,
        );
      }
      if (thirdQuestion) {
        customQuestions.push(
          `3. "${thirdQuestion}"\n Save the answer as: _thirdQuestion`,
        );
      }

      const customQuestionsSection =
        customQuestions.length > 0
          ? `### Kindly ask the below mentioned questions from the caller and store the answers in order as _firstQuestion, _secondQuestion, and _thirdQuestion:\n\nQuestions to Ask:\n${customQuestions.join(
              '\n',
            )}\n\n---`
          : '';

      const addressSection = IsAddressEnable
        ? `Ask for the address  
      > "Could you please provide your address?"  
      Reconfirm the address and store it as _address\n`
        : '';

      // Fetch admin timezone from calenderSettings using the campaign's projectId
      const calenderSetting = await this.db
        .collection('calenderSettings')
        .findOne(
          { knowledgebaseId: new ObjectId(campaignProject.projectId) },
          { projection: { timezone: 1 } },
        );
      const adminTimezone = calenderSetting?.timezone || 'UTC';

      // Compute today and tomorrow formatted in the admin's timezone
      const todayFormatted = moment()
        .tz(adminTimezone)
        .format('YYYY-MM-DD HH:mm:ss');
      const tomorrowFormatted = moment()
        .tz(adminTimezone)
        .add(1, 'day')
        .format('YYYY-MM-DD HH:mm:ss');
      const yearFormatted = moment().tz(adminTimezone).format('YYYY');

      const updatedPrompt = this.interpolatePrompt(JSON.parse(prompt), {
        assistantName: phoneNumbers[0].assistantName || 'VANI',
        targetAudience: targetAudienceDetails.join(', '),
        companyName: campaignProject.projectName,
        painPoints: painPointSolution
          .map((solution) => solution.painPoint)
          .join(', '),
        solutions: painPointSolution
          .map((solution) => solution.solution)
          .join(', '),
        supportEmailId: userDetails.email,
        callerCompanyTitle: targetAudience?.summary?.title || 'NA',
        address_section: addressSection,
        custom_questions_section: customQuestionsSection,
        call_forwarding_instructions: callForwardingInstructions,
        today: todayFormatted,
        tomorrow: tomorrowFormatted,
        year: yearFormatted,
      });

      await this.targetAudienceSchema.updateOne(
        { _id: new ObjectId(audienceId) },
        {
          $set: { prompt: updatedPrompt, updatedAt: new Date() },
        },
      );
    } catch (error) {
      this.logger.error('Error creating prompt:', error);
      throw new Error('Failed to create prompt');
    }
  }

  async saveScrappedDataInVoiceBotCampaign(validResults: any, user: any) {
    Logger.log('Starting saveDataInVoiceBotCampaign');

    try {
      const campaignDetails = await this.db
        .collection('voiceBotCampaigns')
        .insertOne({
          userId: user._id.toHexString() as any,
        });

      const targetAudienceList = validResults.map((data) => ({
        callCompleted: false,
        campaignId: campaignDetails.insertedId.toHexString(),
        userId: user._id.toHexString(),
        phoneNumber: data.phoneNumber ?? '',
        websiteUrl: data.websiteUrl ?? '',
        email: data.email ?? null,
        audienceCompanyName: data.companyName ?? null,
        status: 'SCRAPED',
        createdAt: new Date(),
        updatedAt: new Date(),
        dataSource: DATA_SOURCE_FOR_TARGET_AUDIENCE.GMB,
      }));

      Logger.log(
        `Saving ${targetAudienceList.length} entries in TargetAudience`,
      );

      if (targetAudienceList.length) {
        await this.targetAudienceSchema.insertMany(targetAudienceList);
      }

      Logger.log('Completed saveDataInVoiceBotCampaign');
    } catch (error) {
      Logger.error('Error in saveDataInVoiceBotCampaign:', error);
      throw new HttpException(
        'Failed to save data in voice bot campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async insertScrapJob(user: UserSparse, data: VoicebotCampaignScrapeDTO) {
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
    } catch (error) {}
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
      // candidates still get enriched regardless) and return whatever's been
      // found so far, transformed the same way as a completed job, instead
      // of throwing an error that discards it. This flow doesn't auto-save,
      // so the in-memory progress snapshot is the only place this data
      // exists before the job finishes.
      this.dataScrapperService.cancelScrapeJob(jobId);
      const partialData = this.dataScrapperService.getScrapeJobProgress(jobId);
      return {
        ...job,
        status: 'COMPLETED',
        result: this.toVoicebotValidateResult(partialData),
      };
    }

    if (job.status === 'FAILED') {
      return {
        success: false,
        message: 'Your scraping job has failed. Please try again.',
        status: job.status,
      };
    }

    return job;
  }

  async processScrapingJob(jobId: string, user: UserSparse, data) {
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

  // Shared with the timeout-partial-results path in getScrapeResult, so a
  // client that gave up waiting sees data transformed the exact same way as
  // a normal completed job.
  private toVoicebotValidateResult(items: any[]): any[] {
    const validateResult = [];
    for (const data of items || []) {
      if (data && data.phoneNumber && data.websiteUrl && data.email) {
        validateResult.push({
          phoneNumber: data.phoneNumber,
          websiteUrl: data.websiteUrl,
          email: data?.email,
          companyName: data?.websiteName,
        });
      }
    }
    return validateResult;
  }

  async dataScrappingFromGMB(
    user: UserSparse,
    data: VoicebotCampaignScrapeDTO,
    jobId?: string,
  ) {
    try {
      const existingFilters = ((data.filter as any[]) || []).filter(
        (f) => f?.field !== 'phone',
      );
      data.filter = [
        ...existingFilters,
        { field: 'phone', operator: 'equals', value: 'is_not_blank' },
      ] as any;

      const enableBillingWithoutPersistence = async () => {};

      const ScrapedData = await this.dataScrapperService.dataScrapping(
        user,
        data,
        enableBillingWithoutPersistence,
        null,
        data?.userToken,
        undefined,
        undefined,
        undefined,
        undefined,
        jobId,
      );

      return this.toVoicebotValidateResult(
        ScrapedData?.length > 0 ? ScrapedData.data : [],
      );
    } catch (error) {
      this.logger.error('Error in dataScrappingFromGMB:', error);
      throw new HttpException(
        error.message || 'Failed to start GMB data scrapping',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkDocumentExistence(projectId: string) {
    try {
      // PREVIOUS: hardcoded document-group list excluded WEBPAGE, CUSTOM, and CSV types,
      // so a KB that only had web-scraped or CSV content would incorrectly return false.
      // const document = [
      //   'DOCUMENT',
      //   DataStoreType.DOCX,
      //   DataStoreType.PPTX,
      //   DataStoreType.HTML,
      //   DataStoreType.PDF,
      //   DataStoreType.TEXT,
      //   DataStoreType.IMAGE,
      //   DataStoreType.VIDEO,
      // ];
      // NEW: check across all types so any KB content triggers a true result.
      const allTypes = Object.values(DataStoreType);
      const knowledgebase = await this.db
        .collection(KB_DATASTORE_COLLECTION)
        .find({
          knowledgebaseId: new ObjectId(projectId),
          type: { $in: allTypes },
        })
        .toArray();
      return knowledgebase.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async updateCampaign(
    userId: string,
    email: string,
    body: UpdateVoicebotCampaignDTO,
  ) {
    try {
      const {
        _id: campaignId,
        campaignName: newCampaignName,
        scheduleDate,
        scheduleTime,
      } = body;

      const existing = await this.voiceBotCampaignSchema.findOne({
        _id: new ObjectId(campaignId),
      });

      if (!existing) {
        throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
      }

      if (
        newCampaignName &&
        existing.campaignName.toLowerCase() !== newCampaignName.toLowerCase()
      ) {
        const duplicate = await this.voiceBotCampaignSchema.findOne({
          campaignName: { $regex: `^${newCampaignName}$`, $options: 'i' },
          _id: { $ne: new ObjectId(campaignId) },
        });

        if (duplicate) {
          throw new HttpException(
            `Campaign name "${newCampaignName}" is already in use`,
            HttpStatus.CONFLICT,
          );
        }
      }

      let scheduledDateTime = null;
      let adminTimeZone = null;
      let newStatus = existing.status;
      let isScheduleChanged = false; // track if schedule actually changed

      if (scheduleDate && scheduleTime) {
        const settingData = await this.db
          .collection('calenderSettings')
          .findOne(
            { knowledgebaseId: new ObjectId(body.campaignProject.projectId) },
            { projection: { timezone: 1 } },
          );

        adminTimeZone = settingData?.timezone || 'UTC';

        scheduledDateTime = moment.tz(
          `${scheduleDate} ${scheduleTime}`,
          'YYYY-MM-DD HH:mm',
          adminTimeZone,
        );

        const currentDateTime = moment().tz(adminTimeZone);

        if (scheduledDateTime.isSameOrBefore(currentDateTime)) {
          throw new BadRequestException(
            'Schedule date and time must be greater than current time',
          );
        }

        // Check if campaign is already scheduled with the SAME date & time
        if (
          existing.status === CampaignStatus.Scheduled &&
          existing?.scheduledAt
        ) {
          const existingScheduledAt = moment(existing.scheduledAt);
          isScheduleChanged = !scheduledDateTime.isSame(
            existingScheduledAt,
            'minute',
          );
        } else {
          isScheduleChanged = true;
        }

        if (isScheduleChanged) {
          newStatus = CampaignStatus.Scheduled;
        }
      }
      const result = await this.voiceBotCampaignSchema.findOneAndUpdate(
        { _id: new ObjectId(campaignId), userId },
        {
          $set: {
            campaignName: newCampaignName,
            voiceCharacter: body.voiceCharacter,
            language: body.language,
            phoneNumbers: body.phoneNumbers,
            campaignProject: body.campaignProject,
            maxPerDayCall: body.maxPerDayCall,
            ...(scheduledDateTime &&
              isScheduleChanged && {
                scheduledAt: scheduledDateTime.toDate(),
                status: newStatus,
              }),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      );

      if (!result.value) {
        throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
      }

      if (scheduledDateTime && isScheduleChanged) {
        await this.bullMqService.removeJob(campaignId);

        const queueData = {
          campaignId,
          scheduledDateAndTime: scheduledDateTime.toDate(),
          ...result.value,
          user: {
            _id: userId,
            email,
          },
          IsCampaignScheduledFor: 'voicebot',
          adminTimezone: adminTimeZone,
        };

        await this.bullMqService.scheduleJob(queueData);

        await this.campaignScheduledCollection.updateOne(
          { campaignId },
          {
            $set: {
              scheduleDate,
              scheduleTime,
              scheduledDateAndTime: scheduledDateTime.toDate(),
              updatedAt: moment().toDate(),
              status: CAMPAIGN_SCHEDULER_STATUS.SCHEDULED,
            },
          },
          { upsert: true },
        );
      }

      return result.value;
    } catch (error) {
      throw error;
    }
  }

  async deleteCampaign(userId: string, campaignId: string) {
    try {
      const campaign = await this.voiceBotCampaignSchema.findOne({
        _id: new ObjectId(campaignId),
        userId,
      });

      if (!campaign) {
        throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
      }

      // Delete all target audiences associated with the campaign
      await this.targetAudienceSchema.deleteMany({ campaignId });

      // Delete all campaign recordings associated with the campaign
      await this.campaignRecordingSchema.deleteMany({ campaignId });

      // Delete the campaign itself
      const result = await this.voiceBotCampaignSchema.deleteOne({
        _id: new ObjectId(campaignId),
        userId,
      });

      if (result.deletedCount === 0) {
        throw new HttpException(
          'Failed to delete campaign',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  async pauseCampaign(userId: string, campaignId: string) {
    try {
      const campaign = await this.voiceBotCampaignSchema.findOne({
        _id: new ObjectId(campaignId),
        userId,
      });
      if (!campaign) {
        throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
      }
      if (
        campaign.status === CampaignStatus.Paused ||
        campaign.status === CampaignStatus.Completed ||
        campaign.status === CampaignStatus.Failed
      ) {
        throw new HttpException(
          'Campaign is already paused, completed or failed',
          HttpStatus.BAD_REQUEST,
        );
      }
      //check schedule date should be greater than current date + 10 minutes
      const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
      if (
        campaign.scheduledAt &&
        campaign.scheduledAt < tenMinutesFromNow &&
        campaign.status === CampaignStatus.Scheduled
      ) {
        throw new HttpException(
          'Schedule date should be at least 10 minutes in the future',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.voiceBotCampaignSchema.updateOne(
        { _id: new ObjectId(campaignId) },
        { $set: { status: CampaignStatus.Paused } },
      );
      return { message: 'Campaign paused successfully' };
    } catch (error) {
      this.logger.error('Error in pauseCampaign:', error.message);
      throw new HttpException(
        error.message || 'Failed to pause campaign',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resumeCampaign(
    userId: string,
    email: string,
    campaignId: string,
    scheduleDate?: string,
    scheduleTime?: string,
  ) {
    try {
      const campaign = await this.voiceBotCampaignSchema.findOne({
        _id: new ObjectId(campaignId),
        userId,
      });

      if (!campaign) {
        throw new HttpException('Campaign not found', HttpStatus.NOT_FOUND);
      }

      if (
        campaign.status === CampaignStatus.Running ||
        campaign.status === CampaignStatus.Completed ||
        campaign.status === CampaignStatus.Failed
      ) {
        throw new HttpException(
          'Campaign is already running, completed or failed',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if schedule date and time are provided
      if (scheduleDate && scheduleTime) {
        // Get timezone from settings
        const settingData = await this.db
          .collection('calenderSettings')
          .findOne(
            {
              knowledgebaseId: new ObjectId(campaign.campaignProject.projectId),
            },
            { projection: { timezone: 1 } },
          );

        const adminTimeZone = settingData?.timezone || 'UTC';

        // Parse schedule date and time in admin timezone
        // const [year, month, day] = scheduleDate.split('-').map(Number);
        // const [hours, minutes] = scheduleTime.split(':').map(Number);

        const scheduledDateTime = moment.tz(
          `${scheduleDate} ${scheduleTime}`,
          'YYYY-MM-DD HH:mm',
          adminTimeZone,
        );

        const currentDateTime = moment().tz(adminTimeZone);

        if (scheduledDateTime.isSameOrBefore(currentDateTime)) {
          throw new BadRequestException(
            'Schedule date and time must be greater than current time',
          );
        }

        //schedule on date and time
        await this.voiceBotCampaignSchema.updateOne(
          { _id: new ObjectId(campaignId) },
          {
            $set: {
              status: CampaignStatus.Scheduled,
              scheduledAt: scheduledDateTime.toDate(),
            },
          },
        );

        // Update campaign with scheduled time
        const queueData = {
          campaignId: campaignId,
          scheduledDateAndTime: scheduledDateTime.toDate(),
          ...campaign,
          user: {
            _id: userId,
            email: email,
          },
          IsCampaignScheduledFor: 'voicebot',
          adminTimezone: adminTimeZone,
        };
        await this.bullMqService.scheduleJob(queueData);

        await this.campaignScheduledCollection.updateOne(
          { campaignId: campaignId },
          {
            $set: {
              campaignName: campaign.campaignName,
              scheduleDate,
              scheduleTime,
              scheduledDateAndTime: scheduledDateTime.format(),
              createdAt: new Date(),
              updatedAt: new Date(),
              addedBy: userId,
              status: CAMPAIGN_SCHEDULER_STATUS.SCHEDULED,
              IsCampaignScheduledFor: 'voicebot',
            },
          },
          { upsert: true },
        );

        this.logger.log(
          `Campaign ${campaignId} scheduled successfully for ${scheduledDateTime.format()}`,
        );
      } else {
        // Resume campaign immediately
        await this.voiceBotCampaignSchema.updateOne(
          { _id: new ObjectId(campaignId) },
          { $set: { status: CampaignStatus.Running } },
        );
        await this.vapiService.startCallToAudience(campaignId);
      }

      return { message: 'Campaign resumed successfully' };
    } catch (error) {
      this.logger.error('Error in resumeCampaign:', error.message);
      throw new HttpException(
        error.message || 'Failed to resume campaign',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getRecordingsByCampaignId(
    userId: string,
    campaignId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    try {
      page = Math.max(1, Number(page) || 1);
      limit = Math.max(1, Number(limit) || 10);
      const skip = (page - 1) * limit;

      const query: any = {
        userId,
        campaignId,
      };

      if (search) {
        search = search.trim();
        query.$or = [
          { phoneNumber: { $regex: search.trim(), $options: 'i' } },
          { botNumber: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      const recordings = await this.campaignRecordingSchema
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $addFields: {
              campaignIdObject: {
                $convert: {
                  input: '$campaignId',
                  to: 'objectId',
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          {
            $lookup: {
              from: VOICE_BOT_CAMPAIGN_SCHEMA,
              localField: 'campaignIdObject',
              foreignField: '_id',
              as: 'campaignInfo',
            },
          },
          {
            $addFields: {
              campaignName: { $arrayElemAt: ['$campaignInfo.campaignName', 0] },
            },
          },
          { $project: { campaignInfo: 0, campaignIdObject: 0 } },
        ])
        .toArray();

      const total = await this.campaignRecordingSchema.countDocuments(query);

      return {
        recordings,
        total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  async getInboundCallRecords(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    try {
      page = Math.max(1, Number(page) || 1);
      limit = Math.max(1, Number(limit) || 10);
      const skip = (page - 1) * limit;

      const query: any = {
        userId,
        callType: CallType.Incoming,
      };

      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { phoneNumber: { $regex: searchRegex } },
          { botNumber: { $regex: searchRegex } },
        ];
      }

      const total = await this.campaignRecordingSchema.countDocuments(query);

      const recordings = await this.campaignRecordingSchema
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        recordings,
        total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllSuppressedNumbers(
    userId: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const userObjectId = new ObjectId(userId);
      const userDoc = await this.db
        .collection('blockSuppressionPhoneList')
        .findOne({ userId: userObjectId });

      if (!userDoc) {
        return {
          suppressedNumbers: [],
          total: 0,
          currentPage: page,
          limit,
          totalPages: 0,
        };
      }

      let allNumbers: string[] = [...(userDoc.suppressNumbers || [])];

      // Optional: filter by search string
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        allNumbers = allNumbers.filter((number) => searchRegex.test(number));
      }

      const total = allNumbers.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedNumbers = allNumbers.slice(start, end);

      return {
        suppressedNumbers: paginatedNumbers,
        total,
        currentPage: page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Error fetching suppressed numbers:', error);
      throw new HttpException(
        'Failed to fetch suppressed numbers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteSuppressedNumber(userId: string, phoneNumber: string) {
    try {
      const userObjectId = new ObjectId(userId);
      const result = await this.db
        .collection('blockSuppressionPhoneList')
        .updateOne(
          { userId: userObjectId },
          { $pull: { suppressNumbers: phoneNumber } },
        );

      if (result.modifiedCount === 0) {
        throw new HttpException(
          'Phone number not found in suppressed list',
          HttpStatus.NOT_FOUND,
        );
      }

      return { message: 'Phone number removed from suppressed list' };
    } catch (error) {
      this.logger.error('Error deleting suppressed number:', error);
      throw new HttpException(
        error.message || 'Failed to delete suppressed number',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async mergeLeadsFromMultipleSources(
    targetLeads: TargetLeadsDTO,
    userId: string,
  ) {
    try {
      const {
        csvUploadLeads,
        linkedinLeads,
        facebookLeads,
        gmbLeads,
        yellowpagesLeads,
        forceContinue,
        skipDuplicatesFromActiveCampaigns,
      } = targetLeads;

      const hasLeads =
        (csvUploadLeads && csvUploadLeads.length > 0) ||
        (linkedinLeads && linkedinLeads.length > 0) ||
        (facebookLeads && facebookLeads.length > 0) ||
        (gmbLeads && gmbLeads.length > 0) ||
        (yellowpagesLeads && yellowpagesLeads.length > 0);

      if (!hasLeads) {
        throw new BadRequestException(
          'No leads found. Please provide at least one source of leads (CSV, LinkedIn, Facebook, or GMB).',
        );
      }

      // Add lead type to each lead source
      const allLeads = [
        ...(csvUploadLeads || []).map((lead) => ({
          ...lead,
          leadType: DATA_SOURCE_FOR_TARGET_AUDIENCE.CSV,
        })),
        ...(linkedinLeads || []).map((lead) => ({
          ...lead,
          leadType: DATA_SOURCE_FOR_TARGET_AUDIENCE.LINKEDIN,
        })),
        ...(facebookLeads || []).map((lead) => ({
          ...lead,
          leadType: DATA_SOURCE_FOR_TARGET_AUDIENCE.FACEBOOK,
        })),
        ...(gmbLeads || []).map((lead) => ({
          ...lead,
          leadType: DATA_SOURCE_FOR_TARGET_AUDIENCE.GMB,
        })),
        ...(yellowpagesLeads || []).map((lead) => ({
          ...lead,
          leadType: DATA_SOURCE_FOR_TARGET_AUDIENCE.YELLOW_PAGES,
        })),
      ];

      const { validNumbers, blockedNumbers, suppressedNumbers } =
        await this.checkBlockedSuppressionPhoneNumbers(
          allLeads,
          new ObjectId(userId),
        );

      const data = validateLeads(validNumbers, { voicebotMode: true });

      const activeCampaigns = await this.voiceBotCampaignSchema
        .find(
          {
            userId,
            status: { $in: [CampaignStatus.Running, CampaignStatus.Scheduled] },
          },
          { projection: { _id: 1 } },
        )
        .toArray();

      const activeCampaignIdsAsString = activeCampaigns.map((c) =>
        c._id.toString(),
      );

      let duplicateNumbersInActiveCampaigns = [];

      if (activeCampaignIdsAsString.length > 0 && data.validRows?.length > 0) {
        const phoneNumberListOfActiveCampaigns = await this.targetAudienceSchema
          .find(
            { campaignId: { $in: activeCampaignIdsAsString } },
            { projection: { phoneNumber: 1, _id: 0 } },
          )
          .toArray();

        const activeCampaignPhoneNumbersSet = new Set(
          phoneNumberListOfActiveCampaigns.map((p) => p.phoneNumber),
        );

        duplicateNumbersInActiveCampaigns = data.validRows.filter((lead) =>
          activeCampaignPhoneNumbersSet.has(lead.phoneNumber),
        );

        // If duplicates exist and no forceContinue and no skip flag -> block
        if (
          duplicateNumbersInActiveCampaigns.length > 0 &&
          !forceContinue &&
          !skipDuplicatesFromActiveCampaigns
        ) {
          throw new HttpException(
            {
              message:
                'Some leads already exist in other active campaigns. Do you want to skip them?',
              // duplicates: duplicatesInOtherCampaigns,
              requireConfirmation: true,
            },
            HttpStatus.CONFLICT,
          );
        }

        // If user wants to skip duplicates, remove them
        if (skipDuplicatesFromActiveCampaigns) {
          data.validRows = data.validRows.filter(
            (lead) => !activeCampaignPhoneNumbersSet.has(lead.phoneNumber),
          );
        }
      }

      // RESPONSE TYPE SAME AS BEFORE
      return { ...data, blockedNumbers, suppressedNumbers };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error in mergeLeadsFromMultipleSources:',
        error.status || 500,
      );
    }
  }

  async streamRecording(recordingId: string): Promise<{ redirectUrl: string }> {
    const recordingObjectId = new ObjectId(recordingId);

    let recording: any = await this.campaignRecordingSchema.findOne({
      _id: recordingObjectId,
    });

    if (!recording) {
      recording = await this.db
        .collection(INBOUND_BOT_LEADS_RECORDING_SCHEMA)
        .findOne({ _id: recordingObjectId });
    }

    if (!recording) {
      throw new HttpException('Recording not found', HttpStatus.NOT_FOUND);
    }

    const userId = recording.userId?.toString?.() ?? recording.userId;
    const userConfig =
      await this.userVoiceCampaignServerConfigCollection.findOne({ userId });

    if (
      userConfig?.vapiServerAPIkey &&
      recording.vapiId &&
      recording.vapiId !== 'N/A'
    ) {
      try {
        const vapiKey = CryptoService.decryptPasskey(
          userConfig.vapiServerAPIkey,
        );
        const callData = await this.vapiService.getCallById(
          vapiKey,
          recording.vapiId,
        );
        const presignedUrl =
          callData?.artifact?.presignedMonoUrl ||
          callData?.artifact?.presignedStereoUrl;
        if (presignedUrl && presignedUrl !== 'N/A') {
          return { redirectUrl: presignedUrl };
        }
      } catch {
        // fall through
      }
    }

    throw new HttpException(
      'Recording URL not available',
      HttpStatus.NOT_FOUND,
    );
  }
}
