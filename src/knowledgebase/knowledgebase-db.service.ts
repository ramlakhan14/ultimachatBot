import { HttpException, HttpStatus, Inject, Injectable , Logger } from '@nestjs/common';
import { Collection, Db, FindCursor, ObjectId, WithId } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import { getLimitOffsetPaginatedResponse } from '../common/utils';
import {
  ChatQueryAnswer,
  ChatSession,
  CHAT_SESSION_COLLECTION,
  Chunk,
  ChunkStatus,
  CHUNK_COLLECTION,
  DataStoreStatus,
  DataStoreType,
  KbDataStore,
  KbEmbedding,
  KB_DATASTORE_COLLECTION,
  KB_EMBEDDING_COLLECTION,
  Knowledgebase,
  KnowledgebaseSparse,
  KnowledgebaseStatus,
  KNOWLEDGEBASE_COLLECTION,
  Prompt,
  PROMPT_COLLECTION,
  ChatSessionSparse,
  ChatAnswerFeedbackType,
  LEADS_COLLECTION,
  Lead,
  IsLeadType,
} from './knowledgebase.schema';
import { EmailService } from '../common/email/email.service';
import { UserService } from '../user/user.service';
import { AppConfigService } from '../common/config/appConfig.service';
import { OpenaiService } from '../openai/openai.service';
import Redis from 'ioredis';
import { REDIS } from '../common/redis/redis.module';
import {
  USER_ZAPIER_WEBHOOK_COLLECTION,
  UserZapierWebhook,
} from '../zapier-webhook/schema/userZapierWebhook.schema';
import { ZapierWebhookService } from '../zapier-webhook/zapier-webhook.service';
import thankYouMailTemplate from '../common/email/templates/thankYouMail';
import { GPTModels } from '../campaign/enum/enum';
import {
  CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
  CampaignEmailConversation,
} from '../campaign/schema/campaignEmailConversation.schema';

const CHAT_SESION_EXPIRY_TIME = 10 * 60;

@Injectable()
export class KnowledgebaseDbService {
  private readonly logger = new Logger('KnowledgebaseDbService');

  private readonly knowledgebaseCollection: Collection<Knowledgebase>;
  private readonly kbDataStoreCollection: Collection<KbDataStore>;
  private readonly chunkColleciton: Collection<Chunk>;
  private readonly kbEmbeddingCollection: Collection<KbEmbedding>;
  private readonly chatSessionCollection: Collection<ChatSession>;
  private readonly promptCollection: Collection<Prompt>;
  private readonly leadCollection: Collection<Lead>;
  private readonly userZapierWebhookCollection: Collection<UserZapierWebhook>;
  private readonly emailConversationCollection: Collection<CampaignEmailConversation>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private emailService: EmailService,
    private userService: UserService,
    private readonly appConfig: AppConfigService,
    private readonly openaiService: OpenaiService,
    private readonly zapierWebhookService: ZapierWebhookService,
    @Inject(REDIS) private redis: Redis,
  ) {
    this.emailConversationCollection = this.db.collection(
      CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
    );
    this.knowledgebaseCollection = this.db.collection<Knowledgebase>(
      KNOWLEDGEBASE_COLLECTION,
    );
    this.kbDataStoreCollection = this.db.collection<KbDataStore>(
      KB_DATASTORE_COLLECTION,
    );
    this.chunkColleciton = this.db.collection<Chunk>(CHUNK_COLLECTION);
    this.kbEmbeddingCollection = this.db.collection<KbEmbedding>(
      KB_EMBEDDING_COLLECTION,
    );
    this.chatSessionCollection = this.db.collection<ChatSession>(
      CHAT_SESSION_COLLECTION,
    );
    this.promptCollection = this.db.collection<Prompt>(PROMPT_COLLECTION);
    this.leadCollection = this.db.collection<Lead>(LEADS_COLLECTION);
    this.userZapierWebhookCollection = this.db.collection<UserZapierWebhook>(
      USER_ZAPIER_WEBHOOK_COLLECTION,
    );

    // Compound index lets MongoDB satisfy both the knowledgebaseId+type filter
    // and the createdAt sort via the index alone, avoiding the in-memory sort
    // that otherwise blows the 32 MB limit when documents have large content fields.
    this.kbDataStoreCollection
      .createIndex({ knowledgebaseId: 1, type: 1, createdAt: -1 })
      .catch(() => {});
  }

  /*********************************************************
   * KNOWLEDGEBASE COLLECTION
   *********************************************************/

  async insertKnowledgebase(data: Knowledgebase): Promise<Knowledgebase> {
    const res = await this.knowledgebaseCollection.insertOne(data);

    return {
      _id: res.insertedId,
      ...data,
    };
  }

  async getKnowledgebaseByWebsiteUrl(
    websiteUrl: string,
    userId: ObjectId,
  ): Promise<Knowledgebase> {
    const cleanUrl = websiteUrl
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    const regex = new RegExp(`^(https?:\\/\\/)?(www\\.)?${cleanUrl}\\/?$`, 'i');

    return this.knowledgebaseCollection.findOne({
      'websiteData.websiteUrl': regex,
      owner: userId,
    });
  }

  async getKnowledgebaseSparseById(id: ObjectId): Promise<KnowledgebaseSparse> {
    const res = await this.knowledgebaseCollection.findOne(
      { _id: id },
      {
        projection: {
          _id: 1,
          name: 1,
          status: 1,
          monthUsage: 1,
          crawlData: 1,
          owner: 1,
          chatbotType: 1,
        },
      },
    );
    return res as KnowledgebaseSparse;
  }

  async getKnowledgebaseSparseByDomain(
    domain: string,
  ): Promise<KnowledgebaseSparse> {
    const res = await this.knowledgebaseCollection.findOne(
      { customDomain: domain },
      {
        projection: {
          _id: 1,
          name: 1,
          status: 1,
          monthUsage: 1,
          crawlData: 1,
          owner: 1,
        },
      },
    );
    return res as KnowledgebaseSparse;
  }

  async getKnowledgebaseById(id: ObjectId): Promise<Knowledgebase> {
    const res = await this.knowledgebaseCollection.findOne({ _id: id });
    return res;
  }

  async getKnowledgesbaseListForUser(
    userId: ObjectId,
    limit?: number,
    offset?: number,
    search?: string,
    isChatbotEnabled?: string,
    isScrapedLeadProject?: string,
  ): Promise<KnowledgebaseSparse[]> {
    const filter: any = { owner: userId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'websiteData.websiteUrl': { $regex: search, $options: 'i' } },
      ];
    }

    if (isChatbotEnabled === 'true' || isChatbotEnabled === 'false') {
      filter.isChatbotEnabled = isChatbotEnabled === 'true';
    }

    if (isScrapedLeadProject === 'true') {
      filter.isScrapedLeadProject = true;
    } else if (isScrapedLeadProject === 'false') {
      const nonScrapedOr = [
        { isScrapedLeadProject: false },
        { isScrapedLeadProject: { $exists: false } },
      ];

      // If search $or already exists, combine both with $and to avoid overwrite
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or }, // search condition
          { $or: nonScrapedOr }, // isScrapedLeadProject condition
        ];
        delete filter.$or;
      } else {
        filter.$or = nonScrapedOr;
      }
    }

    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'calenderSettings',
          localField: '_id',
          foreignField: 'knowledgebaseId',
          as: 'projectDetails',
        },
      },
      {
        $addFields: {
          'websiteData.calendarSettingEnabled': {
            $cond: {
              if: { $gt: [{ $size: '$projectDetails' }, 0] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          status: 1,
          monthUsage: 1,
          'crawlData.stats': 1,
          owner: 1,
          'websiteData.websiteUrl': 1,
          'websiteData.calendarSettingEnabled': 1,
          updatedAt: 1,
          lastCrawlAt: 1,
          isChatbotEnabled: 1,
          isScrapedLeadProject: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    if (limit && offset !== undefined) {
      const skip = (offset - 1) * limit;
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    const kbs = await this.knowledgebaseCollection
      .aggregate(pipeline)
      .toArray();

    return kbs as KnowledgebaseSparse[];
  }

  async getKnowledgebaseCountForUser(
    userId: ObjectId,
    search?: string,
    isChatbotEnabled?: string,
    isScrapedLeadProject?: string,
  ): Promise<number> {
    const filter: any = { owner: userId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'websiteData.websiteUrl': { $regex: search, $options: 'i' } },
      ];
    }

    if (isChatbotEnabled === 'true' || isChatbotEnabled === 'false') {
      filter.isChatbotEnabled = isChatbotEnabled === 'true';
    }

    if (isScrapedLeadProject === 'true') {
      filter.isScrapedLeadProject = true;
    } else if (isScrapedLeadProject === 'false') {
      const nonScrapedOr = [
        { isScrapedLeadProject: false },
        { isScrapedLeadProject: { $exists: false } },
      ];

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or }, // search condition
          { $or: nonScrapedOr }, // isScrapedLeadProject condition
        ];
        delete filter.$or;
      } else {
        filter.$or = nonScrapedOr;
      }
    }

    return this.knowledgebaseCollection.countDocuments(filter);
  }

  // To Enable the chatbot for the knowledgebase
  async updateKnowledgebaseChatbotEnabled(
    user,
    knowledgebaseId: string,
    isChatbotEnabled: boolean,
  ) {
    try {
      // check the exisiting knowledgebase with chatbot enabled
      const kb = await this.knowledgebaseCollection.findOne({
        _id: new ObjectId(knowledgebaseId),
        isChatbotEnabled: true,
      });
      if (!kb && isChatbotEnabled) {
        // check bot limit before enabling chatbot
        await this.userService.checkBotMaxLimitAndCreate(
          user._id,
          'chatbot',
          new ObjectId(knowledgebaseId),
        );
        await this.knowledgebaseCollection.updateOne(
          { _id: new ObjectId(knowledgebaseId) },
          {
            $set: { isChatbotEnabled: isChatbotEnabled, updatedAt: new Date() },
          },
        );
        return true;
      }
      return false;
    } catch (error) {
      throw new HttpException(
        'Failed to update chatbot enabled status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getKnowledgebasesListForAdmin() {
    try {
      const kbs = await this.knowledgebaseCollection
        .find(
          {},
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
    } catch (err) {
      throw new HttpException(
        'Failed to retrieve knowledge bases',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getKnowledgebaseChatWidgetData(id: ObjectId) {
    const widgetData = await this.knowledgebaseCollection.findOne(
      { _id: id },
      { projection: { chatWidgeData: 1 } },
    );

    return widgetData;
  }

  async updateKnowledgebaseStatus(id: ObjectId, status: KnowledgebaseStatus) {
    try {
      const knowledgebase = await this.knowledgebaseCollection.findOne({
        _id: id,
      });

      const chunks = await this.db
        .collection(CHUNK_COLLECTION)
        .find({
          knowledgebaseId: id,
          url: `${knowledgebase.websiteData.websiteUrl}/`,
        })
        .toArray();

      let projectDescription = '';
      let projectServices: string[] = [];

      if (status === KnowledgebaseStatus.READY && chunks && chunks.length > 0) {
        const combinedContent = chunks
          .map((chunk) => {
            const title = chunk.title ? `TITLE: ${chunk.title}` : '';
            const content = chunk.chunk ? `CONTENT: ${chunk.chunk}` : '';
            return `${title}\n${content}`;
          })
          .join('\n\n---\n\n')
          .slice(0, 15000);

        const prompt = [
          {
            role: 'system',
            content: `
            You are an expert business analyst specialized in extracting business information from website text.

            Your job is to extract:

            1. projectDescription
            2. projectServices

            You MUST carefully read the entire content and identify what the company/business does.

            IMPORTANT EXTRACTION RULES:

            • projectDescription:
              - Describe what the business/company does
              - Use ONLY facts present in the content
              - Write 2–5 professional sentences
              - Focus on core business, offerings, and value proposition
              - Ignore navigation, footer, copyright, menus, policies

            • projectServices:
              - Extract ONLY real services offered by the business
              - Each service must be 2–5 words max
              - Examples of valid services:
                - "Web development"
                - "Mobile app development"
                - "AI automation"
                - "Cloud consulting"
                - "Digital marketing"
              - Remove duplicates
              - Maximum 10 services

            VERY IMPORTANT:

            • DO NOT hallucinate or invent anything
            • DO NOT include emails, phone numbers, addresses
            • DO NOT include menu items like "Home", "About", "Contact"
            • DO NOT include generic words like "Welcome", "Learn more"
            • Extract from ANY relevant section including:
              - About section
              - Services section
              - Homepage intro
              - Company overview

            If the business purpose is clear, you MUST extract it.

            OUTPUT STRICTLY VALID JSON ONLY:

            {
              "projectDescription": "string",
              "projectServices": ["service1", "service2"]
            }

            If absolutely nothing useful exists, return:
            {
              "projectDescription": "",
              "projectServices": []
            }
            DO NOT include explanations.
            DO NOT include markdown.
            DO NOT include extra text.
            `,
          },
          {
            role: 'user',
            content: `Extract the business description and services from this website content: ${combinedContent}`,
          },
        ];

        try {
          const gptResponse = await this.openaiService.getChatGptCompletion(
            {
              messages: prompt as any,
              temperature: 0,
              model: GPTModels.GPT_5_MINI,
              top_p: 1,
              frequency_penalty: 0,
              presence_penalty: 0,
            },
            [],
            knowledgebase.owner,
            'kb-website-extraction',
          );

          const parsed = JSON.parse(gptResponse.response);
          projectDescription = parsed.projectDescription || '';
          projectServices = parsed.projectServices || [];
          await this.updateMonthlyUsageByN(id, gptResponse.tokenUsage.total);
        } catch (error) {
          this.logger.error(
            'Business description/services extraction failed, continuing without it:',
            error,
          );
        }
      }

      await this.knowledgebaseCollection.updateOne(
        { _id: id },
        {
          $set: {
            status,
            projectDescription,
            projectServices,
            updatedAt: new Date(),
          },
        },
      );
    } catch (error) {
      this.logger.error('updateKnowledgebaseStatus error:', error);
      throw error;
    }
  }

  async updateKnowledgebase(id: ObjectId, update: Partial<Knowledgebase>) {
    return this.knowledgebaseCollection.updateOne(
      { _id: id },
      { $set: { ...update, updatedAt: new Date(), lastCrawlAt: new Date() } },
    );
  }

  async setKnowledgebaseCrawlData(
    id: ObjectId,
    crawlData: Knowledgebase['crawlData'],
    status?: KnowledgebaseStatus,
  ) {
    const update: any = { crawlData, updatedAt: new Date() };
    if (status) {
      update.status = status;
    }
    await this.knowledgebaseCollection.updateOne({ _id: id }, { $set: update });
  }

  async setKnowledgebaseChatWidgetData(
    id: ObjectId,
    widgetData: Knowledgebase['chatWidgeData'],
    updatedPrompt?: any,
  ) {
    const knowledgebase = await this.knowledgebaseCollection.findOne({
      _id: id,
    });
    if (!knowledgebase?.chatWidgeData?.thankyouEmailText) {
      widgetData.thankyouEmailText = thankYouMailTemplate;
    }

    if (!knowledgebase?.chatWidgeData?.isThankYouEmailEnabled) {
      widgetData.isThankYouEmailEnabled = true;
    }
    const updateData: any = {
      chatWidgeData: widgetData,
      updatedAt: new Date(),
    };

    // Only for vakmangids
    if (knowledgebase.chatbotType === 'vakmangids') {
      updateData.prompt = updatedPrompt;
    }

    await this.knowledgebaseCollection.updateOne(
      { _id: id },
      { $set: updateData },
    );
  }

  async updateMonthlyUsageByN(kbId: ObjectId, n: number) {
    await this.knowledgebaseCollection.updateOne({ _id: kbId }, [
      {
        $set: {
          monthUsage: {
            $cond: {
              if: {
                $eq: [
                  '$monthUsage.month',
                  {
                    $concat: [
                      {
                        $toString: new Date().getMonth() + 1,
                      },
                      '/',
                      {
                        $toString: new Date().getFullYear(),
                      },
                    ],
                  },
                ],
              },
              then: {
                month: '$monthUsage.month',
                count: { $add: ['$monthUsage.count', n] },
              },
              else: {
                month: {
                  $concat: [
                    {
                      $toString: new Date().getMonth() + 1,
                    },
                    '/',
                    {
                      $toString: new Date().getFullYear(),
                    },
                  ],
                },
                count: n,
              },
            },
          },
        },
      },
    ]);
  }

  async deleteKnowledgebase(id: ObjectId) {
    await this.knowledgebaseCollection.deleteOne({ _id: id });
  }

  async getKnowledgebaseByWebsiteName(url: string) {
    return await this.knowledgebaseCollection.findOne({
      'websiteData.websiteUrl': url,
      chatbotType: 'vakmangids',
    });
  }

  /*********************************************************
   * KNOWLEDGEBASE DATA STORE
   *********************************************************/

  async insertToKbDataStore(data: KbDataStore) {
    const res = await this.kbDataStoreCollection.insertOne(data);
    return {
      _id: res.insertedId,
      ...data,
    };
  }

  async getKbDataStoreItemById(id: ObjectId) {
    return this.kbDataStoreCollection.findOne({ _id: id });
  }

  async updateKbDataStoreItemTitle(id: ObjectId, title: string) {
    await this.kbDataStoreCollection.updateOne(
      { _id: id },
      {
        $set: { title },
      },
    );
  }

  /**
   * Get cursor for datastore items for given knowledgebase
   * @param kbId
   * @returns
   */
  getKbDataStoreItemsForKnowledgebase(
    kbId: ObjectId,
    status?: DataStoreStatus[],
  ) {
    const filter: any = {
      knowledgebaseId: kbId,
    };
    if (status) {
      filter.status = { $in: status };
    }
    return this.kbDataStoreCollection.find(filter);
  }

  /*
   Get datastore items of given type for knowledgebase
   */
  getDocumentsOfKnowledgebase(kbId: ObjectId, fileType?: DataStoreType[]) {
    return this.kbDataStoreCollection
      .find(
        { knowledgebaseId: kbId, type: { $in: fileType ? fileType : [] } },
        { projection: { content: 0, fileBuffer: 0 } },
      )
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Get cursor for datastore items for given knowledgebase
   * @param kbId
   * @returns
   */
  async getKbDataStoreItemsForKnowledgebaseVakmangids(kbId: ObjectId) {
    return await this.kbDataStoreCollection
      .find({ knowledgebaseId: kbId }, { projection: { content: 1 } })
      .toArray();
  }

  async getPaginatedDataStoreItemsForKnowledgebase(
    kbId: ObjectId,
    pageSize: number,
    type?: DataStoreType,
    page?: number,
  ) {
    const itemsPerPage = Math.min(pageSize, 100);

    const projectionFields = {
      _id: 1,
      url: 1,
      title: 1,
      type: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    type DataStoreListType = Pick<
      KbDataStore,
      '_id' | 'url' | 'title' | 'type' | 'status' | 'createdAt' | 'updatedAt'
    >;

    const filterFields: any = { knowledgebaseId: kbId };
    if (type) {
      filterFields.type = type;
    }

    const response = await getLimitOffsetPaginatedResponse<DataStoreListType>(
      this.kbDataStoreCollection,
      filterFields,
      projectionFields,
      '_id',
      1,
      itemsPerPage,
      page,
    );

    return response;
  }

  async updateKbDataStoreItem(id: ObjectId, data: Partial<KbDataStore>) {
    delete data._id;
    data.updatedAt = new Date();
    await this.kbDataStoreCollection.updateOne({ _id: id }, { $set: data });
    return {
      _id: id,
      ...data,
    };
  }

  async deleteKbDataStoreItem(id: ObjectId) {
    await this.kbDataStoreCollection.deleteOne({ _id: id });
  }

  async deleteKbDataStoreItemsForKnowledgebase(
    kbId: ObjectId,
    type?: DataStoreType,
  ) {
    const filter: any = { knowledgebaseId: kbId };
    if (type) filter.type = type;
    await this.kbDataStoreCollection.deleteMany(filter);
  }

  /*********************************************************
   * KNOWLEDGEBASE CHUNK COLLECTION
   *********************************************************/

  async insertChunk(data: Chunk): Promise<Chunk> {
    const res = await this.chunkColleciton.insertOne(data);

    return {
      _id: res.insertedId,
      ...data,
    };
  }

  async insertChunksBulk(data: Chunk[]): Promise<ObjectId[]> {
    const res = await this.chunkColleciton.insertMany(data);
    return Object.values(res.insertedIds);
  }

  getChunksForKnowledgebase(
    knowledgebaseId: ObjectId,
    status?: ChunkStatus,
  ): FindCursor<WithId<Chunk>> {
    const filter: any = { knowledgebaseId };
    if (status) {
      filter.status = status;
    }
    const chunks = this.chunkColleciton.find(filter);
    return chunks;
  }

  async getChunkByIdBulk(ids: ObjectId[]) {
    const chunks = this.chunkColleciton.find({ _id: { $in: ids } }).toArray();
    return chunks;
  }

  async getChunksForDataStoreItem(dId: ObjectId) {
    const res: Pick<Chunk, '_id'>[] = await this.chunkColleciton
      .find({ dataStoreId: dId }, { projection: { _id: 1 } })
      .toArray();
    return res;
  }

  async updateChunkById(id: ObjectId, chunk: Partial<Chunk>) {
    delete chunk._id;
    await this.chunkColleciton.updateOne(
      { _id: id },
      { $set: { ...chunk, updatedAt: new Date() } },
    );
  }

  async deleteChunkInKnowledgebase(
    knowledgebaseId: ObjectId,
    chunkId: ObjectId,
  ) {
    await this.chunkColleciton.deleteOne({
      _id: chunkId,
      knowledgebaseId: knowledgebaseId,
    });
  }

  async deleteChunksByIdBulk(ids: ObjectId[]) {
    await this.chunkColleciton.deleteMany({ _id: { $in: ids } });
  }

  async deleteChunksForKnowledgebase(id: ObjectId, type?: DataStoreType) {
    const filter: any = { knowledgebaseId: id };
    if (type) filter.type = type;
    await this.chunkColleciton.deleteMany(filter);
  }

  /*********************************************************
   * KNOWLEDGEBASE EMBEDDING COLLECTION
   *********************************************************/

  async insertEmbeddingForChunk(data: KbEmbedding) {
    const res = await this.kbEmbeddingCollection.insertOne(data);

    return {
      _id: res.insertedId,
      ...data,
    };
  }

  /**
   * Update embeedding for chunk in embeddings for KB
   * @param knowledgebaseId
   * @param embedding
   */
  async updateEmbeddingForChunk(chunkId: ObjectId, embeddings: number[]) {
    await this.kbEmbeddingCollection.updateOne(
      {
        _id: chunkId,
      },
      { $set: { embeddings } },
    );
  }

  async deleteKbEmbeddingsForKnowledgebase(
    kbId: ObjectId,
    type?: DataStoreType,
  ) {
    const filter: any = { knowledgebaseId: kbId };
    if (type) filter.type = type;
    await this.kbEmbeddingCollection.deleteMany(filter);
  }

  async deleteEmbeddingForChunk(chunkId: ObjectId) {
    await this.kbEmbeddingCollection.deleteOne({
      _id: chunkId,
    });
  }

  async deleteEmbeddingsByIdBulk(ids: ObjectId[]) {
    await this.kbEmbeddingCollection.deleteMany({ _id: { $in: ids } });
  }

  /*********************************************************
   * CHAT SESSION COLLECTION
   *********************************************************/

  async insertChatSession(data: ChatSession) {
    const res = await this.chatSessionCollection.insertOne(data);

    return {
      _id: res.insertedId,
      ...data,
    };
  }

  async getChatSessionById(id: ObjectId): Promise<ChatSession> {
    const session = await this.chatSessionCollection.findOne({ _id: id });
    return session;
  }

  async getConversationById(id: ObjectId): Promise<CampaignEmailConversation> {
    const conversation = await this.emailConversationCollection.findOne({
      _id: id,
    });
    return conversation;
  }

  async getChatSessionSparseById(id: ObjectId): Promise<ChatSessionSparse> {
    const session = await this.chatSessionCollection.findOne(
      { _id: id },
      {
        projection: {
          _id: 1,
          src: 1,
          messages: 1,
          userData: 1,
          startedAt: 1,
          updatedAt: 1,
          knowledgebaseId: 1,
        },
      },
    );
    return session;
  }

  async getPaginatedChatSessionsForKnowledgebase(
    kbId: ObjectId,
    pageSize: number,
    page?: number,
    searchQuery?: string,
    chatSessionId?: string,
  ) {
    const itemsPerPage = Math.min(pageSize, 50);

    const projectionFields = {
      _id: 1,
      startedAt: 1,
      updatedAt: 1,
      userData: 1,
      isUnread: 1,
      firstMessage: { $first: '$messages' },
    };

    const filter = {
      knowledgebaseId: kbId,
      'messages.0': { $exists: true },
    };

    if (chatSessionId) {
      filter['_id'] = new ObjectId(chatSessionId);
    }
    const response = await getLimitOffsetPaginatedResponse(
      this.chatSessionCollection,
      filter,
      projectionFields,
      'updatedAt',
      -1,
      itemsPerPage,
      page,
      searchQuery,
      ['messages.q', 'messages.a'],
    );

    if (response && response.results && response.results.length > 0) {
      const sessionIds = response.results.map((r: any) => r._id);
      const leads = await this.leadCollection
        .find(
          { chatSessionId: { $in: sessionIds } },
          { projection: { chatSessionId: 1, firstName: 1, lastName: 1, name: 1 } },
        )
        .toArray();

      const leadMap = new Map<string, string>();
      for (const lead of leads) {
        let name = '';
        if (lead.firstName || lead.lastName) {
          name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        } else if (lead.name) {
          name = lead.name;
        }
        if (lead.chatSessionId) {
          leadMap.set(lead.chatSessionId.toString(), name);
        }
      }

      response.results = response.results.map((r: any) => {
        let name = '';
        if (r._id) {
          name = leadMap.get(r._id.toString()) || '';
        }
        if (!name && r.userData) {
          if (r.userData.name) {
            name = r.userData.name;
          } else if (r.userData.firstName || r.userData.lastName) {
            name = `${r.userData.firstName || ''} ${r.userData.lastName || ''}`.trim();
          }
        }
        return {
          ...r,
          name: name || '',
        };
      });
    }

    return response;
  }

  async addMsgToChatSession(id: ObjectId, msg: ChatQueryAnswer) {
    await this.chatSessionCollection.updateOne(
      { _id: id },
      { $push: { messages: msg }, $set: { updatedAt: new Date(), read: true } },
    );
  }

  async deleteChatSession(id: ObjectId) {
    await this.chatSessionCollection.deleteOne({ _id: id });
  }

  async updateChatSession(id: ObjectId, session: Partial<ChatSession>) {
    await this.chatSessionCollection.updateOne(
      {
        _id: id,
      },
      { $set: session },
    );
  }

  async setChatSessionMessageFeedback(
    id: ObjectId,
    msgIdx: number,
    feedback: ChatAnswerFeedbackType,
  ) {
    await this.chatSessionCollection.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          [`messages.${msgIdx}.feedback`]: feedback,
        },
      },
    );
  }

  /** *******************************************
   * PROMPT RELATED
   ******************************************** */

  async listPrompts() {
    return this.promptCollection.find({}).toArray();
  }

  async getPrompt(id: ObjectId): Promise<Prompt> {
    return this.promptCollection.findOne({ _id: id });
  }

  async insertPrompt(data: Prompt): Promise<Prompt> {
    const res = await this.promptCollection.insertOne(data);
    return {
      _id: res.insertedId,
      ...data,
    };
  }
  async updatePrompt(id: ObjectId, data: Partial<Prompt>) {
    await this.promptCollection.updateOne({ _id: id }, { $set: data });
  }

  async deletePrompt(id: ObjectId) {
    await this.promptCollection.deleteOne({ _id: id });
  }

  /** *******************************************
   * LEAD RELATED
   ******************************************** */

  private isQualifiedVakmangidsLead(data: Lead): boolean {
    return !!(
      data.firstName &&
      data.lastName &&
      data.email &&
      data.phone &&
      data.city &&
      data.postalCode
    );
  }

  async createLeads(userId: string, data: Lead) {
    if (
      data.chatbotType === 'vakmangids' &&
      !this.isQualifiedVakmangidsLead(data)
    ) {
      return null;
    }

    let result: any;
    const leadAlreadyExists = await this.leadCollection.findOne({
      chatSessionId: new ObjectId(data.chatSessionId),
      knowledgebaseId: new Object(data.knowledgebaseId),
    });
    if (leadAlreadyExists) {
      data.updatedAt = new Date();
      result = await this.leadCollection.findOneAndUpdate(
        { chatSessionId: data.chatSessionId },
        { $set: data },
        { returnDocument: 'after' },
      );
      return result.value;
    } else {
      data.createdAt = new Date();
      data.updatedAt = data.createdAt;
      data.emailStatus = false;
      data.fieldStatus = 0;
      data.userId = userId;
      data.IsLeadType = IsLeadType.chatBot;
      data.isSyncedToCrm = false;

      // emit the leads to the users webhooks urls
      const webhooks = await this.userZapierWebhookCollection
        .find({
          userId: userId,
        })
        .toArray();

      if (webhooks.length > 0) {
        data.isSyncedToCrm = true;
      }

      data.standAloneAssistant = data.standAloneAssistant ?? false;

      const payload = {
        name: data.firstName + ' ' + data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
      };

      for (const webhook of webhooks) {
        await this.zapierWebhookService.sendLeadViaWebhookPayloadToZapier(
          webhook.webhookUrl,
          webhook.webhookRequestType,
          payload,
        );
      }
      return await this.leadCollection.insertOne(data);
    }
  }

  async sendEmailToLeads(
    data: any,
    Address?: boolean,
    Phone?: boolean,
    appointmentDetails?: {
      meetingDate: string;
      timeSlot: { startTime: Date; endTime: Date };
      isMeetingBookedOnGoogleMeet: boolean;
    },
  ) {
    let getLeadsData: any;
    const sessionData = await this.getChatSessionDataFromCache(
      data.chatSessionId.toHexString(),
    );

    const chatSummary = await this.generateSummarizeData(sessionData);

    if (Phone && Address) {
      getLeadsData = await this.leadCollection.findOne({
        chatSessionId: new ObjectId(data.chatSessionId),
        knowledgebaseId: new Object(data.knowledgebaseId),
        $or: [{ firstName: { $exists: true } }, { name: { $exists: true } }],
        email: { $exists: true },
        address: { $exists: true },
        phone: { $exists: true },
      });
    } else if (Address) {
      getLeadsData = await this.leadCollection.findOne({
        chatSessionId: new ObjectId(data.chatSessionId),
        knowledgebaseId: new Object(data.knowledgebaseId),
        $or: [{ firstName: { $exists: true } }, { name: { $exists: true } }],
        email: { $exists: true },
        address: { $exists: true },
      });
    } else if (Phone) {
      getLeadsData = await this.leadCollection.findOne({
        chatSessionId: new ObjectId(data.chatSessionId),
        knowledgebaseId: new Object(data.knowledgebaseId),
        $or: [{ firstName: { $exists: true } }, { name: { $exists: true } }],
        email: { $exists: true },
        phone: { $exists: true },
      });
    } else {
      getLeadsData = await this.leadCollection.findOne({
        chatSessionId: new ObjectId(data.chatSessionId),
        knowledgebaseId: new Object(data.knowledgebaseId),
        $or: [{ firstName: { $exists: true } }, { name: { $exists: true } }],
        email: { $exists: true },
      });
    }

    const kbId = new ObjectId(data.knowledgebaseId);
    const kb = await this.getKnowledgebaseById(kbId);
    let ownerData: any;
    let leadsEmail: string;
    let vakamangidsLead: boolean;
    if (kb.adminEmail) {
      leadsEmail = kb.adminEmail;
    } else if (kb.chatbotType == 'vakmangids') {
      leadsEmail = this.appConfig.get('vakmangidsAdminEmail');
      vakamangidsLead = true;
    } else {
      ownerData = await this.userService.findUserByIdSparse(
        kb.owner.toString(),
      );
      leadsEmail = ownerData.email;
      vakamangidsLead = false;
    }

    if (getLeadsData && getLeadsData?.emailStatus == false) {
      const leadLink = `${process.env.FRONTEND_URL}/app/edit-bot/${
        data.knowledgebaseId
      }/?tab=leads&email=${getLeadsData.email || ''}`;
      await this.emailService.sendLeadMsgEmail(
        leadsEmail,
        `New Lead Captured for the website ${kb.websiteData.websiteUrl} on UltimaBot`,
        {
          redirectLeadLink: leadLink,
          chat_summary: chatSummary,
          website_url: kb.websiteData.websiteUrl,
          msg_email: getLeadsData.email,
          msg_name: getLeadsData.firstName
            ? getLeadsData.firstName
            : getLeadsData.name,
          msg_number: getLeadsData.phone,
          msg_address: getLeadsData.address,
          appointmentDetails,
          userId: kb.owner.toString(),
        },
      );

      if (vakamangidsLead) {
        await this.emailService.sendLeadMsgEmail(
          getLeadsData.email,
          `Bedankt voor je aanvraag bij Vakmangids!`,
          {
            msg_email: getLeadsData.email,
            msg_name: getLeadsData.firstName
              ? getLeadsData.firstName
              : getLeadsData.name,
            msg_number: getLeadsData.phone,
            msg_address: getLeadsData.address,
            userId: kb.owner.toString(),
          },
          true,
          vakamangidsLead,
        );
      } else if (kb.chatWidgeData?.isThankYouEmailEnabled) {
        await this.emailService.sendThankYouLeadEmail(
          getLeadsData.email,
          `We’ve Received Your Message Via Our Chatbot`,
          {
            msg_email: getLeadsData.email,
            msg_name: getLeadsData.firstName
              ? getLeadsData.firstName
              : getLeadsData.name,
            msg_number: getLeadsData.phone,
            msg_address: getLeadsData.address,
            support_email: leadsEmail,
            userId: kb.owner.toString(),
          },
          kbId,
        );

        try {
          if (
            appointmentDetails.meetingDate &&
            appointmentDetails.timeSlot.endTime &&
            appointmentDetails.timeSlot.startTime
          ) {
            await this.emailService.sendMeetingConfirmationToLead(
              getLeadsData.email,
              getLeadsData.firstName
                ? getLeadsData.firstName
                : getLeadsData.name,
              appointmentDetails.meetingDate,
              appointmentDetails.timeSlot,
              appointmentDetails.isMeetingBookedOnGoogleMeet,
              IsLeadType.chatBot,
              kb.owner.toString(),
            );
          }
        } catch (error) {
        }
      }

      await this.leadCollection.updateOne(
        { chatSessionId: data.chatSessionId },
        { $set: { emailStatus: true } },
      );
    }
  }

  async generateSummarizeData(sessionData: any) {
    const prompt = [
      {
        role: 'system',
        content:
          'You are a professional assistant tasked with summarizing chat conversations. Create a concise summary in JSON format with a single "summary" key. The summary should be brief (max 2-3 sentences) capturing only the most essential points of the conversation. Example format: {"summary": "Customer inquired about product pricing and delivery options. Agent provided details about standard and express shipping."}',
      },
      {
        role: 'user',
        content: `Analyze this chat history and return a JSON object with a "summary" key containing a brief summary: ${JSON.stringify(
          sessionData.messages,
        )}`,
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
      'kb-session-summary',
    );
    const summary = JSON.parse(quickAnswers.response).summary;
    return summary;
  }

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
      const session = await this.getChatSessionById(sId);
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

  async getLeadsDataInfo(
    id: ObjectId,
    pageSize?: number,
    page?: number,
    sortType?: number,
    searchQuery?: string,
  ) {
    const sort: any = {
      ['createdAt']: sortType,
    };

    const filter: any = {};

    if (searchQuery) {
      filter.$or = [
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        {
          address: { $regex: searchQuery, $options: 'i' },
        },
        {
          phone: { $regex: searchQuery, $options: 'i' },
        },
        { createdAt: { $regex: searchQuery, $options: 'i' } },
      ];
      filter.knowledgebaseId = id;
      filter.firstName = { $exists: true, $ne: null };
      filter.email = { $exists: true, $ne: null };
    } else {
      filter.knowledgebaseId = id;
      filter.firstName = { $exists: true, $ne: null };
      filter.email = { $exists: true, $ne: null };
    }
    const [results, count] = await Promise.all([
      this.leadCollection
        .find(filter, {
          projection: {
            chatSessionId: 0,
            knowledgebaseId: 0,
            // firstName: 1,
            // address: 1,
            // phone: 1,
            // email: 1,
            // updatedAt: 1,
            // createdAt: 1,
          },
          limit: pageSize,
          skip: (page - 1) * pageSize,
        })
        .sort(sort)
        .toArray(),
      this.leadCollection.countDocuments(filter),
    ]);
    return { results, pages: Math.ceil(count / pageSize), totalCount: count };
  }

  async getLeadByEmailORPhone(
    query: { $or: any[] },
    userId: string,
  ): Promise<Lead | null> {
    const lead = await this.leadCollection.findOne(
      { ...query, userId },
      { sort: { createdAt: -1 } },
    );
    return lead as Lead;
  }

  // V2 version with improved error handling and validation
  // Now also fetches 'location' as 'address' and allows searching on 'location' as address
  // Modified: If lead has chatSessionId, query chatSession table with this id, else search by lead.email
  async getLeadsDataInfoV2(
    id: ObjectId,
    pageSize = 10,
    page = 1,
    sortType = -1,
    searchQuery?: string,
  ) {
    try {
      if (!id) {
        throw new Error('Knowledge base ID is required');
      }

      if (pageSize < 1) pageSize = 10;
      if (page < 1) page = 1;
      if (![1, -1].includes(sortType)) sortType = -1;

      const sort: any = { createdAt: sortType };
      const filter: any = {
        knowledgebaseId: id,
        IsLeadType: IsLeadType.chatBot,
        email: { $exists: true, $ne: null },
      };
      // Add search on location as address
      if (searchQuery?.trim()) {
        filter.$or = [
          { firstName: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
          { address: { $regex: searchQuery, $options: 'i' } },
          { phone: { $regex: searchQuery, $options: 'i' } },
          { location: { $regex: searchQuery, $options: 'i' } }, // search on location as address
        ];
      }

      const [rawResults, count] = await Promise.all([
        this.leadCollection
          .find(filter)
          .project({
            _id: 1,
            name: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            phone: 1,
            IsLeadType: 1,
            chatbotType: 1,
            createdAt: 1,
            updatedAt: 1,
            emailStatus: 1,
            fieldStatus: 1,
            address: 1,
            location: 1, // fetch location field
            chatSessionId: 1, // fetch chatSessionId if present
          })
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        this.leadCollection.countDocuments(filter),
      ]);

      // Fetch messages for each lead: if chatSessionId exists, use it, else search by email
      const leadsWithMessages = await Promise.all(
        rawResults.map(async (lead) => {
          let messages: any[] = [];
          if (lead.chatSessionId && lead.IsLeadType == IsLeadType.chatBot) {
            // Query chatSession table with this id
            const session = await this.chatSessionCollection.findOne(
              {
                _id: lead.chatSessionId,
                knowledgebaseId: id,
              },
              {
                projection: {
                  messages: 1,
                },
              },
            );
            messages = session?.messages || [];
          } else if (lead.email && lead.IsLeadType == IsLeadType.chatBot) {
            // Query by searching lead.email in messages.q or messages.a
            const session = await this.chatSessionCollection.findOne(
              {
                knowledgebaseId: id,
                $or: [
                  { 'messages.q': { $regex: lead.email, $options: 'i' } },
                  { 'messages.a': { $regex: lead.email, $options: 'i' } },
                ],
              },
              {
                projection: {
                  messages: 1,
                },
              },
            );
            messages = session?.messages || [];
          }

          // Compose name field as per requirements
          let name = lead.name;
          if ((!name || name === '') && (lead.firstName || lead.lastName)) {
            name = `${lead.firstName || ''}${
              lead.lastName ? ' ' + lead.lastName : ''
            }`.trim();
          }

          // If location exists, treat it as address for output
          let address = lead.address;
          if ((!address || address === '') && lead.location) {
            address = lead.location;
          }

          return {
            ...lead,
            address, // ensure address is set, possibly from location
            messages,
          };
        }),
      );

      return {
        results: leadsWithMessages,
        pages: Math.ceil(count / pageSize),
        totalCount: count,
      };
    } catch (error) {
      throw new Error(`Failed to fetch leads data: ${error.message}`);
    }
  }

  async getSessionLeads(id: string) {
    return await this.leadCollection.findOne({
      chatSessionId: new ObjectId(id),
    });
  }

  async updateLeadCrmSyncStatus(
    chatSessionId: ObjectId,
    isSyncedToCrm: boolean,
  ) {
    await this.leadCollection.updateOne(
      { chatSessionId },
      { $set: { isSyncedToCrm } },
    );
  }

  async updateBilling(
    kbId: ObjectId,
    billing: { chargedTokens: number; lastChargedAt?: Date },
  ) {
    return this.knowledgebaseCollection.updateOne(
      { _id: kbId },
      {
        $set: {
          billing,
          updatedAt: new Date(),
        },
      },
    );
  }

  // Public Access url
  async getDataStoreItemById(id: ObjectId): Promise<any> {
    return this.knowledgebaseCollection.findOne({ _id: id });
  }

  async updateDataStoreUrl(id: ObjectId, url: string) {
    const result = await this.knowledgebaseCollection.updateOne(
      { _id: id },
      { $set: { url } },
    );

    return result;
  }
}
