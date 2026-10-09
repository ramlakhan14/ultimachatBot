import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  MessageEvent,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { ObjectId } from 'mongodb';
import { endWith, map, of, skipLast } from 'rxjs';
import {
  CELERY_CLIENT,
  CeleryClientQueue,
  CeleryClientService,
} from '../../common/celery/celery-client.module';
import { EmailService } from '../../common/email/email.service';
import { REDIS } from '../../common/redis/redis.module';
import { SubscriptionPlanInfoService } from '../../subscription/subscription-plan.service';
import { TaskType } from '../../task/task.schema';
import { TaskService } from '../../task/task.service';
import { UserSparse } from '../../user/user.schema';
import { UserService } from '../../user/user.service';
import { WebhookService } from '../../webhook/webhook.service';
import { CustomKeyService } from '../custom-key.service';
import { KnowledgebaseDbService } from '../knowledgebase-db.service';
import { checkUserIsOwnerOfKb } from '../knowledgebase-utils';
import {
  ChatAnswerFeedbackType,
  ChatQueryAnswer,
  ChatSession,
  ChatSessionSparse,
  CustomKeyData,
  IsLeadType,
  KnowledgebaseStatus,
} from '../knowledgebase.schema';
import { UpdateChatbotSessionDTO } from './chatbot.dto';
import { OpenaiChatbotService } from './openaiChatbotService';
import { OpenaiService } from '../../openai/openai.service';
import { Role } from '../../auth/types/role.enum';
import {
  getCalenderDataFromStatus,
  getPromptTemplate,
  getSlotsPrompt,
} from '../../common/utils';
import { AppConfigService } from '../../common/config/appConfig.service';
import {
  AssistantType,
  DEFAULT_CHATGPT_PROMPT,
  DEMO_CHATGPT_PROMPT,
  VAKMANGIDS_CHATBOT_PROMPT,
} from './openaiChatbot.constant';
import axios from 'axios';
import * as crypto from 'crypto';
import * as FormData from 'form-data';
import { GoogleCalenderService } from '../googleCalender/googleCalender.service';
import { subscriptionPlanData } from '../../subscription/subscription.const';
import { GPTModels } from '../../campaign/enum/enum';

const CHAT_SESION_EXPIRY_TIME = 10 * 60;
const CHUNK_FILTER_THRESHOLD = 0.3;
const SOURCES_FILTER_THRESHOLD = 0.8;

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger('ChatbotService');

  constructor(
    private openaiService: OpenaiService,
    private userService: UserService,
    private kbDbService: KnowledgebaseDbService,
    private openaiChatbotService: OpenaiChatbotService,
    private subPlanInfoService: SubscriptionPlanInfoService,
    private emailService: EmailService,
    private taskService: TaskService,
    private readonly customKeyService: CustomKeyService,
    private readonly webhookService: WebhookService,
    private appConfig: AppConfigService,
    private googleCalenderService: GoogleCalenderService,

    @Inject(CELERY_CLIENT) private celeryClient: CeleryClientService,
    @Inject(REDIS) private redis: Redis,
  ) {}

  private async putChatSessionDataToCache(sessionData: ChatSession) {
    return this.redis.set(
      `c_${sessionData._id}`,
      JSON.stringify(sessionData),
      'EX',
      CHAT_SESION_EXPIRY_TIME,
    );
  }

  async getChatSessionDataFromCache(sessionId: string) {
    const sessionKey = `c_${sessionId}`;
    const sId = new ObjectId(sessionId);
    const data = await this.redis.get(sessionKey);
    if (!data) {
      const session = await this.kbDbService.getChatSessionById(sId);
      if (!session) {
        return null;
      }
      await this.putChatSessionDataToCache(session);
      return session;
    } else {
      const sessionData = JSON.parse(data) as ChatSession;
      sessionData._id = sId;
      sessionData.knowledgebaseId = new ObjectId(sessionData.knowledgebaseId);
      if (sessionData.userId) {
        sessionData.userId = new ObjectId(sessionData.userId);
      }
      return sessionData;
    }
  }

  private async setChatSessionData(data: ChatSession) {
    const sessionKey = `c_${data._id.toString()}`;
    data.updatedAt = new Date();
    await this.redis.set(
      sessionKey,
      JSON.stringify(data),
      'EX',
      CHAT_SESION_EXPIRY_TIME,
    );
  }

  private async updateSessionDataWithNewMsg(
    session: ChatSession,
    msg: ChatQueryAnswer,
  ) {
    session.messages.push(msg);
    const totalTokens = msg.qTokens + msg.aTokens;
    return Promise.all([
      this.setChatSessionData(session),
      this.kbDbService.addMsgToChatSession(session._id, msg),
      this.userService.updateMonthlyUsageByN(session.userId, totalTokens),
      this.kbDbService.updateMonthlyUsageByN(
        session.knowledgebaseId,
        totalTokens,
      ),
    ]);
  }

  private async updateTokenUsage(session: ChatSession, msg: ChatQueryAnswer) {
    session.messages.push(msg);
    const totalTokens = msg.qTokens + msg.aTokens;
    return Promise.all([
      this.userService.updateMonthlyUsageByN(session.userId, totalTokens),
      this.kbDbService.updateMonthlyUsageByN(
        session.knowledgebaseId,
        totalTokens,
      ),
    ]);
  }

  /**
   * Notify user of token limit exhaustion (at 80% and 100%)
   * Has logic to not notify only one time per user / month
   * @param userId
   * @returns
   */
  // public async notifyUserOfTokenLimitExhaustion(userId: ObjectId) {
  //   //
  //   // Check from the usage if the token is 80% exceeded or 100% exceeded
  //   //

  //   const monthUsageData = await this.userService.getUserMonthlyUsageData(
  //     userId,
  //   );

  //   const subscriptionPlan = this.subPlanInfoService.getSubscriptionPlanInfo(
  //     monthUsageData.activeSubscription,
  //   );

  //   // We are sure that this function will be invoked only if the token
  //   // limit is exeeded for the current month, so no need of verifying
  //   // if the monthUsage.month is current month

  //   const maxTokens = monthUsageData.maxTokens;

  //   let emailSendFn: (email: string) => Promise<any>;
  //   let emailSendTaskName;

  //   if (monthUsageData.monthUsage.count >= maxTokens) {
  //     emailSendTaskName = `EMAIL_TOKEN_100_${userId}_${monthUsageData.monthUsage.month}`;
  //     emailSendFn = this.emailService.sendToken100ExhaustedEmail;
  //   } else if (monthUsageData.monthUsage.count >= 0.8 * maxTokens) {
  //     emailSendTaskName = `EMAIL_TOKEN_80_${userId}_${monthUsageData.monthUsage.month}`;
  //     emailSendFn = this.emailService.sendToken80ExhaustedEmail;
  //   }

  //   if (!(emailSendFn || emailSendTaskName)) return; // Something is wrong at the triggering side

  //   // Check if an email has already been sent to the user
  //   if ((await this.taskService.getTaskByName(emailSendTaskName)) !== null)
  //     return;

  //   // Send mail
  //   const user = await this.userService.findUserByIdSparse(
  //     userId.toHexString(),
  //   );
  //   await emailSendFn(user.email);

  //   // Update task db to record that email has been sent
  //   await this.taskService.insertTask({
  //     name: emailSendTaskName,
  //     type: TaskType.EMAIL,
  //     payload: {
  //       userId: user._id,
  //       email: user.email,
  //     },
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //   });
  // }

  private async isUseUnderUsageLimits(
    userId: ObjectId,
    maxUsage: number,
    customKeys?: CustomKeyData,
  ): Promise<boolean> {
    // If there is a custom key configured for this knowledgebase
    // then by pass any token limit checks
    if (customKeys?.useOwnKey === true) {
      return true;
    }

    const monthUsageData = await this.userService.getUserMonthlyUsageData(
      userId,
    );

    // If monthUsage does not exists then this is the first msg ever - allow
    if (!monthUsageData.monthUsage) {
      return true;
    } else {
      const today = new Date();
      const currMonth = (today.getMonth() + 1).toString();
      const currYear = today.getFullYear().toString();

      const [month, year] = monthUsageData.monthUsage.month.split('/');

      // If the last monthusage was reported for current month and year
      // check the usage count
      if (year === currYear && month === currMonth) {
        if (monthUsageData.monthUsage.count >= 0.8 * maxUsage) {
          // Trigger notification to user about token limit
          const client = this.celeryClient.get(CeleryClientQueue.CRAWLER);
          const task = client.createTask('tasks.notify_token_limit');
          await task.applyAsync([userId.toHexString()]);
        }
        return monthUsageData.monthUsage.count < maxUsage;
      } else {
        // Else return true as this is the first call for current month
        return true;
      }
    }
  }

  /**
   * Get answer for chatbot question
   * @param sessionId
   * @param query
   * @returns
   */
  async getAnswer(sessionId: string, query: string, debug = false) {
    //
    // Checks and Validations
    //

    const sessionData = await this.getChatSessionDataFromCache(sessionId);
    if (!sessionData) {
      throw new HttpException('Invalid Session Id', HttpStatus.NOT_FOUND);
    }

    const kbId = sessionData.knowledgebaseId;

    // Get top n chunks from knowledge base
    const topChunks = await this.openaiChatbotService.getTopNChunks(
      kbId,
      query,
      CHUNK_FILTER_THRESHOLD,
      sessionData.customKeys ?? undefined,
      sessionData.userId,
      AssistantType.CHATBOT,
    );
    //
    // Get answer for query
    //

    // Get answer from chatgpt
    const prevMessages = sessionData.messages;
    const answer = await this.openaiChatbotService.getAiAnswer(
      sessionData.kbName,
      query,
      topChunks,
      prevMessages,
      sessionData.defaultAnswer,
      sessionData.prompt,
      sessionData.customKeys,
      debug,
      sessionData.isAddress,
      sessionData.isPhone,
      sessionData.userId,
    );

    const msg = {
      q: query,
      a: answer.response,
      qTokens: answer.tokenUsage.prompt,
      aTokens: answer.tokenUsage.completion,
      ts: new Date(),
      read: true,
    };

    await this.updateSessionDataWithNewMsg(sessionData, msg);
    const sources = topChunks
      .filter((c) => c.score > SOURCES_FILTER_THRESHOLD && c.url)
      .map((c) => ({ url: c.url, title: c.title }));

    return {
      response: answer.response,
      sources,
      messages: answer.messages,
    };
  }

  async generateQuickReplies(content: string, sessionId: string) {
    const sessionData = await this.getChatSessionDataFromCache(sessionId);
    if (!sessionData) {
      throw new HttpException('Invalid Session Id', HttpStatus.NOT_FOUND);
    }
    const prompt = [
      {
        role: 'system',
        content: `You are a user interacting with an AI sales agent chat assistant. The following paragraph is the response generated by the AI chat assistant to your last message. 
                  Analyze the response and generate two short quick replies (each up to 5 words) that you (the user) might want to ask the AI sales agent after this response. 
                  IMPORTANT: The quick replies must be in the SAME LANGUAGE as the content provided. 
                  The quick replies must strictly look like short questions a user would ask the AI chat assistant after each response, and must NOT sound like suggestions the AI sales agent might make. 
                  If the AI sales agent asks for or collects any of the following personal information in its response, return an empty string: Name, First Name, Last Name, Email, Phone, City, Postal Code, Service Type, Location, Category, SubCategory, Job Description. 
                  Also, if the content contains thank you messages, farewell messages, or any indication that the conversation is ending (such as "thank you", "you're welcome", "have a great day", "goodbye", "farewell", "end of conversation", etc.), return an empty string as no quick replies are needed for ending conversations.`,
      },
      {
        role: 'user',
        content: `Based on the following content, generate two short quick replies suitable for a chatbot interaction, strictly in the same language as the content: ${content}`,
      },
    ];
    const quickAnswers = await this.openaiService.getChatGptCompletion(
      {
        messages: prompt as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_4O_MINI,
      },
      sessionData?.customKeys?.keys,
      sessionData?.userId,
      'chatbot-quick-replies',
    );
    return quickAnswers;
  }

  /**
   * Get chatbot answer as SSE stream
   * @param sessionId
   * @param query
   * @returns
   * currently not using this function there is v2 function which is bieng used instead of this.
   */
  // ! Not using this go to getAnswerStreamV2
  async getAnswerStream(sessionId: string, query: string) {
    //
    // Checks and Validations
    Logger.log(`Getting session data for sessionId: ${sessionId}`);
    const sessionData = await this.getChatSessionDataFromCache(sessionId);

    if (!sessionData) {
      Logger.error(`Invalid session ID: ${sessionId}`);
      throw new HttpException('Invalid Session Id', HttpStatus.NOT_FOUND);
    }

    Logger.log(
      `Getting knowledgebase data for ID: ${sessionData.knowledgebaseId}`,
    );
    const kb = await this.kbDbService.getKnowledgebaseById(
      sessionData.knowledgebaseId,
    );
    if (!sessionData.prompt && kb.chatbotType == 'vakmangids') {
      sessionData.prompt = VAKMANGIDS_CHATBOT_PROMPT;
    }

    // calender slot bookings
    Logger.log('Getting slots prompt from query');
    const extractSlots = await getSlotsPrompt(query, sessionData.messages);

    Logger.log('Getting slot data from OpenAI');
    const extractSlotData = await this.openaiService.getChatGptCompletion(
      {
        messages: extractSlots as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_4O_MINI,
      },
      sessionData?.customKeys?.keys,
      sessionData.userId,
      'chatbot-slot-extraction',
    );
    Logger.debug('Extracted slot data:', extractSlotData);

    const extractedDate = JSON.parse(extractSlotData.response);

    Logger.log(
      `Getting calendar settings for knowledgebase: ${sessionData.knowledgebaseId}`,
    );
    const calenderData =
      await this.googleCalenderService.findCalenderSettingByKbid(
        sessionData.knowledgebaseId.toHexString(),
      );
    Logger.debug('Calendar data:', calenderData);

    Logger.log('Regenerating access token and getting available slots');
    const getAvailableSlots =
      await this.googleCalenderService.regenerateAccessToken(
        calenderData.refreshToken,
        calenderData.globalTime,
        extractedDate.date,
        Number(calenderData.duration),
        calenderData?.timezone,
      );
    Logger.debug('Available slots:', getAvailableSlots);

    const meetingSlots = getAvailableSlots?.availableSlots;
    Logger.debug('Meeting slots:', meetingSlots);
    // commenting bcz of new pricing model By Nidhi Sharma on 14-01-2026
    // Check usage limits for user
    // if (sessionData.userId) {
    //   Logger.log(`Checking usage limits for user: ${sessionData.userId}`);
    //   const allowUsage = await this.isUseUnderUsageLimits(
    //     sessionData.userId,
    //     sessionData.subscriptionData.maxTokens,
    //     sessionData.customKeys,
    //   );
    //   if (!allowUsage) {
    //     Logger.warn(`Usage limit exceeded for user: ${sessionData.userId}`);
    //     const answer = 'Sorry I cannot respond right now';
    //     const msg = {
    //       q: query,
    //       a: answer,
    //       qTokens: 0,
    //       aTokens: 0,
    //       ts: new Date(),
    //       read: true,
    //     };
    //     await this.updateSessionDataWithNewMsg(sessionData, msg);
    //     return of(answer);
    //   }
    // }

    const kbId = sessionData.knowledgebaseId;

    Logger.log(`Getting top chunks for knowledgebase: ${kbId}`);
    const topChunks = await this.openaiChatbotService.getTopNChunks(
      kbId,
      query,
      CHUNK_FILTER_THRESHOLD,
      sessionData.customKeys,
      sessionData.userId,
      AssistantType.CHATBOT,
    );
    Logger.debug('Top chunks:', topChunks);

    const prevMessages = sessionData.messages;
    let leadsResponse: any;

    Logger.log('Getting AI answer stream');
    const answerStream = await this.openaiChatbotService.getAiAnswerStream(
      sessionData.kbName,
      query,
      topChunks,
      prevMessages,
      async (answer, usage) => {
        const msg = {
          q: query,
          a: answer,
          qTokens: usage.prompt,
          aTokens: usage.completion,
          ts: new Date(),
          read: true,
        };

        Logger.log('Extracting calendar status from answer');
        const extractCalenderStatus = await getCalenderDataFromStatus(answer);
        Logger.debug('Calendar status:', extractCalenderStatus);

        Logger.log('Getting calendar confirmation data from OpenAI');
        const fetchConfirmCalenderData =
          await this.openaiService.getChatGptCompletion(
            {
              messages: extractCalenderStatus as any,
              temperature: 0.1,
              frequency_penalty: 0,
              presence_penalty: 0,
              top_p: 1,
              model: GPTModels.GPT_4O_MINI,
            },
            sessionData?.customKeys?.keys,
            sessionData.userId,
            'chatbot-answer',
          );
        Logger.debug('Calendar confirmation data:', fetchConfirmCalenderData);

        const parsedResponse = JSON.parse(fetchConfirmCalenderData.response);
        Logger.debug('Parsed response:', parsedResponse);

        const normalizedResponse = Object.keys(parsedResponse).reduce(
          (acc, key) => {
            acc[key.toLowerCase()] = parsedResponse[key];
            return acc;
          },
          {},
        );

        if (
          normalizedResponse.hasOwnProperty('email') &&
          normalizedResponse.hasOwnProperty('time') &&
          normalizedResponse.hasOwnProperty('demo confirmation') &&
          normalizedResponse['email'] !== '' &&
          normalizedResponse['time'] !== '' &&
          normalizedResponse['demo confirmation'] === true
        ) {
          Logger.log('Booking calendar slot');
          this.googleCalenderService.bookSlot(
            getAvailableSlots.accessToken,
            normalizedResponse['time'],
            normalizedResponse['email'],
            Number(calenderData.duration),
            'ChatBot',
            calenderData?.timezone,
          );
        }

        Logger.log('Getting lead extraction prompt');
        const extractLeadPrompt = getPromptTemplate(
          { prevMessages, answer, query },
          kb.chatbotType,
        );

        Logger.log('Getting lead data from OpenAI');
        const extractLeadData = await this.openaiService.getChatGptCompletion(
          {
            messages: extractLeadPrompt as any,
            temperature: 0.1,
            frequency_penalty: 0,
            presence_penalty: 0,
            top_p: 1,
            model: GPTModels.GPT_5_MINI,
          },
          sessionData?.customKeys?.keys,
          sessionData.userId,
          'chatbot-lead-extraction',
        );

        await this.updateSessionDataWithNewMsg(sessionData, msg);

        const filteredResponse = Object.fromEntries(
          Object.entries(JSON.parse(extractLeadData.response)).filter(
            ([_, value]) => value !== null && value !== '',
          ),
        );

        if (Object.keys(filteredResponse).length > 0) {
          Logger.log('Creating lead');
          const finalResponse: any = {
            ...filteredResponse,
            knowledgebaseId: kbId,
            chatSessionId: sessionData._id,
            chatbotType: kb.chatbotType,
          };
          leadsResponse = await this.kbDbService.createLeads(
            kb.owner.toHexString(),
            finalResponse,
          );

          Logger.log('Sending email to leads');
          await this.kbDbService.sendEmailToLeads(
            {
              knowledgebaseId: kbId,
              chatSessionId: sessionData._id,
            },
            sessionData.isAddress,
            sessionData.isPhone,
          );
        }

        Logger.log('Sending lead to CRM');
        await this.sendLeadtoCrm(sessionId);
      },
      sessionData.defaultAnswer,
      sessionData.prompt,
      sessionData.customKeys,
      sessionData.isAddress,
      sessionData.isPhone,
      sessionData.userId,
      JSON.stringify(meetingSlots),
    );

    Logger.debug('Answer stream:', answerStream);

    const sources = topChunks
      .filter((c) => c.score > SOURCES_FILTER_THRESHOLD && c.url)
      .map((c) => ({ url: c.url, title: c.title }));

    Logger.log('Transforming stream to MessageEvent');
    return answerStream.pipe(
      map((value) => {
        const newVal: MessageEvent = {
          data: value,
        };

        return newVal;
      }),
      skipLast(1),
      endWith(
        {
          data: {
            content: '',
            sources,
          },
          fieldStatus: leadsResponse?.fieldStatus,
        },
        '[DONE]',
      ),
    );
  }

  /**
   * Create a new chat session for a knowledgebase
   * @param knowledgebaseId
   * @returns
   */
  async createChatSession(
    knowledgebaseId: string,
    userData?: any,
    isAuthenticated = false,
    src?: string,
  ) {
    const sessionId = new ObjectId();

    let kbId: ObjectId;
    try {
      kbId = new ObjectId(knowledgebaseId);
    } catch {
      throw new HttpException('Invalid Knowledgebase Id', HttpStatus.NOT_FOUND);
    }

    // Check if knowledgebase id is valid
    const kb = await this.kbDbService.getKnowledgebaseById(kbId);
    if (!kb) {
      throw new HttpException('Invalid Knowledgebase Id', HttpStatus.NOT_FOUND);
    }

    // IF its a demo knowledgebase then the user should be authenticated
    // ie. Demo chatbots are not avialable to the public, but only to
    // authenticated users inside the app
    if (kb.isDemo && !isAuthenticated) {
      throw new HttpException('Unauthorised', HttpStatus.UNAUTHORIZED);
    }

    // Check if knowledgebase is ready
    if (kb.status !== KnowledgebaseStatus.READY) {
      throw new HttpException(
        'Knowledgebase not ready!',
        HttpStatus.BAD_REQUEST,
      );
    }
    let user: any;
    let subscriptionPlan: any;
    // Get the subscription plan for the user to which the kb belongs
    if (kb.owner) {
      user = await this.userService.findUserById(kb.owner.toString());
      subscriptionPlan = this.subPlanInfoService.getSubscriptionPlanInfo(
        user.activeSubscription,
      );
    }
    // If there is a promptId associated with the KB, fetch the custom prompt
    const prompt = kb.prompt;

    if (kb.prompt === null || kb.prompt === undefined || kb.prompt === '') {
    }

    const sessionData: ChatSession = {
      _id: sessionId,
      knowledgebaseId: kbId,
      kbName: `${kb.name} assistant`,
      defaultAnswer: kb.defaultAnswer,
      prompt,
      isDemo: kb.isDemo,
      // subscriptionData: subscriptionPlan,
      customKeys: user?.customKeys,
      userId: kb.owner,
      startedAt: new Date(),
      updatedAt: new Date(),
      isUnread: true,
      messages: [],
      userData,
      src,
      isAddress: kb?.chatWidgeData?.leadCollectionData
        ? kb?.chatWidgeData?.leadCollectionData[0].address
        : false,
      isPhone: kb?.chatWidgeData?.leadCollectionData
        ? kb?.chatWidgeData?.leadCollectionData[0].phoneNumber
        : false,
    };
    if (kb.owner) {
      await Promise.all([
        this.setChatSessionData(sessionData),
        this.kbDbService.insertChatSession(sessionData),
      ]);
    } else {
      await this.setChatSessionData(sessionData);
      this.kbDbService.insertChatSession(sessionData);
    }
    return sessionId.toString();
  }

  async updateChatbotSession(sessionId: string, data: UpdateChatbotSessionDTO) {
    const sessionData = await this.getChatSessionDataFromCache(sessionId);

    if (!sessionData || !data.userData || !Object.keys(data.userData)?.length)
      return;

    const updatedSessionData: ChatSession = {
      ...sessionData,
      userData: {
        ...sessionData.userData,
        ...data.userData,
      },
    };

    await Promise.all([
      this.setChatSessionData(updatedSessionData),
      this.kbDbService.updateChatSession(sessionData._id, updatedSessionData),
    ]);
  }

  /**
   * Get data for given chat session
   * @param user
   * @param sessionId
   * @returns
   */
  async getChatSessionData(user: UserSparse, sessionId: string) {
    const session: ChatSessionSparse =
      await this.kbDbService.getChatSessionSparseById(new ObjectId(sessionId));

    if (!session) {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }

    const kb = await this.kbDbService.getKnowledgebaseSparseById(
      session.knowledgebaseId,
    );
    if (user.role != Role.Admin) {
      if (!user._id.equals(kb.owner)) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    return session;
  }

  async getChatSessionsForKnowledgebase(
    user: UserSparse,
    knowledgebaseId: string,
    pageSize: number,
    page?: number,
    searchQuery?: string,
    chatSessionId?: string,
  ) {
    const kbId = new ObjectId(knowledgebaseId);

    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (user.role != Role.Admin) {
      checkUserIsOwnerOfKb(user, kb);
    }
    return this.kbDbService.getPaginatedChatSessionsForKnowledgebase(
      kbId,
      pageSize,
      page,
      searchQuery,
      chatSessionId,
    );
  }

  /**
   * Remove session
   * @param sessionId
   */

  async deleteSessionBySession(user: UserSparse, sessionId: string) {
    const session: ChatSessionSparse =
      await this.kbDbService.getChatSessionSparseById(new ObjectId(sessionId));

    if (!session) {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }

    const kb = await this.kbDbService.getKnowledgebaseSparseById(
      session.knowledgebaseId,
    );

    if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
      checkUserIsOwnerOfKb(user, kb);
    }

    try {
      await this.kbDbService.deleteChatSession(new ObjectId(sessionId));
    } catch {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Mark all the messages in the Session as Read
   * @param sessionId
   */
  async markSessionAsRead(user: UserSparse, sessionId: string) {
    const session: ChatSessionSparse =
      await this.kbDbService.getChatSessionSparseById(new ObjectId(sessionId));

    if (!session) {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }

    const kb = await this.kbDbService.getKnowledgebaseSparseById(
      session.knowledgebaseId,
    );
    if (user.role != Role.Admin) {
      if (!user._id.equals(kb.owner)) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    try {
      this.kbDbService.updateChatSession(new ObjectId(sessionId), {
        isUnread: false,
      });
    } catch {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Mark all messages before the given msg as unread
   * @param sessionId
   * @param ts
   */
  async markSessionAsUnread(user: UserSparse, sessionId: string) {
    const session: ChatSessionSparse =
      await this.kbDbService.getChatSessionSparseById(new ObjectId(sessionId));

    if (!session) {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }

    const kb = await this.kbDbService.getKnowledgebaseSparseById(
      session.knowledgebaseId,
    );
    if (user.role != Role.Admin) {
      if (!user._id.equals(kb.owner)) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    }

    try {
      this.kbDbService.updateChatSession(new ObjectId(sessionId), {
        isUnread: true,
      });
    } catch {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Set Feedback for Chat Session Msg by Msg Idx
   * @param sessionId
   * @param msgIdx
   * @param feedback
   */
  async setSessionMessageFeedback(
    sessionId: string,
    msgIdx: number,
    feedback: ChatAnswerFeedbackType,
  ) {
    try {
      await this.kbDbService.setChatSessionMessageFeedback(
        new ObjectId(sessionId),
        msgIdx,
        feedback,
      );
    } catch {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }
  }

  async getChatSessionsMessagesById(sessionId: string): Promise<any> {
    let sessionObjId: ObjectId;
    try {
      sessionObjId = new ObjectId(sessionId);
    } catch {
      throw new HttpException('Invalid Session Id', HttpStatus.NOT_FOUND);
    }
    const session = await this.kbDbService.getChatSessionSparseById(
      sessionObjId,
    );

    if (!session) {
      throw new HttpException('Invalid Session', HttpStatus.NOT_FOUND);
    }

    return {
      id: sessionId,
      messages: session.messages,
    };
  }

  async sendLeadtoCrm(sessionId: string) {
    Logger.log('Sending lead to CRM for sessionId:', sessionId);
    const data: any = await this.kbDbService.getSessionLeads(sessionId);
    const sessionObjectId = new ObjectId(sessionId);
    const chatSessionData = await this.kbDbService.getChatSessionById(
      sessionObjectId,
    );
    if (!chatSessionData) {
      Logger.log(
        `Skipping CRM upload: Chat session not found for sessionId: ${sessionId}`,
      );
      return;
    }
    const kbData = await this.kbDbService.getKnowledgebaseById(
      chatSessionData?.knowledgebaseId,
    );

    if (kbData?.chatbotType !== 'vakmangids') {
      Logger.log(
        `Skipping CRM upload: Chatbot type is not vakmangids (type: ${
          kbData?.chatbotType || 'unknown'
        })`,
      );
      return;
    }

    if (!data) {
      Logger.log(
        `Skipping CRM upload: No lead data found in leads collection for sessionId: ${sessionId}`,
      );
      return;
    }

    // if (data?.isSyncedToCrm) {
    //   Logger.log(
    //     `Skipping CRM upload: Lead already synced to CRM for sessionId: ${sessionId}`,
    //   );
    //   return;
    // }

    // Monitor data workflow - log all fields status
    const allFields = [
      'firstName',
      'lastName',
      'city',
      'email',
      'category',
      'subCategory',
      'phone',
      'location',
      'serviceType',
      'jobDescription',
      'postalCode',
    ];
    Logger.log('--- Lead Data Field Status ---');
    for (const field of allFields) {
      Logger.log(
        `- ${field}: ${
          data[field] !== undefined ? `"${data[field]}"` : 'MISSING'
        }`,
      );
    }
    Logger.log('------------------------------');

    // Require all 6 standard fields (firstName, lastName, email, phone, postalCode, city) to be present before sending to CRM
    if (
      data?.firstName &&
      data?.lastName &&
      data?.email &&
      data?.phone &&
      data?.postalCode &&
      data?.city
    ) {
      try {
        const vakmangids = await import('../../common/vakmangids.json');

        const category = data.category
          ? vakmangids.category.find(
              (value: any) =>
                value.name?.toLowerCase() === data.category?.toLowerCase(),
            )
          : undefined;
        const subCategory = data.subCategory
          ? vakmangids.subCategory.find(
              (value: any) =>
                value.name?.toLowerCase() === data.subCategory?.toLowerCase(),
            )
          : undefined;

        // Retrieve key and format the api url
        const leadApiKey = this.appConfig.get('vakmangidsLeadsKey') || '';
        const baseUrl =
          this.appConfig.get('vakmangidsLeadsUrl') ||
          'https://leads.vakmangids.com';
        const uploadLeadUrl = `${baseUrl}/api/upload-lead?key=${leadApiKey}`;

        const uniqueLeadId = crypto.randomBytes(5).toString('hex'); // Generate a 10-character hex string

        const formData = new FormData();
        formData.append(
          'first-name',
          JSON.stringify({
            key: 'first-name',
            name: 'First Name',
            value: data.firstName || '',
          }),
        );
        formData.append(
          'last-name',
          JSON.stringify({
            key: 'last-name',
            name: 'Last Name',
            value: data.lastName || '',
          }),
        );
        formData.append(
          'email',
          JSON.stringify({
            key: 'email',
            name: 'Email',
            value: data.email || '',
          }),
        );
        formData.append(
          'telephone',
          JSON.stringify({
            key: 'telephone',
            name: 'Telephone',
            value: data.phone || '',
          }),
        );
        formData.append(
          'city',
          JSON.stringify({
            key: 'city',
            name: 'Gemeente',
            value: data.city || '',
          }),
        );
        formData.append(
          'postal-code',
          JSON.stringify({
            key: 'postal-code',
            name: 'Postcode',
            value: data.postalCode || '',
          }),
        );
        formData.append(
          'project-type',
          JSON.stringify({
            key: 'project-type',
            name: 'Type project',
            value: data.serviceType || '',
          }),
        );
        formData.append(
          'location',
          JSON.stringify({
            key: 'location',
            name: 'Locatie',
            value: data.location || '',
          }),
        );
        formData.append(
          'job-description',
          JSON.stringify({
            key: 'job-description',
            name: 'Beschrijving opdracht',
            value: data.jobDescription || '',
          }),
        );

        // Append flat fields
        formData.append(
          'lead_category_name',
          category?.id || 'Category Not Found',
        );
        formData.append(
          'lead_sub_category_name',
          subCategory?.id || 'Subcategory Not Found',
        );
        formData.append('lead_main_desc', data.jobDescription || '');
        formData.append('unique_id', uniqueLeadId);
        formData.append(
          'client_ip',
          chatSessionData?.userData?.ip || '127.0.0.1',
        );
        formData.append('country_code', 'null');
        formData.append('country_name', 'null');
        formData.append('website', 'https://vakmangids.ultimawriter.ai');
        formData.append('page_name', kbData?.websiteData?.websiteUrl || '');
        formData.append(
          'execution-date',
          JSON.stringify({
            key: 'execution-date',
            name: 'Deadline',
            value: 'Zo snel mogelijk',
          }),
        );

        // Append gclid and cid fields if present in session
        const gclid = chatSessionData?.userData?.gclid || '0';
        const cid = chatSessionData?.userData?.cid || '';
        formData.append('gclid', String(gclid));
        formData.append('cid', String(cid));

        const response = await axios.post(uploadLeadUrl, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });

        //added condition to not update lead data if already synced
        await this.kbDbService.updateLeadCrmSyncStatus(sessionObjectId, true);
        return response.data;
      } catch (error) {
        this.logger.error(
          'Error hitting Laravel CRM API:',
          error.response?.data || error.message,
        );
      }
    } else {
    }
  }

  async getAnswerStreamV2(sessionId: string, query: string) {
    //
    // Checks and Validations
    let vakmangidsKnowledgebaseData;
    Logger.log(`Getting session data for sessionId: ${sessionId}`);
    const sessionData = await this.getChatSessionDataFromCache(sessionId);
    if (!sessionData) {
      Logger.error(`Invalid session ID: ${sessionId}`);
      throw new HttpException('Invalid Session Id', HttpStatus.NOT_FOUND);
    }

    Logger.log(
      `Getting knowledgebase data for ID: ${sessionData.knowledgebaseId}`,
    );
    const kb = await this.kbDbService.getKnowledgebaseById(
      sessionData.knowledgebaseId,
    );

    if (kb.chatbotType == 'vakmangids') {
      vakmangidsKnowledgebaseData =
        await this.kbDbService.getKbDataStoreItemsForKnowledgebaseVakmangids(
          sessionData.knowledgebaseId,
        );
      //Added By Nidhi Sharma for vakmangids prompt on 07-10-2025
      sessionData.prompt = kb?.prompt || VAKMANGIDS_CHATBOT_PROMPT;
    }

    const calenderData =
      await this.googleCalenderService.findCalenderSettingByKbid(
        sessionData.knowledgebaseId.toHexString(),
      );

    let meetingSlots: any;
    let getAvailableSlots: any;
    let busySlots: any;
    if (calenderData && calenderData.isActive) {
      sessionData.prompt = DEMO_CHATGPT_PROMPT;
    }

    const sessionMessages = await this.getChatSessionDataFromCache(sessionId);
    const extractSlots = await getSlotsPrompt(query, sessionMessages.messages);

    const extractSlotData = await this.openaiService.getChatGptCompletion(
      {
        messages: extractSlots as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_4O_MINI,
      },
      sessionData?.customKeys?.keys,
      sessionData.userId,
      'chatbot-slot-extraction',
    );

    const extractedDate = JSON.parse(extractSlotData.response);

    const msg3 = {
      q: query,
      a: extractSlotData.response,
      qTokens: extractSlotData.tokenUsage.prompt,
      aTokens: extractSlotData.tokenUsage.completion,
      ts: new Date(),
    };
    this.updateTokenUsage(sessionData, msg3);
    if (extractedDate.date && calenderData && calenderData.isActive) {
      getAvailableSlots =
        await this.googleCalenderService.regenerateAccessToken(
          calenderData.refreshToken,
          calenderData.globalTime,
          extractedDate.date,
          Number(calenderData.duration),
          calenderData?.timezone,
        );
      meetingSlots = getAvailableSlots?.availableSlots;
      busySlots =
        this.googleCalenderService.getBusySlotsForReduceDuplicateBooking(
          getAvailableSlots?.accessToken,
          extractedDate.date,
        );
    }
    //commenting bcz of new pricing model By Nidhi Sharma on 14-01-2026
    // Check usage limits for user
    // if (sessionData.userId) {
    //   Logger.log(`Checking usage limits for user: ${sessionData.userId}`);
    //   const allowUsage = await this.isUseUnderUsageLimits(
    //     sessionData.userId,
    //     sessionData.subscriptionData.maxTokens,
    //     sessionData.customKeys,
    //   );
    //   if (!allowUsage) {
    //     Logger.warn(`Usage limit exceeded for user: ${sessionData.userId}`);
    //     const answer = 'Sorry I cannot respond right now';
    //     const msg = {
    //       q: query,
    //       a: answer,
    //       qTokens: 0,
    //       aTokens: 0,
    //       ts: new Date(),
    //       read: true,
    //     };
    //     await this.updateSessionDataWithNewMsg(sessionData, msg);
    //     return of(answer);
    //   }
    // }

    const kbId = sessionData.knowledgebaseId;
    const topChunks = await this.openaiChatbotService.getTopNChunks(
      kbId,
      query,
      CHUNK_FILTER_THRESHOLD,
      sessionData.customKeys,
      sessionData.userId,
      AssistantType.CHATBOT,
    );

    // Build enriched prompt with returning user context (if applicable)
    const enrichedPrompt = await this.buildReturningUserPrompt(
      query,
      sessionData,
    );

    const prevMessages = sessionData.messages;
    let leadsResponse: any;
    const timezone = calenderData?.timezone;
    const answerStream = await this.openaiChatbotService.getAiAnswerStream(
      sessionData.kbName,
      query,
      topChunks,
      prevMessages,
      async (answer, usage) => {
        const msg = {
          q: query,
          a: answer,
          qTokens: usage.prompt,
          aTokens: usage.completion,
          ts: new Date(),
          read: true,
        };
        //TODO START=======calender slot bookings=====================

        // Calendar booking logic - only process if calendar is active
        if (calenderData && calenderData.isActive) {
          // More specific intent detection to avoid false positives
          const hasStrongCalendarIntent =
            // Strong calendar keywords in answer
            answer.toLowerCase().includes('appointment') ||
            answer.toLowerCase().includes('meeting') ||
            answer.toLowerCase().includes('schedule') ||
            answer.toLowerCase().includes('book') ||
            answer.toLowerCase().includes('demo') ||
            // Strong calendar keywords in query
            query.toLowerCase().includes('appointment') ||
            query.toLowerCase().includes('meeting') ||
            query.toLowerCase().includes('schedule') ||
            query.toLowerCase().includes('book') ||
            query.toLowerCase().includes('demo') ||
            // Email pattern detected (strong indicator of booking intent)
            /@\w+\.\w+/.test(answer) ||
            /@\w+\.\w+/.test(query);

          if (hasStrongCalendarIntent) {
            try {
              const extractCalenderStatus = await getCalenderDataFromStatus(
                answer,
              );
              const fetchConfirmCalenderData =
                await this.openaiService.getChatGptCompletion(
                  {
                    messages: extractCalenderStatus as any,
                    temperature: 0.1,
                    frequency_penalty: 0,
                    presence_penalty: 0,
                    top_p: 1,
                    model: GPTModels.GPT_4O_MINI,
                  },
                  sessionData?.customKeys?.keys,
                  sessionData.userId,
                  'chatbot-answer',
                );

              const parsedResponse = JSON.parse(
                fetchConfirmCalenderData.response,
              );
              // Only process and log if we have meaningful data (not empty)
              if (
                parsedResponse &&
                typeof parsedResponse === 'object' &&
                (parsedResponse.Email ||
                  parsedResponse.email ||
                  parsedResponse.Time ||
                  parsedResponse.time ||
                  parsedResponse['Demo Confirmation'] === true ||
                  parsedResponse['demo_confirmation'] === true)
              ) {
                const msg1 = {
                  q: query,
                  a: fetchConfirmCalenderData.response,
                  qTokens: fetchConfirmCalenderData.tokenUsage.prompt,
                  aTokens: fetchConfirmCalenderData.tokenUsage.completion,
                  ts: new Date(),
                };
                this.updateTokenUsage(sessionData, msg1);

                const normalizedResponse = Object.entries(
                  parsedResponse ?? {},
                ).reduce((acc, [key, value]) => {
                  acc[key.toLowerCase()] = value;
                  return acc;
                }, {} as Record<string, any>);

                // Enhanced validation for booking
                const hasEmail =
                  normalizedResponse['email'] &&
                  normalizedResponse['email'].trim() !== '' &&
                  normalizedResponse['email'].includes('@');

                const hasTime =
                  normalizedResponse['time'] &&
                  normalizedResponse['time'].trim() !== '';

                const hasConfirmation =
                  normalizedResponse['demo confirmation'] === true ||
                  normalizedResponse['demo_confirmation'] === true ||
                  normalizedResponse['confirmation'] === true ||
                  normalizedResponse['confirmed'] === true ||
                  // Check for explicit booking confirmation
                  (hasEmail &&
                    hasTime &&
                    (answer.toLowerCase().includes('yes, book') ||
                      answer.toLowerCase().includes('confirm') ||
                      answer.toLowerCase().includes('schedule it') ||
                      query.toLowerCase().includes('yes, book') ||
                      query.toLowerCase().includes('confirm') ||
                      query.toLowerCase().includes('schedule it')));

                // Create a unique booking key to prevent duplicates
                const bookingKey = `${normalizedResponse['email']}_${normalizedResponse['time']}_${sessionId}`;
                const existingBooking = await this.redis.get(
                  `booking_${bookingKey}`,
                );

                if (
                  hasEmail &&
                  hasTime &&
                  hasConfirmation &&
                  meetingSlots &&
                  meetingSlots?.length > 0
                ) {
                  if (!existingBooking) {
                    try {
                      // Set booking lock to prevent duplicates (expires in 5 minutes)
                      await this.redis.set(
                        `booking_${bookingKey}`,
                        'locked',
                        'EX',
                        300,
                      );

                      await this.googleCalenderService.bookSlot(
                        getAvailableSlots.accessToken,
                        normalizedResponse['time'],
                        normalizedResponse['email'],
                        Number(calenderData.duration),
                        'ChatBot Meeting',
                        calenderData?.timezone,
                      );
                      Logger.log('Calendar slot booked successfully');
                    } catch (bookingError) {
                      Logger.error(
                        'Error booking calendar slot:',
                        bookingError,
                      );
                      // Remove the lock if booking failed
                      await this.redis.del(`booking_${bookingKey}`);
                    }
                  } else {
                    Logger.debug(
                      'Duplicate booking prevented for:',
                      bookingKey,
                    );
                  }
                } else {
                  Logger.debug('Calendar booking conditions not met:', {
                    hasEmail,
                    hasTime,
                    hasConfirmation,
                    hasMeetingSlots: meetingSlots && meetingSlots?.length > 0,
                    email: normalizedResponse['email'],
                    time: normalizedResponse['time'],
                  });
                }
              } else {
                Logger.debug(
                  'No meaningful calendar data extracted - skipping',
                );
              }
            } catch (error) {
              Logger.warn('Error processing calendar confirmation:', error);
              // Continue execution without breaking the flow
            }
          } else {
            Logger.debug(
              'No strong calendar intent detected - skipping calendar processing',
            );
          }
        }

        const extractLeadPrompt = getPromptTemplate(
          { prevMessages, answer, query },
          kb.chatbotType,
        );

        const extractLeadData = await this.openaiService.getChatGptCompletion(
          {
            messages: extractLeadPrompt as any,
            temperature: 0.1,
            frequency_penalty: 0,
            presence_penalty: 0,
            top_p: 1,
            model: GPTModels.GPT_5_MINI,
          },
          sessionData?.customKeys?.keys,
          sessionData.userId,
          'chatbot-lead-extraction',
        );

        await this.updateSessionDataWithNewMsg(sessionData, msg);

        const msg2 = {
          q: query,
          a: extractLeadData.response,
          qTokens: extractLeadData.tokenUsage.prompt,
          aTokens: extractLeadData.tokenUsage.completion,
          ts: new Date(),
        };
        this.updateTokenUsage(sessionData, msg2);

        const appointmentDetails = {
          meetingDate: null,
          timeSlot: {
            startTime: null,
            endTime: null,
          },
          isMeetingBookedOnGoogleMeet: !!calenderData?.isActive,
        };

        const filteredResponse = Object.fromEntries(
          Object.entries(JSON.parse(extractLeadData.response)).filter(
            ([_, value]) => value !== null && value !== '',
          ),
        );

        if (Object.keys(filteredResponse)?.length > 0) {
          Logger.log('Creating lead');
          const finalResponse: any = {
            ...filteredResponse,
            knowledgebaseId: kbId,
            chatSessionId: sessionData._id,
            chatbotType: kb.chatbotType,
            isMeetingBookedOnGoogleMeet: !!calenderData?.isActive,
            campaignDetails: {
              _id: kbId.toHexString(),
              campaignName: kb.name,
            },
          };
          leadsResponse = await this.kbDbService.createLeads(
            kb.owner.toHexString(),
            finalResponse,
          );

          Logger.log('Sending email to leads');
          await this.kbDbService.sendEmailToLeads(
            {
              knowledgebaseId: kbId,
              chatSessionId: sessionData._id,
            },
            sessionData.isAddress,
            sessionData.isPhone,
            appointmentDetails,
          );
        }

        Logger.log('Sending lead to CRM');
        await this.sendLeadtoCrm(sessionId);
      },
      sessionData.defaultAnswer,
      enrichedPrompt, // ← enrichedPrompt instead of sessionData.prompt
      sessionData.customKeys,
      sessionData.isAddress,
      sessionData.isPhone,
      sessionData.userId,
      JSON.stringify(meetingSlots),
      JSON.stringify(busySlots),
      JSON.stringify(vakmangidsKnowledgebaseData),
      timezone,
    );

    const sources = topChunks
      .filter((c) => c.score > SOURCES_FILTER_THRESHOLD && c.url)
      .map((c) => ({ url: c.url, title: c.title }));

    return answerStream.pipe(
      map((value) => {
        const newVal: MessageEvent = {
          data: value,
        };

        return newVal;
      }),
      skipLast(1),
      endWith(
        {
          data: {
            content: '',
            sources,
          },
          fieldStatus: leadsResponse?.fieldStatus,
        },
        '[DONE]',
      ),
    );
  }

  // =============================================
  // RETURNING USER CONTEXT + SUMMARY INJECTION
  // Extracted helper — called from getAnswerStreamV2
  // =============================================

  /**
   * Detects if the current query contains a known email/phone from leads.
   * If found, builds a personalized context block (identity + conversation
   * summary based on IsLeadType) and returns an enriched prompt string.
   */

  private async buildReturningUserPrompt(
    query: string,
    sessionData: any,
  ): Promise<string> {
    const emailMatch = query.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );
    const phoneMatch = query.match(/(\+?\d[\d\s\-().]{7,}\d)/);

    const extractedEmail = emailMatch?.[0] || null;
    const extractedPhone = phoneMatch?.[0]?.replace(/\s/g, '') || null;

    const basePrompt: string = sessionData.prompt || DEFAULT_CHATGPT_PROMPT;

    // if no identifiers found just return base prompt
    if (!extractedEmail && !extractedPhone) {
      return basePrompt;
    }

    try {
      Logger.log(
        `[ReturningUser] Checking lead - email: ${extractedEmail}, phone: ${extractedPhone}`,
      );

      const orConditions: any[] = [];
      if (extractedEmail) orConditions.push({ email: extractedEmail });
      // if (extractedPhone) orConditions.push({ phone: extractedPhone });

      const existingLead = await this.kbDbService.getLeadByEmailORPhone(
        { $or: orConditions },
        sessionData.userId.toHexString(),
      );

      if (!existingLead) {
        Logger.debug('[ReturningUser] No existing lead found - new user');
        return basePrompt;
      }

      Logger.log(
        `[ReturningUser] Found lead - IsLeadType: ${existingLead.IsLeadType}, createdAt: ${existingLead.createdAt}`,
      );

      const conversationSummaryText = await this.buildConversationSummary(
        existingLead,
      );

      const identityLines = this.buildIdentityLines(existingLead);

      const summarySection = conversationSummaryText
        ? `[PREVIOUS CONVERSATION SUMMARY]\n${conversationSummaryText}\n[END SUMMARY]`
        : '';

      const returningUserBlock = [
        '[RETURNING USER CONTEXT]',
        ...identityLines,
        '',
        summarySection,
        '',
        'Instructions for AI:',
        '- This is a returning user. You MUST greet them warmly by name if name is available.',
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
        '- Do NOT expose raw field names, JSON, enum values, or ISO timestamps.',
        '- Convert all dates to human-readable format.',
        '- Keep tone warm, professional, and natural.',
        '[END RETURNING USER CONTEXT]',
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      // 🔹 Parse base JSON prompt safely
      let parsedPrompt: any[];
      try {
        parsedPrompt = JSON.parse(basePrompt);
      } catch (err) {
        Logger.error('[ReturningUser] Invalid prompt JSON');
        return basePrompt;
      }

      // 🔹 Inject returning context as system message
      const returningContextMessage = {
        role: 'system',
        content: returningUserBlock,
      };

      // Insert before the last user message if exists
      const userIndex = parsedPrompt.findIndex((p) => p.role === 'user');

      if (userIndex !== -1) {
        parsedPrompt.splice(userIndex, 0, returningContextMessage);
      } else {
        parsedPrompt.push(returningContextMessage);
      }

      const enrichedPrompt = JSON.stringify(parsedPrompt);

      Logger.log('[ReturningUser] Context successfully injected into prompt');

      return enrichedPrompt;
    } catch (err) {
      Logger.warn(
        '[ReturningUser] Error building context (non-blocking):',
        err,
      );
      return basePrompt;
    }
  }

  // ─────────────────────────────────────────────
  // Builds conversation summary text based on IsLeadType:
  //   voiceBot   → callSummery (plain string)
  //   chatBot    → messages from chatSession via chatSessionId
  //   mailBot    → emailConversation via emailConversationId
  //   zapierCrm  → chatMessage array on the lead itself
  // ─────────────────────────────────────────────
  async buildConversationSummary(existingLead: any): Promise<string> {
    try {
      if (existingLead.IsLeadType === IsLeadType.voiceBot) {
        // VoiceBot: callSummery is a plain string stored directly on lead
        return existingLead?.callSummery?.trim() || '';
      } else if (existingLead.IsLeadType === IsLeadType.chatBot) {
        // ChatBot: fetch messages from chat session via chatSessionId
        if (!existingLead?.chatSessionId) {
          Logger.warn('[ReturningUser] chatBot lead missing chatSessionId');
          return '';
        }
        const chatSession = await this.kbDbService.getChatSessionById(
          existingLead.chatSessionId,
        );
        if (!chatSession?.messages || !Array.isArray(chatSession.messages)) {
          return '';
        }
        return this.formatChatMessages(chatSession.messages);
      } else if (existingLead.IsLeadType === IsLeadType.mailBot) {
        // MailBot: fetch email conversation via emailConversationId
        if (!existingLead?.emailConversationId) {
          Logger.warn(
            '[ReturningUser] mailBot lead missing emailConversationId',
          );
          return '';
        }
        const emailConversation = await this.kbDbService.getConversationById(
          existingLead.emailConversationId,
        );
        if (!emailConversation) {
          Logger.warn('[ReturningUser] mailBot - no conversation found for id');
          return '';
        }
        // emailConversation.emailConversation is the nested turns array
        const turns = emailConversation.emailConversation;
        if (!Array.isArray(turns) || turns.length === 0) {
          return '';
        }
        return this.formatEmailConversation(
          turns,
          emailConversation.subject || '',
          emailConversation.audienceEmailId || '',
        );
      } else if (existingLead.IsLeadType === IsLeadType.zapierCrm) {
        // ZapierCrm: chatMessage[] on lead, shape: { query }
        // NOTE: chatMessage can be null even if the field exists
        if (
          !existingLead.chatMessage ||
          !Array.isArray(existingLead.chatMessage) ||
          existingLead.chatMessage?.length === 0
        ) {
          return '';
        }
        return this.formatZapierMessages(existingLead.chatMessage);
      }
    } catch (err) {
      Logger.warn('[ReturningUser] Error building conversation summary:', err);
    }
    return '';
  }

  // ─────────────────────────────────────────────
  // Formats a messages array into readable turn-by-turn text.
  // Handles 3 shapes: {q, a} | {role, content} | plain object
  // Filters out null/undefined entries before mapping.
  // ─────────────────────────────────────────────
  private formatChatMessages(messages: any[]): string {
    return messages
      .filter(
        (msg) => msg !== null && msg !== undefined && typeof msg === 'object',
      )
      .slice(0, 20) // cap at 20 turns to avoid token overflow
      .map((msg: any, i: number) => {
        try {
          if (msg.q !== undefined || msg.a !== undefined) {
            return `  Turn ${i + 1} — User: ${msg.q || ''} | Bot: ${
              msg.a || ''
            }`;
          } else if (msg.role !== undefined && msg.content !== undefined) {
            return `  Turn ${i + 1} — ${msg.role}: ${msg.content}`;
          } else {
            return `  Turn ${i + 1}: ${JSON.stringify(msg)}`;
          }
        } catch {
          return '';
        }
      })
      .filter(Boolean)
      .join('\n');
  }

  private formatZapierMessages(messages: any[]): string {
    return messages
      .filter(
        (msg) => msg !== null && msg !== undefined && typeof msg === 'object',
      )
      .slice(0, 20)
      .map((msg: any, i: number) => {
        try {
          // ZapierCrm uses 'query' key instead of 'q'
          const userQuery = msg.query || msg.q || '';
          if (!userQuery) return '';
          return `  Message ${i + 1} — User: ${userQuery}`;
        } catch {
          return '';
        }
      })
      .filter(Boolean)
      .join('\n');
  }

  private formatEmailConversation(
    turns: any[],
    subject: string,
    audienceEmail: string,
  ): string {
    const lines: string[] = [];

    if (subject) lines.push(`Subject: ${subject}`);
    if (audienceEmail) lines.push(`Contact email: ${audienceEmail}`);
    lines.push('');

    turns
      .filter((t) => t !== null && t !== undefined && typeof t === 'object')
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
            ? 'EmailBot (auto-reply)'
            : 'EmailBot';
          const ts = turn.dateAndTime
            ? ` [${new Date(turn.dateAndTime).toLocaleString()}]`
            : '';

          lines.push(`  Email ${i + 1}${ts} — ${direction}: ${rawText}`);
        } catch {}
      });

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────
  // Builds identity lines array from lead profile fields
  // ─────────────────────────────────────────────
  private buildIdentityLines(existingLead: any): string[] {
    const lines: string[] = [];

    if (existingLead.IsLeadType) {
      lines.push(
        `This user previously interacted via: ${existingLead.IsLeadType}`,
      );
    }
    if (existingLead.name) {
      lines.push(`Name: ${existingLead.name}`);
    }
    if (existingLead?.firstName || existingLead?.lastName) {
      lines.push(
        `Full Name: ${[existingLead?.firstName, existingLead?.lastName]
          .filter(Boolean)
          .join(' ')}`,
      );
    }
    if (existingLead?.email) {
      lines.push(`Email: ${existingLead.email}`);
    }
    if (existingLead.phone) {
      lines.push(`Phone: ${existingLead.phone}`);
    }
    if (existingLead.createdAt) {
      lines.push(
        `First visited on: ${new Date(
          existingLead.createdAt,
        ).toLocaleString()}`,
      );
    }
    if (existingLead.updatedAt) {
      lines.push(
        `Last visited on: ${new Date(existingLead.updatedAt).toLocaleString()}`,
      );
    }
    if (existingLead.isAppointmentBooked && existingLead.meetingDateAndTime) {
      lines.push(
        `Appointment booked on: ${new Date(
          existingLead.meetingDateAndTime,
        ).toLocaleString()}`,
      );
    }
    if (existingLead.campaignDetails?.campaignName) {
      lines.push(
        `Previous campaign: ${existingLead.campaignDetails.campaignName}`,
      );
    }
    return lines;
  }
}
