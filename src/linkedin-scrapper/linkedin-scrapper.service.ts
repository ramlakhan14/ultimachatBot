import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApifyClient } from 'apify-client';
import { MONGODB } from '../common/mongo/mongo.module';
import { Db, ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

@Injectable()
export class LinkedinScrapperService {
  constructor(
    @Inject(MONGODB) private db: Db,
    private configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  /**
   * Scrapes LinkedIn emails based on provided keywords.
   * @param keywords Array of keywords to search for.
   * @param limit Optional limit for the number of results to return.
   * @returns API response with status, message, and (optionally limited) data.
   */
  async scrapeLinkedinEmails(
    userId: string,
    campaignId: string,
    keywords: string[],
    location: string,
    customDomains: string[],
    platform: string,
    limit?: number,
  ): Promise<any> {
    const logger = new Logger(LinkedinScrapperService.name);

    logger.log(
      `Starting scrapeLinkedinEmails for userId=${userId}, campaignId=${campaignId}, keywords=${JSON.stringify(
        keywords,
      )}, limit=${limit}`,
    );

    // Validate input
    logger.log('Validating input...');
    if (!Array.isArray(keywords) || keywords.length === 0) {
      logger.warn(
        'Validation failed: Keywords must be a non-empty array of strings.',
      );
      throw new BadRequestException(
        'Keywords must be a non-empty array of strings.',
      );
    }
    if (!keywords.every((k) => typeof k === 'string' && k.trim().length > 0)) {
      logger.warn(
        'Validation failed: Each keyword must be a non-empty string.',
      );
      throw new BadRequestException('Each keyword must be a non-empty string.');
    }
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
      logger.warn(
        'Validation failed: Limit must be a positive integer if provided.',
      );
      throw new BadRequestException(
        'Limit must be a positive integer if provided.',
      );
    }

    logger.log('Checking APIFY_API_TOKEN environment variable...');
    if (
      !process.env.APIFY_API_TOKEN ||
      typeof process.env.APIFY_API_TOKEN !== 'string' ||
      process.env.APIFY_API_TOKEN.trim().length === 0
    ) {
      logger.error(
        'APIFY_API_TOKEN environment variable is missing or invalid.',
      );
      throw new InternalServerErrorException(
        'APIFY_API_TOKEN environment variable is missing or invalid.',
      );
    }

    let client: ApifyClient;
    try {
      logger.log('Initializing ApifyClient...');
      client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
      });
    } catch (err) {
      logger.error(
        'Failed to initialize ApifyClient: ' +
          (err?.message || 'Unknown error'),
      );
      throw new InternalServerErrorException(
        'Failed to initialize ApifyClient: ' +
          (err?.message || 'Unknown error'),
      );
    }

    // Prepare Actor input
    logger.log('Preparing Apify Actor input...');
    const input = {
      keywords,
      location,
      customDomains,
      platform,
    };

    try {
      logger.log('Calling Apify Actor...');
      // Run the Actor and wait for it to finish
      const run = await client
        .actor(this.configService.get('APIFY_LINKEDIN_EMAIL_SCRAPPER_ACTOR_ID'))
        .call(input);

      logger.log('Apify Actor call completed.');

      if (!run || !run.defaultDatasetId) {
        logger.error('Failed to get a valid run or dataset ID from Apify.');
        throw new InternalServerErrorException(
          'Failed to get a valid run or dataset ID from Apify.',
        );
      }

      // Fetch Actor results from the run's dataset (if any)
      logger.log(
        `Fetching dataset items from datasetId=${run.defaultDatasetId}...`,
      );
      let items: any[] = [];
      try {
        const dataset = await client.dataset(run.defaultDatasetId).listItems();
        if (!dataset || !Array.isArray(dataset.items)) {
          logger.error('Failed to retrieve items from Apify dataset.');
          throw new InternalServerErrorException(
            'Failed to retrieve items from Apify dataset.',
          );
        }
        items = dataset.items;
        logger.log(`Fetched ${items.length} items from Apify dataset.`);
      } catch (datasetError) {
        logger.error(
          'Error fetching dataset items: ' +
            (datasetError?.message || 'Unknown error'),
        );
        throw new InternalServerErrorException(
          'Error fetching dataset items: ' +
            (datasetError?.message || 'Unknown error'),
        );
      }

      // Apply limit if provided
      logger.log('Applying limit to items (if provided)...');
      const limitedItems = limit ? items.slice(0, limit) : items;

      // Save contacts to campaign audience
      logger.log('Saving contacts to campaign audience...');
      const uniqueScrapData = [];
      const duplicateData = [];
      for (const item of limitedItems) {
        // Prepare data for saveContact
        const contactData = {
          email: item.email || '',
          phone: '', // phone will be empty for email scrapper
          name: item.title || '',
          websiteUrl: item.url || '',
          linkedinUrl: item.url || '',
          dataSourceType: 'email',
          userId,
          campaignId,
          datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`,
          // Optionally, you can add more fields if needed
        };
        try {
          const data = await this.saveEmailsToCampaignAudience(contactData);
          duplicateData.push(data.duplicateData);
          uniqueScrapData.push(data.uniqueData);
        } catch (err) {
          logger.error(
            `Failed to save contact for email: ${item.email || ''} - ${
              err?.message || err
            }`,
          );
          // Continue saving others even if one fails
        }
      }

      logger.log(
        `Returning ${limitedItems.length} items (out of ${items.length} total).`,
      );

      const linkedinCampaignAudience = await this.db
        .collection('campaignAudience')
        .find(
          { dataSource: 'linkedin', campaignId: campaignId, addedBy: userId },
          { projection: { email: 1, _id: 0, name: 1 } },
        )
        .sort({ createdAt: -1 })
        .toArray();

        // Added By Nidhi Sharma to consume the credits based on linkedin scrapping count
        // await this.userService.consumeCredits(new ObjectId(userId),'SCRAPING_LINKEDIN', null,null, linkedinCampaignAudience.length);

      return {
        statusCode: HttpStatus.OK,
        message: 'LinkedIn email scraping completed successfully.',
        // data: {
        //   datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`,
        //   items: limitedItems,
        //   total: items.length,
        //   returned: limitedItems.length,
        // },
        data: linkedinCampaignAudience,
        uniqueScrapData,
        uniqueScrapDataCount: uniqueScrapData.length,
        duplicateData,
        duplicateDataCount: duplicateData.length,
      };
    } catch (error) {
      // Handle Apify API errors and network issues
      let errorMsg = 'Unknown error occurred while scraping LinkedIn emails.';
      if (error?.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      logger.error('Error during Apify Actor execution: ' + errorMsg);
      throw new InternalServerErrorException(errorMsg);
    }
  }

  /**
   * Scrapes LinkedIn phone numbers based on provided keywords, platform, and country.
   * @param keywords Array of keywords to search for.
   * @param platform Platform to search on (default: 'Linkedin').
   * @param country Country to search in (e.g., 'United Kingdom (+44)').
   * @param limit Optional limit for the number of results to return.
   * @returns API response with status, message, and (optionally limited) data.
   */
  async scrapeLinkedinPhoneNumbers(
    userId: string,
    campaignId: string,
    keywords: string[],
    platform: string,
    country: string,
    limit?: number,
  ): Promise<any> {
    const logger = Logger;
    logger.log('Starting scrapeLinkedinPhoneNumbers...');

    // Validate input
    logger.log('Validating input parameters...');
    if (!Array.isArray(keywords) || keywords.length === 0) {
      logger.warn(
        'Validation failed: keywords array is empty or not an array.',
      );
      throw new BadRequestException(
        'Keywords must be a non-empty array of strings.',
      );
    }
    if (!keywords.every((k) => typeof k === 'string' && k.trim().length > 0)) {
      logger.warn(
        'Validation failed: one or more keywords are not valid strings.',
      );
      throw new BadRequestException('Each keyword must be a non-empty string.');
    }
    if (typeof platform !== 'string' || platform.trim().length === 0) {
      logger.warn('Validation failed: platform is not a non-empty string.');
      throw new BadRequestException('Platform must be a non-empty string.');
    }
    if (typeof country !== 'string' || country.trim().length === 0) {
      logger.warn('Validation failed: country is not a non-empty string.');
      throw new BadRequestException('Country must be a non-empty string.');
    }
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
      logger.warn('Validation failed: limit is not a positive integer.');
      throw new BadRequestException(
        'Limit must be a positive integer if provided.',
      );
    }

    logger.log('Checking APIFY_API_TOKEN environment variable...');
    if (
      !process.env.APIFY_API_TOKEN ||
      typeof process.env.APIFY_API_TOKEN !== 'string' ||
      process.env.APIFY_API_TOKEN.trim().length === 0
    ) {
      logger.error(
        'APIFY_API_TOKEN environment variable is missing or invalid.',
      );
      throw new InternalServerErrorException(
        'APIFY_API_TOKEN environment variable is missing or invalid.',
      );
    }

    let client: ApifyClient;
    try {
      logger.log('Initializing ApifyClient...');
      client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
      });
    } catch (err) {
      logger.error(
        'Failed to initialize ApifyClient: ' +
          (err?.message || 'Unknown error'),
      );
      throw new InternalServerErrorException(
        'Failed to initialize ApifyClient: ' +
          (err?.message || 'Unknown error'),
      );
    }

    // Prepare Actor input
    logger.log('Preparing Apify Actor input...');
    const input = {
      keywords,
      platform,
      country,
    };

    try {
      logger.log('Running Apify Actor for LinkedIn phone number scraping...');
      // Run the Actor and wait for it to finish
      const run = await client
        .actor(this.configService.get('APIFY_LINKEDIN_PHONE_SCRAPPER_ACTOR_ID'))
        .call(input);

      if (!run || !run.defaultDatasetId) {
        logger.error('Failed to get a valid run or dataset ID from Apify.');
        throw new InternalServerErrorException(
          'Failed to get a valid run or dataset ID from Apify.',
        );
      }

      // Fetch Actor results from the run's dataset (if any)
      logger.log('Fetching items from Apify dataset...');
      let items: any[] = [];
      try {
        const dataset = await client.dataset(run.defaultDatasetId).listItems();
        if (!dataset || !Array.isArray(dataset.items)) {
          logger.error('Failed to retrieve items from Apify dataset.');
          throw new InternalServerErrorException(
            'Failed to retrieve items from Apify dataset.',
          );
        }
        items = dataset.items;
        logger.log(`Fetched ${items.length} items from Apify dataset.`);
      } catch (datasetError) {
        logger.error(
          'Error fetching dataset items: ' +
            (datasetError?.message || 'Unknown error'),
        );
        throw new InternalServerErrorException(
          'Error fetching dataset items: ' +
            (datasetError?.message || 'Unknown error'),
        );
      }

      // Apply limit if provided
      logger.log('Applying limit to items (if provided)...');
      const limitedItems = limit ? items.slice(0, limit) : items;

      // Save contacts to campaign audience
      logger.log('Saving contacts to campaign audience...');
      const uniqueScrapData = [];
      const duplicateData = [];
      for (const item of limitedItems) {
        // Prepare data for saveContact
        const contactData = {
          email: '', // email will be empty for phone scrapper
          phone: item.phone_number || '',
          name: item.title || '',
          websiteUrl: item.url || '',
          linkedinUrl: item.url || '',
          dataSourceType: 'phone',
          userId,
          campaignId,
          datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`,
        };
        try {
          const data = await this.savePhoneNumbersToCampaignAudience(
            contactData,
          );
          duplicateData.push(data.duplicateData);
          uniqueScrapData.push(data.uniqueData);
        } catch (err) {
          logger.error(
            `Failed to save contact for phone: ${item.phone_number || ''} - ${
              err?.message || err
            }`,
          );
          // Continue saving others even if one fails
        }
      }

      logger.log(
        `Returning ${limitedItems.length} items (out of ${items.length} total).`,
      );

      logger.log('LinkedIn phone number scraping completed successfully.');

      const linkedinCampaignAudience = await this.db
        .collection('targetAudiences')
        .find(
          { dataSource: 'linkedin', campaignId: campaignId, userId: userId },
          { projection: { phoneNumber: 1, _id: 0, websiteName: 1 } },
        )
        .sort({ createdAt: -1 })
        .toArray();

        // Added By Nidhi Sharma to consume the credits based on linkedin scrapping count
        // await this.userService.consumeCredits( new ObjectId(userId),'SCRAPING_LINKEDIN', null,null, limitedItems.length);
      return {
        statusCode: HttpStatus.OK,
        message: 'LinkedIn phone number scraping completed successfully.',
        // data: {
        //   datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`,
        //   items: limitedItems,
        //   total: items.length,
        //   returned: limitedItems.length,
        // },
        data: linkedinCampaignAudience,
        uniqueScrapData,
        uniqueScrapDataCount: uniqueScrapData.length,
        duplicateData,
        duplicateDataCount: duplicateData.length,
      };
    } catch (error) {
      // Handle Apify API errors and network issues
      let errorMsg =
        'Unknown error occurred while scraping LinkedIn phone numbers.';
      if (error?.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      logger.error('Error during Apify Actor execution: ' + errorMsg);
      throw new InternalServerErrorException(errorMsg);
    }
  }

  /**
   * Admin lead-gen variant - runs the same Apify email-scrape actor but
   * returns candidate leads in the shared GMB scrap-lead shape for
   * review/save via /project/save-scrapped-data, instead of writing into
   * campaignAudience (which belongs to the separate bulk-campaign feature).
   */
  async scrapeLinkedinEmailsForAdmin(
    keywords: string[],
    location: string,
    customDomains: string[],
    platform: string,
    limit?: number,
  ): Promise<any[]> {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new BadRequestException(
        'Keywords must be a non-empty array of strings.',
      );
    }
    if (
      !process.env.APIFY_API_TOKEN ||
      typeof process.env.APIFY_API_TOKEN !== 'string' ||
      process.env.APIFY_API_TOKEN.trim().length === 0
    ) {
      throw new InternalServerErrorException(
        'APIFY_API_TOKEN environment variable is missing or invalid.',
      );
    }

    const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    const run = await client
      .actor(this.configService.get('APIFY_LINKEDIN_EMAIL_SCRAPPER_ACTOR_ID'))
      .call({ keywords, location, customDomains, platform });

    if (!run || !run.defaultDatasetId) {
      throw new InternalServerErrorException(
        'Failed to get a valid run or dataset ID from Apify.',
      );
    }

    const dataset = await client.dataset(run.defaultDatasetId).listItems();
    const items = Array.isArray(dataset?.items) ? dataset.items : [];
    const limitedItems = limit ? items.slice(0, limit) : items;

    return limitedItems
      .filter((item) => item.email)
      .map((item) => ({
        websiteName: item.title || '',
        websiteUrl: item.url || '',
        email: item.email,
        phoneNumber: '',
        emailStatus: 'pending',
        processStatus: 0,
        chatbotUrl: '',
        emailContent: '',
        signUpStatus: false,
        source: 'linkedin',
      }));
  }

  /**
   * Admin lead-gen variant of scrapeLinkedinPhoneNumbers - same underlying
   * Apify actor, but returns GMB-shaped candidates without writing to
   * targetAudiences.
   */
  async scrapeLinkedinPhoneNumbersForAdmin(
    keywords: string[],
    platform: string,
    country: string,
    limit?: number,
  ): Promise<any[]> {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new BadRequestException(
        'Keywords must be a non-empty array of strings.',
      );
    }
    if (
      !process.env.APIFY_API_TOKEN ||
      typeof process.env.APIFY_API_TOKEN !== 'string' ||
      process.env.APIFY_API_TOKEN.trim().length === 0
    ) {
      throw new InternalServerErrorException(
        'APIFY_API_TOKEN environment variable is missing or invalid.',
      );
    }

    const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    const run = await client
      .actor(this.configService.get('APIFY_LINKEDIN_PHONE_SCRAPPER_ACTOR_ID'))
      .call({ keywords, platform, country });

    if (!run || !run.defaultDatasetId) {
      throw new InternalServerErrorException(
        'Failed to get a valid run or dataset ID from Apify.',
      );
    }

    const dataset = await client.dataset(run.defaultDatasetId).listItems();
    const items = Array.isArray(dataset?.items) ? dataset.items : [];
    const limitedItems = limit ? items.slice(0, limit) : items;

    return limitedItems
      .filter((item) => item.phone_number)
      .map((item) => ({
        websiteName: item.title || '',
        websiteUrl: item.url || '',
        email: '',
        phoneNumber: item.phone_number,
        emailStatus: 'pending',
        processStatus: 0,
        chatbotUrl: '',
        emailContent: '',
        signUpStatus: false,
        source: 'linkedin',
      }));
  }

  /**
   * Save contact information to campaign audience table
   * @param contactInfo - Contact information to save
   * @developer : ankur
   */
  private async saveEmailsToCampaignAudience(data: any): Promise<any> {
    // Ensure campaignId is always a string (never undefined/null)
    const campaignId = data.campaignId ?? '';
    // Ensure email is always a string (never undefined/null)
    const email = data.email ?? '';
    // Ensure phone is always a string (never undefined/null)
    const phone = data.phone ?? '';

    const contactInfo = {
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
      websiteName: data.websiteName || '',
      websiteUrl: data.websiteUrl || '',
      emailStatus: 'initiated',
      processStatus: 'pending',
      dataSource: 'linkedin',
      dataSourceType: data.dataSourceType || '',
      addedBy: data.userId,
      senderEmailId: null,
      subscribeStatus: true,
      isVerified: true,
      name: data.name || '',
      phone,
      linkedinUrl: data.linkedinUrl || '',
      campaignId,
    };

    Logger.log(
      `Saving contact to campaign audience: ${
        contactInfo.email || contactInfo.phone
      }`,
    );
    try {
      let uniqueKey: any;
      if (contactInfo.email && contactInfo.email.trim() !== '') {
        uniqueKey = {
          campaignId: contactInfo.campaignId,
          email: contactInfo.email,
        };
      } else if (contactInfo.phone && contactInfo.phone.trim() !== '') {
        uniqueKey = {
          campaignId: contactInfo.campaignId,
          phone: contactInfo.phone,
        };
      } else {
        // If both are empty, do not save (invalid data)
        Logger.warn(
          'Both email and phone are empty for contact, skipping save.',
        );
        return;
      }

      const existingContact = await this.db
        .collection('campaignAudience')
        .findOne(uniqueKey);

      let duplicateData: any;
      let uniqueData: any;
      if (existingContact) {
        // Update the existing contact
        await this.db.collection('campaignAudience').updateOne(uniqueKey, {
          $set: { ...contactInfo, updatedAt: new Date() },
        });
        duplicateData = contactInfo;
        Logger.log(
          `Successfully updated existing contact in campaign audience: ${
            contactInfo.email || contactInfo.phone
          }`,
        );
      } else {
        // Insert new contact
        await this.db.collection('campaignAudience').insertOne({
          ...contactInfo,
          createdAt: new Date(),
        });
        uniqueData = contactInfo;
        Logger.log(
          `Successfully saved new contact to campaign audience: ${
            contactInfo.email || contactInfo.phone
          }`,
        );
      }
      return {
        duplicateData,
        uniqueData,
      };
    } catch (error) {
      Logger.error(
        `Error saving to campaign audience for ${
          contactInfo.email || contactInfo.phone
        }:`,
        error,
      );
      // Instead of just logging, throw an error with clear message and code
      throw new InternalServerErrorException(
        `Failed to save contact (${
          contactInfo.email || contactInfo.phone
        }) to campaign audience: ${error?.message || error}`,
      );
    }
  }

  //@developer : ankur
  //@description : save phone numbers to campaign audience
  //@param data : data to save
  //@returns void // change here for VOICEBOT AUDIENCE

  private async savePhoneNumbersToCampaignAudience(data: any): Promise<any> {
    // Ensure campaignId is always a string (never undefined/null)
    const campaignId = data.campaignId ?? '';
    // Ensure email is always a string (never undefined/null)
    const email = data.email ?? '';
    // Ensure phone is always a string (never undefined/null)
    const phone = data.phone ?? '';

    const contactInfo = {
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
      websiteName: data.name || '',
      websiteUrl: data.websiteUrl || '',
      dataSource: 'linkedin',
      dataSourceType: data.dataSourceType || '',
      userId: data.userId,
      phoneNumber: phone,
      linkedinUrl: data.linkedinUrl || '',
      campaignId,
    };

    Logger.log(
      `Saving contact to campaign audience: ${
        contactInfo.email || contactInfo.phoneNumber
      }`,
    );
    try {
      // For phone scrapper, use (campaignId + phone) as unique key if email is empty,
      // For email scrapper, use (campaignId + email) as unique key
      const uniqueKey = {
        campaignId: contactInfo.campaignId,
        userId: contactInfo.userId,
        phoneNumber: contactInfo.phoneNumber,
      };

      const existingContact = await this.db
        .collection('targetAudiences')
        .findOne(uniqueKey);

      let duplicateData: any;
      let uniqueData: any;
      if (existingContact) {
        // Update the existing contact
        await this.db.collection('targetAudiences').updateOne(uniqueKey, {
          $set: { ...contactInfo, updatedAt: new Date() },
        });
        duplicateData = contactInfo;
        Logger.log(
          `Successfully updated existing contact in campaign audience: ${
            contactInfo.email || contactInfo.phoneNumber
          }`,
        );
      } else {
        // Insert new contact
        await this.db.collection('targetAudiences').insertOne({
          ...contactInfo,
          createdAt: new Date(),
        });
        uniqueData = contactInfo;
        Logger.log(
          `Successfully saved new contact to campaign audience: ${
            contactInfo.email || contactInfo.phoneNumber
          }`,
        );
      }
      return {
        duplicateData,
        uniqueData,
      };
    } catch (error) {
      Logger.error(
        `Error saving to campaign audience for ${
          contactInfo.email || contactInfo.phoneNumber
        }:`,
        error,
      );
      // Instead of just logging, throw an error with clear message and code
      throw new InternalServerErrorException(
        `Failed to save contact (${
          contactInfo.email || contactInfo.phoneNumber
        }) to campaign audience: ${error?.message || error}`,
      );
    }
  }
}
