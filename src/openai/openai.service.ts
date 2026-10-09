import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import axios from 'axios';
import { Configuration, CreateChatCompletionRequest, OpenAIApi } from 'openai';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Subject } from 'rxjs';
import { AppConfigService } from '../common/config/appConfig.service';
import * as tiktoken from '@dqbd/tiktoken';
import { createHash } from 'node:crypto';
import { UserService } from '../user/user.service';
import { Db, ObjectId } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import { USER_COLLECTION } from '../user/user.schema';
import { KNOWLEDGEBASE_COLLECTION } from '../knowledgebase/knowledgebase.schema';
import { GPTModels } from '../campaign/enum/enum';
import { OpenAiUsageService } from '../common/openai-usage/openai-usage.service';

const TOKENIZERS = {
  chatgtp: tiktoken.encoding_for_model('gpt-4o-mini'),
};

export interface ChatGTPResponse {
  response: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export type ChatGptPromptMessages = CreateChatCompletionRequest['messages'];

function getOpenAiClient(keys: string[]): [OpenAIApi, string, string] {
  // Select random key from the given list of keys
  const randomKeyIdx = Math.floor(Math.random() * keys.length);
  const selectedKey = keys[randomKeyIdx];
  const selectedKeyHash = createHash('md5').update(selectedKey).digest('hex');

  const config = new Configuration({
    apiKey: selectedKey,
  });
  const client = new OpenAIApi(config);
  return [client, selectedKey, selectedKeyHash];
}

@Injectable()
export class OpenaiService {
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiterMemory;
  private readonly embedRateLimiter: RateLimiterMemory;
  // private readonly userCollection: Collection<User>;

  private defaultKeys = [];

  constructor(
    @Inject(MONGODB) private db: Db,
    private appConfig: AppConfigService,
    private userService: UserService,
    @Optional() private openAiUsageService?: OpenAiUsageService,
  ) {
    // this.userCollection = this.db.collection<User>(USER_COLLECTION);
    this.defaultKeys = [
      this.appConfig.get('openaiKey'),
      this.appConfig.get('openaiKey2'),
    ];

    this.logger = new Logger(OpenaiService.name);

    // Rate limiter for 100 req / min
    this.embedRateLimiter = new RateLimiterMemory({
      points: 400,
      duration: 60 * 1,
    });

    this.rateLimiter = new RateLimiterMemory({
      points: 600,
      duration: 60 * 1,
    });
  }

  getTokenCount(input: string): number {
    const encoder = TOKENIZERS['chatgtp'];
    const tokens = encoder.encode(input);
    return tokens.length;
  }

  /**
   * Get embedding for given string
   * @param input
   * @returns
   */
  // async getEmbedding(
  //   input: string,
  //   keys?: string[],
  //   userId?: ObjectId,
  // ): Promise<number[] | undefined> {
  //   if (userId) {
  //     const userData = await this.userService.findUserById(userId.toString());
  //     this.logger.log(
  //       `[getEmbedding] User subscription: ${userData.activeSubscription}`,
  //     );
  //     if (
  //       userData.openaiKeys &&
  //       // userData.openaiKeys.apiKey &&
  //       userData.openaiKeys.useOwnKey &&
  //       ['STANDARD', 'ENTERPRISE', 'PREMIUM'].includes(
  //         userData.activeSubscription,
  //       )
  //     ) {
  //       this.logger.log(
  //         `[getEmbedding] Using user's OpenAI key for subscription: ${userData.activeSubscription}`,
  //       );
  //       if (!userData.openaiKeys.apiKey || userData.openaiKeys.apiKey === '') {
  //         throw new Error('User OpenAI key not found');
  //       }

  //       keys = [userData.openaiKeys.apiKey];

  //       this.logger.log(`[getEmbedding] Using user key hash: ${keys[0]}`);
  //     } else if (
  //       [
  //         'BASE_MONTHLY',
  //         'STANDARD_MONTHLY',
  //         'PREMIUM_MONTHLY',
  //         'ENTERPRISE_MONTHLY',
  //         'SELF_HOSTED',
  //       ].includes(userData.activeSubscription)
  //     ) {
  //       this.logger.log(
  //         `[getEmbedding] Using default keys for subscription: ${userData.activeSubscription}`,
  //       );
  //       keys = this.defaultKeys;
  //       this.logger.log(`[getEmbedding] Using default key hash: ${keys[0]}`);
  //     }
  //   }
  //   // } else {
  //   //   this.logger.log(`[getEmbedding] No userId provided, using default keys`);
  //   //   keys = this.defaultKeys;
  //   //   this.logger.log(`[getEmbedding] Using ELSE default key hash: ${keys[0]}`);
  //   // }
  //   const [openAiClient, openAiKeyHash] = getOpenAiClient(keys);
  //   this.logger.log(
  //     `[getEmbedding] Using key hash: ${openAiKeyHash.substring(0, 8)}...`,
  //   );
  //   // Rate limiter check
  //   try {
  //     await this.embedRateLimiter.consume(`openai-emd-${openAiKeyHash}`, 1);
  //   } catch (err) {
  //     this.logger.error('OpenAI Embedding Request exeeced rate limiting');
  //     throw new Error('Requests exceeded maximum rate');
  //   }

  //   // API Call
  //   try {
  //     const res = await openAiClient.createEmbedding({
  //       input,
  //       model: 'text-embedding-ada-002',
  //     });
  //     return res.data.data?.[0].embedding;
  //   } catch (err) {
  //     this.logger.error('OpenAI Embedding API error', err);
  //     this.logger.error('Error reponse', err?.response?.data);
  //     throw err;
  //   }
  // }

  async getEmbedding(
    input: string,
    keys?: string[],
    userId?: ObjectId,
    kbId?: ObjectId,
    feature?: string,
  ): Promise<number[] | undefined> {
    if (userId) {
      const userData = await this.userService.findUserById(userId.toString());

      this.logger.log(`[getEmbedding] User role: ${userData.role}`);

      // ✅ SUPERADMIN → use default system keys
      if (userData.role === 'admin') {
        keys = this.defaultKeys;

        this.logger.log(
          `[getEmbedding] Using default OpenAI keys (SUPERADMIN)`,
        );
      }
      // ✅ All other users MUST use their own key
      else {
        if (
          !userData.openaiKeys ||
          !userData.openaiKeys.useOwnKey ||
          !userData.openaiKeys.apiKey
        ) {
          throw new Error(
            'OpenAI API key not configured. Please add your API key to continue.',
          );
        }

        keys = [userData.openaiKeys.apiKey];

        // this.logger.log(`[getEmbedding] Using user-provided OpenAI key`);
      }
    }

    // Safety fallback (system jobs without userId)
    if (!keys || keys.length === 0) {
      throw new Error('No OpenAI API key available');
    }

    const [openAiClient, openAiKeyHash] = getOpenAiClient(keys);

    // this.logger.log(
    //   `[getEmbedding] Using key hash: ${openAiKeyHash.substring(0, 8)}...`,
    // );

    // Rate limiter
    try {
      await this.embedRateLimiter.consume(`openai-emb-${openAiKeyHash}`, 1);
    } catch {
      this.logger.error('OpenAI Embedding rate limit exceeded');
      throw new Error('Requests exceeded maximum rate');
    }

    // OpenAI API call
    try {
      const res = await openAiClient.createEmbedding({
        input,
        model: 'text-embedding-ada-002',
      });

      try {
        await this.updateTokenUsage(
          userId,
          res.data.usage?.total_tokens ?? 0,
          kbId,
        );
      } catch (err) {
        this.logger.error('Error updating token usage', err);
      }

      this.openAiUsageService?.track({
        userId,
        model: 'text-embedding-ada-002',
        feature: feature ?? 'embedding',
        inputTokens: res.data.usage?.total_tokens ?? 0,
        outputTokens: 0,
      });

      return res.data.data?.[0].embedding;
    } catch (err) {
      this.logger.error('OpenAI Embedding API error', err);
      this.logger.error('Error response', err?.response?.data);
      throw err;
    }
  }

  async updateTokenUsage(
    userId: ObjectId,
    totalTokens: number,
    knowledgebaseId?: ObjectId,
  ) {
    try {
      const currentDate = new Date();
      const currentMonth = `${
        currentDate.getMonth() + 1
      }/${currentDate.getFullYear()}`;

      await this.db.collection(USER_COLLECTION).updateOne({ _id: userId }, [
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
        await this.db
          .collection(KNOWLEDGEBASE_COLLECTION)
          .updateOne({ _id: knowledgebaseId }, [
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
   * Get completions from ChatGTP
   * @param data
   * @returns
   */
  // async getChatGptCompletion(
  //   data: CreateChatCompletionRequest,
  //   keys?: string[],
  //   userId?: ObjectId,
  // ): Promise<ChatGTPResponse> {
  //   // Get openAi client from the given keys

  //   if (userId) {
  //     const userData = await this.userService.findUserById(userId.toString());
  //     this.logger.log(
  //       `[getChatGptCompletion] User subscription: ${userData.activeSubscription}`,
  //     );
  //     if (
  //       userData.openaiKeys &&
  //       // userData.openaiKeys.apiKey &&
  //       userData.openaiKeys.useOwnKey &&
  //       ['STANDARD', 'ENTERPRISE', 'PREMIUM'].includes(
  //         userData.activeSubscription,
  //       )
  //     ) {
  //       this.logger.log(
  //         `[getChatGptCompletion] Using user's OpenAI key for subscription: ${userData.activeSubscription}`,
  //       );

  //       if (!userData.openaiKeys.apiKey || userData.openaiKeys.apiKey === '') {
  //         throw new Error('User OpenAI key not found');
  //       }

  //       keys = [userData.openaiKeys.apiKey];
  //       this.logger.log(
  //         `[getChatGptCompletion] Using user key hash: ${keys[0]}`,
  //       );
  //     } else if (
  //       [
  //         'BASE_MONTHLY',
  //         'STANDARD_MONTHLY',
  //         'PREMIUM_MONTHLY',
  //         'ENTERPRISE_MONTHLY',
  //         'SELF_HOSTED',
  //       ].includes(userData.activeSubscription)
  //     ) {
  //       this.logger.log(
  //         `[getChatGptCompletion] Using default keys for subscription: ${userData.activeSubscription}`,
  //       );
  //       keys = this.defaultKeys;
  //       this.logger.log(
  //         `[getChatGptCompletion] Using default key hash: ${keys[0]}`,
  //       );
  //     }
  //     // } else {
  //     //   this.logger.log(
  //     //     `[getChatGptCompletion] No userId provided, using default keys`,
  //     //   );
  //     //   keys = this.defaultKeys;
  //     //   this.logger.log(
  //     //     `[getChatGptCompletion] Using ELSE default key hash: ${keys[0]}`,
  //     //   );
  //     // }
  //     // keys = keys || this.defaultKeys;
  //     const [openAiClient, openAiKeyHash] = getOpenAiClient(keys);
  //     this.logger.log(
  //       `[getChatGptCompletion] Using key hash: ${openAiKeyHash.substring(
  //         0,
  //         8,
  //       )}...`,
  //     );

  //     // Rate limiter check
  //     try {
  //       await this.rateLimiter.consume(`openai-req-${openAiKeyHash}`, 1);
  //     } catch (err) {
  //       this.logger.error(
  //         'OpenAI ChatCompletion Request exeeced rate limiting',
  //       );
  //       throw new Error('Requests exceeded maximum rate');
  //     }

  //     // API Call
  //     try {
  //       const res = await openAiClient.createChatCompletion(data);
  //       return {
  //         response: res.data.choices[0].message.content,
  //         tokenUsage: {
  //           prompt: res.data.usage?.prompt_tokens,
  //           completion: res.data.usage?.completion_tokens,
  //           total: res.data.usage?.total_tokens,
  //         },
  //       };
  //     } catch (err) {
  //       this.logger.error('OpenAI ChatCompletion API error', err);
  //       this.logger.error('Error reponse', err?.response?.data);
  //       throw err;
  //     }
  //   }
  // }
  // GPT-5 family models reject non-default temperature/frequency_penalty/presence_penalty
  // (400 unsupported_value / unsupported_parameter) — strip them so callers can keep
  // passing their usual sampling params without needing to special-case this model.
  private sanitizeCompletionParams(
    data: CreateChatCompletionRequest,
  ): CreateChatCompletionRequest {
    if (data.model === GPTModels.GPT_5_MINI) {
      const {
        temperature: _temperature,
        frequency_penalty: _frequency_penalty,
        presence_penalty: _presence_penalty,
        ...rest
      } = data as any;
      return rest;
    }
    return data;
  }

  async getChatGptCompletion(
    data: CreateChatCompletionRequest,
    keys?: string[],
    userId?: ObjectId,
    feature?: string,
  ): Promise<ChatGTPResponse> {
    // -------------------------------
    // Resolve OpenAI keys
    // -------------------------------
    if (userId) {
      const userData = await this.userService.findUserById(userId.toString());

      this.logger.log(`[getChatGptCompletion] User role: ${userData.role}`);

      // ✅ SUPERADMIN → use default keys
      if (userData.role === 'admin') {
        keys = this.defaultKeys;
        this.logger.log(
          `[getChatGptCompletion] Using default OpenAI keys (SUPERADMIN)`,
        );
      }
      // ✅ All other users → must use own key
      else {
        if (
          !userData.openaiKeys ||
          !userData.openaiKeys.useOwnKey ||
          !userData.openaiKeys.apiKey
        ) {
          throw new Error(
            'OpenAI API key not configured. Please add your API key to continue.',
          );
        }

        keys = [userData.openaiKeys.apiKey];
        // this.logger.log(
        //   `[getChatGptCompletion] Using user-provided OpenAI key`,
        // );
      }
    }

    // Safety guard
    if (!keys || keys.length === 0) {
      throw new Error('No OpenAI API key available');
    }

    // -------------------------------
    // OpenAI client
    // -------------------------------
    const [openAiClient, openAiKeyHash] = getOpenAiClient(keys);

    // this.logger.log(
    //   `[getChatGptCompletion] Using key hash: ${openAiKeyHash.substring(
    //     0,
    //     8,
    //   )}...`,
    // );

    // -------------------------------
    // Rate limiter
    // -------------------------------
    try {
      await this.rateLimiter.consume(`openai-req-${openAiKeyHash}`, 1);
    } catch {
      this.logger.error('OpenAI ChatCompletion request exceeded rate limit');
      throw new Error('Requests exceeded maximum rate');
    }

    // -------------------------------
    // OpenAI API call
    // -------------------------------
    try {
      const res = await openAiClient.createChatCompletion(
        this.sanitizeCompletionParams(data),
      );

      const inputTokens = res.data.usage?.prompt_tokens ?? 0;
      const outputTokens = res.data.usage?.completion_tokens ?? 0;

      this.openAiUsageService?.track({
        userId,
        model: data.model,
        feature: feature ?? 'chat-completion',
        inputTokens,
        outputTokens,
      });

      return {
        response: res.data.choices[0].message.content,
        tokenUsage: {
          prompt: inputTokens,
          completion: outputTokens,
          total: res.data.usage?.total_tokens ?? 0,
        },
      };
    } catch (err) {
      this.logger.error('OpenAI ChatCompletion API error', err);
      this.logger.error('Error response', err?.response?.data);
      throw err;
    }
  }

  /**
   * Get streaming response from chatgpt
   * @param data
   * @param completeCb
   * @returns
   */
  // async getChatGptCompletionStream(
  //   data: CreateChatCompletionRequest,
  //   completeCb?: (
  //     answer: string,
  //     usage: ChatGTPResponse['tokenUsage'],
  //   ) => Promise<void>,
  //   keys?: string[],
  //   userId?: ObjectId,
  // ) {
  //   if (userId) {
  //     const userData = await this.userService.findUserById(userId.toString());
  //     this.logger.log(
  //       `[getChatGptCompletionStream] User subscription: ${userData.activeSubscription}`,
  //     );
  //     if (
  //       userData.openaiKeys &&
  //       // userData.openaiKeys.apiKey &&
  //       userData.openaiKeys.useOwnKey &&
  //       ['STANDARD', 'ENTERPRISE', 'PREMIUM'].includes(
  //         userData.activeSubscription,
  //       )
  //     ) {
  //       this.logger.log(
  //         `[getChatGptCompletionStream] Using user's OpenAI key for subscription: ${userData.activeSubscription}`,
  //       );

  //       if (!userData.openaiKeys.apiKey || userData.openaiKeys.apiKey === '') {
  //         throw new Error('User OpenAi key not found');
  //       }

  //       keys = [userData.openaiKeys.apiKey];
  //       this.logger.log(
  //         `[getChatGptCompletionStream] Using user key hash: ${keys[0]}`,
  //       );
  //     } else if (
  //       [
  //         'BASE_MONTHLY',
  //         'STANDARD_MONTHLY',
  //         'PREMIUM_MONTHLY',
  //         'ENTERPRISE_MONTHLY',
  //         'SELF_HOSTED',
  //       ].includes(userData.activeSubscription)
  //     ) {
  //       this.logger.log(
  //         `[getChatGptCompletionStream] Using default keys for subscription: ${userData.activeSubscription}`,
  //       );
  //       keys = this.defaultKeys;
  //       this.logger.log(
  //         `[getChatGptCompletionStream] Using default key hash: ${keys[0]}`,
  //       );
  //     }
  //     // } else {
  //     //   this.logger.log(
  //     //     `[getChatGptCompletionStream] No userId provided, using default keys`,
  //     //   );
  //     //   keys = this.defaultKeys;
  //     //   this.logger.log(
  //     //     `[getChatGptCompletionStream] Using ELSE default key hash: ${keys[0]}`,
  //     //   );
  //     // }
  //     // Get openAi client from the given keys
  //     // keys = keys || this.defaultKeys;
  //     const [_, openAiKey, openAiKeyHash] = getOpenAiClient(keys);
  //     this.logger.log(
  //       `[getChatGptCompletionStream] Using key hash: ${openAiKeyHash.substring(
  //         0,
  //         8,
  //       )}...`,
  //     );

  //     // Rate limiter check
  //     try {
  //       await this.rateLimiter.consume(`openai-req-${openAiKeyHash}`, 1);
  //     } catch (err) {
  //       this.logger.error(
  //         'OpenAI ChatCompletion Request exeeced rate limiting',
  //       );
  //       throw new Error('Requests exceeded maximum rate');
  //     }

  //     const observable = new Subject<string>();

  //     const promptTokens = this.getTokenCount(
  //       data.messages.map((m) => m.content).join(' '),
  //     );

  //     try {
  //       const res = await axios.post(
  //         'https://api.openai.com/v1/chat/completions',
  //         { ...data, stream: true },
  //         {
  //           responseType: 'stream',
  //           headers: {
  //             Authorization: `Bearer ${openAiKey}`,
  //           },
  //         },
  //       );

  //       const stream = res.data;
  //       let answer = '';
  //       let buffer = '';
  //       stream.on('data', (data) => {
  //         const dataStr = buffer.length
  //           ? buffer + data.toString()
  //           : data.toString();
  //         const responses = dataStr.split('\n\n').filter((c) => c.length > 0);
  //         for (const res of responses) {
  //           try {
  //             if (res === 'data: [DONE]') continue;
  //             const content = JSON.parse(res.replace('data: ', '')).choices[0]
  //               ?.delta?.content;
  //             if (content !== undefined) {
  //               observable.next(JSON.stringify({ content }));
  //               answer += content;
  //             }
  //             buffer = '';
  //           } catch (err) {
  //             buffer += res;
  //           }
  //         }
  //       });

  //       stream.on('end', () => {
  //         observable.next('[DONE]');
  //         observable.complete();
  //         const completionTokens = this.getTokenCount(answer);
  //         completeCb?.(answer, {
  //           prompt: promptTokens,
  //           completion: completionTokens,
  //           total: promptTokens + completionTokens,
  //         });
  //       });
  //     } catch (err) {
  //       this.logger.error('OpenAI ChatCompletion API error', err);
  //       let errorString = '';
  //       err.response.data.setEncoding('utf8');
  //       err.response.data
  //         .on('data', (utf8Chunk) => {
  //           errorString += utf8Chunk;
  //         })
  //         .on('end', () => {
  //           this.logger.error('Error response', errorString);
  //         });
  //       throw err;
  //     }
  //     return observable;
  //   }
  // }

  async getChatGptCompletionStream(
    data: CreateChatCompletionRequest,
    completeCb?: (
      answer: string,
      usage: ChatGTPResponse['tokenUsage'],
    ) => Promise<void>,
    keys?: string[],
    userId?: ObjectId,
    feature?: string,
  ) {
    if (userId) {
      const userData = await this.userService.findUserById(userId.toString());

      this.logger.log(
        `[getChatGptCompletionStream] User role: ${userData.role}`,
      );

      // ✅ SUPERADMIN → system default keys
      if (userData.role === 'admin') {
        keys = this.defaultKeys;
        this.logger.log(
          `[getChatGptCompletionStream] Using default OpenAI keys (SUPERADMIN)`,
        );
      }
      // ✅ All other users → must use own key
      else {
        if (
          !userData.openaiKeys ||
          !userData.openaiKeys.useOwnKey ||
          !userData.openaiKeys.apiKey
        ) {
          throw new Error(
            'OpenAI API key not configured. Please add your API key to continue.',
          );
        }

        keys = [userData.openaiKeys.apiKey];
        // this.logger.log(
        //   `[getChatGptCompletionStream] Using user-provided OpenAI key`,
        // );
      }
    }

    // Safety guard (background jobs, misconfig)
    if (!keys || keys.length === 0) {
      throw new Error('No OpenAI API key available');
    }

    // Get OpenAI client
    const [_, openAiKey, openAiKeyHash] = getOpenAiClient(keys);

    // this.logger.log(
    //   `[getChatGptCompletionStream] Using key hash: ${openAiKeyHash.substring(
    //     0,
    //     8,
    //   )}...`,
    // );

    // -------------------------------
    // Rate limiter
    // -------------------------------
    try {
      await this.rateLimiter.consume(`openai-req-${openAiKeyHash}`, 1);
    } catch {
      this.logger.error('OpenAI ChatCompletion request exceeded rate limit');
      throw new Error('Requests exceeded maximum rate');
    }

    const observable = new Subject<string>();

    const promptTokens = this.getTokenCount(
      data.messages.map((m) => m.content).join(' '),
    );

    // -------------------------------
    // OpenAI streaming call
    // -------------------------------
    try {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        { ...this.sanitizeCompletionParams(data), stream: true },
        {
          responseType: 'stream',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
          },
        },
      );

      const stream = res.data;
      let answer = '';
      let buffer = '';

      stream.on('data', (chunk) => {
        const dataStr = buffer ? buffer + chunk.toString() : chunk.toString();

        const responses = dataStr.split('\n\n').filter((c) => c.length > 0);

        for (const res of responses) {
          try {
            if (res === 'data: [DONE]') continue;

            const content = JSON.parse(res.replace('data: ', ''))?.choices?.[0]
              ?.delta?.content;

            if (content !== undefined) {
              observable.next(JSON.stringify({ content }));
              answer += content;
            }

            buffer = '';
          } catch {
            buffer += res;
          }
        }
      });

      stream.on('end', () => {
        observable.next('[DONE]');
        observable.complete();

        const completionTokens = this.getTokenCount(answer);

        this.openAiUsageService?.track({
          userId,
          model: data.model,
          feature: feature ?? 'chat-completion-stream',
          inputTokens: promptTokens,
          outputTokens: completionTokens,
        });

        completeCb?.(answer, {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        });
      });
    } catch (err) {
      this.logger.error('OpenAI ChatCompletion API error', err);

      let errorString = '';
      err?.response?.data?.setEncoding?.('utf8');
      err?.response?.data
        ?.on?.('data', (chunk) => {
          errorString += chunk;
        })
        ?.on?.('end', () => {
          this.logger.error('Error response', errorString);
        });

      throw err;
    }

    return observable;
  }

  // Extract text from image using OpenAI Vision
  async extractTextFromImage(
    file: Express.Multer.File,
    keys?: string[],
    userId?: ObjectId,
  ): Promise<string> {
    if (!file) {
      throw new Error('Image file not provided');
    }

    if (!userId) {
      throw new Error('UserId is required');
    }

    const userData = await this.userService.findUserById(userId.toString());

    // 🔑 Key selection logic
    if (userData.role == 'admin') {
      keys = this.defaultKeys;
      this.logger.log('[extractTextFromImage] Using default keys (SUPERADMIN)');
    } else {
      if (!userData.openaiKeys?.apiKey) {
        throw new Error('User OpenAI key not found');
      }
      keys = [userData.openaiKeys.apiKey];
      this.logger.log('[extractTextFromImage] Using user OpenAI key');
    }

    const base64Image = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/png';

    const [openAiClient] = getOpenAiClient(keys);

    try {
      const response = await openAiClient.createChatCompletion({
        model: GPTModels.GPT_4O_MINI,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return only plain text.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ] as any,
      });

      this.openAiUsageService?.track({
        userId,
        model: GPTModels.GPT_4O_MINI,
        feature: 'document-image-ocr',
        inputTokens: response.data.usage?.prompt_tokens ?? 0,
        outputTokens: response.data.usage?.completion_tokens ?? 0,
      });

      return response.data.choices[0].message?.content || '';
    } catch (error) {
      this.logger.error('Error extracting text from image', error);
      throw error;
    }
  }
}
