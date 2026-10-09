import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import {
  FacebookScrapeRequestDto,
  ScrapeRequestDto,
} from './dto/scrape-request.dto';
import { HttpService } from '@nestjs/axios';
import { ApifyClient, ActorRun } from 'apify-client';
import * as pLimit from 'p-limit';
import { AppConfigService } from '../common/config/appConfig.service';
import {
  validateLeads,
  ValidationResult,
} from '../voicebot/utils/ValidatorLeads';
import { CampaignService } from '../campaign/campaign.service';
import { UserService } from '../user/user.service';

@Injectable()
export class FacebookScrapperService {
  private readonly logger = new Logger('FacebookScrapperService');

  private readonly facebookQueryMetricsCollection: Collection;

  /**
   * Constructor initializes the Facebook scrapper service
   * @developer : ankur
   */
  constructor(
    @Inject(MONGODB) private db: Db,
    private readonly http: HttpService,
    private appConfig: AppConfigService,
    private readonly campaignService: CampaignService,
    private readonly userService: UserService,
  ) {
    this.facebookQueryMetricsCollection = this.db.collection(
      'facebookQueryMetrics',
    );
    Logger.log('FacebookScrapperService initialized');
  }

  /**
   * Finds address details using the Outscraper API
   * @param apiKey - API key for Outscraper
   * @param facebookAddress - Address to search for
   * @returns Address details or null if not found
   * @developer : ankur
   */
  private async getAddressDetails(
    apiKey: string,
    facebookAddress: string,
  ): Promise<any> {
    Logger.log(`Getting address details for: ${facebookAddress}`);
    try {
      const baseUrl = 'https://api.app.outscraper.com/maps/search-v3';
      const queryParams = new URLSearchParams({
        query: facebookAddress,
        async: 'false',
      });

      Logger.log(`Making API request to get address details: ${baseUrl}`);
      const response = await fetch(`${baseUrl}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Address search failed with status: ${response.status}`,
        );
      }

      const data = await response.json();
      Logger.log(
        `Successfully retrieved address details for: ${facebookAddress}`,
      );
      return data;
    } catch (error) {
      Logger.error('Error finding address:', error);
      return null;
    }
  }

  /**
   * Finds Facebook page details using the Outscraper API
   * @param apiKey - API key for Outscraper
   * @param facebookUrl - Facebook URL to search for
   * @returns Facebook page details or null if not found
   * @developer : ankur
   */
  private async getFacebookPageInfo(
    apiKey: string,
    facebookUrl: string,
  ): Promise<any> {
    Logger.log(`Getting Facebook page info for: ${facebookUrl}`);
    try {
      // Ensure the URL is properly formatted
      let formattedUrl = facebookUrl;
      if (
        !formattedUrl.startsWith('https://') &&
        !formattedUrl.startsWith('http://')
      ) {
        formattedUrl = `${formattedUrl.replace('www.facebook.com/', '')}`;
      }
      // formattedUrl = `${formattedUrl.replace('https://www.facebook.com/', '')}`;

      // Use the correct endpoint for Facebook pages
      const facebookApiUrl = 'https://api.app.outscraper.com/facebook/pages';
      const queryParams = new URLSearchParams({
        query: formattedUrl,
        async: 'false',
        // // Add additional parameters that might help with scraping
        // limit: '1',
        // extract_emails: 'true',
        // extract_phones: 'true',
      });

      Logger.log(
        `Making API request to get Facebook page info: ${facebookApiUrl} for ${formattedUrl}`,
      );

      const response = await fetch(
        `${facebookApiUrl}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      // Handle different response statuses
      if (!response.ok) {
        Logger.warn(
          `Facebook page search returned status: ${response.status} for ${formattedUrl}`,
        );

        // Instead of throwing an error, try to get response body for more details
        const errorBody = await response.text();
        Logger.warn(`Error response body: ${errorBody}`);

        // For 404 errors, we might need to try a different approach
        if (response.status === 404) {
          // Try with just the page name/handle
          const pageName = formattedUrl.split('/').pop();
          if (pageName) {
            Logger.log(`Retrying with just the page name: ${pageName}`);
            return this.retryWithPageName(apiKey, pageName);
          }
        }

        // Return null instead of throwing to prevent breaking the flow
        return null;
      }

      const data = await response.json();

      // Check if we got valid data
      if (!data || !data.data || data.data.length === 0) {
        Logger.warn(`No data returned for Facebook page: ${formattedUrl}`);
        return null;
      }

      Logger.log(
        `Successfully retrieved Facebook page info for: ${formattedUrl}`,
      );
      return data;
    } catch (error) {
      Logger.error(`Error finding Facebook page ${facebookUrl}:`, error);
      return null;
    }
  }

  /**
   * Retry Facebook page search with just the page name
   * @param apiKey - API key for Outscraper
   * @param pageName - Facebook page name/handle
   * @returns Facebook page details or null if not found
   */
  private async retryWithPageName(
    apiKey: string,
    pageName: string,
  ): Promise<any> {
    try {
      const facebookApiUrl = 'https://api.app.outscraper.com/facebook/pages';
      const queryParams = new URLSearchParams({
        query: pageName,
        async: 'false',
        limit: '1',
        extract_emails: 'true',
        extract_phones: 'true',
      });

      Logger.log(`Retrying with page name: ${pageName}`);
      const response = await fetch(
        `${facebookApiUrl}?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        Logger.warn(`Retry failed with status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      Logger.error(`Error in retry for page name ${pageName}:`, error);
      return null;
    }
  }

  /**
   * Finds email addresses associated with a website using the Outscraper API
   * @param apiKey - API key for Outscraper
   * @param site - Website URL to search for emails
   * @returns Email data or null if not found
   * @developer : ankur
   */
  private async getEmailsFromSite(apiKey: string, site: string): Promise<any> {
    Logger.log(`Getting emails from site: ${site}`);
    try {
      const emailApiUrl = 'https://api.app.outscraper.com/emails-and-contacts';
      const queryParams = new URLSearchParams({
        query: site,
        async: 'false',
      });

      Logger.log(`Making API request to get emails: ${emailApiUrl}`);
      const response = await fetch(`${emailApiUrl}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Email search failed with status: ${response.status}`);
      }

      const emailData = await response.json();
      Logger.log(`Retrieved email data for site: ${site}`);

      // Handle pending status with polling
      if (emailData.status === 'Pending' && emailData.results_location) {
        Logger.log(`Email search is pending, starting polling for: ${site}`);
        return await this.pollResults(apiKey, emailData.results_location);
      }

      return emailData;
    } catch (error) {
      Logger.error('Error finding email:', error);
      return null;
    }
  }

  /**
   * Polls for results when an API request returns a pending status
   * @param apiKey - API key for Outscraper
   * @param pollUrl - URL to poll for results
   * @param maxAttempts - Maximum number of polling attempts
   * @returns Final result data or null if polling fails
   * @developer : ankur
   */
  private async pollResults(
    apiKey: string,
    pollUrl: string,
    maxAttempts = 5,
  ): Promise<any> {
    Logger.log(`Starting polling for results: ${pollUrl}`);
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        Logger.log(`Polling attempt ${attempt + 1}/${maxAttempts}`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between attempts

        const response = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Polling failed with status: ${response.status}`);
        }

        const pollData = await response.json();
        Logger.log(`Polling response received, status: ${pollData.status}`);

        if (pollData.status === 'Success') {
          Logger.log('Polling completed successfully');
          return pollData;
        }

        attempt++;
      } catch (error) {
        Logger.error(`Error polling for results (attempt ${attempt}):`, error);
        attempt++;
      }
    }

    Logger.warn(`Polling failed after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Finds companies based on a keyword search using the Outscraper API
   * @param apiKey - API key for Outscraper
   * @param keyword - Keyword to search for companies
   * @param limit - Maximum number of results to return
   * @returns Company data or null if not found
   * @developer : ankur
   */
  private async searchCompanies(
    apiKey: string,
    keyword: string,
    limit?: number,
  ): Promise<any> {
    Logger.log(`Searching companies with keyword: ${keyword}`);
    try {
      const baseUrl = 'https://api.app.outscraper.com/maps/search-v3';
      const queryParams = new URLSearchParams({
        query: keyword,
        async: 'false',
      });

      if (limit) {
        queryParams.append('limit', limit.toString());
      }

      Logger.log(`Making API request to search companies: ${baseUrl}`);
      const response = await fetch(`${baseUrl}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Company search failed with status: ${response.status}`,
        );
      }

      const data = await response.json();
      const companies = data.data?.[0] || null;
      Logger.log(
        `Found ${
          companies ? companies.length : 0
        } companies for keyword: ${keyword}`,
      );
      return companies;
    } catch (error) {
      Logger.error('Error finding companies:', error);
      return null;
    }
  }

  /**
   * Extract contact information from Facebook pages and save to campaign audience
   *
   * @param apiKey - API key for Outscraper
   * @param query - Single query string like "hospitals in india" or "ortho doctors in delhi"
   * @param userId - User ID for whom the contacts are being extracted
   * @param limit - Maximum number of results to process (default: 10)
   * @returns Result metrics for the query
   * @developer : ankur
   */
  async extractAndSaveContactInfo(
    apiKey: string,
    query: string,
    userId: string,
    campaignId?: string,
    limit?: number,
  ): Promise<any> {
    Logger.log(
      `Starting contact extraction for query: "${query}" and userId: ${userId} with limit: ${limit}`,
    );

    const startTime = new Date();
    const metrics = {
      query,
      startTime,
      endTime: null,
      completed: false,
      findCompanies_status: 0,
      findCompanies_count: 0,
      contactsFound: 0,
      error: null,
      userId,
      category: this.parseCategory(query),
      location: this.parseLocation(query),
      limit,
    };

    Logger.log(
      `Parsed category: "${metrics.category}", location: "${metrics.location}"`,
    );

    try {
      if (!query) {
        throw new Error('Query is empty');
      }

      const companies = await this.searchCompanies(apiKey, query, limit);

      if (!companies || !Array.isArray(companies)) {
        throw new Error('No companies found or invalid response');
      }

      metrics.findCompanies_status = 1;
      metrics.findCompanies_count = companies.length;
      Logger.log(
        `Found ${companies.length} companies, processing up to ${limit} companies...`,
      );

      // Process companies in parallel with concurrency control
      const companiesToProcess = companies.slice(0, limit);
      const batchSize = 3; // Process 3 companies at a time to avoid rate limiting

      for (let i = 0; i < companiesToProcess.length; i += batchSize) {
        const batch = companiesToProcess.slice(i, i + batchSize);
        const promises = batch.map((company) =>
          this.processCompany(
            company,
            apiKey,
            userId,
            campaignId,
            metrics.category,
            metrics.location,
          ),
        );

        const results = await Promise.all(promises);
        metrics.contactsFound += results.filter(Boolean).length;

        Logger.log(
          `Processed batch ${i / batchSize + 1}, total contacts found: ${
            metrics.contactsFound
          }`,
        );
      }

      metrics.completed = true;
      Logger.log(
        `Contact extraction completed successfully for query: "${query}"`,
      );
    } catch (error) {
      Logger.error(`Error processing query "${query}":`, error);
      metrics.error = error.message;
    } finally {
      metrics.endTime = new Date();
      await this.saveMetrics(metrics);
    }

    Logger.log(`Returning audience for campaign: "${campaignId}"`);
    return await this.db
      .collection('campaignAudience')
      .find({
        campaignId,
        addedBy: userId,
        dataSource: 'facebook',
      })
      .toArray();
  }

  /**
   * Admin lead-gen variant of extractAndSaveContactInfo - scrapes the same
   * way but returns candidate leads in the shared GMB scrap-lead shape for
   * review/save via /project/save-scrapped-data, instead of writing into
   * campaignAudience (which belongs to the separate bulk-campaign feature).
   */
  async extractLeadsForAdmin(
    apiKey: string,
    query: string,
    limit?: number,
  ): Promise<any[]> {
    if (!query) {
      throw new Error('Query is empty');
    }

    const companies = await this.searchCompanies(apiKey, query, limit);
    if (!companies || !Array.isArray(companies)) {
      return [];
    }

    const companiesToProcess = companies.slice(0, limit);
    const batchSize = 3;
    const leads: any[] = [];

    for (let i = 0; i < companiesToProcess.length; i += batchSize) {
      const batch = companiesToProcess.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((company) =>
          this.extractCompanyLeadForAdmin(company, apiKey),
        ),
      );
      leads.push(...results.filter(Boolean));
    }

    return leads;
  }

  private async extractCompanyLeadForAdmin(
    company: any,
    apiKey: string,
  ): Promise<any | null> {
    const site = company.website;
    if (!site) {
      return null;
    }

    const siteData = await this.getEmailsFromSite(apiKey, site);
    if (!siteData?.data?.length) {
      return null;
    }

    const emails = siteData.data[0]?.emails || [];
    const primaryEmail = emails.length > 0 ? emails[0].value : '';
    if (!primaryEmail) {
      return null;
    }

    const phones = siteData.data[0]?.phones || [];
    const primaryPhone = phones.length > 0 ? phones[0].value : '';

    return {
      websiteName: site.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
      websiteUrl: site,
      email: primaryEmail,
      phoneNumber: primaryPhone || company.phone || '',
      emailStatus: 'pending',
      processStatus: 0,
      chatbotUrl: '',
      emailContent: '',
      signUpStatus: false,
      source: 'facebook',
    };
  }

  /**
   * Process a single company to extract contact information
   * @private
   */
  private async processCompany(
    company: any,
    apiKey: string,
    userId: string,
    campaignId: string,
    category: string,
    location: string,
  ): Promise<boolean> {
    const site = company.site;

    if (!site) {
      Logger.log(
        `Skipping company with no website: ${company.name || 'Unknown'}`,
      );
      return false;
    }

    Logger.log(`Processing company: ${company.name || site}`);

    // Get email data from website
    const siteData = await this.getEmailsFromSite(apiKey, site);

    if (!siteData?.data?.length) {
      Logger.log(`No email data found for site: ${site}`);
      return false;
    }

    // Extract contact information
    const emails = siteData.data[0]?.emails || [];
    const primaryEmail = emails.length > 0 ? emails[0].value : '';

    const phones = siteData.data[0]?.phones || [];
    const primaryPhone = phones.length > 0 ? phones[0].value : '';

    const facebookUrl = siteData.data[0]?.socials?.facebook;

    // Create contact info
    const contactInfo = {
      email: primaryEmail || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      websiteName: site.replace(/^https?:\/\//, '').replace(/\/$/, '') || '',
      websiteUrl: site || '',
      emailStatus: 'initiated',
      processStatus: 'pending',
      dataSource: 'facebook',
      addedBy: userId,
      senderEmailId: null,
      subscribeStatus: true,
      isVerified: true,
      name: company.name || '',
      phone: primaryPhone || company.phone || '',
      address: company.address || '',
      category,
      location,
      facebookUrl: facebookUrl || '',
      campaignId,
    };

    // Enhance with Facebook data if available
    if (facebookUrl) {
      try {
        Logger.log(`Found Facebook URL: ${facebookUrl}`);
        const facebookData = await this.getFacebookPageInfo(
          apiKey,
          facebookUrl,
        );

        if (facebookData?.data?.[0]) {
          const fbPageData = facebookData.data[0];

          // Update contact info with Facebook data
          contactInfo.name = fbPageData.name || contactInfo.name;
          contactInfo.email = fbPageData.email || contactInfo.email;
          contactInfo.phone = fbPageData.phone || contactInfo.phone;
          contactInfo.address = fbPageData.address || contactInfo.address;
        }
      } catch (error) {
        Logger.warn(
          `Error fetching Facebook data for ${facebookUrl}:`,
          error.message,
        );
      }
    }

    // Only save contact if we have an email
    if (contactInfo.email) {
      Logger.log(
        `Extracted contact: ${contactInfo.name}, Email: ${contactInfo.email}`,
      );

      await this.saveContact(contactInfo);
      return true;
    } else {
      Logger.log(`Skipping contact with no email: ${contactInfo.name || site}`);
      return false;
    }
  }

  /**
   * Extract category from query string (e.g., "hospitals", "ortho doctors")
   * @param query - Query string to extract category from
   * @returns Extracted category
   * @developer : ankur
   */
  private parseCategory(query: string): string {
    Logger.log(`Parsing category from query: "${query}"`);
    const words = query.toLowerCase().split(' ');
    const locationKeywords = ['in', 'at', 'near', 'around'];

    // Find the index of the first location keyword
    const locationIndex = words.findIndex((word) =>
      locationKeywords.includes(word),
    );

    if (locationIndex > 0) {
      // Return everything before the location keyword
      const category = words.slice(0, locationIndex).join(' ');
      Logger.log(`Extracted category: "${category}"`);
      return category;
    }

    // If no location keyword found, return the whole query
    Logger.log(
      `No location keyword found, using entire query as category: "${query}"`,
    );
    return query;
  }

  /**
   * Extract location from query string (e.g., "india", "delhi")
   * @param query - Query string to extract location from
   * @returns Extracted location
   * @developer : ankur
   */
  private parseLocation(query: string): string {
    Logger.log(`Parsing location from query: "${query}"`);
    const words = query.toLowerCase().split(' ');
    const locationKeywords = ['in', 'at', 'near', 'around'];

    // Find the index of the first location keyword
    const locationIndex = words.findIndex((word) =>
      locationKeywords.includes(word),
    );

    if (locationIndex > 0 && locationIndex < words.length - 1) {
      // Return everything after the location keyword
      const location = words.slice(locationIndex + 1).join(' ');
      Logger.log(`Extracted location: "${location}"`);
      return location;
    }

    // If no location keyword found or it's the last word, return empty string
    Logger.log('No location found in query');
    return '';
  }

  /**
   * Save query metrics to facebook_query_metrics collection
   * @param metrics - Metrics data to save
   * @developer : ankur
   */
  private async saveMetrics(metrics: any): Promise<void> {
    Logger.log(`Saving metrics for query: "${metrics.query}"`);
    try {
      await this.facebookQueryMetricsCollection.insertOne({
        ...metrics,
        createdAt: new Date(),
      });
      Logger.log(`Saved metrics for query "${metrics.query}" successfully`);
    } catch (error) {
      Logger.error('Error saving query metrics:', error);
    }
  }

  /**
   * Save contact information to campaign audience table
   * @param contactInfo - Contact information to save
   * @developer : ankur
   */
  private async saveContact(contactInfo: any): Promise<void> {
    Logger.log(`Saving contact to campaign audience: ${contactInfo.email}`);
    try {
      // Check if the email already exists
      const existingContact = await this.db
        .collection('campaignAudience')
        .findOne({ email: contactInfo.email });

      if (existingContact) {
        // Update the existing contact
        await this.db
          .collection('campaignAudience')
          .updateOne(
            { email: contactInfo.email },
            { $set: { ...contactInfo, updatedAt: new Date() } },
          );
        Logger.log(
          `Successfully updated existing contact in campaign audience: ${contactInfo.email}`,
        );
      } else {
        // Insert new contact
        await this.db.collection('campaignAudience').insertOne({
          ...contactInfo,
          createdAt: new Date(),
        });
        Logger.log(
          `Successfully saved new contact to campaign audience: ${contactInfo.email}`,
        );
      }
    } catch (error) {
      Logger.error(
        `Error saving to campaign audience for ${contactInfo.email}:`,
        error,
      );
      Logger.log(`Continuing process despite error for ${contactInfo.email}`);
    }
  }

  private async fetchOutScraperPage(
    query: string,
    skip: number,
  ): Promise<any[]> {
    const START_TIMEOUT_MS = 15000;
    const POLL_TIMEOUT_MS = 15000;
    const POLL_INTERVAL_MS = 3000;

    const MAX_POLL_ATTEMPTS = 20; // ~60s of polling on top of the start call

    try {
      const startUrl = `https://api.outscraper.cloud/google-search-v3?query=${encodeURIComponent(
        `site:linkedin.com/in "${query}"`,
      )}&pagesPerQuery=1&skip=${skip}&async=true`;

      const { data: taskData } = await this.http.axiosRef.get(startUrl, {
        headers: { 'X-API-KEY': this.appConfig.get('outscraperKey') },
        timeout: START_TIMEOUT_MS,
      });

      const resultsUrl =
        taskData?.results_location ||
        (taskData?.id
          ? `https://api.outscraper.cloud/requests/${taskData.id}`
          : null);

      if (!resultsUrl) {
        this.logger.warn(
          `⚠️ Outscraper search page (skip=${skip}) returned no task to poll`,
        );
        return [];
      }

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const { data: pollData } = await this.http.axiosRef.get(resultsUrl, {
          headers: { 'X-API-KEY': this.appConfig.get('outscraperKey') },
          timeout: POLL_TIMEOUT_MS,
        });

        const status = pollData?.status;

        if (status === 'Success') {
          const results = pollData?.data ?? [];
          const organicCount = results?.[0]?.organic_results?.length ?? 0;
          if (organicCount === 0) {
            // Distinguishes "Outscraper genuinely found nothing for this
            // page" from a request-level failure - both end up contributing
            // 0 URLs, but only one of them means the query itself is the
            // problem rather than the endpoint's reliability.
            this.logger.warn(
              `⚠️ Outscraper search page (skip=${skip}) succeeded with 0 organic results for query="${query}"`,
            );
          }
          return results;
        }

        if (status && status !== 'Pending' && status !== 'Processing') {
          this.logger.warn(
            `⚠️ Outscraper search page (skip=${skip}) ended with status: ${status}`,
          );
          return [];
        }
        // else keep polling on Pending/Processing
      }

      this.logger.warn(
        `⚠️ Outscraper search page (skip=${skip}) timed out waiting for results`,
      );
      return [];
    } catch (error) {
      // AggregateError (e.g. the NAT64 routing issue seen elsewhere this
      // session - multiple DNS-resolved addresses all failing to connect)
      // has an empty top-level .message, which was logging as a blank,
      // undiagnosable warning. Fall back through the same shape used for
      // Apify errors so the real cause (ETIMEDOUT, ENETUNREACH, etc.) is
      // actually visible.
      const message =
        error?.message ||
        error?.errors?.[0]?.message ||
        error?.code ||
        'Unknown error';
      this.logger.warn(
        `⚠️ Outscraper search page (skip=${skip}) failed, skipping: ${message}`,
      );
      return [];
    }
  }

  async fetchUrlsFromOutScraper(
    query: string,
    pageLimit: number,
  ): Promise<string[]> {
    const MAX_PAGE_ATTEMPTS = 3;
    const RETRY_BACKOFF_MS = 4000;
    const fetchPageWithRetry = async (skip: number): Promise<any[]> => {
      for (let attempt = 1; attempt <= MAX_PAGE_ATTEMPTS; attempt++) {
        const result = await this.fetchOutScraperPage(query, skip);
        if (result.length > 0 || attempt === MAX_PAGE_ATTEMPTS) return result;
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
      }
      return [];
    };
    const PAGE_DISCOVERY_CONCURRENCY = 2;
    const pageLimiter = pLimit(PAGE_DISCOVERY_CONCURRENCY);
    const pages = await Promise.all(
      Array.from({ length: pageLimit }, (_, skip) =>
        pageLimiter(() => fetchPageWithRetry(skip)),
      ),
    );

    const allUrls: string[] = [];
    for (const results of pages) {
      const organicResults = results?.[0]?.organic_results ?? [];

      const newUrls = organicResults
        .map((item: any) => item.link)
        .filter((l: string) => l.includes('linkedin.com'))
        // Google search results can carry a "#:~:text=..." highlight
        // fragment - it's not part of the actual profile URL and only
        // adds noise/duplicates downstream.
        .map((l: string) => l.split('#')[0]);
      allUrls.push(...newUrls);
    }

    const uniqueUrls = [...new Set(allUrls)];

    if (uniqueUrls.length < pageLimit * 5) {
      this.logger.warn(
        `⚠️ LinkedIn URL discovery shortfall: found ${uniqueUrls.length} URL(s) across ${pageLimit} page(s) for query="${query}"`,
      );
    }

    return uniqueUrls;
  }
  async scrapeLinkedinData(
    urls: string[],
  ): Promise<{ items: any[]; quotaExceeded?: boolean }> {
    const APIFY_TOKEN = this.appConfig.get('apifyToken');

    const ACTOR = 'harvestapi/linkedin-profile-scraper';
    const client = new ApifyClient({ token: APIFY_TOKEN });

    let run: ActorRun;
    try {
      run = await client.actor(ACTOR).call(
        {
          profileScraperMode: 'Profile details + email search ($10 per 1k)',
          queries: urls,
        },
        { waitSecs: 300 }, // same 5-minute budget as before
      );
    } catch (error: any) {
      const apifyMessage = error?.message || 'Unknown error';
      this.logger.error('Failed to run Apify LinkedIn actor:', apifyMessage);

      if (/usage hard limit exceeded/i.test(apifyMessage)) {
        this.logger.error(
          'Apify monthly usage limit exceeded - skipping this LinkedIn batch.',
        );
        return { items: [], quotaExceeded: true };
      }
      return { items: [] };
    }

    if (run.status === 'RUNNING' || run.status === 'READY') {
      this.logger.warn(` Apify run ${run.id} timed out after 5 minutes`);
      await this.abortApifyRun(client, run.id, 'LinkedIn');
      return { items: [] };
    }

    if (run.status !== 'SUCCEEDED') {
      this.logger.error(
        `❌ Apify run ${run.id} ended with status: ${run.status}`,
      );
      return { items: [] };
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items?.length && run.defaultKeyValueStoreId) {
      try {
        const output = await client
          .keyValueStore(run.defaultKeyValueStoreId)
          .getRecord('OUTPUT');
        const failedUrls = (output?.value as any)?.failedUrls;
        if (failedUrls?.length) {
          this.logger.warn(
            `⚠️ Apify run ${run.id} succeeded but all ${failedUrls.length} profile(s) failed enrichment - e.g. "${failedUrls[0]?.error}"`,
          );
        }
      } catch {
        // best-effort diagnostic only
      }
    }

    const mappedItems = (items ?? []).map((item: any) => ({
      email: item?.emails?.[0]?.email || null,

      phone: null,
      website: item?.companyWebsites?.[0]?.url || null,
      address:
        item?.location?.parsed?.text || item?.location?.linkedinText || '',
      companyName: item?.currentPosition?.[0]?.companyName || null,
    }));

    return { items: mappedItems };
  }

  private extractZipcode(address: string): string | null {
    const match = address.match(
      /\b\d{4,6}\b|\b\d{5}-\d{4}\b|\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/i,
    );
    return match ? match[0] : null;
  }

  private modifyData(
    data: any,
    options?: { requirePhone?: boolean; limit?: number },
  ) {
    const seen = new Set<string>();
    let filteredUnique = data.reduce((acc: any[], item: any) => {
      const email = item?.email || null;
      const phoneNumber = item?.phone || null;
      const websiteUrl = item?.website || null;
      const zipcode = this.extractZipcode(item?.address || '') || null;
      const companyName =
        item?.companyName !== undefined
          ? item.companyName
          : item?.title !== undefined
          ? item.title
          : null;

      if (!email && !phoneNumber) return acc;

      const identifier = `${email ?? ''}||${phoneNumber ?? ''}`;
      if (!seen.has(identifier)) {
        seen.add(identifier);
        acc.push({
          email,
          phoneNumber,
          websiteUrl,
          zipcode,
          companyName,
          businessName: companyName,
        });
      }
      return acc;
    }, []);
    // URL discovery over-fetches on purpose (page count is rounded up to the
    // nearest 10, see linkedinScrape) to leave headroom for invalid/duplicate
    // rows - but nothing downstream ever capped the surplus back down to
    // what was actually requested, so callers could get well more than
    // resultsLimit back. Capping here, before validateLeads runs, keeps the
    // returned counts internally consistent with the row arrays.
    if (options?.limit && options.limit > 0) {
      filteredUnique = filteredUnique.slice(0, options.limit);
    }
    filteredUnique = validateLeads(filteredUnique, {
      requirePhone: options?.requirePhone,
    });
    return filteredUnique;
  }

  private async isApifyQuotaExceeded(token: string): Promise<boolean> {
    try {
      const client = new ApifyClient({ token });
      const limits = await client.user('me').limits();
      const usage = limits?.current?.monthlyUsageUsd;
      const cap = limits?.limits?.maxMonthlyUsageUsd;
      return (
        typeof usage === 'number' && typeof cap === 'number' && usage >= cap
      );
    } catch (error) {
      this.logger.warn(
        '⚠️ Failed to check Apify account limits:',
        error?.message,
      );
      return false;
    }
  }

  async linkedinScrape(req: ScrapeRequestDto, user_id: string) {
    const apifyToken = this.appConfig.get('apifyToken');
    if (await this.isApifyQuotaExceeded(apifyToken)) {
      throw new BadRequestException(
        'Apify monthly usage limit exceeded. Please upgrade your Apify plan or wait for the next billing cycle.',
      );
    }

    let totalLimit = 1;
    if (req.resultsLimit && req.resultsLimit > 0) {
      totalLimit = Math.ceil(req.resultsLimit / 10);
    }

    const effectiveQuery = req.country
      ? `${req.query} ${req.country}`
      : req.query;
    const urls = await this.fetchUrlsFromOutScraper(effectiveQuery, totalLimit);
    if (urls.length === 0) return [];

    const maxConcurrency = 32;
    let batchSize: number;

    if (urls.length <= maxConcurrency) {
      batchSize = 1;
    } else {
      batchSize = Math.ceil(urls.length / maxConcurrency);
    }

    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }

    const limit = pLimit(maxConcurrency);

    const runWithTimeout = async (batchUrls: string[]) => {
      return Promise.race([
        this.scrapeLinkedinData(batchUrls),
        new Promise<{ items: any[]; quotaExceeded?: boolean }>((resolve) =>
          setTimeout(() => {
            this.logger.warn('⏱️ Dropping batch due to timeout:', batchUrls);
            resolve({ items: [] });
          }, 200000),
        ),
      ]);
    };

    const batchResults = await Promise.all(
      batches.map((batchUrls) => limit(() => runWithTimeout(batchUrls))),
    );

    const allResults = batchResults.flatMap((r) => r?.items ?? []);
    const quotaExceeded = batchResults.some((r) => r?.quotaExceeded);

    const filteredUnique = this.modifyData(allResults, {
      requirePhone: false,
      limit: req.resultsLimit,
    });

    if (!filteredUnique?.validRows?.length && quotaExceeded) {
      throw new BadRequestException(
        'Apify monthly usage limit exceeded. Please upgrade your Apify plan or wait for the next billing cycle.',
      );
    }

    // Disabled: this call's result was never captured by the caller, so it
    // had no effect on persisted data or the API response - its only real
    // effect was burning a live Outscraper email-verification API call
    // (and occasionally throwing, silently swallowed) for a result that was
    // then discarded.
    // if (req.campaignId && user_id) {
    //   try {
    //     await this.campaignService.mergeLeadsFromMultipleSources(
    //       {
    //         linkedinLeads: filteredUnique?.validRows,
    //         campaignId: req.campaignId,
    //       },
    //       user_id,
    //     );
    //   } catch (error) {
    //     console.log('🚀 ~ error:', error);
    //   }
    // }

    await this.userService.consumeCredits(
      new ObjectId(user_id),
      'SCRAPING_LINKEDIN',
      null,
      null,
      filteredUnique?.validRows?.length,
    );

    return filteredUnique;
  }

  // Best-effort cleanup so a client-side timeout doesn't leave the Apify run
  // consuming the shared account's concurrency/memory slot indefinitely,
  // which can otherwise cause *later* runs to fail to start.
  private async abortApifyRun(
    client: ApifyClient,
    runId: string,
    label: string,
  ): Promise<void> {
    try {
      await client.run(runId).abort();
      this.logger.warn(`🛑 Aborted orphaned ${label} Apify run ${runId}`);
    } catch (abortError: any) {
      this.logger.error(
        `Failed to abort ${label} Apify run ${runId}:`,
        abortError?.message,
      );
    }
  }

  async facebookScrape(
    req: FacebookScrapeRequestDto,
    user_id: string,
  ): Promise<ValidationResult> {
    const token = this.appConfig.get('apifyToken');

    if (!token) {
      throw new BadRequestException('Apify token is not configured.');
    }

    const ACTOR = 'apify/facebook-search-scraper';
    const client = new ApifyClient({ token });

    // The actor's real input schema has no `query` field - it reads search
    // keywords under `categories` (array). Passing `req` wholesale silently
    // drops the search term, since the actor just ignores the unrecognized
    // `query` key and runs with categories empty.
    const actorInput = {
      categories: Array.isArray(req.query) ? req.query : [req.query],
      locations: req.locations,
      resultsLimit: req.resultsLimit,
    };

    let run: ActorRun;
    try {
      run = await client.actor(ACTOR).call(actorInput, { waitSecs: 360 });
    } catch (error: any) {
      const apifyMessage = error?.message || 'Unknown error';
      this.logger.error('❌ Failed to run Facebook Apify actor:', apifyMessage);

      // Won't be fixed by retrying - fail fast with an actionable message.
      if (/usage hard limit exceeded/i.test(apifyMessage)) {
        throw new BadRequestException(
          'Apify monthly usage limit exceeded. Please upgrade your Apify plan or wait for the next billing cycle.',
        );
      }
      throw new BadRequestException(
        `Failed to start Facebook scraping: ${apifyMessage}`,
      );
    }

    if (run.status === 'RUNNING' || run.status === 'READY') {
      this.logger.warn(`⏱️ Facebook run ${run.id} timed out after 6 minutes`);
      await this.abortApifyRun(client, run.id, 'Facebook');
      throw new BadRequestException(
        'Facebook scraping timed out. Please try again later.',
      );
    }

    if (run.status !== 'SUCCEEDED') {
      this.logger.error(
        `❌ Facebook run ${run.id} ended with status: ${run.status}`,
      );
      throw new BadRequestException(
        'Facebook scraping failed. Please try again.',
      );
    }

    const { items: data } = await client
      .dataset(run.defaultDatasetId)
      .listItems();

    if (!Array.isArray(data)) {
      throw new BadRequestException('Invalid response from Apify.');
    }

    const totalItems = this.modifyData(data);

    // Disabled: this call's result was never captured by the caller, so it
    // had no effect on persisted data or the API response - its only real
    // effect was burning a live Outscraper email-verification API call
    // (and occasionally throwing, silently swallowed) for a result that was
    // then discarded.
    // if (req?.campaignId && user_id && totalItems?.validRows?.length) {
    //   try {
    //     await this.campaignService.mergeLeadsFromMultipleSources(
    //       {
    //         facebookLeads: totalItems.validRows,
    //         campaignId: req.campaignId,
    //       },
    //       user_id,
    //     );
    //   } catch (mergeError) {
    //     this.logger.error('Facebook error:', mergeError);
    //   }
    // }

    if (totalItems?.validRows?.length) {
      await this.userService.consumeCredits(
        new ObjectId(user_id),
        'SCRAPING_FACEBOOK',
        null,
        null,
        totalItems.validRows.length,
      );
    }
    return totalItems;
  }
}
