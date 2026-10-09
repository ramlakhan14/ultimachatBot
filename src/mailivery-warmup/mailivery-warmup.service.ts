import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CreateSmtpCampaignDto } from './dto/create-smtp-campaign.dto';
import { GetCampaignsDto } from './dto/get-campaigns.dto';
import { PatchCampaignDto } from './dto/patch-campaign.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateGmailCampaignDto } from './dto/create-gmail-campaign.dto';
import {
  CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
  CampaignEmailWarmupCount,
} from '../campaign/schema/campaignEmailWarmupCount.schema';
import { Collection, Db } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import {
  MailiveryCampaign,
  MailiveryCampaignType,
  CampaignStatusCode,
  WARMUP_EMAIL_COLLECTION,
} from './schema/warmupEmail.schema';
import { EMAIL_AND_PASSKEY_STATUS } from '../campaign/enum/enum';
import { AppConfigService } from '../common/config/appConfig.service';
import * as FormData from 'form-data';
import { SmtpSetting, SMTP_SETUP_COLLECTION  } from '../smtp/entities/smtp.entity';


@Injectable()
export class MailiveryWarmupService {
  private readonly logger = new Logger('MailiveryWarmupService');

  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly campaignWarmupCollection: Collection<CampaignEmailWarmupCount>;
  private readonly mailiveryWarmupCollection: Collection<MailiveryCampaign>;
  private readonly smtpSettingsCollection: Collection<SmtpSetting>;
  constructor(
    @Inject(MONGODB) private db: Db,
    private readonly http: HttpService,
    private readonly appConfig: AppConfigService,
  ) {
    this.campaignWarmupCollection =
      this.db.collection<CampaignEmailWarmupCount>(
        CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
      );

    this.mailiveryWarmupCollection = this.db.collection<MailiveryCampaign>(
      WARMUP_EMAIL_COLLECTION,
    );
    this.smtpSettingsCollection= this.db.collection<SmtpSetting>(SMTP_SETUP_COLLECTION)

    this.baseURL = this.appConfig.get('mailiveryApiUrl');
    this.apiKey = this.appConfig.get('mailiveryApiKey');
  }

  /**
   * @developer : Ankur
   * @param err : any
   * @returns : throws HttpException with code and message
   * @working : Handles and throws formatted HTTP errors
   */
  private handleError(err: any) {
    const status = err.status;
    const message =
      err.response?.data?.message || err.message || 'Internal Server Error';
    throw new HttpException({ status, message }, status);
  }

  /**
   * @developer : Ankur
   * @param dto : CreateSmtpCampaignDto
   * @returns : {statusCode, message, data}
   * @working : Creates a new SMTP campaign via Mailivery API
   */
  /**
   * Creates a new SMTP campaign via Mailivery API and stores the data in local database
   *
   * @param dto - The data transfer object containing SMTP campaign configuration
   * @param userId - The user ID for tracking ownership of the campaign
   * @returns Object containing status code, message and API response data
   */
  async createSmtpCampaign(dto: CreateSmtpCampaignDto, userId: string) {
    try {
      const existEmail = await this.mailiveryWarmupCollection.findOne({
        email: dto.email,
        statusCode: CampaignStatusCode.ACTIVE,
      });
      if (existEmail) {
        throw new BadRequestException(
          `Email ${dto.email} already exists and is active. Please use a different email or delete the existing campaign first.`,
        );
      }
      const jsonData = this.prepareSmtpFormData(dto);

      // Make API call with proper JSON data
      const resp = await this.callMailiveryApi(jsonData, userId);

      if (!resp?.data?.id) {
        throw new HttpException(
          'Failed to create campaign on Mailivery server',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Save to database after successful API call
      await this.saveCampaignToDatabase(resp.data, dto, userId);

      return {
        statusCode: HttpStatus.OK,
        message: 'SMTP campaign created successfully',
        data: resp.data,
      };
    } catch (err) {
      this.logger.error('Error creating SMTP campaign:', err);
      this.handleError(err);
    }
  }

  private prepareSmtpFormData(dto: CreateSmtpCampaignDto): any {
    const jsonData = {
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      email_per_day: dto.email_per_day,
      response_rate: dto.response_rate,
      smtp_host: dto.smtp?.smtp_host,
      smtp_port: dto.smtp?.smtp_port,
      smtp_username: dto.email,
      smtp_password: dto.smtp?.smtp_password,
      imap_host: dto.imap?.imap_host,
      imap_port: dto.imap?.imap_port,
      imap_email: dto.email,
      imap_username: dto.email,
      imap_password: dto.imap?.imap_password,
    };
    if (dto.rampup_speed) {
      jsonData['with_rampup'] = true;
      jsonData['rampup_speed'] = dto.rampup_speed;
    }

    if (dto.timezone) jsonData['timezone'] = dto.timezone;
    if (dto.tags) jsonData['tags'] = dto.tags;

    // Remove any undefined values
    Object.keys(jsonData).forEach((key) => {
      if (jsonData[key] === undefined) {
        delete jsonData[key];
      }
    });

    return jsonData;
  }

  private async callMailiveryApi(data: any, userId: string) {
    try {
      const requestId = uuidv4();

      // Log the data being sent in the format requested by user

      // Use the format similar to the example code
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${this.baseURL}/campaigns/smtp`,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'X-Request-ID': uuidv4(),
        },
        data: data,
      };

      const resp = await axios(config);


      return resp.data;
    } catch (error) {
      this.logger.error('API call failed:', error.message);

      this.handleError(error);
    }
  }

  private async saveCampaignToDatabase(
    apiResponse: any,
    dto: CreateSmtpCampaignDto,
    userId: string,
  ) {
    try {
      const campaignType = MailiveryCampaignType.SMTP;
      const campaignId = apiResponse.id;

      // Step 1: Save to campaign warmup collection for tracking (always insert)
      // const campaignWarmupData = {
      //   userId: userId,
      //   mailiveryCampaignId: campaignId,
      //   mailiveryWarmupEmailId: dto.email,
      //   email: apiResponse.email || dto.email,
      //   status: EMAIL_AND_PASSKEY_STATUS.VERIFIED,
      //   isWarmUpEnabled: false,
      //   isWarmedUp: false,
      //   mailiveryWarmupStatus: undefined,
      //   mailboxType: campaignType,
      //   warmupCount: 0,
      //   updatedMaxLimit: 0,
      //   maxLimit: 0,
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // };

      // await this.campaignWarmupCollection.insertOne(campaignWarmupData);

      // Step 2: Prepare mailivery campaign record
      const campaignData: Partial<MailiveryCampaign> = {
        userId: userId,
        mailiveryCampaignId: campaignId,
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.email,
        mailiveryCampaignType: campaignType,
        emailPerDay: dto.email_per_day,
        responseRate: apiResponse.response_rate,
        withRampup: dto.ramp_up,
        rampUpSpeed: dto.rampup_speed,
        timezone: dto.timezone,
        statusCode: CampaignStatusCode.ACTIVE,
        archiveFolder: apiResponse.archive_folder || null,
        nextEmailAfter: apiResponse.next_email_after || null,
        outreachToday: apiResponse.outreach_today || 0,
        responseToday: apiResponse.response_today || 0,
        dashboardUrl: apiResponse.dashboard_url || null,
        remainingForToday: apiResponse.remaining_for_today || 0,
        status: apiResponse.status || null,
        savedFromSpam: apiResponse.scheduled_for_today || null,
        emailsSentToday: apiResponse.emails_sent_today || null,
        sentInLast45Days: apiResponse.sent_in_last_45_days || null,
        spamInLast14Days: apiResponse.spam_in_last_14_days || null,
        spamRateInLast14Days: apiResponse.spam_rate_in_last_14_days || null,
        scheduledForToday: apiResponse.scheduled_for_today || null,
        providerType: apiResponse.provider_type || null,
        mailiveryResponseMetadata: JSON.stringify(apiResponse),
        scheduleSending: new Date().toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (dto.smtp) {
        campaignData.smtp = {
          host: dto.smtp.smtp_host,
          port: dto.smtp.smtp_port,
          username: dto.smtp.smtp_username,
          password: dto.smtp.smtp_password,
          secure: false,
        };
      }

      if (dto.imap) {
        campaignData.imap = {
          host: dto.imap.imap_host,
          port: dto.imap.imap_port,
          username: dto.imap.imap_username,
          password: dto.imap.imap_password,
          secure: true,
        };
      }


      // Upsert instead of always insert
      await this.mailiveryWarmupCollection.updateOne(
        { mailiveryCampaignId: campaignId, userId: userId }, // match condition
        { $set: campaignData }, // update with new data
        { upsert: true }, // insert if not exists
      );
    } catch (dbError) {
      this.logger.error('Database error while saving campaign:', dbError);
      this.handleError(dbError);
    }
  }
  /**
   * @developer : Ankur
   * @param query : GetCampaignsDto
   * @returns : {statusCode, message, data}
   * @working : Retrieves a list of campaigns from Mailivery API
   */
  async listCampaigns(
    query: GetCampaignsDto,
    userId?: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ) {
    try {
      //  sanitize pagination
      page = page && page > 0 ? Math.floor(page) : 1;
      limit = limit && limit > 0 ? Math.floor(limit) : 10;
      const skip = (page - 1) * limit;

      //  dynamic match filter
      const matchFilter: any = {
        userId: userId,
        isActive: true,
      };

      //  STATUS FILTER
      if (status && status.toLowerCase() !== 'all') {
        matchFilter.status = status.toLowerCase();
      }
      if (search) {
        matchFilter.$or = [{ email: { $regex: search, $options: 'i' } }];
      }

      //  total count with filter
      const totalCount = await this.mailiveryWarmupCollection.countDocuments(
        matchFilter,
      );

      const totalPages = Math.ceil(totalCount / limit);

      //  aggregation pipeline
      const pipeline = [
        {
          $match: matchFilter,
        },
        {
          $project: {
            userId: 1,
            mailiveryCampaignId: 1,
            email: 1,
            statusCode: 1,
            firstName: 1,
            lastName: 1,
            emailPerDay: 1,
            mailiveryCampaignType: 1,
            responseRate: 1,
            withRampup: 1,
            rampUpSpeed: 1,
            rampUpStatus: 1,
            tags: 1,
            isActive: 1,
            emailsSentToday: 1,
            scheduledForToday: 1,
            spamRateInLast14Days: 1,
            savedFromSpam: 1,
            status: 1,
            createdAt: 1,
          },
        },
        {
          $lookup: {
            from: 'campaignEmailWarmupCount',
            // localField: 'email',
            // foreignField: 'email',
            let: { email: '$email' },
            pipeline: [
            {
              $match: {
            $expr: { $eq: ['$email', '$$email'] },
          },
          },
          { $limit: 1 }, 
          ],
            as: 'campaignEmailWarmupData',
          },
        },
        {
          $unwind: {
            path: '$campaignEmailWarmupData',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            isWarmUpEnabled: '$campaignEmailWarmupData.isWarmUpEnabled',
            mailiveryWarmupStatus:
              '$campaignEmailWarmupData.mailiveryWarmupStatus',
          },
        },
        {
          $project: {
            campaignEmailWarmupData: 0,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const emailList = await this.mailiveryWarmupCollection
        .aggregate(pipeline)
        .toArray();

      //  pagination response
      const pagination = {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        data: emailList,
        pagination,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param campaignId : number
   * @param dto : PatchCampaignDto
   * @returns : {statusCode, message, data}
   * @working : Updates a campaign's configuration via Mailivery API
   */
  async updateResponseRateForCampaigns(
    campaignId: number,
    responseRate: number,
  ) {
    try {
      const params = new URLSearchParams();
      params.append('response_rate', responseRate.toString());

      const resp: AxiosResponse = await firstValueFrom(
        this.http.patch(
          `/campaigns/${campaignId}/update-response-rate`,
          params,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/x-www-form-urlencoded', // ✅ better
            },
          },
        ),
      );

      return 'Response rate updated successfully';
    } catch (err) {
      this.handleError(err);
    }
  }

  // async patchCampaignSingle(campaignId: number, dto: any, userId: string) {
  //   try {
  //     console.log(`Patching campaign ${campaignId} with data:`, dto);

  //     const emailBox = await this.mailiveryWarmupCollection.findOne({
  //       mailiveryCampaignId: campaignId,
  //     });

  //     if (!emailBox) {
  //       throw new BadRequestException('Email Box not found');
  //     }

  //     if (emailBox?.email) {
  //       const exists = await this.checkEmailExistsInMailivery(emailBox.email);

  //       if (!exists) {
  //         throw new BadRequestException(
  //           `Email ${emailBox.email} not found on Mailivery`,
  //         );
  //       }
  //     }

  //     // 🔥 Parallel API calls for better performance
  //     // const promises: Promise<any>[] = [];

  //     if (dto.emailPerDay) {
  //       //pr/omises.push(
  //       await this.updateEmailPerDay(campaignId, dto.emailPerDay),
  //         // );

  //         await this.mailiveryWarmupCollection.updateOne(
  //           { mailiveryCampaignId: campaignId },
  //           {
  //             $set: {
  //               emailPerDay: dto.emailPerDay,
  //             },
  //           },
  //         );

  //       delete dto.emailPerDay;
  //     }

  //     if (dto.responseRate) {
  //       // promises.push(
  //       await this.updateResponseRateForCampaigns(campaignId, dto.responseRate),
  //         // );

  //         await this.mailiveryWarmupCollection.updateOne(
  //           { mailiveryCampaignId: campaignId },
  //           {
  //             $set: {
  //               responseRate: dto.responseRate,
  //             },
  //           },
  //         );

  //       delete dto.responseRate;
  //     }

  //     // Run both APIs in parallel
  //     // if (promises.length) {
  //     //   await Promise.all(promises);
  //     // }

  //     let response = null;

  //     if (dto.tags && Array.isArray(dto.tags)) {
  //       const config = {
  //         method: 'patch',
  //         url: `${this.baseURL}/campaigns/${campaignId}`,
  //         headers: {
  //           'X-Request-ID': uuidv4(),
  //           Authorization: `Bearer ${this.apiKey}`,
  //         },
  //         data: {
  //           tags: dto.tags,
  //         },
  //       };

  //       console.log('Request to Mailivery API (tags):', dto.tags);

  //       response = await axios.request(config);

  //       console.log('Response from Mailivery API:', response.data.data);
  //     }

  //     const updateFields: Record<string, any> = {};

  //     if (dto.tags !== undefined) {
  //       updateFields.tags = dto.tags;
  //     }

  //     if (response) {
  //       updateFields.mailiveryResponseMetadata = JSON.stringify(response.data);
  //     }

  //     updateFields.updatedAt = new Date().toISOString();

  //     if (Object.keys(updateFields).length) {
  //       await this.mailiveryWarmupCollection.updateOne(
  //         { mailiveryCampaignId: campaignId },
  //         { $set: updateFields },
  //       );
  //     }

  //     return 'Email Warm-up updated successfully';
  //   } catch (err) {
  //     if (err.response) {
  //       this.logger.error('Mailivery API Error:', {
  //         status: err.response.status,
  //         headers: err.response.headers,
  //         data: err.response.data,
  //       });
  //     } else {
  //       this.logger.error('Internal Error:', err.message);
  //     }

  //     throw new BadRequestException(
  //       err?.response?.message || 'Mailivery request failed',
  //     );
  //   }
  // }

async patchCampaignSingle(
  campaignId: number,
  dto: any,
  userId: string,
) {
  try {

    const emailBox = await this.mailiveryWarmupCollection.findOne({
      mailiveryCampaignId: campaignId,
    });

    if (!emailBox) {
      throw new BadRequestException('Email Box not found');
    }

    if (emailBox?.email) {
      const exists = await this.checkEmailExistsInMailivery(
        emailBox.email,
      );

      if (!exists) {
        throw new BadRequestException(
          `Email ${emailBox.email} not found on Mailivery`,
        );
      }
    }

    //DO NOT MUTATE DTO
    const emailPerDay = dto.emailPerDay;
    const responseRate = dto.responseRate;
    const tags = dto.tags;

    // Email Per Day
    if (emailPerDay !== undefined) {
      await this.updateEmailPerDay(campaignId, emailPerDay);

      await this.mailiveryWarmupCollection.updateOne(
        { mailiveryCampaignId: campaignId },
        { $set: { emailPerDay } },
      );
    }

    // Response Rate
    if (responseRate !== undefined) {
      await this.updateResponseRateForCampaigns(
        campaignId,
        responseRate,
      );

      await this.mailiveryWarmupCollection.updateOne(
        { mailiveryCampaignId: campaignId },
        { $set: { responseRate } },
      );
    }

    let response = null;

    if (tags && Array.isArray(tags)) {
      const config = {
        method: 'patch',
        url: `${this.baseURL}/campaigns/${campaignId}`,
        headers: {
          'X-Request-ID': uuidv4(),
          Authorization: `Bearer ${this.apiKey}`,
        },
        data: { tags },
      };


      response = await axios.request(config);

    }

    // Update Mailivery DB
    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (tags !== undefined) {
      updateFields.tags = tags;
    }

    if (response) {
      updateFields.mailiveryResponseMetadata = JSON.stringify(
        response.data,
      );
    }

    await this.mailiveryWarmupCollection.updateOne(
      { mailiveryCampaignId: campaignId },
      { $set: updateFields },
    );

    // Update SMTP DB
    if (emailBox?.email) {
    try {
    const smtpFilter = await this.smtpSettingsCollection.findOne({
      email: emailBox.email?.trim()?.toLowerCase(),
      userId: userId,
    });

    const smtpUpdate: any = {};

    if (emailPerDay !== undefined) {
      smtpUpdate['warmupSettings.emailPerDay'] = emailPerDay;
    }

    if (responseRate !== undefined) {
      smtpUpdate['warmupSettings.responseRate'] = responseRate;
    }

    if (Object.keys(smtpUpdate).length > 0) {
      const result = await this.smtpSettingsCollection.updateOne(
        smtpFilter,
        {
          $set: {
            ...smtpUpdate,
            updatedAt: new Date(),
          },
        },
      );
    }
  } catch (smtpErr) {
        this.logger.error('SMTP update failed:', smtpErr.message);
      }
    }

    return 'Email Warm-up updated successfully';
  } catch (err) {
    if (err.response) {
      this.logger.error('Mailivery API Error:', {
        status: err.response.status,
        headers: err.response.headers,
        data: err.response.data,
      });
    } else {
      this.logger.error('Internal Error:', err.message);
    }

    throw new BadRequestException(
      err?.response?.data?.message ||
        err.message ||
        'Mailivery request failed',
    );
  }
}

  async patchCampaign(dto: PatchCampaignDto, userId: string) {
    try {
      const updateResults = [];

      for (const campaignId of dto.Ids) {
        const result = await this.patchCampaignSingle(
          Number(campaignId),
          dto,
          userId,
        );
        updateResults.push({ campaignId, message:result });
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'Email Warm-up updated successfully',
        data: updateResults,
      };
    } catch (err) {
      if (err.response) {
        this.logger.error('Mailivery API Error:', {
          status: err.response.status,
          headers: err.response.headers,
          data: err.response.data,
        });
      } else {
        this.logger.error('Internal Error:', err.message);
      }

      throw new BadRequestException(
        err?.response?.message || 'Mailivery request failed',
      );
    }
  }

  async checkEmailExistsInMailivery(email: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseURL}/campaigns/email/${email}`, 
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      // Assuming success means email exists
      return !!response?.data?.data;
    } catch (err) {
      // If 404 → email not found
      if (err?.response?.status === 404) {
        return false;
      }

      // Log unexpected errors
      this.logger.error(
        'Mailivery email check error:',
        err?.response?.data || err.message,
      );

      throw new Error('Failed to verify email from Mailivery');
    }
  }
  /**
   * @developer : Ankur
   * @param campaignId : number
   * @param dto : PatchCampaignDto
   * @returns : {statusCode, message, data}
   * @working : Updates and reconnects mailbox for a campaign via Mailivery API
   */
  async updateAndReconnectMailbox(campaignId: number, dto: PatchCampaignDto) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.patch(`/campaigns/${campaignId}`, {
          ...dto,
          reconnect: true,
        }),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign updated and mailbox reconnected successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param campaignId : number
   * @returns : {statusCode, message, data}
   * @working : Deletes a campaign via Mailivery API
   */
  async deleteCampaign(campaignId: number) {
    try {
      const existEmailBox = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: campaignId,
        isActive: true,
      });

      if (!existEmailBox) {
        throw new HttpException(
          'Email Box or Campaign ID does not exist',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (existEmailBox && existEmailBox.email) {
        const exists = await this.checkEmailExistsInMailivery(
          existEmailBox.email,
        );

        if (!exists) {
          throw new BadRequestException(
            `Email ${existEmailBox.email} not found on Mailivery`,
          );
        }
      }
      const url = `${this.baseURL}/campaigns/${campaignId}`;
      const response = await axios.delete(url, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
      });

      await this.mailiveryWarmupCollection.updateOne(
        { mailiveryCampaignId: campaignId },
        { $set: { isActive: false } },
      );
      await this.campaignWarmupCollection.deleteOne({
        mailiveryCampaignId: campaignId,
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign deleted successfully',
        data: response.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param campaignId : number
   * @returns : {statusCode, message, data}
   * @working : Starts warmup for a campaign via Mailivery API
   */
  async startWarmup(mailiveryCampaignId: number, userId: string) {
    try {
      const existEmailBox = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: mailiveryCampaignId,
        statusCode: CampaignStatusCode.ACTIVE,
      });
      if (!existEmailBox) {
        throw new HttpException(
          'Email Box or Campaign ID does not exist',
          HttpStatus.BAD_REQUEST,
        );
      }
      const config = {
        method: 'PATCH',
        url: `${this.baseURL}/campaigns/${mailiveryCampaignId}/start-warmup`,
        headers: {
          'X-Request-ID': uuidv4(),
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };
      const resp = await axios.request(config);

      await this.campaignWarmupCollection.updateOne(
        { mailiveryCampaignId: mailiveryCampaignId, userId },
        {
          $set: {
            isWarmUpEnabled: true,
            // mailiveryWarmupStatus:resp.data.data.war
          },
        },
        { upsert: true },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warmup started successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  async pauseWarmup(mailiveryCampaignId: number, userId: string) {
    try {
      const existEmailBox = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: mailiveryCampaignId,
        // statusCode: CampaignStatusCode.ACTIVE,
      });
      if (!existEmailBox) {
        throw new HttpException(
          'Email Box or Campaign ID does not exist',
          HttpStatus.BAD_REQUEST,
        );
      }
      const config = {
        method: 'PATCH',
        url: `${this.baseURL}/campaigns/${mailiveryCampaignId}/pause-warmup`,
        headers: {
          'X-Request-ID': uuidv4(),
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };
      const resp = await axios.request(config);

      await this.mailiveryWarmupCollection.updateOne(
        { mailiveryCampaignId: mailiveryCampaignId, userId },
        {
          $set: {
            statusCode: CampaignStatusCode.PAUSED,
          },
        },
      );
      await this.campaignWarmupCollection.updateOne(
        { mailiveryCampaignId: mailiveryCampaignId, userId },
        {
          $set: {
            isWarmUpEnabled: false,
            mailiveryWarmupStatus: resp.data.code,
          },
        },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warmup paused successfully',
        data: resp.data.code,
      };
    } catch (err) {
      this.handleError(err);
    }
  }
  async resumeWarmup(mailiveryCampaignId: number, userId: string) {
    try {
      const existEmailBox = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: mailiveryCampaignId,
        // statusCode: CampaignStatusCode.PAUSED,
      });
      if (!existEmailBox) {
        throw new HttpException(
          'Email Box or Campaign ID does not exist',
          HttpStatus.BAD_REQUEST,
        );
      }
      const config = {
        method: 'PATCH',
        url: `${this.baseURL}/campaigns/${mailiveryCampaignId}/resume-warmup`,
        headers: {
          'X-Request-ID': uuidv4(),
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      };
      const resp = await axios.request(config);

      await this.mailiveryWarmupCollection.updateOne(
        { mailiveryCampaignId: mailiveryCampaignId, userId },
        {
          $set: {
            statusCode: CampaignStatusCode.ACTIVE,
          },
        },
      );
      await this.campaignWarmupCollection.updateOne(
        { mailiveryCampaignId: mailiveryCampaignId, userId },
        {
          $set: {
            isWarmUpEnabled: true,
            mailiveryWarmupStatus: resp.data.code,
          },
        },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warmup started successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param campaignId : number
   * @returns : {statusCode, message, data}
   * @working : Retrieves metrics for a campaign via Mailivery API
   */
  async getMetrics(campaignId: number) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.patch(`/campaigns/${campaignId}/get-metrics`),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Metrics retrieved successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @returns : {statusCode, message, data}
   * @working : Rechecks all campaign connections via Mailivery API
   */
  async recheckConnections() {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.patch('/campaigns/connections/recheck'),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Connections rechecked successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param config : { api_key: string; email: string }
   * @returns : {statusCode, message, data}
   * @working : Creates a Sendgrid campaign via Mailivery API
   */
  async createSendgridCampaign(config: { api_key: string; email: string }) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.post('/campaigns/sendgrid', config),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Sendgrid campaign created successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param config : { api_key: string; email: string }
   * @returns : {statusCode, message, data}
   * @working : Creates a Google campaign via Mailivery API
   */
  async createGoogleCampaign(config: CreateGmailCampaignDto) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.post('/campaigns/google', config),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Google campaign created successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param campaignId : number
   * @param speed : 'slow' | 'normal' | 'fast'
   * @returns : {statusCode, message, data}
   * @working : Initiates rampup for a campaign via Mailivery API
   */
  async rampupCampaign(campaignId: number, speed: 'slow' | 'normal' | 'fast') {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.patch(`/campaigns/${campaignId}/rampup`, { speed }),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Rampup initiated successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param campaignId : number
   * @param emailsPerDay : number
   * @returns : {statusCode, message, data}
   * @working : Updates the number of emails sent per day for a campaign via Mailivery API
   */
  async updateEmailPerDay(campaignId: number, emailsPerDay: number) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.patch(`/campaigns/${campaignId}/update-email-per-day`, {
          emailsPerDay,
        }),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Emails per day updated successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param data : any
   * @returns : {statusCode, message, data}
   * @working : Creates a new warm-up template via Mailivery API
   */
  async createWarmupTemplate(data: any) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.post('/warmup-templates', data),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warm-up template created successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param templateId : string
   * @param data : any
   * @returns : {statusCode, message, data}
   * @working : Updates a warm-up template via Mailivery API
   */
  async updateWarmupTemplate(templateId: string, data: any) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.patch(`/warmup-templates/${templateId}`, data),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warm-up template updated successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param templateId : string
   * @returns : {statusCode, message, data}
   * @working : Deletes a warm-up template via Mailivery API
   */
  async deleteWarmupTemplate(templateId: string) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.delete(`/warmup-templates/${templateId}`),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warm-up template deleted successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @returns : {statusCode, message, data}
   * @working : Retrieves all warm-up templates via Mailivery API
   */
  async getWarmupTemplates() {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.get('/warmup-templates'),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warm-up templates retrieved successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @developer : Ankur
   * @param templateId : string
   * @returns : {statusCode, message, data}
   * @working : Retrieves a single warm-up template by ID via Mailivery API
   */

  async getWarmupTemplateById(templateId: string) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.get(`/warmup-templates/${templateId}`),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Warm-up template retrieved successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  private isEmailWarmedUp(campaignData, metrics) {
    const status = campaignData.status_code;
    const dailyLimit = campaignData.email_per_day;
    const replyRate = campaignData.response_rate;
    const warmupDays = metrics.length;

    // --- Criteria ---
    const requiredDays = 15; // minimum days of warm-up
    const targetDailyVolume = 40; // target send volume
    const minInboxRate = 85; // % inbox placement
    const minReplyRate = 5; // minimum expected reply %

    if (status !== 'Active') return false; // warmup must be active
    if (dailyLimit < targetDailyVolume) return false;
    if (replyRate < minReplyRate) return false;
    if (warmupDays < requiredDays) return false;

    // Analyze inbox vs spam placement over past warm-up days
    let totalSent = 0;
    let totalInbox = 0;
    metrics.forEach((day) => {
      totalSent += day.warmup.sent;
      totalInbox += day.warmup.inbox;
    });

    const inboxRate = (totalInbox / totalSent) * 100;

    if (inboxRate < minInboxRate) return false;

    return true; // All conditions passed
  }

  /**
   * @developer : Ankur
   * @param campaignId : number
   * @returns : {statusCode, message, data}
   * @working : Retrieves a single campaign by ID via Mailivery API
   */
  async getCampaignById(campaignId: number) {
    try {
      const resp: AxiosResponse = await firstValueFrom(
        this.http.get(`/campaigns/${campaignId}`, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Accept: 'application/json',
          },
        }),
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Campaign retrieved successfully',
        data: resp.data,
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  async getWarmupStatus(campaignId: number): Promise<boolean> {
    const campaign = await this.getCampaignById(campaignId);
    const metrics = await this.getMetrics(campaign.data?.id);
    return this.isEmailWarmedUp(campaign.data, metrics.data);
  }

  async upsertMailiveryCampaign(
    campaign: Partial<MailiveryCampaign>,
  ): Promise<{ statusCode: number; message: string; data: MailiveryCampaign }> {
    if (!campaign || typeof campaign.mailiveryCampaignId !== 'number') {
      throw new Error('Invalid campaign data: mailiveryCampaignId is required');
    }

    const existing = await this.mailiveryWarmupCollection.findOne({
      mailiveryCampaignId: campaign.mailiveryCampaignId,
    });

    if (!existing) {
      const requiredFields: (keyof MailiveryCampaign)[] = [
        'mailiveryCampaignId',
      ];
      for (const field of requiredFields) {
        if (campaign[field] === undefined || campaign[field] === null) {
          throw new Error(
            `Missing required field '${field}' for MailiveryCampaign creation`,
          );
        }
      }
      const campaignToInsert = campaign as MailiveryCampaign;
      const result = await this.mailiveryWarmupCollection.insertOne(
        campaignToInsert,
      );
      if (!result.insertedId) {
        throw new Error('Failed to insert new MailiveryCampaign');
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'MailiveryCampaign created',
        data: { ...campaignToInsert },
      };
    } else {
      const updateFields: Partial<MailiveryCampaign> = {};
      (Object.keys(campaign) as Array<keyof MailiveryCampaign>).forEach(
        (key) => {
          if (
            campaign[key] !== undefined &&
            JSON.stringify(campaign[key]) !== JSON.stringify(existing[key])
          ) {
            (updateFields as Record<keyof MailiveryCampaign, unknown>)[key] =
              campaign[key] as MailiveryCampaign[typeof key];
          }
        },
      );
      if (Object.keys(updateFields).length === 0) {
        return {
          statusCode: HttpStatus.OK,
          message: 'No changes detected in MailiveryCampaign',
          data: existing,
        };
      }
      await this.mailiveryWarmupCollection.updateOne(
        { mailiveryCampaignId: campaign.mailiveryCampaignId },
        { $set: updateFields },
      );
      const updated = { ...existing, ...updateFields };
      return {
        statusCode: HttpStatus.OK,
        message: 'MailiveryCampaign updated',
        data: updated,
      };
    }
  }

  async upsertCampaignEmailWarmupCount(
    warmupCount: Partial<CampaignEmailWarmupCount>,
  ): Promise<{
    statusCode: number;
    message: string;
    data: CampaignEmailWarmupCount;
  }> {
    if (
      !warmupCount ||
      typeof warmupCount.mailiveryCampaignId !== 'number' ||
      !warmupCount.email
    ) {
      throw new Error(
        'Invalid warmupCount data: mailiveryCampaignId and email are required',
      );
    }

    const existing = await this.campaignWarmupCollection.findOne({
      mailiveryCampaignId: warmupCount.mailiveryCampaignId,
      email: warmupCount.email,
    });

    if (!existing) {
      const requiredFields: (keyof CampaignEmailWarmupCount)[] = [
        'mailiveryCampaignId',
        'email',
      ];
      for (const field of requiredFields) {
        if (warmupCount[field] === undefined || warmupCount[field] === null) {
          throw new Error(
            `Missing required field '${field}' for CampaignEmailWarmupCount creation`,
          );
        }
      }
      const warmupCountToInsert = warmupCount as CampaignEmailWarmupCount;
      const result = await this.campaignWarmupCollection.insertOne(
        warmupCountToInsert,
      );
      if (!result.insertedId) {
        throw new Error('Failed to insert new CampaignEmailWarmupCount');
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'CampaignEmailWarmupCount created',
        data: { ...warmupCountToInsert },
      };
    } else {
      const updateFields: Partial<CampaignEmailWarmupCount> = {};
      (
        Object.keys(warmupCount) as Array<keyof CampaignEmailWarmupCount>
      ).forEach((key) => {
        if (
          Object.prototype.hasOwnProperty.call(existing, key) &&
          warmupCount[key] !== undefined &&
          JSON.stringify(warmupCount[key]) !== JSON.stringify(existing[key])
        ) {
          (updateFields as any)[key] = warmupCount[key];
        }
      });
      if (Object.keys(updateFields).length === 0) {
        return {
          statusCode: HttpStatus.OK,
          message: 'No changes detected in CampaignEmailWarmupCount',
          data: existing,
        };
      }
      await this.campaignWarmupCollection.updateOne(
        {
          mailiveryCampaignId: warmupCount.mailiveryCampaignId,
          email: warmupCount.email,
        },
        { $set: updateFields },
      );
      const updated = { ...existing, ...updateFields };
      return {
        statusCode: HttpStatus.OK,
        message: 'CampaignEmailWarmupCount updated',
        data: updated,
      };
    }
  }

  async updateResponseRate(
    campaignId: number,
    userId: string,
    response_rate: number,
  ) {
    try {
      const isEmailBoxExist = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: campaignId,
        userId,
        statusCode: CampaignStatusCode.ACTIVE,
      });

      if (!isEmailBoxExist) {
        throw new BadRequestException(
          'Email Box or Campaign ID does not exist',
        );
      }
      const payload = {
        response_rate: response_rate,
      };
      const config = {
        method: 'patch',
        url: `${this.baseURL}/campaigns/${campaignId}/update-response-rate`,
        headers: {
          'X-REQUEST-ID': uuidv4(),
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        data: payload,
      };
      const resp = await axios(config);

      await this.mailiveryWarmupCollection.updateOne(
        {
          mailiveryCampaignId: campaignId,
          userId,
        },
        {
          $set: {
            responseRate: resp.data.data.response_rate,
          },
        },
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Response rate updated successfully',
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  async enableRampUp(
    campaignId: number,
    userId: string,
    rampup_speed: 'slow' | 'normal' | 'fast',
  ) {
    try {
      const isEmailBoxExist = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: campaignId,
        userId,
      });
      if (!isEmailBoxExist) {
        throw new BadRequestException(
          'Email Box or Campaign ID does not exist',
        );
      }
      const payload = {
        rampup_speed: rampup_speed || 'normal',
      };
      const config = {
        method: 'patch',
        url: `${this.baseURL}/campaigns/${campaignId}/enable-ramp-up`,
        headers: {
          'X-REQUEST-ID': uuidv4(),
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        data: payload,
      };
      const resp = await axios(config);
      // console.log('Ramp-up Response:', resp.data.data.rampup);

      await this.mailiveryWarmupCollection.updateOne(
        {
          mailiveryCampaignId: campaignId,
          userId,
        },
        {
          $set: {
            withRampup: true,
            rampUpSpeed: resp.data.data.rampup.speed,
          },
        },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Ramp-up enabled successfully',
      };
    } catch (err) {
      // this.handleError(err);
      throw new HttpException(
        err?.response?.data?.message || err.message || 'Internal Server Error',
        err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async disableRampUp(campaignId: number, userId: string) {
    try {
      const isEmailBoxExist = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: campaignId,
        userId,
      });

      if (!isEmailBoxExist) {
        throw new BadRequestException(
          'Email Box or Campaign ID does not exist',
        );
      }
      if (isEmailBoxExist.withRampup === false) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Ramp-up already disabled',
        });
      }

      const config = {
        method: 'patch',
        url: `${this.baseURL}/campaigns/${campaignId}/disable-ramp-up`,
        headers: {
          'X-REQUEST-ID': uuidv4(),
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      };
      const resp = await axios(config);
      await this.mailiveryWarmupCollection.updateOne(
        {
          mailiveryCampaignId: campaignId,
          userId,
        },
        {
          $set: {
            withRampup: false,
            rampUpSpeed: null,
          },
        },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Ramp-up disabled successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async getEmailBoxById(mailiveryCampaignId: number, userId: string) {
    try {
      const emailBox = await this.mailiveryWarmupCollection
        .aggregate([
          {
            $match: {
              mailiveryCampaignId: mailiveryCampaignId,
              userId: userId,
              isActive: true,
            },
          },
          {
            $project: {
              userId: 1,
              mailiveryCampaignId: 1,
              email: 1,
              statusCode: 1,
              firstName: 1,
              lastName: 1,
              emailPerDay: 1,
              mailiveryCampaignType: 1,
              responseRate: 1,
              withRampup: 1,
              rampUpSpeed: 1,
              tags: 1,
              isActive: 1,
            },
          },
          {
            $lookup: {
              from: 'campaignEmailWarmupCount', // target collection
              localField: 'email',
              foreignField: 'email',
              as: 'campaignEmailWarmupData',
            },
          },
          {
            $unwind: {
              path: '$campaignEmailWarmupData',
              preserveNullAndEmptyArrays: true, // keep even if no match
            },
          },
          {
            $addFields: {
              isWarmUpEnabled: '$campaignEmailWarmupData.isWarmUpEnabled',
              mailiveryWarmupStatus:
                '$campaignEmailWarmupData.mailiveryWarmupStatus',
            },
          },
          {
            $project: {
              campaignEmailWarmupData: 0, // remove raw lookup object if not needed
            },
          },
        ])
        .toArray();
      return {
        statusCode: HttpStatus.OK,
        message: 'Email Box fetched successfully',
        data: emailBox[0],
      };
    } catch (err) {
      this.handleError(err);
    }
  }

  async fetchRampUpStatus(campaignId: number, userId: string) {
    try {
      const isEmailBoxExist = await this.mailiveryWarmupCollection.findOne({
        mailiveryCampaignId: campaignId,
        userId,
      });

      if (!isEmailBoxExist) {
        throw new BadRequestException(
          'Email Box or Campaign ID does not exist',
        );
      }

      const config = {
        method: 'patch',
        url: `${this.baseURL}/campaigns/${campaignId}/fetch-ramp-up-status`,
        headers: {
          'X-REQUEST-ID': uuidv4(),
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
      };
      const resp = await axios(config);
      await this.mailiveryWarmupCollection.updateOne(
        {
          mailiveryCampaignId: campaignId,
          userId,
        },
        {
          $set: {
            withRampup: resp.data.data.rampup.withRampup,
            rampUpSpeed: resp.data.data.rampup.speed,
            rampUpStatus: resp.data.data.rampup.status,
          },
        },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Ramp-up status fetched successfully',
        data: {
          withRampup: resp.data.data.rampup.withRampup,
          rampUpSpeed: resp.data.data.rampup.speed,
          rampUpStatus: resp.data.data.rampup.status,
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}
