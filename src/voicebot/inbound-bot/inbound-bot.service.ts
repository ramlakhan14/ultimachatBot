import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CreateInboundBotDto,
  TalkToUltimaBotDto,
} from './dto/create-inbound-bot.dto';
import { UpdateInboundBotDto } from './dto/update-inbound-bot.dto';
import { Collection, Db, ObjectId } from 'mongodb';
import {
  BotStatus,
  INBOUND_BOT_SCHEMA,
  InboundBotSchema,
} from './schema/inbound.bot.schema';
import { MONGODB } from '../../common/mongo/mongo.module';
import { VapiService } from '../voicebot/vapi.service';
import { VoicebotService } from '../voicebot/voicebot.service';
import * as FormData from 'form-data';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  CallSuccess,
  INBOUND_BOT_LEADS_RECORDING_SCHEMA,
  InboundBotCallRecordingsSchema,
  InboundCallEndedReason,
  InboundCallFilter,
} from './schema/inbound.bot.leads.schema';
import getDefaultInboundBot from './utils/default.Inbound.bot';
import {
  InBoundSettings,
  VOICEBOT_SETTING_COLLECTION,
} from '../schema/voicebot-setting.schema';
import axios from 'axios';
import { CallType, InUseStatus } from '../schema/phonenumber.schema';
import { ResponseUtil } from '../utils/response.util';
import {
  DataStoreType,
  IsLeadType,
  KB_DATASTORE_COLLECTION,
  KNOWLEDGEBASE_COLLECTION,
  LEADS_COLLECTION,
} from '../../knowledgebase/knowledgebase.schema';
import { OpenaiService } from '../../openai/openai.service';
import { AppConfigService } from '../../common/config/appConfig.service';
import { EmailService } from '../../common/email/email.service';
import { USER_COLLECTION } from '../../user/user.schema';
import { LEAD_COLLECTOR_PROMPT } from './utils/prompts';
import { AssistantType } from '../../knowledgebase/chatbot/openaiChatbot.constant';
import { UserService } from '../../user/user.service';
import { LeadSyncWithCrmDto } from '../../zapier-webhook/dto/leadSyncWithCrm.dto';
import { GPTModels } from '../../campaign/enum/enum';

@Injectable()
export class InboundBotService {
  private readonly logger = new Logger('InboundBotService');

  private readonly inboundBotsCollection: Collection<InboundBotSchema>;
  private readonly inboundBotCallRecordingsSchema: Collection<InboundBotCallRecordingsSchema>;
  private readonly VAPI_BASE_URL = 'https://api.vapi.ai';

  constructor(
    @Inject(MONGODB) private db: Db,
    private readonly vapiService: VapiService,
    private readonly voicebotService: VoicebotService,
    private readonly openaiService: OpenaiService,
    private emailService: EmailService,
    private appConfig: AppConfigService,
    private userService: UserService,
  ) {
    this.inboundBotsCollection =
      this.db.collection<InboundBotSchema>(INBOUND_BOT_SCHEMA);
    this.inboundBotCallRecordingsSchema =
      this.db.collection<InboundBotCallRecordingsSchema>(
        INBOUND_BOT_LEADS_RECORDING_SCHEMA,
      );
  }
  @OnEvent('lead.voicebot.trigger', { async: true })
  async handleVoiceBot(leadData: LeadSyncWithCrmDto) {
    if (leadData.IsLeadType === IsLeadType.callbackRequest) {
      await this.callMeRequestFromUltima(leadData);
    } else {
      await this.talkToMeWidget(leadData);
    }
  }
  async createInboundBot(
    createInboundBotDto: CreateInboundBotDto,
    userDetails: any,
  ) {
    const { _id: rawUserId, email } = userDetails;
    const userId = rawUserId.toHexString();
    const ts = new Date();

    const newInboundBot: InboundBotSchema = {
      ...createInboundBotDto,
      userId: new ObjectId(userId),
      status: BotStatus.Inactive,
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      createdAt: ts,
      updatedAt: ts,
    };

    const existingBot = await this.inboundBotsCollection.findOne({
      userId: newInboundBot.userId,
      botName: { $regex: `^${newInboundBot.botName}$`, $options: 'i' },
    });
    if (existingBot) {
      throw new HttpException(
        `Inbound bot ${newInboundBot.botName} already exists`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const newBot = await this.inboundBotsCollection.insertOne(newInboundBot);

    // Check bot limit before creating new bot
    await this.userService.checkBotMaxLimitAndCreate(
      new ObjectId(userDetails._id),
      'inbound_voicebot',
      newBot.insertedId,
    );

    let vapiData: any = null;
    try {
      const {
        vapi_key,
        inBoundSettings,
        toolIds = [],
      } = await this.getVapiKey(userId);

      const knowledgeBaseFile = await this.generateKnowledgebaseFile(
        userId,
        createInboundBotDto.campaignProject.projectId,
        AssistantType.VOICEBOT,
      );

      let openAIgeneratedPrompt = '';
      const isLeadBot = createInboundBotDto.isLeadBot === true ? true : false;
      if (isLeadBot) {
        openAIgeneratedPrompt = this.manipulatePrompt(LEAD_COLLECTOR_PROMPT, {
          callForwardingNumbers: inBoundSettings?.callForwardingNumbers,
          supportEmailId: email,
          botName: createInboundBotDto.botName,
          companyName: createInboundBotDto.campaignProject.projectName,
        });
      } else {
        openAIgeneratedPrompt = await this.generateSystemPrompt(
          inBoundSettings,
          createInboundBotDto,
          email,
          userId,
        );
      }

      // Validate prompt is not empty
      if (!openAIgeneratedPrompt || openAIgeneratedPrompt.trim().length === 0) {
        throw new HttpException(
          'Failed to generate bot prompt. Please try again.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const defAssistant = getDefaultInboundBot(
        openAIgeneratedPrompt,
        toolIds || [],
        {
          userId,
          inboundBotId: newBot.insertedId.toHexString(),
          prompt: openAIgeneratedPrompt,
          botName: createInboundBotDto.botName,
          voiceCharacter: createInboundBotDto.voiceCloneId
            ? createInboundBotDto.voiceCloneId
            : createInboundBotDto.voiceCharacter,
          waitSeconds: parseInt(inBoundSettings?.waitTimeBeforeSpeak),
          knowledgeBaseFiles: [knowledgeBaseFile?.id].filter(Boolean),
          knowledgebaseId: createInboundBotDto.campaignProject.projectId,
          INBOUND_BOT_SERVER_URL: isLeadBot
            ? process.env.ADVANCE_VAPI_SERVERURL
            : process.env.ADVANCE_VAPI_INBOUND_BOT_SERVER_URL,
        },
      );

      vapiData = await this.createBotOnVapi(vapi_key, defAssistant);

      await this.inboundBotsCollection.findOneAndUpdate(
        { _id: newBot.insertedId },
        {
          $set: {
            knowledgebaseDetails: knowledgeBaseFile ?? null,
            assistantId: vapiData?.id,
            vapiAssistantData: vapiData,
          },
        },
      );

      const phoneNumberData = await this.voicebotService.registerPhoneNumber(
        userId,
        {
          assistantId: vapiData?.id,
          callType: CallType.INBOUND,
          phoneNumber: createInboundBotDto.phoneNumber,
          assistantName: createInboundBotDto.botName,
        },
      );

      const updatedBot = await this.inboundBotsCollection.findOneAndUpdate(
        { _id: newBot.insertedId },
        {
          $set: {
            phoneNumberId: phoneNumberData?.phoneNumberId,
            status: BotStatus.Active,
            vapiAssistantData: vapiData,
            prompt: openAIgeneratedPrompt,
          },
        },
        { returnDocument: 'after' },
      );

      delete updatedBot.value.vapiAssistantData;
      return updatedBot.value;
    } catch (error) {
      let message = error?.message || 'Unknown error';
      if (
        message.includes('Phone number') &&
        message.includes('already in use')
      ) {
        message =
          'This phone number is already linked to another account. Please use a different phone number.';
      }

      await this.inboundBotsCollection.deleteOne({ _id: newBot.insertedId });
      await this.userService.decreaseBotCount(
        new ObjectId(userDetails._id),
        'inbound_voicebot',
        newBot.insertedId,
      );
      if (vapiData?.id) {
        const { vapi_key } = await this.getVapiKey(userId);
        await this.vapiService
          .deleteAssistant(vapi_key, vapiData.id)
          .catch(() => null);
      }
      throw error;
    }
  }

  async findAllInboundBots(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const filter: any = {
        $or: [{ userId: new ObjectId(userId) }, { userId: userId }],
      };
      if (search) {
        filter.botName = { $regex: search, $options: 'i' };
      }

      const [data, total] = await Promise.all([
        this.inboundBotsCollection
          .aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
              $lookup: {
                from: INBOUND_BOT_LEADS_RECORDING_SCHEMA,
                localField: '_id',
                foreignField: 'inboundBotId',
                as: 'recordings',
              },
            },
            {
              $addFields: {
                totalCalls: { $size: '$recordings' },
                successCalls: {
                  $size: {
                    $filter: {
                      input: '$recordings',
                      as: 'r',
                      cond: { $eq: ['$$r.status', 'Success'] },
                    },
                  },
                },
                failedCalls: {
                  $size: {
                    $filter: {
                      input: '$recordings',
                      as: 'r',
                      cond: { $eq: ['$$r.status', 'Failed'] },
                    },
                  },
                },
              },
            },
            {
              $project: {
                recordings: 0,
                vapiAssistantData: 0,
                assistantId: 0,
                phoneNumberId: 0,
              },
            },
          ])
          .toArray(),
        this.inboundBotsCollection.countDocuments(filter),
      ]);

      return {
        botsData: data,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        limit: limitNum,
      };
    } catch (error) {
      throw error;
    }
  }

  async findOneInboundBots(id: string, userId: string) {
    try {
      const botObjectId = new ObjectId(id);

      const [bot, totalCalls, successCalls, failedCalls] = await Promise.all([
        this.inboundBotsCollection.findOne(
          {
            _id: botObjectId,
            $or: [{ userId: new ObjectId(userId) }, { userId: userId as any }],
          } as any,
          {
            projection: {
              vapiAssistantData: 0,
              assistantId: 0,
              phoneNumberId: 0,
            },
          },
        ),
        this.inboundBotCallRecordingsSchema.countDocuments({
          inboundBotId: botObjectId,
        }),
        this.inboundBotCallRecordingsSchema.countDocuments({
          inboundBotId: botObjectId,
          status: 'Success',
        }),
        this.inboundBotCallRecordingsSchema.countDocuments({
          inboundBotId: botObjectId,
          status: 'Failed',
        }),
      ]);

      if (!bot) {
        throw new Error('Inbound bot not found');
      }

      return { ...bot, totalCalls, successCalls, failedCalls };
    } catch (error) {
      throw error;
    }
  }

  async updateInboundBots(
    updateInboundBotDto: UpdateInboundBotDto,
    userId: string,
    email: string,
  ) {
    try {
      const botObjectId = new ObjectId(updateInboundBotDto._id);
      const existingBot = await this.inboundBotsCollection.findOne({
        _id: botObjectId,
      });

      if (!existingBot) {
        throw new HttpException(`Inbound bot not found`, HttpStatus.NOT_FOUND);
      }

      const ts = new Date();
      const allowedKeys: (keyof UpdateInboundBotDto)[] = [
        'botName',
        'voiceCharacter',
        'botPurpose',
        'toneOfVoice',
        'prompt',
        'voiceCloneId',
        'phoneNumber',
        'emailToTeam',
        'botPurpose',
        'isLeadBot',
        'campaignProject',
      ];

      const updateData: Partial<InboundBotSchema> = { updatedAt: ts };
      for (const key of allowedKeys) {
        if (key in updateInboundBotDto) {
          updateData[key] = updateInboundBotDto[key];
        }
      }

      const {
        vapi_key,
        inBoundSettings,
        toolIds = [],
      } = await this.getVapiKey(userId);

      let updatedGeneratedPrompt = '';
      if (updateInboundBotDto.botPurpose !== existingBot.botPurpose) {
        updatedGeneratedPrompt = await this.generateSystemPrompt(
          inBoundSettings,
          updateInboundBotDto,
          email,
          userId,
        );
      }

      const defAssistantData = {
        userId,
        inboundBotId: botObjectId.toHexString(),
        prompt: updatedGeneratedPrompt || updateInboundBotDto.prompt,
        botName: updateInboundBotDto.botName,
        voiceCharacter: updateInboundBotDto.voiceCloneId
          ? updateInboundBotDto.voiceCloneId
          : updateInboundBotDto.voiceCharacter,
        waitSeconds: parseInt(inBoundSettings?.waitTimeBeforeSpeak),
        toolIds: toolIds ?? [],
        botPurpose: updateInboundBotDto.botPurpose,
        knowledgeBaseFile: existingBot.knowledgebaseDetails.id,
        isLeadBot: updateInboundBotDto.isLeadBot,
        projectId: updateInboundBotDto.campaignProject.projectId,
        knowledgeBaseFiles: existingBot.knowledgebaseDetails,
        assistantId: existingBot?.assistantId,
      };
      const vapiAssistantData =
        await this.vapiService.updateAssistantInboundBot(
          vapi_key,
          defAssistantData,
        );

      let phoneNumberId = existingBot.phoneNumberId;
      if (updateData.phoneNumber !== existingBot.phoneNumber) {
        const phoneData = await this.db
          .collection('twiliophonenumberlist')
          .findOne({
            userId,
            status: InUseStatus.YES,
            phoneNumber: existingBot.phoneNumber,
            assistantId: vapiAssistantData.id,
          });

        if (phoneData) {
          await this.vapiService.deletePhoneNumberFromVapi(
            vapi_key,
            phoneData.phoneNumberId,
          );
          await this.db
            .collection('twiliophonenumberlist')
            .deleteOne({ _id: phoneData._id });
        }
        const phoneNumberData = await this.voicebotService.registerPhoneNumber(
          userId,
          {
            assistantId: vapiAssistantData?.id,
            callType: CallType.INBOUND,
            phoneNumber: updateData.phoneNumber,
            assistantName: updateData.botName,
          },
        );
        phoneNumberId = phoneNumberData?.phoneNumberId;
      }

      const response = await this.inboundBotsCollection.findOneAndUpdate(
        { _id: botObjectId },
        { $set: { vapiAssistantData, ...updateData, phoneNumberId } },
        { returnDocument: 'after' },
      );
      if (response.value) {
        delete response.value.vapiAssistantData;
      }
      return response.value;
    } catch (error) {
      throw error;
    }
  }

  async removeInboundBots(
    id: string,
    userId: string,
    isDeletedBySystem = true,
  ) {
    try {
      const inboundBot = await this.inboundBotsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!inboundBot) {
        throw new HttpException('Inbound bot not found', HttpStatus.NOT_FOUND);
      }

      const vapiAssistantId = inboundBot.vapiAssistantData?.id;
      const phoneNumber = inboundBot.phoneNumber;

      if (vapiAssistantId) {
        try {
          const { vapi_key } = await this.getVapiKey(userId);
          // Delete assistant from VAPI
          await this.vapiService.deleteAssistant(vapi_key, vapiAssistantId);

          // Find linked phone number
          const phoneData = await this.db
            .collection('twiliophonenumberlist')
            .findOne({
              userId,
              phoneNumber,
              assistantId: vapiAssistantId,
            });

          if (phoneData) {
            await this.vapiService.deletePhoneNumberFromVapi(
              vapi_key,
              phoneData.phoneNumberId,
            );
            await this.db
              .collection('twiliophonenumberlist')
              .deleteOne({ _id: phoneData._id });
          }
        } catch (vapiError) {
          this.logger.error('⚠️ Failed to remove VAPI resources:', vapiError);
        }
      }
      if (isDeletedBySystem) {
        await this.inboundBotsCollection.deleteOne({ _id: new ObjectId(id) });
        await this.inboundBotCallRecordingsSchema.deleteMany({
          inboundBotId: new ObjectId(id),
        });
        await this.userService.decreaseBotCount(
          new ObjectId(userId),
          'inbound_voicebot',
        );
      }
      return;
    } catch (error) {
      this.logger.error('❌ Error removing inbound bot:', error);
      throw error;
    }
  }

  async bulkDeleteBot(botIds: string[], userId: string) {
    if (!botIds?.length) {
      throw new HttpException('No bot IDs provided', HttpStatus.BAD_REQUEST);
    }

    const deletedBots: string[] = [];
    const failedBots: { id: string; reason: string }[] = [];

    for (const id of botIds) {
      try {
        await this.removeInboundBots(id, userId);
        deletedBots.push(id);
      } catch (error: any) {
        failedBots.push({ id, reason: error?.message || 'Unknown error' });
      }
    }

    return {
      deletedBots,
      failedBots,
    };
  }

  async updateBotStatus(isActive: boolean, botId: string, userId: any) {
    try {
      const bot = await this.inboundBotsCollection.findOne({
        _id: new ObjectId(botId),
        userId: new ObjectId(userId),
      });

      if (!bot) {
        throw new HttpException('Bot not found', HttpStatus.NOT_FOUND);
      }

      const currentStatus = bot.status;
      const targetStatus = isActive ? BotStatus.Active : BotStatus.Inactive;

      if (currentStatus === targetStatus) {
        throw new HttpException(
          `Bot is already ${targetStatus}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const { vapi_key } = await this.getVapiKey(userId);
      if (targetStatus === BotStatus.Inactive) {
        if (bot.vapiAssistantData?.id) {
          await this.removeInboundBots(botId, userId, false);
        }
        await this.inboundBotsCollection.updateOne(
          { _id: new ObjectId(botId), userId: new ObjectId(userId) },
          { $set: { status: targetStatus } },
        );
      } else if (targetStatus === BotStatus.Active) {
        delete bot.vapiAssistantData?.id;
        delete bot.vapiAssistantData?.createdAt;
        delete bot.vapiAssistantData?.updatedAt;
        delete bot.vapiAssistantData?.isServerUrlSecretSet;
        delete bot.vapiAssistantData?.orgId;
        const vapiData = await this.createBotOnVapi(
          vapi_key,
          bot.vapiAssistantData,
        );
        await this.inboundBotsCollection.updateOne(
          { _id: new ObjectId(botId), userId: new ObjectId(userId) },
          {
            $set: {
              assistantId: vapiData.id,
              vapiAssistantData: vapiData,
            },
          },
        );
        const phoneNumberData = await this.voicebotService.registerPhoneNumber(
          userId,
          {
            assistantId: vapiData?.id,
            callType: CallType.INBOUND,
            phoneNumber: bot.phoneNumber,
            assistantName: bot.botName,
          },
        );
        await this.inboundBotsCollection.updateOne(
          { _id: new ObjectId(botId), userId: new ObjectId(userId) },
          {
            $set: {
              phoneNumberId: phoneNumberData?.phoneNumberId,
              status: targetStatus,
            },
          },
        );
        // Check bot limit before activating
        await this.userService.checkBotMaxLimitAndCreate(
          new ObjectId(userId),
          'inbound_voicebot',
          new ObjectId(botId),
        );
      }
      return { status: targetStatus };
    } catch (error) {
      throw error;
    }
  }

  async getInboundBotNumbers(userId: string) {
    try {
      const allNumbers = await this.voicebotService.getTwilioNumbers(userId);

      if (allNumbers && allNumbers.length === 0) {
        throw new HttpException(
          'No phone numbers available',
          HttpStatus.BAD_REQUEST,
        );
      }
      const numbers = await this.voicebotService.fetchPhoneNumber(userId, true);

      const inboundNumbers = allNumbers.filter(
        (tn) => !numbers.some((f) => f.phoneNumber === tn.phoneNumber),
      );

      if (!inboundNumbers || inboundNumbers.length === 0) {
        throw new HttpException(
          'No phone numbers available.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return inboundNumbers;
    } catch (error) {
      throw error;
    }
  }

  async uploadKnowledgebase(userId: string, file: Express.Multer.File) {
    try {
      const allowedMimeTypes = [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Unsupported file format');
      }

      const campaignVoiceServerConfig: any = await this.db
        .collection('campaignVoiceServerConfig')
        .findOne({ userId });

      const vapi_key = CryptoService.decryptPasskey(
        campaignVoiceServerConfig.vapiServerAPIkey,
      );
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: `${file.originalname}_${userId}_${Date.now()}`,
        contentType: file.mimetype,
      });
      const result = await this.vapiService.uploadKnowledgeBase(
        vapi_key,
        formData,
      );
      return { id: result?.id, fileUrl: result.url, fileName: result?.name };
    } catch (error) {
      throw error;
    }
  }

  async downloadToCSV(botId: string, userId: string) {
    try {
      const records = await this.inboundBotCallRecordingsSchema
        .find(
          {
            inboundBotId: new ObjectId(botId),
            userId: new ObjectId(userId),
          },
          {
            projection: {
              inboundBotId: 0,
              userId: 0,
              vapiId: 0,
            },
          },
        )
        .toArray();

      if (!records || records.length === 0) {
        throw new Error('No call records found');
      }

      const headers = [
        'Phone Number',
        'Bot Number',
        'Call Type',
        'Status',
        'Call Summary',
        'Call Duration',
        'Recording URL',
        'Call Ended Reason',
        'Created At',
        'Updated At',
      ];

      const csvRows = [headers.join(',')];

      for (const r of records) {
        const row = [
          r.phoneNumber ?? '',
          r.botNumber ?? '',
          r.callType ?? '',
          r.status ?? '',
          r.callSummery ?? '',
          r.callDuration ?? '',
          r.recordingUrl ?? '',
          r.callEndedReason ?? '',
          r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
          r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '',
        ].map((value) => `"${String(value).replace(/"/g, '""')}"`);

        csvRows.push(row.join(','));
      }

      const csvString = csvRows.join('\n');
      const buffer = Buffer.from(csvString, 'utf-8');
      const fileName = `leads_${Date.now()}.csv`;

      return {
        status: HttpStatus.OK,
        message: 'Leads exported successfully',
        fileName,
        fileBuffer: buffer,
      };
    } catch (error) {
      throw error;
    }
  }

  async getInboundCalls(
    userId: string,
    botId: string,
    filter: InboundCallFilter = {},
  ) {
    try {
      const query: any = {
        $or: [{ userId: new ObjectId(userId) }, { userId: userId }],
        inboundBotId: new ObjectId(botId),
      };
      if (filter.status) {
        query.status = filter.status;
      }
      if (filter.phoneNumber) {
        query.phoneNumber = filter.phoneNumber;
      }
      if (filter.botNumber) {
        query.botNumber = filter.botNumber;
      }
      const page = filter.page ?? 1;
      const limit = filter.limit ?? 20;
      const skip = (page - 1) * limit;

      const total = await this.inboundBotCallRecordingsSchema.countDocuments(
        query,
      );

      const calls = await this.inboundBotCallRecordingsSchema
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        data: calls,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  private manipulatePrompt(
    prompt: string,
    data: {
      callForwardingNumbers: any;
      supportEmailId: string;
      botName: string;
      companyName?: string;
    },
  ) {
    try {
      const { callForwardingNumbers, supportEmailId, botName, companyName } =
        data;
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

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const todayStr = fmt(now);
      const tomorrowStr = fmt(tomorrowDate);
      const yearStr = String(now.getFullYear());

      const modified_Prompt = this.voicebotService.interpolatePrompt(prompt, {
        supportEmailId,
        call_forwarding_instructions: callForwardingInstructions,
        botName,
        companyName,
        today: todayStr,
        tomorrow: tomorrowStr,
        year: yearStr,
      });
      return modified_Prompt;
    } catch (error) {
      throw error;
    }
  }

  // Generate system prompt using OpenAI
  private async generateSystemPrompt(
    inBoundSettings: any,
    createInboundBotDto: any,
    email: string,
    userId: string,
  ) {
    const callForwardingNumbers = inBoundSettings?.callForwardingNumbers || [];
    let callForwardingInstructions = '';
    if (
      Array.isArray(callForwardingNumbers) &&
      callForwardingNumbers.length > 0
    ) {
      callForwardingInstructions =
        'If the caller requests to speak with a specific person or department, follow these rules:\n' +
        callForwardingNumbers
          .map(
            (entry) =>
              `- If the caller asks for "${entry.name}", call transferCall("${entry.number}").`,
          )
          .join('\n') +
        '\n';
    }

    const instruction = `
You are creating a complete inbound voice assistant prompt for a bot system.

Your task:
- Generate a clear, conversational, and self-contained system prompt that defines the bot’s behavior and purpose.
- The prompt will be used in a voice-based LLM environment.

Requirements:
1. Describe the bot using botName and botPurpose.
2. Ensure the assistant introduces itself naturally and stays engaging.
3. If call forwarding instructions exist, include them clearly.
4. When users ask about our products, services, or company information, use the integrated knowledge base to find accurate and up-to-date answers. If an exact match is not found, politely offer to connect the user to a human agent or provide additional help resources.
5. Maintain a professional, warm, and helpful tone.
6. Include the support email if provided.
7. Prompt Template should be like with these heading and then followed by their description like 
    a. # Surveys & Feedback Collection Agent Prompt
    b. ## Identity & Purpose
    c. ## Voice & Persona
    d. ## Conversation Flow
    e. ## Core feedback questions
    f. ## Response Handling
    e. ## Closing & Follow-up
8. example prompt structure:
# [Bot Name]: [Brief Description]

## Identity & Purpose
You are [Bot Name], an AI assistant designed to [Bot Purpose]. Your goal is to [detailed description of bot's purpose and objectives].
## Voice & Persona
Your tone is [describe tone, e.g., friendly, professional, empathetic]. You should sound [describe voice characteristics, e.g., clear, engaging, approachable].
## Conversation Flow
- Greet callers warmly and introduce yourself as [Bot Name].
- Listen carefully to caller inquiries and respond based on your knowledge base.
- If a caller requests to speak with a specific person or department, follow these instructions:
${callForwardingInstructions}
- If you cannot find an answer in the knowledge base, politely offer to connect the caller to a human agent or provide additional help resources.
## Closing & Follow-up
- Thank callers for reaching out and offer further assistance if needed.

  `.trim();
    const content = `
botName: ${createInboundBotDto.botName}
botType: ${createInboundBotDto.botType}
supportEmail: ${email ?? 'N/A'}

${callForwardingInstructions}

BasePrompt:
${createInboundBotDto.prompt}
  `.trim();
    const data = await this.openaiService.getChatGptCompletion(
      {
        model: GPTModels.GPT_5_MINI,
        messages: [
          { role: 'system', content: instruction },
          { role: 'user', content: content },
        ],
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
      },
      [],
      new ObjectId(userId),
      'inbound-bot-prompt-gen',
    );
    await this.vapiService.updateTokenUsage(
      new ObjectId(userId),
      data.tokenUsage.total,
      createInboundBotDto.campaignProject.projectId,
    );
    return data.response;
  }

  private async getVapiKey(userId: string): Promise<{
    vapi_key: string;
    inBoundSettings: InBoundSettings | null;
    toolIds: string[];
  }> {
    try {
      const settings = await this.db
        .collection(VOICEBOT_SETTING_COLLECTION)
        .findOne({ userId });

      const campaignVoiceServerConfig: any = await this.db
        .collection('campaignVoiceServerConfig')
        .findOne({ userId });

      const toolIds = campaignVoiceServerConfig?.inboundToolsData?.map(
        (tool) => tool?.toolId,
      );

      const outboundToolsIds =
        campaignVoiceServerConfig?.vapiToolsData
          ?.filter((tool) => tool?.toolName !== 'transfer_call_tool')
          ?.map((tool) => tool?.toolId)
          ?.filter(Boolean) ?? [];

      const vapi_key = CryptoService.decryptPasskey(
        campaignVoiceServerConfig.vapiServerAPIkey,
      );
      return {
        vapi_key,
        toolIds: [...(toolIds || []), ...outboundToolsIds],
        inBoundSettings: settings?.inBoundSettings,
      };
    } catch (error) {
      throw error;
    }
  }

  async generateKnowledgebaseFile(
    userId: string,
    projectId: string,
    botName?: AssistantType,
  ) {
    // PREVIOUS APPROACH — grouped fallback logic (kept for reference):
    // The old code split KB types into three groups (WEBPAGE, DOCUMENT, CUSTOM) and
    // iterated through them in a preferred order, breaking as soon as any group returned
    // results. This caused a critical gap: if a KB had even one WEBPAGE entry, the loop
    // stopped there and VIDEO, PDF, DOCX, IMAGE data were never included in the VAPI
    // knowledge base file. Bots were effectively blind to non-webpage content.
    //
    // const preferredKB = await this.db.collection('preferredknbbybots').findOne({
    //   botName: botName,
    // });
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
    //   DOCUMENT: ['DOCUMENT', 'WEBPAGE', 'CUSTOM'],
    //   CUSTOM: ['CUSTOM', 'WEBPAGE', 'DOCUMENT'],
    // };
    // const preferredType = preferredKB?.preferredKNB ?? 'DOCUMENT';
    // const fallbackOrder = fallbackOrderMap[preferredType];
    // let knowledgebase = null;
    // for (const type of fallbackOrder) {
    //   const typesToQuery = kbTypeMap[type];
    //   knowledgebase = await this.db
    //     .collection(KB_DATASTORE_COLLECTION)
    //     .find({
    //       knowledgebaseId: new ObjectId(projectId),
    //       type: { $in: typesToQuery },
    //     })
    //     .toArray();
    //   if (knowledgebase.length > 0) {
    //     break;
    //   }
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

    if (!knowledgebase || knowledgebase.length === 0) {
      return null;
    }

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
    const file = {
      path: filePath,
      originalname: fileName,
      mimetype: 'text/plain',
      filename: fileName,
      buffer,
    } as unknown as Express.Multer.File;

    try {
      const uploadResult = await this.uploadKnowledgebase(userId, file);
      await fs.unlink(filePath).catch(() => null);
      return uploadResult;
    } catch (error) {
      await fs.unlink(filePath).catch(() => null);
      throw error;
    }
  }

  async createBotOnVapi(vapiKey: string, payload: any): Promise<any> {
    try {
      const config = {
        method: 'post',
        url: `${this.VAPI_BASE_URL}/assistant`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      };

      const assistantResponse = await axios.request(config);

      if (!assistantResponse.data) {
        throw new HttpException(
          'Failed to create assistant: No response from VAPI',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return assistantResponse.data;
    } catch (error) {
      throw error;
    }
  }

  async handleWebhook(message: any, userID: string, inboundBotId: string) {
    try {
      const type = message.type;
      switch (type) {
        case 'end-of-call-report': {
          const { call } = message;
          const reason = message.endedReason as InboundCallEndedReason;
          let callStatus: CallSuccess;

          // Success cases
          const successReasons: InboundCallEndedReason[] = [
            InboundCallEndedReason.ASSISTANT_ENDED_CALL,
            InboundCallEndedReason.ASSISTANT_ENDED_CALL_AFTER_MESSAGE_SPOKEN,
            InboundCallEndedReason.ASSISTANT_SAID_END_CALL_PHRASE,
            InboundCallEndedReason.VONAGE_COMPLETED,
            InboundCallEndedReason.CUSTOMER_ENDED_CALL,
          ];

          // Failed cases
          const failedReasons: InboundCallEndedReason[] = [
            InboundCallEndedReason.CUSTOMER_DID_NOT_ANSWER,
            InboundCallEndedReason.CUSTOMER_BUSY,
            InboundCallEndedReason.ASSISTANT_ERROR,
            InboundCallEndedReason.ASSISTANT_REQUEST_FAILED,
            InboundCallEndedReason.UNKNOWN_ERROR,
            InboundCallEndedReason.TWILIO_FAILED_TO_CONNECT_CALL,
            InboundCallEndedReason.VONAGE_FAILED_TO_CONNECT_CALL,
            InboundCallEndedReason.PIPELINE_ERROR,
            InboundCallEndedReason.EXCEEDED_MAX_DURATION,
            InboundCallEndedReason.MANUALLY_CANCELED,
            InboundCallEndedReason.ASSISTANT_FORWARDED_CALL,
            InboundCallEndedReason.CALL_FORWARDING_OPERATOR_BUSY,
            InboundCallEndedReason.CALL_RINGING_HOOK_EXECUTED_TRANSFER,
          ];

          const updateField: Record<string, number> = { totalCalls: 1 };

          if (successReasons.includes(reason)) {
            callStatus = CallSuccess.Success;
            updateField.successCalls = 1;
          } else if (failedReasons.includes(reason)) {
            callStatus = CallSuccess.Failed;
            updateField.failedCalls = 1;
          } else {
            callStatus = CallSuccess.Failed;
            updateField.failedCalls = 1;
          }

          const iInboundBotExists = await this.inboundBotsCollection.findOne({
            _id: new ObjectId(inboundBotId),
          });

          if (!iInboundBotExists) {
            throw new HttpException(
              'Inbound bot not found',
              HttpStatus.NOT_FOUND,
            );
          }

          const callReport = {
            vapiId: call.id,
            status: callStatus,
            inboundBotId: new ObjectId(inboundBotId),
            userId: new ObjectId(userID),
            phoneNumber: message?.customer?.number,
            botNumber: message?.phoneNumber?.number,
            callType: CallType.INBOUND,
            callSummery: message?.summary || 'N/A',
            callDuration: message.durationSeconds
              ? `${Math.floor(message.durationSeconds / 60)} min: ${(
                  message.durationSeconds % 60
                ).toFixed(0)} sec`
              : null,
            recordingUrl: message.recordingUrl || 'N/A',
            createdAt: new Date(),
            updatedAt: new Date(),
            callEndedReason: reason || InboundCallEndedReason.UNKNOWN_ERROR,
          };
          await this.inboundBotCallRecordingsSchema.insertOne(callReport);

          const isVoiceCloneUsed = Boolean(iInboundBotExists.voiceCloneId);
          // Deduct credits for inbound call
          await this.userService.consumeCredits(
            new ObjectId(userID),
            'INBOUND_CALLS',
            isVoiceCloneUsed,
            message.durationSeconds,
          );

          const leadData = {
            userId: userID,
            phone: message?.customer?.number || 'Unknown',
            name: message?.customer?.name || 'Unknown Caller',
            voiceBotRecordingURL: callReport.recordingUrl,
            isSyncedToCrm: false,
            campaignDetails: {
              _id: iInboundBotExists.campaignProject.projectId,
              campaignName: iInboundBotExists.campaignProject.projectName,
            },
            standAloneAssistant: null,
            IsLeadType: IsLeadType.voiceBot,
            callSummery: callReport.callSummery,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const existingLead = await this.db
            .collection(LEADS_COLLECTION)
            .findOne({
              userId: userID,
              phone: message?.customer?.number,
            });

          if (existingLead) {
            await this.db.collection(LEADS_COLLECTION).updateOne(
              { _id: existingLead._id },
              {
                $set: {
                  ...leadData,
                  updatedAt: new Date(),
                },
              },
            );
          } else {
            await this.db.collection(LEADS_COLLECTION).insertOne(leadData);
          }

          const inboundBot = await this.inboundBotsCollection.findOneAndUpdate(
            { _id: new ObjectId(inboundBotId) },
            { $inc: updateField },
            { returnDocument: 'after' },
          );
          const userEmail = await this.db
            .collection(USER_COLLECTION)
            .findOne(
              { _id: new ObjectId(userID) },
              { projection: { email: 1 } },
            );

          const { emailToTeam } = inboundBot.value || {};
          try {
            const meetingDetails = {
              startTime: null,
              endTime: null,
              isMeetingBookedOnGoogleMeet: true,
            };
            await this.emailService.sendPotentialLeadMailToAdmin(
              userEmail?.email,
              null,
              null,
              message?.customer?.number,
              null,
              callReport.callSummery,
              true,
              meetingDetails,
              null,
              userID,
            );
            if (emailToTeam) {
              await this.emailService.sendPotentialLeadMailToAdmin(
                emailToTeam,
                null,
                null,
                message?.customer?.number,
                null,
                callReport.callSummery,
                false,
                meetingDetails,
                null,
                userID,
              );
            }
          } catch (error) {}
          break;
        }
        default:
          break;
      }

      return ResponseUtil.success(HttpStatus.OK);
    } catch (error) {
      throw error;
    }
  }

  async callMeRequestFromUltima(body: TalkToUltimaBotDto) {
    try {
      const { phone: userNumber, name = 'Unknown', email = 'Unknown' } = body;
      const adminUserId =
        process.env.ULTIMA_ADMIN_USER_ID || '66d92ebb9944525e612535c4'; // SuperAdmin ID, as this is a generic callback request without a specific user context
      const adminKnowledgebaseId =
        process.env.ULTIMA_ADMIN_KNOWLEDGEBASE_ID || '698afa71fbb5229753d9f3bc'; // Ultima website Knowledebase ID
      const vapi_key = process.env.ULTIMA_VAPI_KEY || ''; // client account key
      const phoneNumberId =
        process.env.ULTIMA_PHONE_NUMBER_ID ||
        '2a33a398-56a6-486c-b6d9-a884ff8bfd67';
      const assistantId =
        process.env.ULTIMA_ASSISTANT_ID ||
        '47cf05df-b15a-4d8d-8e5f-611a67296ad9'; // Ultima Assistant ID for callback request

      const now = new Date();
      // define duplicate time window (example: 5 minutes)
      const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
      const timeThreshold = new Date(now.getTime() - DUPLICATE_WINDOW_MS);

      // build duplicate filter
      const duplicateFilter: any = {
        phone: userNumber,
        createdAt: { $gte: timeThreshold },
        knowledgebaseId: new ObjectId(adminKnowledgebaseId),
      };

      // check duplicate request in time window
      const isExistRequest = await this.db
        .collection(LEADS_COLLECTION)
        .findOne(duplicateFilter);

      if (isExistRequest) {
        throw new BadRequestException(
          'You have already requested recently. Please wait a few minutes before trying again.',
        );
      }

      try {
        await this.vapiService.createCallFlowForCallBackRequest(
          userNumber,
          adminUserId,
          vapi_key,
          phoneNumberId,
          assistantId,
          adminKnowledgebaseId,
        );
        // await this.db.collection(LEADS_COLLECTION).insertOne(leadData);
        return 'Thank you for your interest! Our team will get back to you shortly.';
      } catch (error) {
        throw new BadRequestException(error.message || 'Something went wrong');
      }
    } catch (error) {
      throw error;
    }
  }

  async talkToMeWidget(body: TalkToUltimaBotDto) {
    try {
      const {
        message: userMessage,
        phone: userNumber,
        name = 'Unknown',
        email = 'Unknown',
        knowledgebaseId,
      } = body;

      if (!userMessage) {
        throw new BadRequestException('Query is required.');
      }
      const now = new Date();
      const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
      const timeThreshold = new Date(now.getTime() - DUPLICATE_WINDOW_MS);

      // build duplicate filter
      const duplicateFilter: any = {
        phone: userNumber,
        createdAt: { $gte: timeThreshold },
      };

      // include knowledgebaseId only for widget leads
      if (knowledgebaseId) {
        duplicateFilter.knowledgebaseId = new ObjectId(knowledgebaseId);
      }

      // check duplicate request in time window
      const isExistRequest = await this.db
        .collection(LEADS_COLLECTION)
        .findOne(duplicateFilter);

      if (isExistRequest) {
        throw new BadRequestException(
          'You have already requested recently. Please wait a few minutes before trying again.',
        );
      }

      // CASE 2: Message exists but no knowledgebaseId
      if (!knowledgebaseId) {
        throw new BadRequestException('Knowledgebase ID is required');
      }

      const projectData = await this.db
        .collection(KNOWLEDGEBASE_COLLECTION)
        .findOne({ _id: new ObjectId(knowledgebaseId) });

      if (!projectData) {
        throw new BadRequestException('Invalid knowledgebase ID');
      }

      const knowledgebaseFile = await this.generateKnowledgebaseFile(
        projectData.owner.toString(),
        knowledgebaseId,
        AssistantType.CHATBOT,
      );

      const campaignVoiceServerConfig: any = await this.db
        .collection('campaignVoiceServerConfig')
        .findOne({ userId: projectData.owner.toString() });
      const toolIds = campaignVoiceServerConfig.vapiToolsData.map(
        (tool) => tool.toolId,
      );
      const vapi_key = await CryptoService.decryptPasskey(
        campaignVoiceServerConfig.vapiServerAPIkey,
      );

      const phoneNumberData = await this.db
        .collection('twiliophonenumberlist')
        .findOne({
          userId: projectData.owner.toString(),
          status: InUseStatus.YES,
        });
      const phoneNumberId = phoneNumberData?.phoneNumberId;
      const assistantId = phoneNumberData.assistantId;

      try {
        await this.vapiService.createCallFlowForWidget(
          userNumber,
          projectData.owner.toString(),
          vapi_key,
          toolIds,
          phoneNumberId,
          assistantId,
          projectData,
          knowledgebaseId,
          [knowledgebaseFile?.id].filter(Boolean),
        );
        // await this.db.collection(LEADS_COLLECTION).insertOne(leadData);
      } catch (error) {
        const message = error?.response?.data?.message;
        throw new BadRequestException(message || 'Something went wrong');
      }

      return 'Thank you for your interest! Our team will get back to you shortly.';
    } catch (error) {
      throw error;
    }
  }

  async handleTalkToMeWidgets(message: any) {
    try {
      const type = message.type;
      switch (type) {
        case 'end-of-call-report': {
          const { call } = message;
          const { metadata } = call;
          const existingLead = await this.db
            .collection(LEADS_COLLECTION)
            .findOne({
              vapiId: call?.id,
              phone: message?.customer?.number,
              IsLeadType: metadata?.IsLeadType,
              knowledgebaseId: new ObjectId(metadata?.knowledgebaseId),
            });

          if (existingLead) {
            await this.db.collection(LEADS_COLLECTION).updateOne(
              { _id: existingLead._id },
              {
                $set: {
                  callSummery: message?.summary || 'N/A',
                  callDuration: message.durationSeconds
                    ? `${Math.floor(message.durationSeconds / 60)} min: ${(
                        message.durationSeconds % 60
                      ).toFixed(0)} sec`
                    : null,
                  recordingUrl: message.recordingUrl || 'N/A',
                  updatedAt: new Date(),
                },
              },
            );
          }
        }
        default:
          break;
      }
      return ResponseUtil.success(HttpStatus.OK);
    } catch (error) {
      throw error;
    }
  }
}
