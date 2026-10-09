// import {
//   CrawlConfig,
//   CrawleeCrawler,
//   CrawlerStats,
//   CrawlPageDataCb,
// } from './crawler.types';
// import { PuppeteerCrawler, Configuration, LogLevel } from 'crawlee';
// import puppeteer from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import { convertCrawleeStats } from './crawlee-crawler';

// puppeteer.use(StealthPlugin());

// const config = new Configuration({
//   logLevel: LogLevel.WARNING,
//   persistStorage: false,
//   storageClientOptions: {
//     persistStorage: false,
//   },
// });

// Configuration.getGlobalConfig().set('persistStorage', false);
// Configuration.getGlobalConfig().set('storageClientOptions', {
//   ...Configuration.getGlobalConfig().get('storageClientOptions'),
//   persistStorage: false,
// });

// export class CrawleePuppeteerCrawler implements CrawleeCrawler {
//   private crawler?: PuppeteerCrawler;
//   private config?: CrawlConfig;
//   private stats?: CrawlerStats;

//   public setConfig(config: CrawlConfig) {
//     this.config = config;
//   }

//   public getStats(): CrawlerStats | undefined {
//     if (!this.crawler) return this.stats;
//     return convertCrawleeStats(this.crawler.stats);
//   }

//   public async crawlV2(cb: CrawlPageDataCb) {
//     this.crawler = new PuppeteerCrawler(
//       {
//         maxConcurrency: 10,
//         maxRequestsPerCrawl: this.config?.maxPages,
//         launchContext: {
//           launcher: puppeteer,
//           launchOptions: {
//             headless: true,
//             args: ['--no-sandbox', '--disable-setuid-sandbox'],
//           },
//         },
//         requestHandler: async ({ page, request, enqueueLinks, log }) => {
//           const url = request.loadedUrl || request.url;

//           if (
//             url.includes('?') ||
//             /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)$/i.test(url)
//           ) {
//             log.info(`Skipping unsupported URL: ${url}`);
//             return;
//           }

//           const urlObj = new URL(url);
//           const pathSegments = urlObj.pathname.split('/').filter(Boolean);
//           if (pathSegments.length > 2) {
//             log.info(`Skipping deep URL: ${url}`);
//             return;
//           }

//           const title = await page.title();
//           const content = await page.content();

//           await cb({ url, title, content });

//           await enqueueLinks({
//             globs: this.config?.include,
//             exclude: this.config?.exclude,
//           });
//         },
//         failedRequestHandler: async ({ request, error, log, response }) => {
//           if (response?.statusCode === 403) {
//             log.warning(`Blocked by 403: ${request.url}`);
//             return;
//           }
//           log.error(`Failed: ${request.url} - ${(error as any)?.message}`);
//         },
//       },
//       config,
//     );

//     await this.crawler.run(this.config?.urls ?? []);
//     this.stats = convertCrawleeStats(this.crawler.stats);
//     await this.crawler.requestQueue.drop();
//     await this.crawler.teardown();
//   }
// }
