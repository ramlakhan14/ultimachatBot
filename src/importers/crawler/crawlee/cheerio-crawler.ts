import {
  CrawlConfig,
  CrawleeCrawler,
  CrawlerStats,
  CrawlPageDataCb,
} from './crawler.types';
import { CheerioCrawler, Configuration, LogLevel } from 'crawlee';
import { convertCrawleeStats } from './crawlee-crawler';

const config = new Configuration({
  logLevel: LogLevel.WARNING,
  persistStorage: false,
  storageClientOptions: {
    persistStorage: false,
  },
});

Configuration.getGlobalConfig().set('persistStorage', false);
Configuration.getGlobalConfig().set('storageClientOptions', {
  ...Configuration.getGlobalConfig().get('storageClientOptions'),
  persistStorage: false,
});

export class CrawleeCheerioCrawler implements CrawleeCrawler {
  private crawler?: CheerioCrawler;
  private config?: CrawlConfig;
  private stats?: CrawlerStats;

  public setConfig(config: CrawlConfig) {
    this.config = config;
  }

  public getStats(): CrawlerStats | undefined {
    if (!this.crawler) {
      return this.stats;
    }

    return convertCrawleeStats(this.crawler.stats);
  }

  public async crawl(cb: CrawlPageDataCb) {
    // Create crawler
    this.crawler = new CheerioCrawler(
      {
        maxConcurrency: 10,
        maxRequestsPerCrawl: this.config?.maxPages,
        preNavigationHooks: [
          async ({ request }, gotOptions) => {
            if (gotOptions) {
              gotOptions.http2 = false;
              gotOptions.headers = {
                ...gotOptions.headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              };
            }
          },
        ],
        requestHandler: async ({ request, $, enqueueLinks, log }) => {
          const url = request.loadedUrl || request.url;
          const title = await $('title').text();
          const content = await $.html();

          // Call cb with page data
          await cb({
            url,
            title,
            content,
          });

          await enqueueLinks({
            globs: this.config?.include,
            exclude: this.config?.exclude,
          });
        },
      },
      config,
    );

    // Run crawler
    await this.crawler.run(this.config?.urls, {});

    this.stats = convertCrawleeStats(this.crawler.stats);

    // Cleanup
    await this.crawler.requestQueue.drop();
    await this.crawler.teardown();
  }

  public async crawlV2(cb: CrawlPageDataCb) {
    // Create crawler
    this.crawler = new CheerioCrawler(
      {
        maxConcurrency: 10,
        maxRequestsPerCrawl: this.config?.maxPages,
        preNavigationHooks: [
          async ({ request }, gotOptions) => {
            if (gotOptions) {
              gotOptions.http2 = false;
              gotOptions.headers = {
                ...gotOptions.headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              };
            }
          },
        ],
        requestHandler: async ({ request, $, enqueueLinks, log }) => {
          // Skip any URL with query parameters
          if (request.url.includes('?')) {
            log.info(`Skipping URL with query params: ${request.url}`);
            return;
          }

          // Skip image URLs
          if (
            /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico|pdf|docx?|xlsx?|pptx?|zip|rar)$/i.test(request.url)
          ) {
            log.info(`Skipping non-HTML URL: ${request.url}`);
            return;
          }

          // Allow up to two slugs after the base URL
          const urlObj = new URL(request.url);
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 2) {
            log.info(`Skipping deep URL: ${request.url}`);
            return;
          }

          const url = request.loadedUrl || request.url;
          const title = await $('title').text();
          const content = await $.html();

          // Call cb with page data
          await cb({
            url,
            title,
            content,
          });

          const baseOrigin = new URL(request.url).origin;
          await enqueueLinks({
            globs: this.config?.include?.length
              ? this.config.include
              : [`${baseOrigin}/**`],
            exclude: [
              ...(this.config?.exclude || []),
              '**/*.pdf',
              '**/*.doc',
              '**/*.docx',
              '**/*.xls',
              '**/*.xlsx',
              '**/*.ppt',
              '**/*.pptx',
              '**/*.zip',
              '**/*.rar',
              '**/*.mp3',
              '**/*.mp4',
              '**/*.jpg',
              '**/*.jpeg',
              '**/*.png',
              '**/*.gif',
              '**/*.svg',
            ],
          });
        },
        failedRequestHandler: async ({ request, error, log, response }) => {
          if (response && response.statusCode === 403) {
            log.warning(`Skipping URL due to 403 Forbidden: ${request.url}`);
            return;
          }
          log.error(
            `Request failed: ${request.url} - ${
              (error as any)?.message || 'Unknown error'
            }`,
          );
        },
      },
      config,
    );

    // Run crawler
    await this.crawler.run(this.config?.urls, {});

    this.stats = convertCrawleeStats(this.crawler.stats);

    // Cleanup
    await this.crawler.requestQueue.drop();
    await this.crawler.teardown();
  }
}
