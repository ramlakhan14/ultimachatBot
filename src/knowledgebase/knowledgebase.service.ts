import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import { isAdmin } from '../auth/guards/role.enum';
import {
  CELERY_CLIENT,
  CeleryClientQueue,
  CeleryClientService,
} from '../common/celery/celery-client.module';
import { CrawlConfig } from '../importers/crawler/crawlee/crawler.types';
import { SubscriptionPlanInfoService } from '../subscription/subscription-plan.service';
import { UserSparse } from '../user/user.schema';
import {
  AssistantType,
  DEFAULT_CHATGPT_PROMPT,
  DEMO_CHATGPT_PROMPT,
  VAKMANGIDS_CHATBOT_PROMPT,
} from './chatbot/openaiChatbot.constant';
import { KnowledgebaseDbService } from './knowledgebase-db.service';
import { checkUserIsOwnerOfKb } from './knowledgebase-utils';
import {
  ChatWidgetDataDTO,
  CreateKnowledgebaseDTO,
  UpdateKnowledgebaseWebsiteDataDTO,
} from './knowledgebase.dto';
import {
  CustomKeyData,
  DataStoreType,
  Knowledgebase,
  KnowledgebaseStatus,
  WebsiteProject,
} from './knowledgebase.schema';
import { CustomKeyService } from './custom-key.service';
import { UserService } from '../user/user.service';
import { Role } from '../auth/types/role.enum';
import { AppConfigService } from '../common/config/appConfig.service';
import { GoogleCalenderService } from './googleCalender/googleCalender.service';
import { MONGODB } from '../common/mongo/mongo.module';
import axios from 'axios';

@Injectable()
export class KnowledgebaseService implements OnModuleInit {
  private CHATBOT_TYPE = 'vakmangids';
  constructor(
    @Inject(CELERY_CLIENT) private celeryClient: CeleryClientService,
    @Inject(MONGODB) private db: Db,
    private kbDbService: KnowledgebaseDbService,
    private subPlanInfoService: SubscriptionPlanInfoService,
    private customKeyService: CustomKeyService,
    private readonly userService: UserService,
    private appConfig: AppConfigService,
    private googleCalenderService: GoogleCalenderService,
  ) {}

  /*********************************************************
   * KNOWLEDGEBASE CREATION AND CRAWLING
   *********************************************************/

  async onModuleInit() {
    await this.seedPreferredKnbByBots();
  }

  private async crawlWebsiteForKb(
    kbId: ObjectId,
    websiteData: Knowledgebase['websiteData'],
    maxPages: number,
    useAlternateParser = false,
  ) {
    const baseUrl = new URL(websiteData.websiteUrl).origin;

    const includeUrlsForInit = websiteData.include.map((u) => `${baseUrl}${u}`);

    const data: CrawlConfig = {
      urls: [
        websiteData.websiteUrl,
        ...websiteData.urls,
        ...includeUrlsForInit,
      ],
      // When no include filters are provided, default to the full domain wildcard
      // so Crawlee's enqueueLinks follows all same-origin links.
      include:
        websiteData.include.length > 0
          ? websiteData.include.flatMap((u) => [
              `${baseUrl}${u}`,
              `${baseUrl}${u}/**/*`,
            ])
          : [`${baseUrl}/**`],
      exclude: websiteData.exclude.flatMap((u) => [
        `${baseUrl}${u}`,
        `${baseUrl}${u}/**/*`,
      ]),
      maxPages,
    };

    // Exclude other file types
    data.exclude.push(`${baseUrl}/**/*.mp3`);

    const client = this.celeryClient.get(CeleryClientQueue.CRAWLER);
    const task = client.createTask('tasks.crawl');
    task.applyAsync([data, kbId.toString(), 1, useAlternateParser]);

    await this.kbDbService.updateKnowledgebaseStatus(
      kbId,
      KnowledgebaseStatus.CRAWLING,
    );
  }

  /**
   * Clean website data urls
   * - websiteUrl, urls: This should be a valid url and should not have trailing /
   * - include, exclude: This should being with a slash
   * @param data
   * @returns
   */
  public cleanWebsiteData(
    data: Knowledgebase['websiteData'],
  ): Knowledgebase['websiteData'] {
    function validateUrl(url: string): string {
      if (!(url.startsWith('http://') || url.startsWith('https://'))) {
        throw new HttpException(`Invalid Url ${url}`, HttpStatus.BAD_REQUEST);
      }

      // Remove any trailing slashes
      url = url.replace(/\/+$/, '');

      return url;
    }

    function validatePath(path: string): string {
      // Ensure / in the beginning
      if (path[0] !== '/') {
        path = '/' + path;
      }

      // Remove any slashes at the end
      path = path.replace(/\/+$/, '');

      return path;
    }

    // Ensure website url and urls is well formed
    data.websiteUrl = validateUrl(data.websiteUrl);
    data.urls = data.urls.map(validateUrl);

    data.include = data.include.map(validatePath);
    data.exclude = data.exclude.map(validatePath);

    return data;
  }

  /**
   * Normalize URL
   * - add https if missing
   * - remove trailing slash
   */
  normalizeUrl(url: string): string {
    url = url.trim();

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const parsed = new URL(url);

    return parsed.origin;
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if website is reachable
   */
  async isWebsiteReachable(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
      });

      if (response.status < 400 || response.status === 405) {
        return true;
      }
    } catch (headErr: any) {
      const status = headErr?.response?.status;
      if (status !== 405 && status !== 403 && status !== 501) {
      }
    }

    try {
      const response = await axios.get(url, {
        timeout: 8000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
        responseType: 'stream',
      });
      response.data.destroy();
      return response.status < 400;
    } catch (getErr: any) {
      const status = getErr?.response?.status;
      if (status) {
        return status < 500;
      }
      return false;
    }
  }

  /**
   * Create a new knowledgebase and crawl urls
   * @param user
   * @param data
   * @returns
   */
  async createKnowledgebase(
    user: UserSparse,
    data: CreateKnowledgebaseDTO,
    scrap = false,
  ) {
    const isAdminUser = isAdmin(user);

    // Validate plan & limits (single source of truth)
    const subscriptionData = this.getUserSubscriptionData(user);

    const kbCount = await this.kbDbService.getKnowledgebaseCountForUser(
      user._id,
    );

    if (!data.websiteUrl) {
      throw new BadRequestException('Website URL is required.');
    }

    // Normalize URL
    let websiteURL = this.normalizeUrl(data.websiteUrl);

    // Validate URL format
    if (!this.isValidUrl(websiteURL)) {
      throw new BadRequestException('Please enter a valid website URL.');
    }

    // Check if website is reachable
    const reachable = await this.isWebsiteReachable(websiteURL);

    if (!reachable) {
      throw new BadRequestException(
        'The website URL is not reachable. Please enter a valid website.',
      );
    }

    // Check existing project
    const isExistingProject =
      await this.kbDbService.getKnowledgebaseByWebsiteUrl(websiteURL, user._id);
    if (isExistingProject) {
      throw new BadRequestException('This domain already exists');
    }

    if (!isAdminUser && kbCount >= subscriptionData.maxBots) {
      throw new BadRequestException(
        'You have reached the maximum number of knowledgebases for your plan. Please upgrade.',
      );
    }

    const websiteData: Knowledgebase['websiteData'] = websiteURL
      ? this.cleanWebsiteData({
          websiteUrl: websiteURL,
          urls: data.urls,
          include: data.include,
          exclude: data.exclude,
        })
      : undefined;

    const now = new Date();
    const kb: Knowledgebase = {
      name: data.name,
      owner: user._id,
      status: KnowledgebaseStatus.CREATED,
      websiteData,
      createdAt: now,
      updatedAt: now,
      lastCrawlAt: now,
      isChatbotEnabled: !!data.isChatbotEnabled,
      isScrapedLeadProject: data?.isScrapedLeadProject || false,
    };

    const kbData = await this.kbDbService.insertKnowledgebase(kb);
    if (data.isChatbotEnabled) {
      await this.userService.checkBotMaxLimitAndCreate(
        user._id,
        'chatbot',
        kbData._id,
      );
    }
    if (websiteData) {
      const maxPages = scrap
        ? this.appConfig.get('visitorMaxPages')
        : isAdminUser
        ? 2000
        : subscriptionData.maxPages;

      await this.crawlWebsiteForKb(
        kbData._id,
        websiteData,
        maxPages,
        data.useAlternateParser,
      );
    }

    return kbData;
  }

  async createKnowledgebaseForVisitors(data: CreateKnowledgebaseDTO) {
    const websiteData: Knowledgebase['websiteData'] = data.websiteUrl
      ? this.cleanWebsiteData({
          websiteUrl: data.websiteUrl,
          urls: data.urls,
          include: data.include,
          exclude: data.exclude,
        })
      : undefined;

    // Create a new Kb in db
    const ts = new Date();
    const kb: Knowledgebase = {
      name: data.name,
      owner: data.owner
        ? new ObjectId(data.owner)
        : new ObjectId('66d92ebb9944525e612535c4'),
      status: KnowledgebaseStatus.CREATED,
      websiteData,
      createdAt: ts,
      updatedAt: ts,
      chatbotType: data.chatbotType,
      chatWidgeData: data.chatWidgetData,
    };

    if (data.chatbotType === 'vakmangids') {
      kb.adminEmail = this.appConfig.get('vakmangidsAdminEmail');
    }

    const kbData = await this.kbDbService.insertKnowledgebase(kb);
    // Start crawling
    if (websiteData) {
      const maxPages = this.appConfig.get('visitorMaxPages');
      await this.crawlWebsiteForKb(
        kbData._id,
        websiteData,
        maxPages,
        data.useAlternateParser,
      );
    }

    return kbData;
  }

  async getKnowledgeBaseDetailForVisitors(id: string) {
    const kb = await this.kbDbService.getKnowledgebaseById(new ObjectId(id));
    // Set Default prompt if knowledgebase prompt is not defined

    Logger.log(
      '****************************************getKnowledgeBaseDetailForVisitors:- DEMO_CHATGPT_PROMPT***************************************',
    );
    if (!kb.prompt) {
      kb.prompt = DEFAULT_CHATGPT_PROMPT;
    }

    const calenderData =
      await this.googleCalenderService.findCalenderSettingByKbid(
        kb._id.toHexString(),
      );
    Logger.log(
      'Calendar data from knowledgebase service getKnowledgeBaseDetailForVisitors method:',
      calenderData,
    );

    if (calenderData && calenderData.isActive) {
      Logger.log(
        '****************************************getKnowledgeBaseDetailForVisitors:- DEMO_CHATGPT_PROMPT***************************************',
        DEMO_CHATGPT_PROMPT,
      );
      kb.prompt = DEMO_CHATGPT_PROMPT;
    }

    kb.prompt = this.getBaseSystemMsgFromPrompt(kb.prompt);

    return kb;
  }
  /**
   * Update website data urls for Knowledgebase and recrawl
   * @param user
   * @param data
   * @returns
   */
  async updateKnowledgebaseWebsiteData(
    user: UserSparse,
    id: string,
    data: UpdateKnowledgebaseWebsiteDataDTO,
  ) {
    const kbId = new ObjectId(id);
    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
      checkUserIsOwnerOfKb(user, kb);
    }

    if (
      kb.status === KnowledgebaseStatus.CRAWLING ||
      kb.status === KnowledgebaseStatus.GENERATING_EMBEDDINGS
    ) {
      throw new HttpException(
        'Knowledgebase already in training',
        HttpStatus.BAD_REQUEST,
      );
    }

    const subscriptionData = this.getUserSubscriptionData(user);

    const websiteData: Knowledgebase['websiteData'] = this.cleanWebsiteData({
      websiteUrl: data.websiteUrl,
      urls: data.urls,
      include: data.include,
      exclude: data.exclude,
    });

      await Promise.all([
      this.kbDbService.deleteKbDataStoreItemsForKnowledgebase(
        kbId,
        DataStoreType.WEBPAGE,
      ),
      this.kbDbService.deleteChunksForKnowledgebase(
        kbId,
        DataStoreType.WEBPAGE,
      ),
      this.kbDbService.deleteKbEmbeddingsForKnowledgebase(
        kbId,
        DataStoreType.WEBPAGE,
      ),
    ]);

    const updateData: Partial<Knowledgebase> = {
      status: KnowledgebaseStatus.CREATED,
      websiteData,
    };

    // Update data in db
    await this.kbDbService.updateKnowledgebase(kbId, updateData);

    const updatedData = { ...kb, ...updateData };

    // Start crawling
    const maxPages =
      isAdmin(user) && kb.chatbotType == 'vakmangids'
        ? this.appConfig.get('visitorMaxPages')
        : isAdmin(user) && kb.chatbotType != 'vakmangids'
        ? 2000
        : subscriptionData.maxPages;
    await this.crawlWebsiteForKb(
      kbId,
      websiteData,
      maxPages,
      data.useAlternateParser,
    );

    return updatedData;
  }

  /**
   * Start generating embeddings for Knowledgebase
   * @param user
   * @param id
   */
  async generateEmbeddingsForKnowledgebase(user: UserSparse, id: string) {
    const kbId = new ObjectId(id);

    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
      checkUserIsOwnerOfKb(user, kb);
    }
    if (
      kb.status === KnowledgebaseStatus.CRAWLING ||
      kb.status === KnowledgebaseStatus.GENERATING_EMBEDDINGS
    ) {
      throw new HttpException(
        'Knowledgebase already in training',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.kbDbService.updateKnowledgebaseStatus(
      kbId,
      KnowledgebaseStatus.GENERATING_EMBEDDINGS,
    );

    const client = this.celeryClient.get(CeleryClientQueue.CRAWLER);
    const task = client.createTask('tasks.gen_embeddings');
    task.applyAsync([kbId.toString()]);
  }

  async generateEmbeddingsForKnowledgebaseVisitors(id: string) {
    const kbId = new ObjectId(id);

    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (
      kb.status === KnowledgebaseStatus.CRAWLING ||
      kb.status === KnowledgebaseStatus.GENERATING_EMBEDDINGS
    ) {
      throw new HttpException(
        'Knowledgebase already in training',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.kbDbService.updateKnowledgebaseStatus(
      kbId,
      KnowledgebaseStatus.GENERATING_EMBEDDINGS,
    );

    const client = this.celeryClient.get(CeleryClientQueue.CRAWLER);
    const task = client.createTask('tasks.gen_embeddings');
    task.applyAsync([kbId.toString()]);
  }

  /*********************************************************
   * KNOWLEDGEBASE APIS
   *********************************************************/

  private getUserSubscriptionData(user: UserSparse): any {
    const userPlan = user.activeSubscription;
    return this.subPlanInfoService.getSubscriptionPlanInfo(userPlan);
  }

  private getBaseSystemMsgFromPrompt(prompt: string): string {
    try {
      const promptJson = JSON.parse(prompt);
      const systemMsg = promptJson[0].content;
      const baseMsg = systemMsg.split('\n\nContext Sections')[0];
      return baseMsg;
    } catch {
      return undefined;
    }
  }

  private constructPromptFromBaseSystemMsg(msg: string): string {
    const prompt = JSON.parse(DEFAULT_CHATGPT_PROMPT);
    //TODO: Add calender prompt if calender is active if it has been getting used somewhere. //case got handle where it getting called.
    const baseMsg: string[] = prompt[0].content.split('\n\nContext Sections');
    baseMsg[0] = msg;
    prompt[0].content = baseMsg.join('\n\nContext Sections');
    return JSON.stringify(prompt);
  }

  /**
   * Get all knowledgebases for user
   * @param user
   * @param limit Optional limit for pagination
   * @param offset Optional offset for pagination
   * @returns
   */
  async listKnowledgebasesForUser(
    user: UserSparse,
    limit?: number,
    page?: number,
    search?: string,
    isChatbotEnabled?: string,
    isScrapedLeadProject?: string,
  ) {
    const kbs = await this.kbDbService.getKnowledgesbaseListForUser(
      user._id,
      limit,
      page,
      search,
      isChatbotEnabled,
      isScrapedLeadProject,
    );

    if (limit && page !== undefined) {
      const total = await this.kbDbService.getKnowledgebaseCountForUser(
        user._id,
        search,
        isChatbotEnabled,
        isScrapedLeadProject,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Knowledgebases fetched successfully',
        data: kbs,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Knowledgebases fetched successfully',
      data: kbs,
    };
  }

  async listAllKnowledgebasesForAdmin(user: UserSparse) {
    const adminStatus = isAdmin(user);
    if (adminStatus) {
      return await this.kbDbService.getKnowledgebasesListForAdmin();
    }
  }

  /**
   * Get knowledgebase detail data
   * @param user
   * @param id
   * @returns
   */
  async getKnowledgeBaseDetail(user: UserSparse, id: string) {
    const kb = await this.kbDbService.getKnowledgebaseById(new ObjectId(id));
    if (user.role != Role.Admin) {
      checkUserIsOwnerOfKb(user, kb);
    }
    // Set Default prompt if knowledgebase prompt is not defined

    if (!kb.prompt) {
      kb.prompt =
        kb.chatbotType == this.CHATBOT_TYPE
          ? VAKMANGIDS_CHATBOT_PROMPT
          : DEFAULT_CHATGPT_PROMPT;
    }

    const calenderData =
      await this.googleCalenderService.findCalenderSettingByKbid(
        kb._id.toHexString(),
      );

    if (calenderData && calenderData.isActive) {
      kb.prompt =
        kb.chatbotType == this.CHATBOT_TYPE
          ? VAKMANGIDS_CHATBOT_PROMPT
          : DEMO_CHATGPT_PROMPT;
    }

    kb.prompt = this.getBaseSystemMsgFromPrompt(kb.prompt);
    return kb;
  }

  /**
   * Admin API to set Knowledgebase as a Demo KB
   * @param kbId
   */
  async setKnowledgebaseAsDemo(user: UserSparse, knowledgebaseId: string) {
    const kbId = new ObjectId(knowledgebaseId);

    // Update the knowledgebase (also verify that the kb belongs to the admin user)
    const res = await this.kbDbService.updateKnowledgebase(kbId, {
      isDemo: true,
    });

    if (res.modifiedCount === 0) {
      throw new HttpException('Invalid Knowledgebase', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Delete knowledgebase and all its data
   * @param user
   * @param id
   */
  async deleteKnowledgebaseForUser(user: UserSparse, id: string) {
    const kbId = new ObjectId(id);

    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (user.role != Role.Admin) {
      checkUserIsOwnerOfKb(user, kb);
    }
    await Promise.all([
      this.kbDbService.deleteKnowledgebase(kbId),
      this.kbDbService.deleteKbDataStoreItemsForKnowledgebase(kbId),
      this.kbDbService.deleteChunksForKnowledgebase(kbId),
      this.kbDbService.deleteKbEmbeddingsForKnowledgebase(kbId),
    ]);
  }

  /**
   * Set chat widge data for Knowledgebase
   * @param user
   * @param id
   * @param data
   */
  async setKnowledgebaseChatWidgeData(
    user: UserSparse,
    id: string,
    data: ChatWidgetDataDTO,
  ) {
    const kbId = new ObjectId(id);

    const knowledgebase = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    let updatedPrompt;
    if (
      knowledgebase?.chatbotType === 'vakmangids' &&
      data?.prompt
    ) {
      updatedPrompt = this.constructPromptFromBaseSystemMsg(data.prompt);
    }

    await this.kbDbService.setKnowledgebaseChatWidgetData(kbId, data, updatedPrompt);
  }

  /**
   * Get Chat widget data for Knowledgebase
   * @param id kk
   * @returns
   */
  async getKnowledgebaseChatWidgetData(id: string) {
    let kbId: ObjectId;
    try {
      kbId = new ObjectId(id);
    } catch {
      throw new HttpException('Invalid Knowledgebase Id', HttpStatus.NOT_FOUND);
    }

    const kbData = await this.kbDbService.getKnowledgebaseById(kbId);
    if (!kbData) {
      throw new HttpException('Invalid Knowledgebase Id', HttpStatus.NOT_FOUND);
    }

    // const userData = await this.userService.findUserById(
    //   kbData.owner.toHexString(),
    // );

    // const whitelabelling = {
    //   removeBranding: userData.whitelabelling?.removeBranding || false,
    // };

    // if (
    //   userData.activeSubscription === Subscription.APPSUMO_TIER3 &&
    //   userData.customKeys?.useOwnKey === true
    // ) {
    //   whitelabelling.removeBranding = true;
    // }

    const widgetData = {
      id,
      chatWidgeData: kbData.chatWidgeData,
      chatbotType: kbData?.chatbotType,
      // customKey: userData.customKeys?.useOwnKey,
      // whitelabelling,
    };

    return widgetData;
  }

  async getChatWidgetDataForDomain(domain: string) {
    // Get knowldgebase from domain
    const kb = await this.kbDbService.getKnowledgebaseSparseByDomain(domain);
    if (!kb) {
      throw new HttpException('Invalid Domain', HttpStatus.NOT_FOUND);
    }

    return this.getKnowledgebaseChatWidgetData(kb._id.toHexString());
  }

  /**
   * Set / Unset the defaultAnswer for the knowledgebase
   * @param user
   * @param id
   * @param defaultAnswer
   * @returns
   */
  async setKnowledgebaseDefaultAnswer(
    user: UserSparse,
    id: string,
    defaultAnswer?: string,
  ) {
    const kbId = new ObjectId(id);

    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
      checkUserIsOwnerOfKb(user, kb);
    }

    await this.kbDbService.updateKnowledgebase(kbId, {
      defaultAnswer,
    });
  }

  async setKnowledgebasePrompt(user: UserSparse, id: string, prompt: string) {
    const kbId = new ObjectId(id);

    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);

    if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
      checkUserIsOwnerOfKb(user, kb);
    }

    prompt = this.constructPromptFromBaseSystemMsg(prompt);

    const calenderData =
      await this.googleCalenderService.findCalenderSettingByKbid(
        kb._id.toHexString(),
      );
    Logger.log(
      'Calendar data from knowledgebase service setKnowledgebasePrompt method:',
      calenderData,
    );

    if (calenderData && calenderData.isActive) {
      prompt = DEMO_CHATGPT_PROMPT;
    }
    await this.kbDbService.updateKnowledgebase(kbId, {
      prompt,
    });

    return 'Done';
  }

  async setToDefaultPrompt(user: UserSparse, id: string) {
    const kb = await this.kbDbService.getKnowledgebaseById(new ObjectId(id));
    if (user.role != Role.Admin) {
      checkUserIsOwnerOfKb(user, kb);
    }

    Logger.log(
      '****************************************setToDefaultPrompt:- DEFAULT_CHATGPT_PROMPT***************************************',
    );

    const prompt = DEFAULT_CHATGPT_PROMPT;

    const calenderData =
      await this.googleCalenderService.findCalenderSettingByKbid(
        kb._id.toHexString(),
      );
    Logger.log(
      'Calendar data from knowledgebase service setToDefaultPrompt method:',
      calenderData,
    );

    if (calenderData && calenderData.isActive) {
      Logger.log(
        '****************************************setToDefaultPrompt:- DEMO_CHATGPT_PROMPT***************************************',
      );
      kb.prompt = DEMO_CHATGPT_PROMPT;
    }

    await this.kbDbService.updateKnowledgebase(new ObjectId(id), { prompt });
    return { message: 'Prompt Set To Default Succcessfully' };
  }

  async setUserCustomKeys(
    user: UserSparse,
    id: string,
    keyData: CustomKeyData,
  ) {
    const encryptedKeys = this.customKeyService.encryptCustomKeys(keyData.keys);

    await this.userService.setUserCustomKeys(user._id, {
      useOwnKey: keyData.useOwnKey,
      keys: encryptedKeys,
    });
  }

  async setKnowledgebaseAdminEmail(
    user: UserSparse,
    id: string,
    email: string,
  ) {
    const kbId = new ObjectId(id);
    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
      checkUserIsOwnerOfKb(user, kb);
    }

    await this.kbDbService.updateKnowledgebase(kbId, { adminEmail: email });
  }

  /**
   * Set custom domain for kb
   * @param user
   * @param id
   * @param domain
   * @returns
   */
  async setCustomDomain(user: UserSparse, id: string, domain: string) {
    const kbId = new ObjectId(id);
    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    checkUserIsOwnerOfKb(user, kb);

    await this.kbDbService.updateKnowledgebase(kbId, {
      customDomain: domain,
    });

    return 'Done';
  }

  // get leads data according to knowledgebase
  async getLeadGenerationData(
    user: UserSparse,
    id: string,
    pageSize?: number,
    page?: number,
    sort?: number,
    searchQuery?: string,
  ) {
    const kbId = new ObjectId(id);
    const kb = await this.kbDbService.getKnowledgebaseSparseById(kbId);
    if (user.role != Role.Admin) {
      checkUserIsOwnerOfKb(user, kb);
    }
    return await this.kbDbService.getLeadsDataInfoV2(
      kbId,
      pageSize,
      page,
      sort,
      searchQuery,
    );
  }

  async seedPreferredKnbByBots() {
    const collection = this.db.collection('preferredknbbybots');

    const defaults = [
      { botName: AssistantType.CHATBOT, preferredKNB: DataStoreType.WEBPAGE },
      { botName: AssistantType.VOICEBOT, preferredKNB: DataStoreType.DOCUMENT },
      {
        botName: AssistantType.EMAIL_ASSISTANT,
        preferredKNB: DataStoreType.CUSTOM,
      },
    ];

    for (const item of defaults) {
      await collection.updateOne(
        { botName: item.botName },
        { $setOnInsert: item },
        { upsert: true },
      );
    }
  }
}
