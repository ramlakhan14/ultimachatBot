import { Inject, Injectable, Logger } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import {
  CELERY_CLIENT,
  CeleryClientQueue,
  CeleryClientService,
} from '../../common/celery/celery-client.module';
import { retryWithBackoff } from '../../common/utils';
import {
  ChatGTPResponse,
  ChatGptPromptMessages,
  OpenaiService,
} from '../../openai/openai.service';
import { KnowledgebaseDbService } from '../knowledgebase-db.service';
import {
  CHUNK_SIZE,
  ChatQueryAnswer,
  Chunk,
  ChunkStatus,
  CustomKeyData,
} from '../knowledgebase.schema';
import { PromptService } from '../prompt/prompt.service';
import {
  ASSISTANT_PRIORITY_MAP,
  AssistantType,
  DEFAULT_CHATGPT_PROMPT,
} from './openaiChatbot.constant';
import { CustomKeyService } from '../custom-key.service';
import { AppConfigService } from '../../common/config/appConfig.service';
import { GPTModels } from '../../campaign/enum/enum';

interface CosineSimilarityWorkerResponse {
  chunkId: {
    $oid: string;
  };
  similarity: number;
}

interface ChunkForCompletion extends Chunk {
  content: string;
  score: number;
}

@Injectable()
export class OpenaiChatbotService {
  private readonly logger: Logger;

  constructor(
    private openaiService: OpenaiService,
    private kbDbService: KnowledgebaseDbService,
    private readonly promptService: PromptService,
    private readonly customKeyService: CustomKeyService,
    private appConfig: AppConfigService,
    @Inject(CELERY_CLIENT) private celeryClient: CeleryClientService,
  ) {
    this.logger = new Logger(OpenaiChatbotService.name);
  }

  private getCustomKeys(customKeys?: CustomKeyData): string[] | undefined {
    if (!customKeys?.useOwnKey) return undefined;

    return this.customKeyService.decryptCustomKeys(customKeys?.keys);
  }

  /** *******************************************
   * EMBEDDINGS SEARCH RELATED
   ******************************************** */

  /**
   * Check if chunk is valid for working as embedding
   * @param chunk
   * @returns
   */
  isValidChunk(chunk: Chunk): boolean {
    const totalChunk = chunk.title + ' ' + chunk.chunk;
    return totalChunk?.length < CHUNK_SIZE;
  }

  /**
   * Get embeddings for a new chunk
   * @param chunk
   * @returns
   */
  async getEmbeddingsForChunk(
    chunk: Chunk,
    customKeys?: CustomKeyData,
    userId?: ObjectId,
    kbId?: ObjectId,
  ) {
    if (!chunk._id) {
      throw new Error('Invalid Chunk! No _id present');
    }
    const text = chunk.title
      ? `Title: ${chunk.title.trim()}; Content: ${chunk.chunk.trim()}`
      : `Content: ${chunk.chunk.trim()}`;

    // Generate embeddings for chunk
    const embeddings = await retryWithBackoff(
      async () => {
        const embeddings = await this.openaiService.getEmbedding(
          text,
          this.getCustomKeys(customKeys),
          userId,
          kbId,
          'kb-chunk-embedding',
        );
        return embeddings;
      },
      undefined,
      10, // max 10 retries (102 sec)
    );

    return embeddings;
  }

  /**
   * Generate and add embedding for new chunk to KB
   * @param kbId
   * @param chunk
   */
  async addEmbeddingsForChunk(
    kbId: ObjectId,
    chunk: Chunk,
    customKeys?: CustomKeyData,
    userId?: ObjectId,
  ) {
    const embeddings = await this.getEmbeddingsForChunk(
      chunk,
      customKeys || undefined,
      userId,
      kbId,
    );

    // Add embedding for new chunk into embeddings collection
    await this.kbDbService.insertEmbeddingForChunk({
      _id: chunk._id,
      knowledgebaseId: kbId,
      embeddings,
      type: chunk.type,
    });
    await this.kbDbService.updateChunkById(chunk._id, {
      status: ChunkStatus.EMBEDDING_GENERATED,
    });
  }

  async updateEmbeddingsForChunk(
    kbId: ObjectId,
    chunk: Chunk,
    customKeys?: CustomKeyData,
  ) {
    const embeddings = await this.getEmbeddingsForChunk(
      chunk,
      customKeys,
      undefined,
      kbId,
    );

    // Add embedding for new chunk into embeddings collection
    await this.kbDbService.updateEmbeddingForChunk(chunk._id, embeddings);
    await this.kbDbService.updateChunkById(chunk._id, {
      status: ChunkStatus.EMBEDDING_GENERATED,
    });
  }

  /**
   * Get top n chunks in the knowledgedbase for the given query
   * @param kbId
   * @param query
   * @param threshold
   * @returns
   */
  async getTopNChunks(
    kbId: ObjectId,
    query: string,
    threshold = 0.0,
    customKeys?: CustomKeyData,
    userId?: ObjectId,
    assistantType?: AssistantType,
  ): Promise<ChunkForCompletion[]> {
    try {
      const priorityTypes = ASSISTANT_PRIORITY_MAP[assistantType] || ASSISTANT_PRIORITY_MAP[AssistantType.CHATBOT];
      Logger.log(`Getting embeddings for query: "${query}" for KB: ${kbId}`);
      // Get embeddings for given query
      const queryEmbedding = await this.openaiService.getEmbedding(
        query,
        this.getCustomKeys(customKeys),
        userId,
        kbId,
        'chatbot-query-embedding',
      );

      Logger.debug('Query embedding generated successfully');

      Logger.log('Creating Celery task for retrieving top chunks');
      const client = this.celeryClient.get(CeleryClientQueue.DEFAULT);
      const task = client.createTask('worker.get_top_n_chunks');

      Logger.log(`Executing Celery task with kbId: ${kbId}`);
      const result = await task
        .applyAsync([queryEmbedding, kbId.toString(), 3, priorityTypes])
        .get();

 // ← add this

      if (!result) {
        Logger.warn('No results returned from Celery task');
        return [];
      }

      Logger.log('Parsing results from Celery task');
      const topChunks: CosineSimilarityWorkerResponse[] = JSON.parse(result);

      if (!topChunks || !Array.isArray(topChunks)) {
        Logger.warn('Invalid response format from Celery task');
        return [];
      }

      Logger.log(`Retrieved ${topChunks?.length} chunks from worker`);
      const filteredChunks =
        topChunks?.length > 2
          ? topChunks.filter((chunk) => chunk.similarity > threshold)
          : topChunks;

      Logger.log(
        `After filtering by threshold ${threshold}: ${filteredChunks?.length} chunks remaining`,
      );
      if (filteredChunks?.length === 0) {
        return [];
      }

      Logger.log('Creating score map for chunks');
      const chunksScoreMap = filteredChunks?.reduce((map, chunk) => {
        map[chunk.chunkId.$oid] = chunk.similarity;
        return map;
      }, {});

      const chunkIds = filteredChunks.map((c) => new ObjectId(c.chunkId.$oid));
      Logger.log(`Fetching ${chunkIds?.length} chunks from database`);

      const chunks = await this.kbDbService.getChunkByIdBulk(chunkIds);

      if (!chunks || !Array.isArray(chunks)) {
        Logger.warn('No chunks found in database');
        return [];
      }

      Logger.log(`Retrieved ${chunks?.length} chunks from database`);
      const topChunkData = chunks.map((chunk) => ({
        ...chunk,
        content: `${chunk.title}: ${chunk.chunk}`,
        score: chunksScoreMap[chunk._id.toString()],
      }));

      Logger.log(`Returning ${topChunkData?.length} chunks for completion`);
      return topChunkData;
    } catch (error) {
      Logger.error(`Error in getTopNChunks: ${error.message}`, error.stack);
      this.logger.error('Error in getTopNChunks:', error);
      return [];
    }
  }

  /** *******************************************
   * CHAT GPT ANSWER RELATED
   ******************************************** */

  getTokenCountForChatGptMessages(messages: ChatGptPromptMessages): number {
    return this.openaiService.getTokenCount(
      messages?.reduce<string>((str, p) => {
        str += p.content;
        return str;
      }, ''),
    );
  }

  // getChatGptPrompt(
  //   chatbotName: string,
  //   query: string,
  //   topChunks: ChunkForCompletion[],
  //   prevMessages: ChatQueryAnswer[],
  //   defaultAnswer: string | undefined,
  //   maxTokenLimit?: number,
  //   prompt?: string,
  //   isAddress?: boolean,
  //   isPhone?: boolean,
  //   meetingSlots?: any,
  //   busySlots?: any,
  //   vakmangidsKnowledgebaseData?: any,
  //   timezone?: string,
  // ): ChatGptPromptMessages {
  //   // Defaults
  //   defaultAnswer = defaultAnswer || "I don't know how to answer that";
  //   console.log(
  //     '🚀 ~ OpenaiChatbotService ~ getChatGptPrompt ~ prompt:',
  //     prompt,
  //   );

  //   prompt = prompt || DEFAULT_CHATGPT_PROMPT;
  //   // First compile the prompt without ctx and pastMessages to get the number of tokens
  //   // that the ctx and passMessages can occupy together}

  //   const emptyPrompt = this.promptService.compilePrompt(prompt, {
  //     chatbotName,
  //     ctx: '',
  //     defaultAnswer,
  //     pastMessages: [],
  //     query,
  //   });

  //   const emptyPromptTokens = this.getTokenCountForChatGptMessages(emptyPrompt);

  //   /** ********************************************************************
  //    * NOTE: Size of chunk matters heavily in the following calculation
  //    * The current CHUNK_SIZE of 1500 is fit for chatgpt prompt size of 4000
  //    ********************************************************************* */
  //   // Calculation on how to split the remainingTokens between ctx and pastMessages
  //   // CONSIDERATIONS:
  //   // - Bare minimum - 2 ctx blocks and 2 previous msgs (truncated if necessary)
  //   // - Only the last 2 messages are important, others can be discarded if necessary
  //   // - We can truncate the chatbot response of the 2nd last msg if required
  //   // - Try to fit in as many context blocks as possible
  //   // LOGIC:
  //   // - First add two chunks to the context
  //   // - Add 2 of past messages
  //   // - If token limit not exceeded
  //   //    - Continue adding chunks to context till token limit is reached
  //   // - else
  //   //    - remove n-2th msg

  //   const remainingTokens = maxTokenLimit - emptyPromptTokens - 300;
  //   const pastMessagesTokenCount = prevMessages?.reduce((count, m) => {
  //     count += (m.aTokens || 0) + this.openaiService.getTokenCount(m.q);
  //     return count;
  //   }, 0);

  //   // Function to construct ctx block given a chunk
  //   const getCtxBlock = (chunk: ChunkForCompletion) =>
  //     `${chunk?.content}${chunk?.url ? '; URL: ' + chunk.url : ''}`;

  //   // Try to Add 2 chunks initially
  //   let ctx = '';
  //   let tokenCount = 0;
  //   for (let i = 0; i < Math.max(1, topChunks?.length); i++) {
  //     const chunk = topChunks[i];
  //     const ctxSection = getCtxBlock(chunk);
  //     const tokens = this.openaiService.getTokenCount(ctxSection);
  //     if (tokenCount + tokens <= remainingTokens) {
  //       ctx += `${ctxSection}\n\n`;
  //       tokenCount += tokens;
  //     } else {
  //       break;
  //     }
  //   }

  //   // Check if adding the past messages would exceed token limit
  //   // If yes then take only last message
  //   if (tokenCount + pastMessagesTokenCount > remainingTokens) {
  //     const lastMsg = prevMessages[prevMessages?.length - 1];
  //     const lastMsgTokenCount =
  //       lastMsg.aTokens + this.openaiService.getTokenCount(lastMsg.q);

  //     // See if its possibl to add few last msg
  //     if (tokenCount + lastMsgTokenCount < remainingTokens) {
  //       prevMessages = prevMessages.slice(-10);
  //       tokenCount += lastMsgTokenCount;
  //     } else {
  //       prevMessages = [];
  //     }
  //   } else {
  //     tokenCount += pastMessagesTokenCount;
  //   }

  //   const pastMessages: ChatGptPromptMessages = prevMessages.flatMap((msg) => [
  //     { role: 'user', content: msg.q },
  //     { role: 'assistant', content: msg.a },
  //   ]);

  //   // Continue adding chunks to the context till token limit is reached
  //   for (let i = 2; i < topChunks?.length; i++) {
  //     const chunk = topChunks[i];
  //     const ctxSection = getCtxBlock(chunk);
  //     const tokens = this.openaiService.getTokenCount(ctxSection);
  //     if (tokenCount + tokens <= remainingTokens) {
  //       ctx += `${ctxSection}\n\n`;
  //       tokenCount += tokens;
  //     } else {
  //       break;
  //     }
  //   }
  //   const messages = this.promptService.compilePrompt(prompt, {
  //     chatbotName,
  //     ctx,
  //     defaultAnswer,
  //     pastMessages,
  //     query,
  //     isAddress,
  //     isPhone,
  //     meetingSlots,
  //     busySlots,
  //     vakmangidsKnowledgebaseData,
  //     timezone,
  //   });

  //   return messages;
  // }

  getChatGptPrompt(
    chatbotName: string,
    query: string,
    topChunks: ChunkForCompletion[],
    prevMessages: ChatQueryAnswer[],
    defaultAnswer: string | undefined,
    maxTokenLimit?: number,
    prompt?: string,
    isAddress?: boolean,
    isPhone?: boolean,
    meetingSlots?: any,
    busySlots?: any,
    vakmangidsKnowledgebaseData?: any,
    timezone?: string,
  ): ChatGptPromptMessages {
    defaultAnswer = defaultAnswer || "I don't know how to answer that";
    prompt = prompt || DEFAULT_CHATGPT_PROMPT;

    const cleanPrevMessages = (prevMessages || []).filter((m) => {
      if (!m || !m.a) return false;
      try {
        const parsed = JSON.parse(m.a);
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          Object.keys(parsed).length === 1 &&
          'date' in parsed
        ) {
          return false;
        }
      } catch {}
      return true;
    });

    const emptyPrompt = this.promptService.compilePrompt(prompt, {
      chatbotName,
      ctx: '',
      defaultAnswer,
      pastMessages: [],
      query,
    });

    const emptyPromptTokens = this.getTokenCountForChatGptMessages(emptyPrompt);

    /** ********************************************************************
     * NOTE: Size of chunk matters heavily in the following calculation
     * The current CHUNK_SIZE of 1500 is fit for chatgpt prompt size of 4000
     ********************************************************************* */
    // Calculation on how to split the remainingTokens between ctx and pastMessages
    // CONSIDERATIONS:
    // - Bare minimum - 2 ctx blocks and 2 previous msgs (truncated if necessary)
    // - Only the last 2 messages are important, others can be discarded if necessary
    // - We can truncate the chatbot response of the 2nd last msg if required
    // - Try to fit in as many context blocks as possible
    // LOGIC:
    // - First add two chunks to the context
    // - Add 2 of past messages
    // - If token limit not exceeded
    //    - Continue adding chunks to context till token limit is reached
    // - else
    //    - remove n-2th msg

    const remainingTokens = maxTokenLimit - emptyPromptTokens - 300;

    // ─── FIX: use cleanPrevMessages + guard undefined aTokens ────────────────
    const pastMessagesTokenCount = cleanPrevMessages.reduce((count, m) => {
      count += (m.aTokens || 0) + this.openaiService.getTokenCount(m.q || '');
      return count;
    }, 0);

    const getCtxBlock = (chunk: ChunkForCompletion) =>
      `${chunk?.content}${chunk?.url ? '; URL: ' + chunk.url : ''}`;

    let ctx = '';
    let tokenCount = 0;
    for (let i = 0; i < Math.max(1, topChunks?.length); i++) {
      const chunk = topChunks[i];
      const ctxSection = getCtxBlock(chunk);
      const tokens = this.openaiService.getTokenCount(ctxSection);
      if (tokenCount + tokens <= remainingTokens) {
        ctx += `${ctxSection}\n\n`;
        tokenCount += tokens;
      } else {
        break;
      }
    }

    let filteredMessages = cleanPrevMessages;
    if (tokenCount + pastMessagesTokenCount > remainingTokens) {
      const lastMsg = filteredMessages[filteredMessages.length - 1];
      if (lastMsg) {
        const lastMsgTokenCount =
          (lastMsg.aTokens || 0) +
          this.openaiService.getTokenCount(lastMsg.q || '');
        if (tokenCount + lastMsgTokenCount < remainingTokens) {
          filteredMessages = filteredMessages.slice(-10);
          tokenCount += lastMsgTokenCount;
        } else {
          filteredMessages = [];
        }
      } else {
        filteredMessages = [];
      }
    } else {
      tokenCount += pastMessagesTokenCount;
    }

    const pastMessages: ChatGptPromptMessages = filteredMessages.flatMap(
      (msg) => [
        { role: 'user', content: msg.q },
        { role: 'assistant', content: msg.a },
      ],
    );

    for (let i = 2; i < topChunks?.length; i++) {
      const chunk = topChunks[i];
      const ctxSection = getCtxBlock(chunk);
      const tokens = this.openaiService.getTokenCount(ctxSection);
      if (tokenCount + tokens <= remainingTokens) {
        ctx += `${ctxSection}\n\n`;
        tokenCount += tokens;
      } else {
        break;
      }
    }

    const messages = this.promptService.compilePrompt(prompt, {
      chatbotName,
      ctx,
      defaultAnswer,
      pastMessages,
      query,
      isAddress,
      isPhone,
      meetingSlots,
      busySlots,
      vakmangidsKnowledgebaseData,
      timezone,
    });

    return messages;
  }

  getChatGptPromptV2(
    chatbotName: string,
    query: string,
    topChunks: ChunkForCompletion[],
    prevMessages: ChatQueryAnswer[],
    defaultAnswer: string | undefined,
    maxTokenLimit?: number,
    prompt?: string,
    isAddress?: boolean,
    isPhone?: boolean,
    meetingSlots?: any,
    busySlots?: any,
  ): ChatGptPromptMessages {
    // Defaults
    defaultAnswer = defaultAnswer || "I don't know how to answer that";
    prompt = prompt || DEFAULT_CHATGPT_PROMPT;

    // Calculate base prompt tokens without context
    const emptyPrompt = this.promptService.compilePrompt(prompt, {
      chatbotName,
      ctx: '',
      defaultAnswer,
      pastMessages: [],
      query,
    });
    const emptyPromptTokens = this.getTokenCountForChatGptMessages(emptyPrompt);

    // Calculate available tokens for context and messages
    const availableTokens = maxTokenLimit - emptyPromptTokens - 300; // 300 buffer for safety

    // Helper function to get context block from chunk
    const getCtxBlock = (chunk: ChunkForCompletion) =>
      `${chunk?.content}${chunk?.url ? '; URL: ' + chunk.url : ''}`;

    // Process context chunks
    const { ctx, remainingTokens } = this.processContextChunks(
      topChunks,
      availableTokens,
      getCtxBlock,
    );

    // Process previous messages
    const processedMessages = this.processPreviousMessages(
      prevMessages,
      remainingTokens,
    );

    // Compile final prompt
    return this.promptService.compilePrompt(prompt, {
      chatbotName,
      ctx,
      defaultAnswer,
      pastMessages: processedMessages,
      query,
      isAddress,
      isPhone,
      meetingSlots,
      busySlots,
    });
  }

  private processContextChunks(
    chunks: ChunkForCompletion[],
    availableTokens: number,
    getCtxBlock: (chunk: ChunkForCompletion) => string,
  ): { ctx: string; remainingTokens: number } {
    let ctx = '';
    let usedTokens = 0;

    // Process chunks in order of relevance
    for (const chunk of chunks) {
      const ctxSection = getCtxBlock(chunk);
      const tokens = this.openaiService.getTokenCount(ctxSection);

      if (usedTokens + tokens <= availableTokens) {
        ctx += `${ctxSection}\n\n`;
        usedTokens += tokens;
      } else {
        break;
      }
    }

    return { ctx, remainingTokens: availableTokens - usedTokens };
  }

  private processPreviousMessages(
    messages: ChatQueryAnswer[],
    availableTokens: number,
  ): ChatGptPromptMessages {
    // Calculate total tokens for all messages
    const totalMessageTokens = messages?.reduce((count, msg) => {
      return count + msg.aTokens + this.openaiService.getTokenCount(msg.q);
    }, 0);

    // If we can fit all messages, return them all
    if (totalMessageTokens <= availableTokens) {
      return messages.flatMap((msg) => [
        { role: 'user', content: msg.q },
        { role: 'assistant', content: msg.a },
      ]);
    }

    // Otherwise, try to fit as many recent messages as possible
    let usedTokens = 0;
    const recentMessages: ChatQueryAnswer[] = [];

    for (let i = messages?.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = msg.aTokens + this.openaiService.getTokenCount(msg.q);

      if (usedTokens + msgTokens <= availableTokens) {
        recentMessages.unshift(msg);
        usedTokens += msgTokens;
      } else {
        break;
      }
    }

    return recentMessages.flatMap((msg) => [
      { role: 'user', content: msg.q },
      { role: 'assistant', content: msg.a },
    ]);
  }

  async getAiAnswer(
    chatbotName: string,
    query: string,
    topChunks: ChunkForCompletion[],
    prevMessages: ChatQueryAnswer[],
    defaultAnswer: string | undefined,
    prompt: string | undefined,
    customKeys: CustomKeyData,
    debug = false,
    isAddress?: boolean,
    isPhone?: boolean,
    userId?: ObjectId,
  ) {
    const messages = this.getChatGptPrompt(
      chatbotName,
      query,
      topChunks,
      prevMessages,
      defaultAnswer,
      this.appConfig.get('maxTokenLimit'),
      prompt,
      isAddress,
      isPhone,
    );
    const answer = await this.openaiService.getChatGptCompletion(
      {
        messages: messages as any,
        temperature: 0.1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        model: GPTModels.GPT_4O_MINI, // High-volume chatbot: cheapest tier for user-facing chatbot answer
      },
      this.getCustomKeys(customKeys),
      userId,
      'chatbot-answer',
    );

    return { ...answer, messages: debug ? { messages } : {} };
  }

  async getAiAnswerStream(
    chatbotName: string,
    query: string,
    topChunks: ChunkForCompletion[],
    prevMessages: ChatQueryAnswer[],
    answerCompleteCb: (
      answer: string,
      usage: ChatGTPResponse['tokenUsage'],
    ) => Promise<void>,
    defaultAnswer: string | undefined,
    prompt: string | undefined,
    customKeys?: CustomKeyData,
    isAddress?: boolean,
    isPhone?: boolean,
    userId?: ObjectId,
    meetingSlots?: any,
    busySlots?: any,
    vakmangidsKnowledgebaseData?: any,
    timezone?: string,
  ) {
    try {
      const messages = this.getChatGptPrompt(
        chatbotName,
        query,
        topChunks,
        prevMessages,
        defaultAnswer,
        this.appConfig.get('maxTokenLimit'),
        prompt,
        isAddress,
        isPhone,
        meetingSlots,
        busySlots,
        vakmangidsKnowledgebaseData,
        timezone,
      );

      const answerStream = await this.openaiService.getChatGptCompletionStream(
        {
          messages: messages as any,
          temperature: 0,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: true,
          top_p: 1,
          model: GPTModels.GPT_4O_MINI, // High-volume chatbot: cheapest tier for user-facing streaming chatbot answer
        },
        answerCompleteCb,
        this.getCustomKeys(customKeys),
        userId,
        'chatbot-answer-stream',
      );
      return answerStream;
    } catch (error) {
      throw error;
    }
  }
}
