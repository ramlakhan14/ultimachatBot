import './bootstrap.patch';

import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as celery from 'celery-node';
import { ObjectId } from 'mongodb';
import { AppConfigModule } from './common/config/appConfig.module';
import { MongoModule } from './common/mongo/mongo.module';
import {
  CrawlConfig,
  CrawlerPageData,
} from './importers/crawler/crawlee/crawler.types';
import { CrawlerService } from './importers/crawler/crawler.service';
import { getCleanedHtmlContent } from './importers/crawler/readability/readability';
import { ImportersModule } from './importers/importers.module';
import { InscriptisImporterService } from './importers/inscriptis/inscriptis-importer.service';
import { DataStoreService } from './knowledgebase/datastore.service';
import { KnowledgebaseDbService } from './knowledgebase/knowledgebase-db.service';
import { KnowledgebaseModule } from './knowledgebase/knowledgebase.module';
import {
  DataStoreStatus,
  DataStoreType,
  KbDataStore,
  KnowledgebaseStatus,
} from './knowledgebase/knowledgebase.schema';
import { OpenaiModule } from './openai/openai.module';
import { EmailModule } from './common/email/email.module';
import { TaskModule } from './task/task.module';
import { ChatbotService } from './knowledgebase/chatbot/chatbot.service';
import { AppConfigService } from './common/config/appConfig.service';
import { MaxJobQueue } from './common/max-job-queue';
import { VoicebotService } from './voicebot/voicebot/voicebot.service';
import {
  CrwalStatus,
  targetCrawledDataStore,
} from './voicebot/schema/voicebot.campaign.schema';
import { VoicebotModule } from './voicebot/voicebot/voicebot.module';
import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { DistributedLockModule } from './common/distributed-lock/distributed-lock.module';
@Module({
  imports: [
    AppConfigModule,
    MongoModule,
    DistributedLockModule,
    OpenaiModule,
    KnowledgebaseModule,
    VoicebotModule,
    ImportersModule,
    EmailModule,
    TaskModule,
    UserModule,
  ],
})
class CrawlerAppModule {}

async function processPage(
  pageData: CrawlerPageData,
  knowledgebaseId: ObjectId,
  insertKbDataStoreEntry: (data: KbDataStore) => Promise<KbDataStore>,
  parser: (html: string) => Promise<string>,
  useAlternateParser = false,
) {
  // Get cleaned text content from the html
  let pageContent;
  if (!useAlternateParser) {
    const cleanedContent = getCleanedHtmlContent(pageData.content);
    try {
      pageContent =
        cleanedContent.markdownContent || cleanedContent.textContent;
    } catch (error) {
      pageContent = '';
    }
  } else {
    // TODO: Fall back to normal parser if this fails
    pageContent = await parser(pageData.content);
  }
  // Add page to kbDataStore
  const ts = new Date();
  await insertKbDataStoreEntry({
    knowledgebaseId,
    url: pageData.url,
    title: pageData.title,
    content: pageContent,
    type: DataStoreType.WEBPAGE,
    status: DataStoreStatus.CREATED,
    createdAt: ts,
    updatedAt: ts,
  });
}

async function processPage2(
  pageData: CrawlerPageData,
  audienceId: ObjectId,
  updateDataStoreEntry: (data: targetCrawledDataStore) => Promise<any>,
  parser: (html: string) => Promise<string>,
  useAlternateParser = false,
) {
  // Get cleaned text content from the html
  let pageContent;
  if (!useAlternateParser) {
    const cleanedContent = getCleanedHtmlContent(pageData.content);
    try {
      pageContent =
        cleanedContent?.markdownContent || cleanedContent?.textContent || '';
    } catch (error) {
      pageContent = '';
    }
  } else {
    pageContent = await parser(pageData.content);
  }

  // Add page to datastore
  const ts = new Date();
  const data: targetCrawledDataStore = {
    content: pageContent,
    url: pageData.url,
    title: pageData.title || '',
    type: 'webpage',
    status: 'created',
    createdAt: ts,
    updatedAt: ts,
  };

  await updateDataStoreEntry(data);
  return data;
}

async function bootstrap() {
  // Get required services from NestJs
  const app = await NestFactory.createApplicationContext(CrawlerAppModule);
  const appConfigService = app.get(AppConfigService);
  const crawlerService = app.get(CrawlerService);
  const dataStoreService = app.get(DataStoreService);
  const inscriptisService = app.get(InscriptisImporterService);
  const kbDbService = app.get(KnowledgebaseDbService);
  const chatbotService = app.get(ChatbotService);
  const voicebotService = app.get(VoicebotService);
  const userService = app.get(UserService);
  const logger = new Logger('CrawlerWorker');

  // Celery Worker Init
  const redisConnectionStr = `redis://${appConfigService.get(
    'redisHost',
  )}:${appConfigService.get('redisPort')}/`;
  const worker = celery.createWorker(
    redisConnectionStr,
    redisConnectionStr,
    'crawler',
  );
  const client = celery.createClient(
    redisConnectionStr,
    redisConnectionStr,
    'crawler',
  );

  const crawlerJobQueue = new MaxJobQueue(1);

  // Hack to decrease the TTL of the result
  (worker.backend as any).set = function (key: string, value: string) {
    return Promise.all([
      this.redis.setex(key, 60, value),
      this.redis.publish(key, value), // publish command for subscribe
    ]);
  };

  /**
   * Worker function
   * @param crawlData
   * @param knowledgebaseId
   * @returns
   */
  async function doCrawl(
    crawlData: CrawlConfig,
    knowledgebaseId: string,
    retryCount: number,
    useAlternateParser = false,
  ) {
    const WEBSITE_TOKENS_PER_CREDIT = 1000;
    const MAX_TOKENS_PER_PAGE = 10000;

    logger.log(
      `Starting crawl job for knowledgebase: ${knowledgebaseId}, retry count: ${retryCount}, data: ${JSON.stringify(
        crawlData,
      )}`,
    );

    return crawlerJobQueue.addJob(async () => {
      const crawlUrls: string[] = [];
      logger.log(
        `Crawl job added to queue for knowledgebase: ${knowledgebaseId}`,
      );

      try {
        logger.log(
          `Beginning crawl for ${crawlData.urls.length} URLs with max pages: ${
            crawlData.maxPages || 'unlimited'
          }`,
        );

        let totalTokens = 0;

        const crawlStats = (await crawlerService.crawl(
          crawlData,
          async (pageData) => {
            crawlUrls.push(pageData.url);
            logger.log(`Processing page: ${pageData.url}`);

            const text = await inscriptisService.getTextForHtml(
              pageData.content,
            );

            const tokens = Math.min(
              Math.ceil(text.length / 4),
              MAX_TOKENS_PER_PAGE,
            );

            totalTokens += tokens;
            try {
            await processPage(
              pageData,
              new ObjectId(knowledgebaseId),
              async (data: KbDataStore) =>
                kbDbService.insertToKbDataStore(data),
              async () => text,
              useAlternateParser,
            );
            }catch (processError) {
              logger.error(
                `Error processing page ${pageData.url}:`,
                processError,
              );
            }
          },
        )) as any;

        crawlStats.totalTokens = totalTokens;

        let status = KnowledgebaseStatus.CRAWLED;

        if (crawlStats.crawledPages === 0) {
          status = KnowledgebaseStatus.CRAWL_ERROR;
          logger.log(
            `No pages crawled for knowledgebase: ${knowledgebaseId}, setting status to CRAWL_ERROR`,
          );
        } else {
          // ✅ TOKEN & CREDIT DEDUCTION LOGIC
          const kb = await kbDbService.getKnowledgebaseById(
            new ObjectId(knowledgebaseId),
          );

          const crawledTotalTokens = crawlStats.totalTokens || 0;
          const alreadyChargedTokens = kb.billing?.chargedTokens || 0;

          const deltaTokens = crawledTotalTokens - alreadyChargedTokens;

          if (deltaTokens > 0) {
            const creditsToDeduct = Math.ceil(
              deltaTokens / WEBSITE_TOKENS_PER_CREDIT,
            );

            logger.log(
              `Billing knowledgebase ${knowledgebaseId}: ` +
                `totalTokens=${crawledTotalTokens}, ` +
                `alreadyCharged=${alreadyChargedTokens}, ` +
                `deltaTokens=${deltaTokens}, ` +
                `credits=${creditsToDeduct}`,
            );

            await userService.consumeCredits(
              kb.owner,
              'VECTOR_EMBEDDING',
              null,
              null,
              null,
              deltaTokens,
            );

            await kbDbService.updateBilling(new ObjectId(knowledgebaseId), {
              chargedTokens: crawledTotalTokens,
              lastChargedAt: new Date(),
            });
          }
        }

        logger.log(`Updating knowledgebase crawl data for: ${knowledgebaseId}`);

        await kbDbService.setKnowledgebaseCrawlData(
          new ObjectId(knowledgebaseId),
          {
            stats: crawlStats,
          },
          status,
        );

        logger.log(`Crawl job completed for knowledgebase: ${knowledgebaseId}`);

        return {
          ...crawlStats,
        };
      } catch (err) {
        logger.error(`Error in crawl for ${knowledgebaseId}`, err);

        logger.log(
          `Updating knowledgebase status to CRAWL_ERROR for: ${knowledgebaseId}`,
        );

        await kbDbService.updateKnowledgebaseStatus(
          new ObjectId(knowledgebaseId),
          KnowledgebaseStatus.CRAWL_ERROR,
        );

        // Retry task with linearly increasing timeout
        if (retryCount < 3) {
          // const nextRetry = retryCount ? retryCount + 1 : 1;
          // const timeout = retryCount * 1000;
          const nextRetry = retryCount + 1;
          const timeout = retryCount * 1000; // 1s, 2s, 3s

          logger.log(
            `Scheduling retry #${nextRetry} for knowledgebase: ${knowledgebaseId} in ${timeout}ms`,
          );

          setTimeout(async () => {
            logger.log(
              `Executing retry #${nextRetry} for knowledgebase: ${knowledgebaseId}`,
            );

            await client
              .createTask('tasks.crawl')
              .applyAsync([
                crawlData,
                knowledgebaseId,
                nextRetry,
                useAlternateParser,
              ]);
          }, timeout);
        } else {
          logger.log(
            `Maximum retry attempts reached for knowledgebase: ${knowledgebaseId}, giving up`,
          );
        }
      }
    });
  }

  /**
   * Generate embeddings for knowledgebase
   * @param knowledgebaseId
   */
  async function generateEmbeddingsForKnowledgebase(knowledgebaseId: string) {
    const kbId = new ObjectId(knowledgebaseId);

    // Generate chunks for all data store items which are not trained yet
    const dsItemCursor = kbDbService.getKbDataStoreItemsForKnowledgebase(kbId, [
      DataStoreStatus.CREATED,
      DataStoreStatus.CHUNKED,
    ]);
    try {
      for await (const dsItem of dsItemCursor) {
        await dataStoreService.generateChunksAndEmbeddingsForDataStoreItem(
          dsItem,
        );
      }

      // Set the knowledgebase as ready
      await kbDbService.updateKnowledgebaseStatus(
        kbId,
        KnowledgebaseStatus.READY,
      );
    } catch (err) {
      logger.error(
        `Error in create chunks / embedding for ${knowledgebaseId}`,
        err,
      );
      await kbDbService.updateKnowledgebaseStatus(
        kbId,
        KnowledgebaseStatus.EMBEDDING_ERROR,
      );
      return;
    }
  }

  // async function notifyTokenLimit(userId: string) {
  //   const id = new ObjectId(userId);
  //   await chatbotService.notifyUserOfTokenLimitExhaustion(id);
  // }

  async function crawlWebsiteForCampaignLead(
    crawlData: CrawlConfig,
    audienceId: string,
    retryCount: number,
    useAlternateParser = false,
  ) {
    return crawlerJobQueue.addJob(async () => {
      const crawlUrls: string[] = [];
      logger.log(`Starting crawl job for audience: ${audienceId}`);

      try {
        const crawlStats = await crawlerService.crawl(
          crawlData,
          async (pageData) => {
            logger.log(`Processing page: ${pageData.url}`);
            crawlUrls.push(pageData.url);

            try {
              const processedData = await processPage2(
                pageData,
                new ObjectId(audienceId),
                async (data: targetCrawledDataStore) => {
                  logger.log('Saving processed data to database');
                  return voicebotService.insertSummaryIntoAudience(
                    audienceId,
                    data,
                  );
                },
                async (html: string) => inscriptisService.getTextForHtml(html),
                useAlternateParser,
              );

              logger.log(`Successfully processed page data`);
            } catch (processError) {
              logger.error(
                `Error processing page ${pageData.url}:`,
                processError,
              );
              throw processError;
            }
          },
        );

        logger.log('Crawl completed with stats:', crawlStats);

        let status = CrwalStatus.CRAWLED;
        if (crawlStats.crawledPages === 0) {
          logger.warn('No pages were crawled, setting error status');
          status = CrwalStatus.CRAWL_ERROR;
        }

        await voicebotService.setTargetAudienceWebsiteCrawlData(
          new ObjectId(audienceId),
          {
            stats: crawlStats,
            urls: crawlUrls,
          },
          status,
        );

        logger.log(
          `Crawl task completed successfully for audience: ${audienceId}`,
        );
        return crawlStats;
      } catch (err) {
        logger.error(`Error in crawl for ${audienceId}:`, err);
        await voicebotService.updatetargetAudienceStatus(
          new ObjectId(audienceId),
          CrwalStatus.CRAWL_ERROR,
        );

        if (retryCount < 3) {
          logger.log(`Scheduling retry ${retryCount + 1} of 3`);
          setTimeout(async () => {
            client
              .createTask('tasks.crawl_v2')
              .applyAsync([
                crawlData,
                audienceId,
                retryCount ? retryCount + 1 : 1,
                useAlternateParser,
              ]);
          }, retryCount * 1000);
        } else {
          logger.error('Max retries reached, giving up');
        }

        throw err;
      }
    });
  }

  worker.register('tasks.crawl', doCrawl);
  worker.register('tasks.gen_embeddings', generateEmbeddingsForKnowledgebase);
  // worker.register('tasks.notify_token_limit', notifyTokenLimit);
  worker.register('tasks.crawl_v2', crawlWebsiteForCampaignLead);
  worker.start();
}

bootstrap();
