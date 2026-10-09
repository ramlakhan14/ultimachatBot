import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import getDefaultAssistant from '../utils/default-assistant';
import axios from 'axios';
import { IUpdateAssistant } from '../interfaces/vapi-key-config.interface';
import { MONGODB } from '../../common/mongo/mongo.module';
import {
  IsLeadType,
  Lead,
  LEADS_COLLECTION,
} from '../../knowledgebase/knowledgebase.schema';
import { Collection, Db, ObjectId } from 'mongodb';
import {
  CampaignStatus,
  CrwalStatus,
  TARGET_AUDIENCES_SCHEMA,
  TargetAudienceSchema,
  VOICE_BOT_CAMPAIGN_SCHEMA,
  VoiceBotCampaignSchema,
} from '../schema/voicebot.campaign.schema';
import { ResponseUtil } from '../utils/response.util';
import {
  CallType,
  CAMPAIGN_RECORDINGS_SCHEMA,
  CampaignRecordingsSchema,
} from '../schema/campaign.recordings.schema';
import {
  VOICE_BOT_CAMPAIGN_DASHBOARD_SCHEMA,
  VoiceBotCampaignDashboardSchema,
} from '../schema/dashboard.schema';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import {
  ReminderPreference,
  VOICEBOT_SETTING_COLLECTION,
} from '../schema/voicebot-setting.schema';
import { BullMqService } from '../../campaign/bull/bullMq.service';
import { ModuleRef } from '@nestjs/core';
import * as moment from 'moment-timezone';
import { EmailService } from '../../common/email/email.service';
import { OpenaiService } from '../../openai/openai.service';
import { GPTModels } from '../../campaign/enum/enum';
import {
  VOICEBOT_CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
  VoicebotCampaignEmailConversationSchema,
} from '../schema/voicebotEmailConversation.schema';
import {
  addToSuppressListTool,
  generatePayloadForBookingAppointmentTool,
  generatePayloadForCheckBookingSlotTool,
  generatePayloadForTransferCallTool,
} from './tools';
import { GOOGLECALENDER_COLLECTION } from '../../knowledgebase/googleCalender/googleCalender.schema';
import { GOOGLE_CALENDER_MEETING } from '../../knowledgebase/google-calender-meeting.schema';
import FormData from 'form-data';
import getDefaultInboundBot from '../inbound-bot/utils/default.Inbound.bot';
import { INBOUND_BOT_LEADS_RECORDING_SCHEMA } from '../inbound-bot/schema/inbound.bot.leads.schema';
import { UserService } from '../../user/user.service';
@Injectable()
export class VapiService {
  private logger = new Logger(VapiService.name);
  private bullMqService: BullMqService;
  private readonly VAPI_BASE_URL = 'https://api.vapi.ai';
  private voiceBotCampaignSchema: Collection<VoiceBotCampaignSchema>;
  private targetAudienceSchema: Collection<TargetAudienceSchema>;
  private campaignRecordingsSchema: Collection<CampaignRecordingsSchema>;
  private voiceBotDashboardSchema: Collection<VoiceBotCampaignDashboardSchema>;
  private voiceBotEmailConversationSchema: Collection<VoicebotCampaignEmailConversationSchema>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private readonly moduleRef: ModuleRef,
    private emailService: EmailService,
    private openaiService: OpenaiService,
    private userService: UserService,
  ) {
    this.voiceBotCampaignSchema = this.db.collection<VoiceBotCampaignSchema>(
      VOICE_BOT_CAMPAIGN_SCHEMA,
    );
    this.targetAudienceSchema = this.db.collection<TargetAudienceSchema>(
      TARGET_AUDIENCES_SCHEMA,
    );
    this.campaignRecordingsSchema =
      this.db.collection<CampaignRecordingsSchema>(CAMPAIGN_RECORDINGS_SCHEMA);
    this.voiceBotDashboardSchema =
      this.db.collection<VoiceBotCampaignDashboardSchema>(
        VOICE_BOT_CAMPAIGN_DASHBOARD_SCHEMA,
      );
    this.voiceBotEmailConversationSchema =
      this.db.collection<VoicebotCampaignEmailConversationSchema>(
        VOICEBOT_CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
      );
  }

  async onModuleInit() {
    this.bullMqService = this.moduleRef.get(BullMqService, { strict: false });
    // await this.updateToolForAllUsers();
  }

  async checkVapiKey(vapiKey: string) {
    try {
      const config = {
        method: 'get',
        url: `${this.VAPI_BASE_URL}/assistant`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
      } as any;

      const vapiResponse = await axios.request(config);
      return vapiResponse.data;
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || 'Invalid VAPI API key';
      throw new HttpException(
        message,
        status === 401
          ? HttpStatus.BAD_REQUEST
          : status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createAssistant(vapiKey: string, toolIds: string[]): Promise<any> {
    try {
      const payload = getDefaultAssistant(toolIds, null, null);

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
      this.logger.log('Error in the creating assistant function');
      throw new HttpException(
        error.message || 'Error creating assistant',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // This function is used to create a call forwarding tool
  async createUpdateCallForwardingTool(
    vapiKey: string,
    callForwardingNumbers: {
      name: string;
      number: string;
      customMessage: string;
    }[],
    userId: string,
    isUpdate: boolean,
    toolId: string,
    toolFor: string,
  ) {
    try {
      const toolName =
        toolFor === 'inbound'
          ? 'transfer_call_tool_inbound'
          : 'transfer_call_tool';

      let systemNumber;
      if (toolFor === 'inbound') {
        const inboundBot = await this.db.collection('inboundBot').findOne({
          userId: new ObjectId(userId),
        });
        systemNumber = inboundBot?.phoneNumber;
      }

      const payload = generatePayloadForTransferCallTool(
        callForwardingNumbers,
        toolName,
        systemNumber,
      );
      const toolType = payload.type;
      if (isUpdate) {
        delete payload.type;
      }

      const config = {
        method: isUpdate ? 'patch' : 'post',
        url: `${this.VAPI_BASE_URL}/tool${isUpdate ? `/${toolId}` : ''}`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      };

      const toolResponse = await axios.request(config);

      if (!toolResponse.data) {
        throw new HttpException(
          'Failed to create tool',
          HttpStatus.BAD_REQUEST,
        );
      }

      const toolData = {
        toolType,
        toolName: toolResponse.data.function?.name ?? toolName,
        description:
          toolResponse.data.function?.description ??
          payload.function.description,
        toolData: toolResponse.data,
        toolId: toolResponse.data.id,
      };
      const key = toolFor === 'inbound' ? 'inboundToolsData' : 'vapiToolsData';

      if (isUpdate && toolId) {
        await this.db.collection('campaignVoiceServerConfig').updateOne(
          { userId, [`${key}.toolId`]: toolId },
          {
            $set: {
              [`${key}.$[tool].toolData`]: toolResponse.data, // recommended
              [`${key}.$[tool].description`]:
                toolResponse.data.function?.description ??
                payload.function.description,
              [`${key}.$[tool].toolType`]: toolResponse.data.type ?? toolType,
              [`${key}.$[tool].toolName`]:
                toolResponse.data.function?.name ?? toolName,
            },
          },
          {
            arrayFilters: [{ 'tool.toolId': toolId }],
          },
        );
        return toolResponse.data;
      }

      await this.db
        .collection('campaignVoiceServerConfig')
        .updateOne({ userId }, { $addToSet: { [key]: { $each: [toolData] } } });
      return toolResponse.data;
    } catch (error) {
      throw error;
    }
  }

  async createTool(userId: string, vapiKey: string): Promise<any> {
    try {
      const generatePayloadForBookingAppointment =
        generatePayloadForBookingAppointmentTool(userId);
      const generatePayloadForCheckBookingSlot =
        generatePayloadForCheckBookingSlotTool(userId);

      const addToSuppressList = addToSuppressListTool(userId);
      // Create tool using user's VAPI key
      const toolBaseURL = `${this.VAPI_BASE_URL}/tool`;

      const headers = {
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
      };

      const toolResponseOfBookSlot = await axios.post(
        toolBaseURL,
        generatePayloadForBookingAppointment,
        headers,
      );
      const toolResponseOfCheckSlot = await axios.post(
        toolBaseURL,
        generatePayloadForCheckBookingSlot,
        headers,
      );
      const toolResponseOfAddToSuppressList = (await axios.post(
        toolBaseURL,
        addToSuppressList,
        headers,
      )) as any;

      if (!toolResponseOfBookSlot.data || !toolResponseOfCheckSlot.data) {
        throw new HttpException(
          'Failed to create tool',
          HttpStatus.BAD_REQUEST,
        );
      }

      const toolData1 = {
        toolType: 'function',
        toolName: generatePayloadForBookingAppointment.function.name,
        description: generatePayloadForBookingAppointment.function.description,
        toolData: generatePayloadForBookingAppointment,
        toolId: toolResponseOfBookSlot.data.id,
        function_server_url: toolResponseOfBookSlot?.data?.server?.url || '',
      };

      const toolData2 = {
        toolType: 'function',
        toolName: generatePayloadForCheckBookingSlot.function.name,
        description: generatePayloadForCheckBookingSlot.function.description,
        toolData: generatePayloadForCheckBookingSlot,
        toolId: toolResponseOfCheckSlot.data.id,
        function_server_url: toolResponseOfCheckSlot.data?.server?.url || '',
      };
      const toolData3 = {
        toolType: 'function',
        toolName: addToSuppressList.function.name,
        description: addToSuppressList.function.description,
        toolData: addToSuppressList,
        toolId: toolResponseOfAddToSuppressList.data.id,
        function_server_url:
          toolResponseOfAddToSuppressList.data?.server?.url || '',
      };
      const toolData = [toolData1, toolData2, toolData3];
      return toolData;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.response.data.message || 'Failed to create tool',
        error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateToolForAllUsers() {
    try {
      // Find all users with a verified VAPI key (status: "verified")
      const usersWithVapi = await this.db
        .collection('campaignVoiceServerConfig')
        .find({
          vapiServerAPIkey: { $exists: true, $ne: null },
          status: 'verified',
        })
        .toArray();

      for (const userConfig of usersWithVapi) {
        const { userId, vapiServerAPIkey, vapiToolsData } = userConfig;
        if (!Array.isArray(vapiToolsData)) continue;

        // Prepare new payloads for each tool type
        const bookingPayload = generatePayloadForBookingAppointmentTool(userId);
        const checkSlotPayload = generatePayloadForCheckBookingSlotTool(userId);
        const suppressPayload = addToSuppressListTool(userId);

        // Remove type: 'function' from each payload if present
        if (bookingPayload.type === 'function') {
          delete bookingPayload.type;
        }
        if (checkSlotPayload.type === 'function') {
          delete checkSlotPayload.type;
        }
        if (suppressPayload.type === 'function') {
          delete suppressPayload.type;
        }

        // Map tool names to payloads
        const toolPayloadMap: Record<string, any> = {
          [bookingPayload.function.name]: bookingPayload,
          [checkSlotPayload.function.name]: checkSlotPayload,
          [suppressPayload.function.name]: suppressPayload,
        };
        // Decrypt the VAPI key
        const vapiKey = await CryptoService.decryptPasskey(vapiServerAPIkey);

        for (const toolObj of vapiToolsData) {
          if (!toolObj.toolId || !toolObj.toolName) continue;
          const newToolData = toolPayloadMap[toolObj.toolName];
          if (!newToolData) continue;

          // Call VAPI update tool AP
          const config = {
            method: 'patch',
            url: `${this.VAPI_BASE_URL}/tool/${toolObj.toolId}`,
            headers: {
              Authorization: `Bearer ${vapiKey}`,
              'Content-Type': 'application/json',
            },
            data: newToolData,
          };

          await axios.request(config);
        }
      }
      return { success: true, message: 'Tool updated for all verified users.' };
    } catch (error) {
      this.logger.error('Error updating tool for all users:', error);
      throw new HttpException(
        'Failed to update tool for all users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addPhoneNumber(
    vapiKey: string,
    phoneNumber: string,
    assistantId: string,
  ) {
    try {
      //phone number attached in the assistant
      const payload = {
        provider: 'twilio',
        number: phoneNumber,
        twilioAccountSid: 'twilioAccountSid',
        twilioAuthToken: 'twilioAuthToken',
        assistantId: assistantId, //This is the assistant that will be used for incoming calls to this phone number.
        server: {
          url: '', //where all the data transfer
        },
      };

      const config = {
        method: 'post',
        url: `${this.VAPI_BASE_URL}/phone-number`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      };
      const phoneNumberResponse = await axios.request(config);

      if (!phoneNumberResponse.data) {
        throw new HttpException(
          'Failed to add phone number',
          phoneNumberResponse.status,
        );
      }

      return phoneNumberResponse.data;
    } catch (error) {
      throw new HttpException('Failed to add phone number', error.status);
    }
  }

  async updateAssistant(vapiKey: string, body: IUpdateAssistant) {
    try {
      const { assistantId } = body;
      const payload = await getDefaultAssistant(
        body.toolIds,
        assistantId,
        body,
      );
      const config = {
        method: 'patch',
        url: `${this.VAPI_BASE_URL}/assistant/${assistantId}`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      };
      const vapiResponse = await axios.request(config);

      return vapiResponse.data;
    } catch (error) {
      throw error;
    }
  }

  async addPhoneNumnerInVapi(
    vapiKey: string,
    body: {
      twilioAccountSid: string;
      twilioAuthToken: string;
      phoneNumber: string;
      // VAPI's assistantId on a phone number governs INBOUND call routing only —
      // https://docs.vapi.ai/api-reference/phone-numbers/create. Omit it for
      // outbound-only numbers so inbound calls aren't misrouted to the outbound assistant.
      assistantId?: string;
    },
  ) {
    try {
      const payload: Record<string, any> = {
        provider: 'twilio',
        number: body.phoneNumber,
        twilioAccountSid: body.twilioAccountSid,
        twilioAuthToken: body.twilioAuthToken,
      };
      if (body.assistantId) {
        payload.assistantId = body.assistantId;
      }

      const config = {
        method: 'post',
        url: `${this.VAPI_BASE_URL}/phone-number`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      };
      const vapiResponse = await axios.request(config);

      if (!vapiResponse.data) {
        throw new HttpException(
          'Failed to add phone number',
          vapiResponse.status,
        );
      }

      return vapiResponse.data;
    } catch (error) {
      this.logger.error(
        `VAPI phone-number import failed: ${JSON.stringify(error?.response?.data)}`,
      );
      throw new HttpException(
        error?.response?.data?.message || 'Failed to add Number in VAPI',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // VAPI's Update Phone Number endpoint — https://docs.vapi.ai/api-reference/phone-numbers/update.
  // Used when a Twilio number already imported for one call type (e.g. outbound) is now
  // also being set up for inbound, so the VAPI-side assistantId gets pointed at the inbound assistant.
  async updatePhoneNumberInVapi(
    vapiKey: string,
    phoneNumberId: string,
    updates: { assistantId?: string },
  ) {
    try {
      const config = {
        method: 'patch',
        url: `${this.VAPI_BASE_URL}/phone-number/${phoneNumberId}`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        data: updates,
      };
      const vapiResponse = await axios.request(config);
      return vapiResponse.data;
    } catch (error) {
      throw new HttpException(
        error?.response?.data?.message ||
          'Failed to update phone number in VAPI',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Make bulk call
  async createCallFlow(
    targetAudience: TargetAudienceSchema[],
    campaign: any,
    vapiServerAPIkey: string,
    toolIds: string[],
    phoneNumberId?: string,
    assistantId?: string,
  ) {
    try {
      const {
        _id: campaignId,
        campaignName,
        userId,
        phoneNumbers,
        language,
        voiceCharacter,
        campaignProject,
      } = campaign;
      const voicebotSetting: any = await this.db
        .collection('voicebotsetting')
        .findOne({ userId });

      const customers = targetAudience.map((audience) => ({
        numberE164CheckEnabled: true,
        number: audience.phoneNumber,
        name: 'Name of audience',
      }));
      const result = await this.updateAssistant(vapiServerAPIkey, {
        userId,
        prompt: targetAudience[0].prompt,
        language,
        assistantId: assistantId,
        voiceCharacter,
        campaignName,
        knowledgebaseId: campaignProject.projectId,
        companyName: campaignProject?.projectName,
        waitSeconds: parseInt(
          voicebotSetting?.outBoundSettings?.waitTimeBeforeSpeak,
        ),
        toolIds,
        knowledgeBaseFiles: [campaign?.knowledgebaseDetails?.id].filter(
          Boolean,
        ),
      });
      if (!result) {
        throw new HttpException(
          'Failed to update assistant',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (result) {
        const DEFAULT_ASSISTANT_ID = assistantId;
        const DEFAULT_PHONE_NUMBER_ID = phoneNumberId;

        const VAPI_CONFIG_DATA = {
          customers,
          assistantId: DEFAULT_ASSISTANT_ID.trim(),
          phoneNumberId: DEFAULT_PHONE_NUMBER_ID.trim(),
          metadata: {
            campaignId,
            campaignName,
            userId,
            callerNumber: phoneNumbers[0].phoneNumber,
            knowledgebaseId: campaignProject.projectId, //projectId is used as knowledgebaseId
            targetAudienceId: targetAudience[0]._id.toHexString(),
          },
        };
        const config = {
          method: 'post',
          url: `${this.VAPI_BASE_URL}/call`,
          headers: {
            Authorization: `Bearer ${vapiServerAPIkey}`,
            'Content-Type': 'application/json',
          },
          data: VAPI_CONFIG_DATA,
        };

        const vapiResponse = await axios.request(config);
        if (vapiResponse && vapiResponse.data) {
          await this.updateVapiId(vapiResponse.data);
          return vapiResponse.data;
        } else {
          throw new HttpException(
            'Invalid response from VAPI',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async createCallFlowForWidget(
    userPhoneNumber,
    userId: any,
    vapiServerAPIkey: string,
    toolIds: string[],
    phoneNumberId: string,
    assistantId: string,
    projectData: any,
    adminKnowledgebaseId: string,
    knowledgebaseFileId?: any,
  ) {
    try {
      const { name, services, description } = projectData;
      const voicebotSetting: any = await this.db
        .collection('voicebotsetting')
        .findOne({ userId });

      const customer = {
        numberE164CheckEnabled: true,
        number: userPhoneNumber,
        name: 'Name of audience',
      };

      const prompt = `
[Identity]\n\nYou are a highly professional and well-informed customer support AI agent for {{name}}, a trusted provider of {{description}} specializing in {{services}}.\n\n[Style]\n\n- Communicate in a formal, professional, and courteous tone.\n- Be patient, attentive, and empathetic.\n- Ensure the customer feels heard and valued.\n- Keep responses concise yet clear, especially for voice interactions.\n\n[Response Guidelines]\n\n- Listen carefully and do not interrupt; allow the customer to fully explain their issue before responding.\n- Acknowledge the customer’s concern with empathy before offering solutions.\n- Provide accurate and concise information strictly related to {{name}} products and services.\n- Do NOT make up information. If unsure, respond honestly and offer to connect the customer with a human representative.\n- Keep explanations simple, structured, and easy to understand.\n\n[Task & Goals]\n\n1. Greet the customer politely and professionally.\n2. Allow the customer to explain their concern fully before responding.\n3. Once the issue is understood, acknowledge it empathetically.\n4. Provide clear and accurate support related to:\n   -{{services}}\n5. Offer guidance on next steps, troubleshooting, or escalation if required.\n6. If clarification is needed, politely ask for more details.\n7. If unable to resolve, offer to connect them to a human support representative.\n\n[Scope Restrictions – IMPORTANT]\n\n- ONLY answer questions related to {{name}} and its products or services.\n- If asked about unrelated topics (weather, politics, general knowledge, personal advice, etc.), respond with:\n\n\"I appreciate your question, but I'm specifically here to assist with{{name}} products and services. Is there anything I can help you with regarding our offerings?\"\n\n- Never provide assumptions or information outside your verified knowledge base.\n\n[Error Handling / Fallback]\n\n- If the request is unclear:\n\"I want to make sure I understand your concern correctly. Could you please elaborate?\"\n\n- If the issue requires human support:\n\"This matter may require assistance from one of our specialists. I can connect you with a representative for further support.\"\n\n- If facing technical limitations:\n\"I’m currently unable to access that information. Let me help you connect with our support team for further assistance.\"\n
      `;

      // TODO add fixed to setting
      const webhookUrl = process.env.ADVANCE_VAPI_TALK_TO_ME_WIGHTS;
      const result = await this.updateAssistant(vapiServerAPIkey, {
        userId,
        prompt: prompt, //will write by myself
        language: voicebotSetting?.language || 'en-US',
        assistantId: assistantId,
        voiceCharacter: null,
        knowledgebaseId: projectData?._id.toHexString(), //projectId is used as knowledgebaseId
        companyName: projectData?.name,
        waitSeconds: parseInt(
          voicebotSetting?.outBoundSettings?.waitTimeBeforeSpeak,
        ),
        toolIds,
        knowledgeBaseFiles: knowledgebaseFileId,
        webhookUrl,
      });
      if (!result) {
        throw new HttpException(
          'Failed to update assistant',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (result) {
        const DEFAULT_ASSISTANT_ID = assistantId;
        const DEFAULT_PHONE_NUMBER_ID = phoneNumberId;

        const VAPI_CONFIG_DATA = {
          customer,
          assistantId: DEFAULT_ASSISTANT_ID.trim(),
          phoneNumberId: DEFAULT_PHONE_NUMBER_ID.trim(),
          metadata: {
            userId,
            callerNumber: userPhoneNumber,
            knowledgebaseId: projectData?._id.toHexString(), //projectId is used as knowledgebaseId
          },
        };
        const config = {
          method: 'post',
          url: `${this.VAPI_BASE_URL}/call`,
          headers: {
            Authorization: `Bearer ${vapiServerAPIkey}`,
            'Content-Type': 'application/json',
          },
          data: VAPI_CONFIG_DATA,
        };

        const vapiResponse = await axios.request(config);
        if (vapiResponse && vapiResponse.data) {
          const updateResult = await this.db
            .collection(LEADS_COLLECTION)
            .updateOne(
              {
                knowledgebaseId: new ObjectId(adminKnowledgebaseId),
                userId: userId,
                phone: userPhoneNumber,
              },
              {
                $set: {
                  vapiId: vapiResponse?.data?.id,
                },
              },
            );

          if (updateResult.matchedCount === 0) {
            this.logger.warn(
              'No lead found matching the criteria for vapiId update',
            );
          }
          return vapiResponse.data;
        } else {
          throw new HttpException(
            'Invalid response from VAPI',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async createCallFlowForCallBackRequest(
    userPhoneNumber,
    userId: any,
    vapiServerAPIkey: string,
    phoneNumberId: string,
    assistantId: string,
    adminKnowledgebaseId: string,
  ) {
    try {
      const customer = {
        numberE164CheckEnabled: true,
        number: userPhoneNumber,
        name: 'Name of audience',
      };

      const VAPI_CONFIG_DATA = {
        customer,
        assistantId: assistantId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        metadata: {
          userId,
          callerNumber: userPhoneNumber,
          knowledgebaseId: adminKnowledgebaseId,
        },
      };
      const config = {
        method: 'post',
        url: `${this.VAPI_BASE_URL}/call`,
        headers: {
          Authorization: `Bearer ${vapiServerAPIkey}`,
          'Content-Type': 'application/json',
        },
        data: VAPI_CONFIG_DATA,
      };

      const vapiResponse = await axios.request(config);
      if (vapiResponse && vapiResponse.data) {
        const updateResult = await this.db
          .collection(LEADS_COLLECTION)
          .updateOne(
            {
              knowledgebaseId: new ObjectId(adminKnowledgebaseId),
              userId: userId,
              phone: userPhoneNumber,
            },
            {
              $set: {
                vapiId: vapiResponse?.data?.id,
              },
            },
          );

        if (updateResult.matchedCount === 0) {
          this.logger.warn('No lead found matching the criteria for vapiId update');
        }
        return vapiResponse.data;
      } else {
        throw new HttpException(
          'Invalid response from VAPI',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      const message = error?.response?.data?.message;
      throw new BadRequestException(message || 'Something went wrong');
    }
  }

  async startCallToAudience(campaignId?: string) {
    try {
      let allCampaign = [] as any;
      if (!campaignId) {
        //exclude those campaigns which scheduled for the future
        allCampaign = await this.voiceBotCampaignSchema
          .find({
            status: {
              $nin: [
                CampaignStatus.Completed,
                CampaignStatus.Failed,
                CampaignStatus.Paused,
                CampaignStatus.Scheduled,
              ],
            },
            $or: [
              { scheduledAt: null },
              {
                scheduledAt: {
                  $exists: true,
                  $ne: null,
                  $lte: new Date(),
                },
              },
            ],
          })
          .toArray();
      } else {
        allCampaign = await this.voiceBotCampaignSchema
          .find({
            _id: new ObjectId(campaignId),
            $or: [
              { status: CampaignStatus.Scheduled },
              { status: CampaignStatus.Running },
            ],
          })
          .toArray();
      }

      for (const campaign of allCampaign) {
        const { userId, _id: campaignId, maxPerDayCall } = campaign;
        try {
          const targetAudience = await this.targetAudienceSchema
            .find({
              userId,
              campaignId: campaignId.toHexString(),
              callCompleted: false,
              // status: CrwalStatus.CRAWLED,
            })
            .toArray();

          if (targetAudience.length > 0) {
            const campaignVoiceServerConfig: any = await this.db
              .collection('campaignVoiceServerConfig')
              .findOne({ userId });
            const toolIds = campaignVoiceServerConfig.vapiToolsData.map(
              (tool) => tool.toolId,
            );
            const vapi_key = await CryptoService.decryptPasskey(
              campaignVoiceServerConfig.vapiServerAPIkey,
            );

            // Step 1: Limit the targetAudience to maxPerDayCall
            const limitedAudience = targetAudience.slice(0, maxPerDayCall);

            let audienceIndex = 0;

            for (const phone of campaign.phoneNumbers) {
              const {
                maxLimit: maxLimitCount,
                phoneNumber,
                assistantId,
                phoneNumberId,
              } = phone;

              // If already assigned enough audience, break
              if (audienceIndex >= limitedAudience.length) break;

              // Get the next chunk based on phone's max limit
              const chunk = limitedAudience.slice(
                audienceIndex,
                audienceIndex + maxLimitCount,
              );

              if (chunk.length === 0) break;

              // Optional: Add phone details to each audience (if needed)
              const enrichedAudience = chunk.map((aud) => ({
                ...aud,
                assignedPhoneNumber: phoneNumber,
                assistantId,
                phoneNumberId,
              }));

              // Call the voice assistant flow for this chunk
              // Sent one audience at a time
              for (const singleAudience of enrichedAudience) {
                await this.createCallFlow(
                  [singleAudience],
                  campaign,
                  vapi_key,
                  toolIds,
                  phoneNumberId,
                  assistantId,
                );
              }

              // await this.voiceBotCampaignSchema.updateOne(
              //   { _id: campaignId },
              //   {
              //     $inc: { totalCalls: chunk.length },
              //     $set: { updatedAt: new Date() },
              //   },
              // );
              await this.voiceBotCampaignSchema.updateOne(
                { _id: campaignId },
                {
                  $set: {
                    status: CampaignStatus.Running,
                    updatedAt: new Date(),
                  },
                },
              );
              // Move pointer
              audienceIndex += chunk.length;
            }
          }
        } catch (error) {

          const rawReason =
            error?.response?.data?.message ??
            'An error occurred while starting the call to audience.';

          let reason: string;

          if (typeof rawReason === 'string') {
            if (rawReason.includes('Your Wallet Balance')) {
              reason =
                'Campaign failed due to insufficient VAPI wallet balance. Please purchase more credits or upgrade your plan before proceeding.';
            } else if (rawReason.includes('Assistant not found')) {
              reason =
                'Campaign failed due to an invalid or missing assistant. Please ensure the assistant is created and configured correctly.';
            } else if (
              /phoneNumber.*does not exist/i.test(rawReason) ||
              rawReason.includes(
                'Failed to create calls for the following customers',
              )
            ) {
              reason =
                'Campaign failed because the configured phone number (phoneNumberId) does not exist in your VAPI account. Please verify the phone number settings and try again.';
            } else if (Array.isArray(rawReason)) {
              const e164Msg = rawReason.find((msg: string) =>
                msg.includes('E.164'),
              );
              if (e164Msg) {
                reason = `Campaign failed due to invalid phone number format.`;
              } else {
                reason = JSON.stringify(rawReason);
              }
            } else {
              reason = rawReason;
            }
          } else {
            reason = JSON.stringify(rawReason);
          }

          if (!reason) {
            reason = 'Campaign failed due to an unknown error.';
          }

          await this.voiceBotCampaignSchema.updateOne(
            { _id: campaignId },
            {
              $set: {
                status: CampaignStatus.Failed,
                failedReason: reason,
                updatedAt: new Date(),
              },
            },
          );
          continue;
        }
      }
    } catch (error) {
    }
  }

  // VAPI web hook
  async vapiWebHook(
    message: any,
    userID: string,
    inboundBotId?: string | null,
  ) {
    try {
      const type = message.type;
      switch (type) {
        case 'status-update': {
          if (message.call.type === 'inboundPhoneCall') {
            return;
          }

          const { endedReason, call } = message;
          const { metadata } = call;
          const campaignId = metadata?.campaignId || 'NA';
          const userId = metadata?.userId || 'NA';
          const targetAudienceId = metadata?.targetAudienceId || 'NA';

          if (
            endedReason &&
            ['customer-did-not-answer', 'customer-busy'].includes(endedReason)
          ) {
            // Update audience data
            const audienceData =
              await this.targetAudienceSchema.findOneAndUpdate(
                { _id: new ObjectId(targetAudienceId) },
                { $set: { callEndedReason: endedReason } },
                { returnDocument: 'after' },
              );

            if (campaignId) {
              await this.voiceBotCampaignSchema.findOneAndUpdate(
                { _id: new ObjectId(campaignId) },
                {
                  $inc: { failedCalls: 1 },
                  $set: { updatedAt: new Date() },
                },
              );
            }

            // Insert call recording
            await this.campaignRecordingsSchema.insertOne({
              vapiId: call.id,
              userId,
              status: message.status,
              campaignName: metadata?.campaignName || 'NA',
              campaignId,
              botNumber: message.phoneNumber.number,
              phoneNumber: call.customer.number,
              callType:
                call.type === 'outboundPhoneCall'
                  ? CallType.Outgoing
                  : CallType.Incoming,
              callDuration: 'N/A',
              recordingUrl: 'N/A',
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            this.updateCallDetails(message);

            const retryCount = audienceData.value.retryCount;

            if (retryCount <= 2) {
              const campaignData = await this.voiceBotCampaignSchema.findOne({
                _id: new ObjectId(campaignId),
              });

              const timezoneDoc = await this.db
                .collection('calenderSettings')
                .findOne({
                  knowledgebaseId: new ObjectId(metadata.knowledgebaseId),
                });
              const timezone = timezoneDoc?.timezone || 'Asia/Kolkata';

              const voicebotSettings = await this.db
                .collection('voicebotsetting')
                .findOne({ userId }, { projection: { followUpSetting: 1 } });

              const { lunchHour, workDaysAndHours, reminderIntervals } =
                voicebotSettings.followUpSetting;
              const retryDelay = reminderIntervals[retryCount];
              const isDayBased = retryDelay.type === 'days';

              const retryMoment = await this.getNextRetryMoment(
                new Date(campaignData.scheduledAt || campaignData.createdAt),
                timezone,
                workDaysAndHours,
                lunchHour,
                retryDelay.type,
                retryDelay.amount,
                isDayBased ? retryDelay.startTime : undefined,
                isDayBased ? retryDelay.endTime : undefined,
              );

              await this.bullMqService.scheduleJob({
                campaignId,
                scheduledDateAndTime: retryMoment.utc().toDate(),
                targetAudienceId,
                userId,
                IsCampaignScheduledFor: 'voicebot-call-follow-up',
                adminTimezone: timezone,
              });
            } else if (retryCount === 3) {
              const { value: audience } = audienceData;
              const userData = await this.db
                .collection('users')
                .findOne(
                  { _id: new ObjectId(userID) },
                  { projection: { email: 1 } },
                );

              if (!audience.isFollowUpEmailSent && audience.email) {
                const campaignData = await this.voiceBotCampaignSchema.findOne({
                  _id: new ObjectId(campaignId),
                });
                //split the campaignData.campaignProject?.projectName
                const [projectName] =
                  campaignData.campaignProject?.projectName.split('.');
                const { data } = await this.generateEmailForLead(
                  campaignData.painPointSolution as any,
                  userID,
                  audience.audienceCompanyName,
                  projectName || campaignData.campaignProject?.projectName,
                );
                await this.insertVoicebotEmailConversation({
                  email: data.email,
                  subject: data.subject,
                  userId: userID,
                  adminEmail: userData.email,
                  campaignId,
                  audienceEmail: audience.email,
                });

                await this.emailService.sendEmailToCallerRegardingCampaign(
                  audience.email,
                  data.email,
                  data.subject,
                  userData.email,
                  userID,
                );

                await this.targetAudienceSchema.findOneAndUpdate(
                  { _id: new ObjectId(targetAudienceId) },
                  { $set: { isFollowUpEmailSent: true } },
                );
              } else if (!audience.isFollowUpEmailSent && !audience.email) {
                await this.emailService.sendEmailToCampaignOwner(
                  audience.phoneNumber as any,
                  userData.email,
                  userID,
                );
              }
            }
          }

          if (message.status === 'in-progress') {
            await this.voiceBotCampaignSchema.findOneAndUpdate(
              {
                _id: new ObjectId(metadata?.campaignId),
                userId: metadata.userId,
              },
              { $set: { status: CampaignStatus.Running } },
            );
          }
          break;
        }

        case 'end-of-call-report': {
          const { call } = message;
          const isOutbound = call.type === 'outboundPhoneCall';
          const inbound = call.type === 'inboundPhoneCall';

          const callReport = {
            vapiId: call.id,
            status: call.status,
            campaignId: isOutbound ? call?.metadata?.campaignId : 'N/A',
            userId: isOutbound ? call?.metadata?.userId : userID,
            campaignName: isOutbound ? call?.metadata?.campaignName : 'NA',
            phoneNumber: message?.customer?.number,
            botNumber: message?.phoneNumber?.number,
            callType: isOutbound ? CallType.Outgoing : CallType.Incoming,
            callSummery: message?.summary || 'N/A',
            callDuration: message.durationSeconds
              ? `${Math.floor(message.durationSeconds / 60)} min: ${(
                  message.durationSeconds % 60
                ).toFixed(0)} sec`
              : null,
            recordingUrl: message.artifact?.recordingUrl || 'N/A',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          let recordingDetails: any = null;

          if (isOutbound) {
            recordingDetails = await this.campaignRecordingsSchema.insertOne(
              callReport,
            );
            await this.targetAudienceSchema.updateOne(
              {
                vapiId: callReport.vapiId,
              },
              { $set: { callCompleted: true } },
            );
            // Deduct credits for outbound call
            await this.userService.consumeCredits(
              new ObjectId(userID),
              'OUTBOUND_CALLS',
              false,
              message.durationSeconds,
            );
          } else if (inbound) {
            recordingDetails = await this.db
              .collection(INBOUND_BOT_LEADS_RECORDING_SCHEMA)
              .insertOne({
                inboundBotId: new ObjectId(inboundBotId),
                callDuration: callReport.callDuration,
                recordingUrl: callReport.recordingUrl,
                vapiId: callReport.vapiId,
                createdAt: new Date(),
                updatedAt: new Date(),
                IsLeadType: IsLeadType.voiceBot,
                botNumber: callReport.botNumber,
                phoneNumber: callReport.phoneNumber,
                userId: new ObjectId(userID),
                callType: callReport.callType,
                status: 'Success',
              });

            // Deduct credits for outbound call
            await this.userService.consumeCredits(
              new ObjectId(userID),
              'INBOUND_CALLS',
              false,
              message.durationSeconds,
            );
          }

          const leads = await this.db
            .collection(LEADS_COLLECTION)
            .find({
              phone: call.customer.number,
              userId: userID,
              IsLeadType: IsLeadType.voiceBot,
            })
            .sort({ updatedAt: -1 })
            .toArray();

          if (leads.length > 0) {
            await this.db.collection(LEADS_COLLECTION).updateOne(
              { _id: leads[0]._id },
              {
                $set: {
                  voiceBotRecordingId: recordingDetails.insertedId,
                  voiceBotRecordingURL: message.artifact?.recordingUrl,
                  IsLeadType: IsLeadType.voiceBot,
                  callSummery: message?.summary || 'N/A',
                },
              },
            );
          }

          // Sending email to admin if a meeting is scheduled
          const calendarData = await this.db
            .collection(GOOGLECALENDER_COLLECTION)
            .findOne({
              knowledgebaseId: new ObjectId(
                message?.call?.metadata?.knowledgebaseId ||
                  message?.assistant?.server?.headers?.knowledgebaseId,
              ),
            });

          // Find if any meeting is scheduled for this call
          const googleCalenderData = await this.db
            .collection(GOOGLE_CALENDER_MEETING)
            .findOne({
              userId: call?.metadata?.userId ?? userID,
              campaignId: call?.metadata?.campaignId,
              targetAudienceId: call?.metadata?.targetAudienceId,
            });

          // Get latest lead created and send email to admin
          if (googleCalenderData) {
            // Get the latest lead created after the call (not updated)
            const { startTime, endTime, isMeetingBookedOnGoogleMeet } =
              googleCalenderData;

            const latestLead = await this.db
              .collection(LEADS_COLLECTION)
              .find({
                phone: call.customer.number,
                userId: userID,
                IsLeadType: IsLeadType.voiceBot,
                createdAt: {
                  $gte: new Date(
                    call.createdAt ||
                      call.startTime ||
                      Date.now() - 1000 * 60 * 10,
                  ),
                },
              })
              .sort({ createdAt: -1 })
              .limit(1)
              .toArray();

            if (latestLead.length > 0) {
              const lead = latestLead[0];
              try {
                await this.emailService.sendPotentialLeadMailToAdmin(
                  calendarData?.email,
                  lead.email,
                  lead.name,
                  lead.phone,
                  lead.address,
                  callReport.callSummery,
                  true,
                  {
                    startTime,
                    endTime,
                    isMeetingBookedOnGoogleMeet,
                  },
                  lead?.customQuestions,
                  userID,
                );
              } catch (error) {
              }

              const campaignId = call?.metadata?.campaignId;
              if (campaignId) {
                const campaignData = await this.db
                  .collection(VOICE_BOT_CAMPAIGN_SCHEMA)
                  .findOne({ _id: new ObjectId(campaignId) });
                if (campaignData?.emailToTeam) {
                  try {
                    await this.emailService.sendPotentialLeadMailToAdmin(
                      campaignData?.emailToTeam,
                      lead.email,
                      lead.name,
                      lead.phone,
                      lead.address,
                      callReport.callSummery,
                      false,
                      {
                        startTime,
                        endTime,
                        isMeetingBookedOnGoogleMeet,
                      },
                      lead?.customQuestions,
                      userID,
                    );
                  } catch (error) {
                  }
                }
              }
            }
          }

          if (isOutbound) {
            this.updateCallDetails(message);
          }
          break;
        }

        case 'hang':
        case 'voicemail':
          break;

        default:
          this.logger.warn('Unhandled Webhook Event:', type);
          break;
      }

      return ResponseUtil.success(HttpStatus.OK);
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Error in VAPI Webhook',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateCallStatus(status: string, userId: string) {
    try {
      await this.voiceBotDashboardSchema.findOneAndUpdate(
        { userId },
        {
          $inc: { [`callByStatus.${status}`]: 1 },
          $set: { updatedAt: new Date() },
        },
      );
    } catch (error) {
      this.logger.error('Error updating call status:', error);
    }
  }

  // Update the call details
  async updateCallDetails(message: any) {
    try {
      const filter = {
        _id: new ObjectId(message.call.metadata.campaignId),
        userId: message.call.metadata.userId,
      };

      const campaignDetails: VoiceBotCampaignSchema =
        await this.voiceBotCampaignSchema.findOne(filter);

      if (campaignDetails?.status === CampaignStatus.Failed) {
        return;
      }

      await this.voiceBotCampaignSchema.findOneAndUpdate(filter, {
        $set: { status: CampaignStatus.Running },
      });

      const completedCalls = await this.targetAudienceSchema.countDocuments({
        campaignId: message.call.metadata.campaignId,
        callCompleted: true,
      });

      if (completedCalls === campaignDetails.totalAudience) {
        await this.voiceBotCampaignSchema.findOneAndUpdate(filter, {
          $set: { status: CampaignStatus.Completed },
        });
        Logger.log('Campaign completed successfully.');
      }
    } catch (error) {
    }
  }

  // Will update vapi id in recording collection later on will fetch or get the data
  async updateVapiId(vapiResponse: any): Promise<void> {
    try {
      if (!vapiResponse.results || !Array.isArray(vapiResponse.results)) {
        throw new Error('Invalid vapiResponse format');
      }

      for (const result of vapiResponse.results) {
        const { id: vapiId, metadata, customer } = result;
        const phoneNumber = customer?.number;
        const campaignId = metadata?.campaignId;
        const callerNumber = metadata?.callerNumber;

        if (!campaignId || !phoneNumber) continue;

        await this.targetAudienceSchema.updateOne(
          { campaignId, phoneNumber },
          { $set: { vapiId, callerNumber } },
        );
      }
    } catch (error) {
      this.logger.error('🚀 ~ VapiService ~ updateVapiId ~ error:', error);
    }
  }

  async meetingAssistantReminder(userId: string) {
    const serverConfigData = await this.db
      .collection('campaignVoiceServerConfig')
      .findOne({ userId: userId });
    const decrepetedVapiKey = await CryptoService.decryptPasskey(
      serverConfigData.vapiServerAPIkey,
    );

    const reminderAssistantPayload = {
      name: 'Meeting-Reminder-Assistant',
      voice: {
        voiceId: 'Elliot',
        provider: 'vapi',
      },

      model: {
        model: GPTModels.GPT_5_MINI,
        messages: [
          {
            role: 'system',
            content:
              "[Identity]  \nYou are a personalized meeting reminder assistant tasked with crafting clear and concise reminders for users.  \n\n[Style]  \n- Maintain a friendly and professional tone.  \n- Keep the language concise and engaging.  \n\n[Response Guidelines]  \n- Limit the reminder to 3-4 sentences.  \n- Use <reminder> tags to encapsulate the message.  \n\n[Task & Goals]  \n1. Begin with a friendly greeting using the user's name from {{USER_NAME}}.\n2. Clearly state the purpose of the reminder—informing the user about the scheduled meeting.\n3. Incorporate details from {{MEETING_DETAILS}} including date, time, location, and any special instructions.\n4. Highlight the importance or benefits of attending the meeting, if applicable.\n5. Conclude with a positive and encouraging closing statement.\n\n[Error Handling / Fallback]  \n- If meeting details are unclear or incomplete, prompt for clarification by seeking additional information or confirm with fallback options.",
          },
        ],
        provider: 'openai',
        temperature: 0.5,
      },
      firstMessage: 'Hello.',
      voicemailMessage: "Please call back when you're available.",
      endCallMessage: 'Have a great day.',
      transcriber: {
        model: 'nova-3',
        language: 'en',
        provider: 'deepgram',
        endpointing: 300,
      },
      clientMessages: [
        'transcript',
        'hang',
        'function-call',
        'speech-update',
        'metadata',
        'transfer-update',
        'conversation-update',
        'workflow.node.started',
      ],
      serverMessages: [
        'end-of-call-report',
        'status-update',
        'hang',
        'function-call',
      ],
      hipaaEnabled: false,
      backchannelingEnabled: false,
      backgroundDenoisingEnabled: false,
      startSpeakingPlan: {
        waitSeconds: 0.4,
        smartEndpointingEnabled: 'livekit',
      },
    };

    const config = {
      method: 'post',
      url: `${this.VAPI_BASE_URL}/assistant`,
      headers: {
        Authorization: `Bearer ${decrepetedVapiKey}`,
        'Content-Type': 'application/json',
      },
      data: reminderAssistantPayload,
    };

    const assistantResponse = await axios.request(config);

    if (!assistantResponse.data) {
      throw new HttpException(
        'Failed to create assistant: No response from VAPI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return assistantResponse.data.id;
  }

  async checkVoiceReminderSetting(
    userId: string,
    email: string,
    name: string,
    meetDate: Date,
  ) {
    try {
      const result = await this.db
        .collection('voicebotsetting')
        .findOne({ userId });

      if (!result) {
        this.logger.warn(`No voicebot setting found for userId: ${userId}`);
        return false;
      }

      return result as any;
    } catch (error) {
      throw new HttpException(
        'Error checking voice reminder settings',
        error.statusCode || 500,
      );
    }
  }

  // async sendVoiceReminderCall(userId:string,email: string, name: string, meetDate: Date, userPhoneNumber:any) {
  //   try {

  //     const date = new Date(meetDate).toISOString().split('T')[0];
  //     const time = new Date(meetDate).toISOString().split('T')[1];
  //     const result = await this.db
  //       .collection('voicebotsetting')
  //       .findOne({ userId: userId });
  //     // const assistantId = result?.assistantId;
  //     const supportEmailId = result?.email;

  //     const phoneNumberData = await this.db.collection('twiliophonenumberlist').findOne({ userId: userId });
  //     const phoneNumberId = phoneNumberData?.phoneNumberId;

  //     const vapiServerConfigData = await this.db.collection('campaignVoiceServerConfig').findOne({ userId: userId });
  //     const vapiServerAPIkey = await CryptoService.decryptPasskey(vapiServerConfigData.vapiServerAPIkey);

  //     if (result) {
  //         // Call the Vapi Assistant API to send the reminder

  //       const VAPI_CONFIG_DATA = {
  //         customer:{
  //           numberE164CheckEnabled: true,
  //           number: userPhoneNumber,
  //           name: 'Name of audience',
  //         },
  //         assistant: {

  //             "name": "Meeting Reminder Assistant",
  //             "voice": {
  //                 "voiceId": "Elliot",
  //                 "provider": "vapi"
  //             },

  //             "model": {
  //                 "model": "gpt-4o",
  //                 "messages": [
  //                     {
  //                         "role": "system",
  //                         "content": `[Identity]  \nYou are VANI, a smart, polite, and professional AI assistant that calls users to remind them about their upcoming meetings.\n\n[Purpose]  \nYour goal is to speak clearly and naturally while informing users about their scheduled meeting. You help ensure they are aware, prepared, and feel supported.\n\n[Style]  \n- Friendly, professional, and human-like tone.  \n- Speak naturally and clearly, as if on a phone call.  \n- Keep the conversation concise and polite.  \n- Use slight pauses (e.g., "..." or commas) for a more natural speech rhythm.\n\n[Response Guidelines]  \n1. Begin with a greeting and introduction: "Hello, I am VANI speaking..."  \n2. Use the user's name: "Hi ${name}..."  \n3. Clearly state that the purpose of the call is to remind them about their scheduled meeting.  \n4. Share important details:  \n   - Date → ${date}  \n   - Time → ${time}  \n5. Briefly mention the purpose is to give you some input as per your business needs.  \n6. Add: "If you have any queries, please email us at ${supportEmailId}"  \n7. End on a positive note: thank them and express looking forward to their presence.\n\n[Sample Output]  \n"Hello, I am VANI speaking. Hi ${name}, this call is regarding your upcoming meeting scheduled on ${date} at ${time}. If you have any queries, please email us at ${supportEmailId}. We look forward to your presence. Thank you!"\n\n[Error Handling / Fallback]  \n- If meeting details are missing or unclear, respond with:  \n  "I'm calling to remind you about an upcoming meeting, but I couldn't find complete details. Please contact our support team or check your email for more information."`;
  //                     }
  //                 ],
  //                 "provider": "openai",
  //                 "temperature": 0.5
  //             },
  //             "firstMessage": "Hello.",
  //             "voicemailMessage": "Please call back when you're available.",
  //             "endCallMessage": "Goodbye.",
  //             "endCallFunctionEnabled": true,
  //             "transcriber": {
  //                 "model": "nova-3",
  //                 "language": "en",
  //                 "provider": "deepgram",
  //                 "endpointing": 300
  //             },
  //             "clientMessages": [
  //                 "transcript",
  //                 "hang",
  //                 "function-call",
  //                 "speech-update",
  //                 "metadata",
  //                 "transfer-update",
  //                 "conversation-update",
  //                 "workflow.node.started"
  //             ],
  //             "serverMessages": [
  //                 "end-of-call-report",
  //                 "status-update",
  //                 "hang",
  //                 "function-call"
  //             ],
  //             "hipaaEnabled": false,
  //             "backchannelingEnabled": false,
  //             "backgroundDenoisingEnabled": false,
  //             "startSpeakingPlan": {
  //                 "waitSeconds": 0.3,
  //                 "smartEndpointingEnabled": "livekit"
  //             }
  //         },
  //         phoneNumberId: phoneNumberId.trim(),
  //         metadata: { userId },
  //       };
  //       const config = {
  //         method: 'post',
  //         url: `${this.VAPI_BASE_URL}/call`,
  //         headers: {
  //           Authorization: `Bearer ${vapiServerAPIkey}`,
  //           'Content-Type': 'application/json',
  //         },
  //         data: VAPI_CONFIG_DATA,
  //       };

  //       const vapiResponse = await axios.request(config);
  //       //save somewhere as reminder data
  //       console.log(vapiResponse.data);
  //       }

  //   } catch (error) {
  //     throw new HttpException(
  //       'Error checking voice reminder settings',
  //       error.statusCode || 500,
  //     );
  //   }
  // }

  async sendVoiceReminderCall(
    userId: string,
    email: string,
    name: string,
    meetDate: Date,
    userPhoneNumber: string,
  ) {
    try {
      // Convert to IST for natural speech
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };

      const updatedDate = new Date(meetDate);
      const date = new Intl.DateTimeFormat('en-IN', options).format(
        updatedDate,
      );
      const time = new Intl.DateTimeFormat('en-IN', timeOptions).format(
        updatedDate,
      );

      const result = await this.db
        .collection('voicebotsetting')
        .findOne({ userId });
      if (!result) {
        this.logger.warn(`No voicebot setting found for userId: ${userId}`);
        return;
      }

      const supportEmailId = result.email || 'admin@example.com';

      const phoneNumberData = await this.db
        .collection('twiliophonenumberlist')
        .findOne({ userId, status: 'Yes' });

      const phoneNumberId = phoneNumberData?.phoneNumberId?.trim();
      if (!phoneNumberId) {
        throw new Error('Twilio phone number ID not found or invalid');
      }

      const vapiServerConfigData = await this.db
        .collection('campaignVoiceServerConfig')
        .findOne({ userId });

      const vapiServerAPIkey = await CryptoService.decryptPasskey(
        vapiServerConfigData?.vapiServerAPIkey,
      );

      const promptTemplate = `[Identity]  
  You are VANI, a smart, polite, and professional AI assistant that calls users to remind them about their upcoming meetings.
  
  [Purpose]  
  Your goal is to speak clearly and naturally while informing users about their scheduled meeting. You help ensure they are aware, prepared, and feel supported.
  
  [Style]  
  - Friendly, professional, and human-like tone.  
  - Speak naturally and clearly, as if on a phone call.  
  - Keep the conversation concise and polite.  
  - Use slight pauses (e.g., "..." or commas) for a more natural speech rhythm.
  
  [Response Guidelines]  
  1. Begin with a greeting and introduction: "Hello, I am VANI speaking..."  
  2. Use the user's name: "Hi ${name}..."  
  3. Clearly state that the purpose of the call is to remind them about their scheduled meeting.  
  4. Share important details:  
     - Date → ${date}  
     - Time → ${time}  
  5. Briefly mention the purpose is to give you some input as per your business needs.  
  6. Add: "If you have any queries, please email us at ${supportEmailId}"  
  7. End on a positive note: thank them and express looking forward to their presence.
  
  [Sample Output]  
  "Hello, I am VANI speaking. Hi ${name}, this call is regarding your upcoming meeting scheduled on ${date} at ${time}. If you have any queries, please email us at ${supportEmailId}. We look forward to your presence. Thank you!"
  
  [Error Handling / Fallback]  
  - If meeting details are missing or unclear, respond with:  
    "I'm calling to remind you about an upcoming meeting, but I couldn't find complete details. Please contact our support team or check your email for more information."`;

      const VAPI_CONFIG_DATA = {
        customer: {
          numberE164CheckEnabled: true,
          number: userPhoneNumber,
          name: name || 'Guest',
        },
        assistant: {
          name: 'Meeting Reminder Assistant',
          voice: {
            voiceId: 'Elliot',
            provider: 'vapi',
          },
          model: {
            model: GPTModels.GPT_5_MINI,
            provider: 'openai',
            temperature: 0.5,
            messages: [
              {
                role: 'system',
                content: promptTemplate,
              },
            ],
          },
          firstMessage: 'Hello.',
          voicemailMessage: "Please call back when you're available.",
          endCallMessage: 'Goodbye.',
          endCallFunctionEnabled: true,
          transcriber: {
            model: 'nova-3',
            language: 'en',
            provider: 'deepgram',
            endpointing: 300,
          },
          clientMessages: [
            'transcript',
            'hang',
            'function-call',
            'speech-update',
            'metadata',
            'transfer-update',
            'conversation-update',
            'workflow.node.started',
          ],
          serverMessages: [
            'end-of-call-report',
            'status-update',
            'hang',
            'function-call',
          ],
          hipaaEnabled: false,
          backchannelingEnabled: false,
          backgroundDenoisingEnabled: false,
          startSpeakingPlan: {
            waitSeconds: 0.4,
            smartEndpointingEnabled: 'livekit',
          },
          stopSpeakingPlan: {
            numWords: 0,
            voiceSeconds: 0.2,
            backoffSeconds: 1,
            acknowledgementPhrases: [
              'i understand',
              'i see',
              'i got it',
              'i hear you',
              'im listening',
              'im with you',
              'right',
              'okay',
              'ok',
              'sure',
              'alright',
              'got it',
              'understood',
              'yeah',
              'yes',
              'uh-huh',
              'mm-hmm',
              'gotcha',
              'mhmm',
              'ah',
              'yeah okay',
              'yeah sure',
            ],
            interruptionPhrases: [
              'stop',
              'shut',
              'up',
              'enough',
              'quiet',
              'silence',
              'but',
              'dont',
              'not',
              'no',
              'hold',
              'wait',
              'cut',
              'pause',
              'nope',
              'nah',
              'nevermind',
              'never',
              'bad',
              'actually',
            ],
          },
        },
        phoneNumberId,
        metadata: { userId },
      };

      const config = {
        method: 'post',
        url: `${this.VAPI_BASE_URL}/call`,
        headers: {
          Authorization: `Bearer ${vapiServerAPIkey}`,
          'Content-Type': 'application/json',
        },
        data: VAPI_CONFIG_DATA,
      };

      const vapiResponse = await axios.request(config);
    } catch (error) {
      this.logger.log('❌ Failed to send voice reminder call:', error);
      throw new HttpException(
        'Error sending voice reminder call',
        error.statusCode || 500,
      );
    }
  }

  async deletePhoneNumberFromVapi(vapiKey: string, phoneNumberId: string) {
    try {
      const config = {
        method: 'delete',
        url: `${this.VAPI_BASE_URL}/phone-number/${phoneNumberId}`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
      };
      const response = await axios.request(config);
      if (response.status !== 200) {
        throw new HttpException(
          'Failed to delete phone number from VAPI',
          response.status,
        );
      }
      this.logger.log('Phone number deleted successfully from VAPI');
      return { message: 'Phone number deleted successfully from VAPI' };
    } catch (error) {
      if (error.status === 404 || error.response?.status === 404) {
        this.logger.warn(
          `Phone number not found in VAPI (already deleted?): ${phoneNumberId}`,
        );
        return { message: 'Phone number not found in VAPI, no action needed' };
      }

      this.logger.error(
        'Error deleting phone number from VAPI:',
        error.response?.data.message || error.message,
      );
      throw new HttpException(
        error.response?.data.message ||
          'Failed to delete phone number from VAPI',
        error.status,
      );
    }
  }

  async startCallToFollowUp(data: any) {
    try {
      const { campaignId, targetAudienceId, userId } = data;

      const campaignData = await this.voiceBotCampaignSchema.findOne({
        _id: new ObjectId(campaignId),
      });

      const targetAudience = await this.targetAudienceSchema.findOne({
        _id: new ObjectId(targetAudienceId),
        userId,
        campaignId: campaignId,
      });

      const campaignVoiceServerConfig: any = await this.db
        .collection('campaignVoiceServerConfig')
        .findOne({ userId });

      const toolIds = campaignVoiceServerConfig.vapiToolsData.map(
        (tool) => tool.toolId,
      );
      const vapi_key = await CryptoService.decryptPasskey(
        campaignVoiceServerConfig.vapiServerAPIkey,
      );

      await this.createCallFlow(
        [targetAudience],
        campaignData,
        vapi_key,
        toolIds,
      );

      //increment the retry count
      await this.targetAudienceSchema.findOneAndUpdate(
        { _id: new ObjectId(targetAudienceId) },
        { $inc: { retryCount: 1 } },
      );
    } catch (error) {
      this.logger.error(
        error?.response?.data?.message || 'Error in startCallToFollowUp:',
        error.response?.data?.statusCode || 400,
      );
    }
  }

  async getNextRetryMoment(
    baseTime,
    timezone,
    workDaysAndHours,
    lunchHour,
    offsetType = 'hours' as any,
    offsetAmount = 4,
    intervalStartTime?: string,
    intervalEndTime?: string,
  ) {
    try {
      let retryMoment = moment
        .tz(baseTime, timezone)
        .add(offsetAmount, offsetType);

      const getTimeMoment = (baseDate, timeStr) =>
        moment.tz(`${baseDate} ${timeStr}`, 'YYYY-MM-DD HH:mm', timezone);

      while (true) {
        const dayName = retryMoment.format('dddd');
        const workDay = workDaysAndHours.find((d) => d.day === dayName);

        if (!workDay) {
          retryMoment = retryMoment.add(1, 'day').startOf('day');
          continue;
        }

        const dateStr = retryMoment.format('YYYY-MM-DD');
        const workStart = getTimeMoment(dateStr, workDay.startTime);
        const workEnd = getTimeMoment(dateStr, workDay.endTime);
        const lunchStart = getTimeMoment(dateStr, lunchHour.start);
        const lunchEnd = getTimeMoment(dateStr, lunchHour.end);
        const lunchEndPlusBuffer = lunchEnd.clone().add(15, 'minutes');

        const intervalStart = intervalStartTime?.trim()
          ? getTimeMoment(dateStr, intervalStartTime)
          : workStart;

        const intervalEnd = intervalEndTime?.trim()
          ? getTimeMoment(dateStr, intervalEndTime)
          : workEnd;

        // Retry time before working hours
        if (retryMoment.isBefore(workStart)) {
          retryMoment = workStart;
          continue;
        }

        // Retry time after working hours
        if (retryMoment.isSameOrAfter(workEnd)) {
          retryMoment = retryMoment.add(1, 'day').startOf('day');
          continue;
        }

        // Retry during lunch break
        if (
          retryMoment.isSameOrAfter(lunchStart) &&
          retryMoment.isBefore(lunchEnd)
        ) {
          retryMoment = lunchEndPlusBuffer;
          continue;
        }

        // Retry before interval start
        if (retryMoment.isBefore(intervalStart)) {
          retryMoment = intervalStart;
          continue;
        }

        // Retry after interval end
        if (retryMoment.isSameOrAfter(intervalEnd)) {
          retryMoment = retryMoment.add(1, 'day').startOf('day');
          continue;
        }

        break;
      }

      return retryMoment;
    } catch (error) {
      this.logger.error('Error in getNextRetryMoment:', error);
      throw new HttpException(
        'Error calculating next retry moment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateEmailForLead(
    painPointSolution: [],
    userId: string,
    audienceCompanyName: string,
    projectName?: string,
  ) {
    const prompt = [
      {
        role: 'system',
        content: `You are a professional B2B sales copywriter. Craft a short follow-up email in HTML format when a call was missed.

            Use the pain points and solutions provided to:
            - Briefly explain the pain points and how your services solve them.
            - Mention that you tried calling but the lead didn't answer.
            - Encourage a reply or meeting for further discussion.

            Tone: Friendly, helpful, and supportive — not salesy.

            Structure:
            - Professional subject line (e.g., "Helping You Solve [Pain Point]" or "Follow-Up on Our Missed Call")
            - If company name exists, use:
              "Hi There,
              If you're the right person to speak with, I'd love to briefly share how we help businesses like [CompanyName] to..."
            - If no company name, use:
              "Hi there,
              If you're the person handling marketing/growth/sales at your company, this might be useful — if not, could you point me in the right direction?
              Most businesses I speak to are overwhelmed with [pain problem]."
            - Mention your relevant pain points/solutions.
            - Invite the lead to reply or connect for more information.
            - Write a professional email ending with add projectName. eg projectName is ultimabot then Best Regards, Ultimabot Team

            IMPORTANT: Return a valid JSON object in this exact format:
            {
              "subject": "Your subject line here", 
              "email": "Your email content here in HTML format"
            }

            Do NOT include anything outside this JSON. The email must be in HTML with inline styling for a clean and professional look.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          painPointSolution,
          audienceCompanyName,
          projectName,
        }),
      },
    ];

    try {
      const emailResponse = await this.openaiService.getChatGptCompletion(
        {
          messages: prompt as any,
          temperature: 0.5,
          frequency_penalty: 0.2,
          presence_penalty: 0.3,
          top_p: 1,
          model: GPTModels.GPT_5_MINI,
        },
        [],
        new ObjectId(userId),
        'voicebot-lead-email',
      );

      // Update user token usage
      await this.updateTokenUsage(
        new ObjectId(userId),
        emailResponse.tokenUsage.total,
      );

      let emailBody;
      let subject;
      try {
        const response = emailResponse.response.trim();
        if (!response.startsWith('{') || !response.endsWith('}')) {
          throw new Error('Response is not a valid JSON object');
        }

        const parsedResponse = JSON.parse(response);
        if (!parsedResponse.email || typeof parsedResponse.email !== 'string') {
          throw new Error('Response missing required email field');
        }
        if (
          !parsedResponse.subject ||
          typeof parsedResponse.subject !== 'string'
        ) {
          throw new Error('Response missing required subject field');
        }

        // Format the email with proper HTML styling
        emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            ${parsedResponse.email}
          </div>
        </div>`;
        subject = parsedResponse.subject;
      } catch (parseError) {
        Logger.error(`Error parsing OpenAI response: ${parseError.message}`);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to parse generated email',
          error: parseError.message,
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Lead-generation email generated successfully',
        data: {
          email: emailBody,
          subject: subject,
        },
      };
    } catch (error) {
      Logger.error(`Error in generateEmailForLead: ${error.message}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate email',
        error: error.message,
      };
    }
  }

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

      await this.db.collection('users').updateOne({ _id: userId }, [
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
        await await this.db
          .collection('knowledgebase')
          .updateOne({ _id: knowledgebase }, [
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

  async insertVoicebotEmailConversation(data: any) {
    try {
      const { email, subject, userId, adminEmail, campaignId, audienceEmail } =
        data;

      await this.voiceBotEmailConversationSchema.insertOne({
        campaignId,
        userEmailId: adminEmail,
        audienceEmailId: audienceEmail,
        subject,
        emailConversation: [
          {
            isSentEmail: true,
            isReceivedEmail: false,
            isAutoReply: false,
            emailTextContent: email,
            dateAndTime: new Date(),
          },
        ],
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error('Error inserting voicebot email conversation', error);
      throw new HttpException(
        'Error inserting voicebot email conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadKnowledgeBase(vapiKey: string, payload: FormData) {
    try {
      const config = {
        method: 'post',
        url: `${this.VAPI_BASE_URL}/file`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          ...payload.getHeaders(),
        },
        data: payload,
      };

      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteAssistant(vapiKey: string, assistantId: string) {
    try {
      const config = {
        method: 'delete',
        url: `${this.VAPI_BASE_URL}/assistant/${assistantId}`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
        },
      };

      const response = await axios.request(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new HttpException(
          error.response.data?.message || 'Failed to delete assistant in VAPI',
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        error.message || 'Unknown error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCallById(vapiKey: string, callId: string): Promise<any> {
    const response = await axios.get(`${this.VAPI_BASE_URL}/call/${callId}`, {
      headers: { Authorization: `Bearer ${vapiKey}` },
    });
    return response.data;
  }

  async updateAssistantInboundBot(vapiKey: string, body: any) {
    try {
      const {
        assistantId,
        prompt,
        toolIds,
        userId,
        inboundBotId,
        botName,
        voiceCharacter,
        waitTimeBeforeSpeak,
        knowledgeBaseFile,
        projectId,
        isLeadBot,
      } = body;
      const defAssistant = getDefaultInboundBot(prompt, toolIds, {
        userId,
        inboundBotId,
        prompt: prompt,
        botName,
        voiceCharacter,
        waitSeconds: waitTimeBeforeSpeak,
        knowledgeBaseFiles: [knowledgeBaseFile?.id].filter(Boolean),
        knowledgebaseId: projectId,
        INBOUND_BOT_SERVER_URL: isLeadBot
          ? process.env.ADVANCE_VAPI_SERVERURL
          : process.env.ADVANCE_VAPI_INBOUND_BOT_SERVER_URL,
      });
      const config = {
        method: 'patch',
        url: `${this.VAPI_BASE_URL}/assistant/${assistantId}`,
        headers: {
          Authorization: `Bearer ${vapiKey}`,
          'Content-Type': 'application/json',
        },
        data: defAssistant,
      };
      const vapiResponse = await axios.request(config);

      return vapiResponse.data;
    } catch (error) {
      throw error;
    }
  }
}
