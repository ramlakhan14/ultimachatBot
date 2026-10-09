/**
 * SMTP Service
 * Handles SMTP settings management for email functionality
 * @developer : ankur
 */
import {
  Inject,
  Injectable,
  NotFoundException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CreateSmtpDto } from './dto/create-smtp.dto';
import { UpdateSmtpDto } from './dto/update-smtp.dto';
import {
  SmtpSetting,
  SMTP_SETUP_COLLECTION,
  WarmupStatus,
} from './entities/smtp.entity';
import { Collection, Db, ObjectId } from 'mongodb';
import { Logger } from '@nestjs/common';
import { MONGODB } from '../common/mongo/mongo.module';
import { NodemailerService } from './nodemailer/nodemailer.service';
import {
  CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
  CampaignEmailPasskey,
} from '../campaign/schema/campaignEmailPasskey.schema';
import {
  CampaignAudience,
  CAMPAIGNAUDIENCE_COLLECTION,
} from '../campaign/schema/campaignAudience.schema';
import {
  CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
  CampaignEmailWarmupCount,
} from '../campaign/schema/campaignEmailWarmupCount.schema';
import { CryptoService } from '../campaign/campaign-utils/crypto.service';
import { MailiveryCampaignType } from '../mailivery-warmup/schema/warmupEmail.schema';
import { UserService } from '../user/user.service';
import { KNOWLEDGEBASE_COLLECTION } from '../knowledgebase/knowledgebase.schema';
import { MailiveryWarmupService } from '../mailivery-warmup/mailivery-warmup.service';
import { CreateSmtpCampaignDto } from '../mailivery-warmup/dto/create-smtp-campaign.dto';
import { WarmupSettingsDto } from './dto/warmup.setting.dto';
import { EmailAssistanceService } from '../email-assistance/email-assistance.service';
/**
 * Service for managing SMTP settings
 * @developer : ankur
 */
@Injectable()
export class SmtpService {
  private readonly smtpSettingsCollection: Collection<SmtpSetting>;
  private readonly campaignEmailPasskeyCollection: Collection<CampaignEmailPasskey>;
  private readonly campaignAudienceCollection: Collection<CampaignAudience>;
  private readonly campaignWarmupCollection: Collection<CampaignEmailWarmupCount>;

  /**
   * Constructor initializes the SMTP settings collection
   * @param db - MongoDB database instance
   * @developer : ankur
   */
  constructor(
    private readonly nodemailerService: NodemailerService,
    @Inject(MONGODB)
    private readonly db: Db,
    private readonly userService: UserService,
    private readonly mailiveryWarmupService: MailiveryWarmupService,
    private readonly emailAssistanceService: EmailAssistanceService,
  ) {
    this.smtpSettingsCollection = this.db.collection<SmtpSetting>(
      SMTP_SETUP_COLLECTION,
    );
    this.campaignEmailPasskeyCollection =
      this.db.collection<CampaignEmailPasskey>(
        CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
      );
    this.campaignAudienceCollection = this.db.collection<CampaignAudience>(
      CAMPAIGNAUDIENCE_COLLECTION,
    );
    this.campaignWarmupCollection =
      this.db.collection<CampaignEmailWarmupCount>(
        CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
      );
  }

  /**
   * Creates or updates an SMTP setting for a user
   * @param createSmtpDto - DTO containing SMTP configuration
   * @param userId - ID of the user
   * @returns Object with status, message and created/updated SMTP setting
   * @developer : ankur
   */
  // async create(createSmtpDto: CreateSmtpDto, userId: string): Promise<any> {
  //   try {
  //     Logger.log(`Starting SMTP setting creation/update for user: ${userId}`);

  //     // Check if setting already exists for this user and email/host combination
  //     Logger.log(
  //       `Checking for existing SMTP setting with email: ${createSmtpDto.email} and host: ${createSmtpDto.host}`,
  //     );

  //     const isExistSMTP = await this.smtpSettingsCollection.findOne({
  //       userId,
  //       email: createSmtpDto.email,
  //     });

  //     if (isExistSMTP) {
  //       return {
  //         statusCode: HttpStatus.BAD_REQUEST,
  //         message:
  //           'SMTP setting already exists for this user, please change the email and try again',
  //       };
  //     }

  //     const isStandAloneAssistant =
  //       createSmtpDto?.isStandAloneAssistant || false;
  //     const existingSetting = await this.smtpSettingsCollection.findOne({
  //       userId,
  //       email: createSmtpDto.email,
  //       host: createSmtpDto.host,
  //       port: createSmtpDto.port,
  //       secure: createSmtpDto.secure,
  //       isStandAloneAssistant: isStandAloneAssistant,
  //     });

  //     Logger.log(`Existing setting found: ${existingSetting ? 'Yes' : 'No'}`);

  //     // Prepare SMTP setting object
  //     Logger.log(`Preparing SMTP setting object for user: ${userId}`);
  //     const smtpSetting: SmtpSetting = {
  //       userId,
  //       host: createSmtpDto.host,
  //       port: createSmtpDto.port,
  //       imapHost: createSmtpDto.imapHost || createSmtpDto.host,
  //       imapPort: createSmtpDto.imapPort || 993,
  //       email: createSmtpDto.email,
  //       password: CryptoService.encryptPasskey(createSmtpDto.password),
  //       secure: createSmtpDto.secure,
  //       from: createSmtpDto.from,
  //       name: createSmtpDto.name,
  //       timeout: createSmtpDto.timeout,
  //       knowledgebaseId: createSmtpDto.knowledgebaseId,
  //       isStandAloneAssistant: isStandAloneAssistant,
  //       isActive: true,
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //     };

  //     Logger.log(`Verifying SMTP configuration for new setting`);
  //     const nodemailerResult = await Promise.race([
  //       this.nodemailerService.verifySmtpConfig(smtpSetting),
  //       new Promise((_, reject) =>
  //         setTimeout(
  //           () => reject(new Error('SMTP verification timed out')),
  //           60000,
  //         ),
  //       ),
  //     ]).catch((error) => ({
  //       data: {
  //         success: false,
  //         error: error.message,
  //         details:
  //           'SMTP verification timed out. Please check your connection and try again.',
  //       },
  //     }));

  //     Logger.log(
  //       `SMTP verification result: ${
  //         nodemailerResult.data.success ? 'Success' : 'Failed'
  //       }`,
  //     );

  //     Logger.log(`Sending test email to: ${smtpSetting.email}`);
  //     const smtpTestEmails = await Promise.race([
  //       this.nodemailerService.sendTestEmail(smtpSetting, smtpSetting.email),
  //       new Promise((_, reject) =>
  //         setTimeout(
  //           () => reject(new Error('Test email sending timed out')),
  //           60000,
  //         ),
  //       ),
  //     ]).catch((error) => ({
  //       data: {
  //         success: false,
  //         error: error.message,
  //         details:
  //           'Test email sending timed out. Please check your connection and try again.',
  //       },
  //     }));

  //     Logger.log(
  //       `Test email result: ${
  //         smtpTestEmails.data.success ? 'Success' : 'Failed'
  //       }`,
  //     );

  //     if (!nodemailerResult.data.success || !smtpTestEmails.data.success) {
  //       Logger.error(`SMTP configuration validation failed`);
  //       return {
  //         statusCode: HttpStatus.BAD_REQUEST,
  //         message: 'Invalid SMTP configuration',
  //         error: !nodemailerResult.data.success
  //           ? nodemailerResult.data.error
  //           : smtpTestEmails.data.error,
  //         details: !nodemailerResult.data.success
  //           ? nodemailerResult.data.details
  //           : smtpTestEmails.data.details ||
  //             'Failed to send test email. Please check your email settings.',
  //       };
  //     }

  //     // Update existing setting if found
  //     if (existingSetting) {
  //       Logger.log(
  //         `Updating existing SMTP setting with ID: ${existingSetting._id}`,
  //       );
  //       const updateResult = await this.smtpSettingsCollection.findOneAndUpdate(
  //         { _id: existingSetting._id },
  //         {
  //           $set: {
  //             ...smtpSetting,
  //             createdAt: existingSetting.createdAt,
  //             updatedAt: new Date(),
  //           },
  //         },
  //         { returnDocument: 'after' },
  //       );

  //       if (!updateResult.value) {
  //         Logger.error(
  //           `Failed to update existing SMTP setting with ID: ${existingSetting._id}`,
  //         );
  //         return {
  //           statusCode: HttpStatus.BAD_REQUEST,
  //           message: 'Unable to update SMTP settings. Please try again later.',
  //         };
  //       }

  //       Logger.log(
  //         `Successfully updated SMTP setting with ID: ${existingSetting._id}`,
  //       );

  //       // Remove sensitive fields before returning
  //       Logger.log(`Removing sensitive fields from response`);
  //       delete updateResult.value.from;
  //       delete updateResult.value.name;
  //       delete updateResult.value.timeout;
  //       delete updateResult.value.password;
  //       this.addWarmupCount(userId);
  //       return {
  //         statusCode: HttpStatus.OK,
  //         message: 'SMTP setting updated successfully',
  //         data: updateResult.value,
  //       };
  //     }

  //     // Create new setting if none exists
  //     Logger.log(`Creating new SMTP setting for user: ${userId}`);
  //     const result = await this.smtpSettingsCollection.insertOne({
  //       ...smtpSetting,
  //     });

  //     if (!result.acknowledged) {
  //       Logger.error(`Failed to create new SMTP setting for user: ${userId}`);
  //       return {
  //         statusCode: HttpStatus.BAD_REQUEST,
  //         message: 'Failed to save SMTP settings. Please try again later.',
  //       };
  //     }

  //     Logger.log(
  //       `Successfully created SMTP setting with ID: ${result.insertedId}`,
  //     );

  //     // Remove sensitive fields before returning
  //     Logger.log(`Removing sensitive fields from response`);
  //     delete smtpSetting.from;
  //     delete smtpSetting.name;
  //     delete smtpSetting.timeout;
  //     delete smtpSetting.password;

  //     this.addWarmupCount(userId);

  //     // Added for the Email Assistant Bot As per updated pricing on 27-01-2026
  //     if (isStandAloneAssistant) {
  //       await this.userService.checkBotMaxLimitAndCreate(
  //         new ObjectId(userId),
  //         'email_assistant',
  //         result.insertedId,
  //       );
  //     }

  //     return {
  //       statusCode: HttpStatus.CREATED,
  //       message:
  //         'SMTP setting created and verified successfully, we have sent a test mail to your provided email',
  //       data: {
  //         _id: result.insertedId,
  //         messageId: smtpTestEmails.data?.messageId || null,
  //         ...smtpSetting,
  //       },
  //     };
  //   } catch (error) {
  //     Logger.error(`Error creating/updating SMTP setting: ${error.message}`);
  //     return {
  //       statusCode: HttpStatus.BAD_REQUEST,
  //       message: 'Failed to configure SMTP settings',
  //       error: error.message || 'Unknown error occurred',
  //       details: 'Please check your SMTP configuration and try again.',
  //     };
  //   }
  // }

  async create(createSmtpDto: CreateSmtpDto, userId: string): Promise<any> {
    try {
      Logger.log(`Starting SMTP creation for user: ${userId}`);

      // --- Duplicate check ---
      const isExistSMTP = await this.smtpSettingsCollection.findOne({
        email: createSmtpDto.email,
        userId,
      });
      if (isExistSMTP) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            'SMTP setting already exists for this user, please change the email and try again',
        };
      }

      const isStandAloneAssistant =
        createSmtpDto?.isStandAloneAssistant || false;

      if (createSmtpDto.knowledgebaseId === '') {
        throw new BadRequestException('Project is required');
      }

      // --- Build SMTP setting ---
      const smtpSetting: SmtpSetting = {
        userId,
        host: createSmtpDto.host,
        port: createSmtpDto.port,
        imapHost: createSmtpDto.imapHost || createSmtpDto.host,
        imapPort: createSmtpDto.imapPort || 993,
        email: createSmtpDto.email,
        password: CryptoService.encryptPasskey(createSmtpDto.password),
        secure: createSmtpDto.port === 465 ? true : false,
        from: createSmtpDto.from,
        name: createSmtpDto.name,
        timeout: createSmtpDto.timeout || 30000,
        knowledgebaseId: createSmtpDto.knowledgebaseId,
        isStandAloneAssistant,
        // If warmup enabled → NOT active until Mailivery warmup completes
        isActive: !createSmtpDto.enableWarmup,
        enableWarmup: createSmtpDto.enableWarmup,
        warmupStatus: createSmtpDto.enableWarmup
          ? WarmupStatus.IN_PROGRESS
          : WarmupStatus.NOT_ENABLED,
        warmupSettings: createSmtpDto.enableWarmup
          ? {
              responseRate: createSmtpDto.warmupSettings.response_rate,
              emailPerDay: createSmtpDto.warmupSettings.email_per_day,
            }
          : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // --- Decrypt password for verification ---
      const decryptedPassword = CryptoService.decryptPasskey(
        smtpSetting.password,
      );

      // --- IMAP Verification ---
      Logger.log(`Starting IMAP verification for: ${smtpSetting.email}`);
      const imapResult = (await Promise.race([
        this.nodemailerService.verifyImapConfig({
          host: smtpSetting.imapHost,
          port: smtpSetting.imapPort,
          user: smtpSetting.email,
          password: decryptedPassword,
          secure: smtpSetting.imapPort === 993 ? true : false,
          tls: smtpSetting.imapPort === 143 ? true : false,
        }),
        new Promise<{ success: false; error: string; details: string }>(
          (_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('IMAP verification timed out after 60 seconds'),
                ),
              60000,
            ),
        ),
      ]).catch((error) => ({
        success: false,
        error: error.message,
        details: error.message,
      }))) as { success: boolean; error?: string; details?: string };

      if (!imapResult.success) {
        Logger.error(
          `IMAP verification failed for user ${userId} email ${smtpSetting.email}: ${imapResult?.error} - ${imapResult?.details}`,
        );
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid IMAP configuration',
          error: imapResult?.error,
          details: imapResult?.details,
        };
      }
      Logger.log(`IMAP verification successful for: ${smtpSetting.email}`);

      // --- Verify SMTP ---
      const nodemailerResult = await Promise.race([
        this.nodemailerService.verifySmtpConfig(smtpSetting),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('SMTP verification timed out')),
            60000,
          ),
        ),
      ]).catch((error) => ({
        data: { success: false, error: error.message, details: error.message },
      }));

      const smtpTestEmails = await Promise.race([
        this.nodemailerService.sendTestEmail(smtpSetting, smtpSetting.email),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test email timed out')), 60000),
        ),
      ]).catch((error) => ({
        data: { success: false, error: error.message, details: error.message },
      }));
      Logger.log('SMTP verification result:', nodemailerResult.data);
      Logger.log('SMTP test email result:', smtpTestEmails.data);
      if (!nodemailerResult.data.success || !smtpTestEmails.data.success) {
        Logger.error(
          `SMTP verification or Test email failed for user ${userId} email ${smtpSetting.email}. NodeMailer Error: ${nodemailerResult.data.error}, Test Email Error: ${smtpTestEmails.data.error}`,
        );

        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid SMTP configuration',
          error: !nodemailerResult.data.success
            ? nodemailerResult.data.error
            : smtpTestEmails.data.error,
          details: !nodemailerResult.data.success
            ? nodemailerResult.data.details
            : smtpTestEmails.data.details ||
              'Failed to send test email. Please check your email settings.',
        };
      }

      // --- Save SMTP to DB ---
      const result = await this.smtpSettingsCollection.insertOne({
        ...smtpSetting,
      });
      if (!result.acknowledged) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Failed to save SMTP settings. Please try again later.',
        };
      }

      Logger.log(`SMTP saved: ${result.insertedId}`);

      // --- Warmup path: register with Mailivery ---
      if (createSmtpDto.enableWarmup && createSmtpDto.warmupSettings) {
        const mailiveryDto = this.mapSmtpToMailiveryDto(
          smtpSetting,
          createSmtpDto.warmupSettings,
        );

        // fire-and-forget (optimized)
        await this.mailiveryWarmupService
          .createSmtpCampaign(mailiveryDto, userId)
          .catch((err) =>
            Logger.error(`Mailivery registration failed: ${err.message}`),
          );
        await this.addWarmupCount(userId);
      }
      if (isStandAloneAssistant) {
        await this.userService.checkBotMaxLimitAndCreate(
          new ObjectId(userId),
          'email_assistant',
          result.insertedId,
        );
      }

      const { from, name, timeout, password, ...safeSmtpSetting } = smtpSetting;

      try {
        await this.emailAssistanceService.getEmailAssistanceSetting(userId);
      } catch (error) {
        await this.emailAssistanceService.createEmailAssistanceSetting(userId, {
          isAutoReply: false,
          manualReply: true,
          noReplyAutoFollowup: false,
        });
      }

      return {
        statusCode: HttpStatus.CREATED,
        message: createSmtpDto.enableWarmup
          ? `SMTP saved. Warmup started via Mailivery — this email will be available for campaigns once warmup completes.`
          : 'SMTP setting created and verified successfully. A test email has been sent to your inbox.',
        data: {
          _id: result.insertedId,
          messageId: smtpTestEmails.data?.messageId || null,
          ...safeSmtpSetting,
        },
      };
    } catch (error) {
      Logger.error(
        `Error creating SMTP setting for user ${userId}: ${error.message}`,
        error.stack,
      );
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
        error: error.message || 'Unknown error occurred',
        details: 'Please check your SMTP configuration and try again.',
      };
    }
  }

  private mapSmtpToMailiveryDto(
    smtp: SmtpSetting,
    warmup: WarmupSettingsDto,
  ): CreateSmtpCampaignDto {
    return {
      first_name: smtp.name || 'User',
      last_name: 'SMTP',
      email: smtp.email,

      email_per_day: warmup.email_per_day,
      response_rate: warmup.response_rate,

      tags: null,
      owner_email: smtp.email,

      smtp: {
        smtp_host: smtp.host,
        smtp_port: smtp.port,
        smtp_username: smtp.email,
        smtp_password: CryptoService.decryptPasskey(smtp.password),
      },

      imap: {
        imap_host: smtp.imapHost,
        imap_port: smtp.imapPort,
        imap_username: smtp.email,
        imap_email: smtp.email,
        imap_password: CryptoService.decryptPasskey(smtp.password),
      },
    };
  }
  /**
   * Retrieves all SMTP settings for a user with pagination
   * @param userId - ID of the user
   * @param page - Page number (default: 1)
   * @param limit - Number of items per page (default: 10)
   * @returns Object with status, message, array of SMTP settings and pagination info
   * @developer : ankur
   */
  async findAll(userId: string, page: number, limit: number): Promise<any> {
    try {
      const pageNumber = Math.max(1, Number(page) || 1);
      const limitNumber = Math.max(1, Number(limit) || 10);
      const skip = (pageNumber - 1) * limitNumber;

      const result = await this.smtpSettingsCollection
        .aggregate([
          {
            $match: { userId },
          },
          {
            $lookup: {
              from: KNOWLEDGEBASE_COLLECTION,
              let: {
                kbId: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$knowledgebaseId', null] },
                        { $ne: ['$knowledgebaseId', ''] },
                      ],
                    },
                    { $toObjectId: '$knowledgebaseId' },
                    null,
                  ],
                },
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', '$$kbId'],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    name: 1,
                  },
                },
              ],
              as: 'knowledgebase',
            },
          },
          {
            $unwind: {
              path: '$knowledgebase',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              projectName: {
                $ifNull: ['$knowledgebase.name', null],
              },
            },
          },
          {
            $unset: 'knowledgebase',
          },
          {
            $project: {
              _id: 1,
              host: 1,
              port: 1,
              email: 1,
              imapHost: 1,
              imapPort: 1,
              isActive: 1,
              from: 1,
              name: 1,
              password: 1,
              timeout: 1,
              secure: 1,
              createdAt: 1,
              updatedAt: 1,
              knowledgebaseId: 1,
              isStandAloneAssistant: 1,
              projectName: 1,
              enableWarmup: 1,
              warmupSettings: 1,
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $facet: {
              data: [{ $skip: skip }, { $limit: limitNumber }],
              totalCount: [{ $count: 'count' }],
            },
          },
        ])
        .toArray();

      const settings = result[0]?.data || [];
      const total = result[0]?.totalCount?.[0]?.count || 0;

      return {
        statusCode: HttpStatus.OK,
        message: 'SMTP settings retrieved successfully',
        data: settings,
        pagination: {
          currentPage: pageNumber,
          pageSize: limitNumber,
          totalItems: total,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
    } catch (error) {
      Logger.error(`Error finding SMTP settings: ${error.message}`);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to retrieve SMTP settings',
        error: error.message || 'Unknown error occurred',
        details: 'Please check your SMTP settings and try again.',
      };
    }
  }

  /**
   * Retrieves a single SMTP setting for a user
   * @param userId - ID of the user
   * @returns Object with status, message and SMTP setting data
   * @developer : ankur
   */
  async findOne(userId: string, email?: string): Promise<any> {
    try {
      const smtpSetting = await this.smtpSettingsCollection.findOne({
        userId,
        email,
      });

      if (!smtpSetting) {
        throw new NotFoundException(`SMTP setting not found`);
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'SMTP setting retrieved successfully',
        data: smtpSetting,
      };
    } catch (error) {
      Logger.error(`Error finding SMTP setting: ${error.message}`);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to retrieve SMTP setting',
        error: error.message || 'Unknown error occurred',
        details: 'Please check your SMTP settings and try again.',
      };
    }
  }

  /**
   * Updates an existing SMTP setting
   * @param id - ID of the SMTP setting
   * @param updateSmtpDto - DTO containing fields to update
   * @param userId - ID of the user
   * @returns Object with status, message and updated SMTP setting
   * @developer : ankur
   */
  async update(
    id: string,
    updateSmtpDto: UpdateSmtpDto,
    userId: string,
  ): Promise<any> {
    try {
      const updatePayload: any = {
        ...updateSmtpDto,
        updatedAt: new Date(),
      };
      if (updateSmtpDto.enableWarmup) {
        if (!updateSmtpDto.warmupSettings) {
          throw new BadRequestException('Warmup settings required');
        }

        updatePayload.warmupSettings = {
          emailPerDay: updateSmtpDto.warmupSettings.email_per_day,
          responseRate: updateSmtpDto.warmupSettings.response_rate,
        };

        updatePayload.warmupStatus = WarmupStatus.IN_PROGRESS;
        updatePayload.isActive = false;
      } else {
        updatePayload.warmupSettings = null;
        updatePayload.warmupStatus = WarmupStatus.NOT_ENABLED;
        updatePayload.isActive = true;
      }

      delete updatePayload.warmupSettings?.email_per_day;
      delete updatePayload.warmupSettings?.response_rate;

      const result = await this.smtpSettingsCollection.findOneAndUpdate(
        { id, userId },
        {
          $set: updatePayload,
        },
        { returnDocument: 'after' },
      );

      if (!result.value) {
        throw new NotFoundException(`SMTP setting with ID ${id} not found`);
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'SMTP setting updated successfully',
        data: result.value,
      };
    } catch (error) {
      Logger.error(`Error updating SMTP setting: ${error.message}`);
      throw error;
    }
  }

  /**
   * Removes an SMTP setting for a user
   * @param userId - ID of the user
   * @returns Object with status, message and null data
   * @developer : ankur
   */
  async remove(userId: string, id: string): Promise<any> {
    try {
      const smtpSetting = await this.smtpSettingsCollection.findOne({
        _id: new ObjectId(id),
        userId,
      });

      const result = await this.smtpSettingsCollection.deleteOne({
        _id: new ObjectId(id),
        userId,
      });

      await this.campaignWarmupCollection.deleteOne({
        userId,
        email: smtpSetting.email,
      });

      if (result.deletedCount === 0) {
        throw new NotFoundException(`SMTP setting not found`);
      }
      //Decrement bot count if smtp setting is for stand alone email assistant on 27-01-2026
      if (smtpSetting.isStandAloneAssistant) {
        await this.userService.decreaseBotCount(
          new ObjectId(userId),
          'email_assistant',
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'SMTP setting deleted successfully',
        data: null,
      };
    } catch (error) {
      Logger.error(`Error removing SMTP setting: ${error.message}`);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to delete SMTP setting',
        error: error.message || 'Unknown error occurred',
        details: 'Please check your SMTP settings and try again.',
      };
    }
  }

  /**
   * Public method to create SMTP setting (wrapper for create)
   * @param createSmtpDto - DTO containing SMTP configuration
   * @param userId - ID of the user
   * @returns Result from create method
   * @developer : ankur
   */
  async createSmtpSetting(
    createSmtpDto: CreateSmtpDto,
    userId: string,
  ): Promise<any> {
    try {
      return await this.create(createSmtpDto, userId);
    } catch (error) {
      Logger.error(`Error in createSmtpSetting: ${error.message}`);
      throw error;
    }
  }

  /**
   * Public method to edit SMTP setting
   * @param id - ID of the SMTP setting to edit
   * @param updateSmtpDto - DTO containing updated SMTP configuration
   * @param userId - ID of the user
   * @returns Updated SMTP setting
   * @developer : ankur
   */
  async editSmtpSetting(
    id: string,
    updateSmtpDto: UpdateSmtpDto,
    userId: string,
  ): Promise<any> {
    try {
      const existingSetting = await this.smtpSettingsCollection.findOne({
        _id: new ObjectId(id),
        userId,
      });

      if (!existingSetting) {
        throw new NotFoundException(`SMTP setting not found`);
      }

      if (updateSmtpDto.knowledgebaseId === '') {
        throw new BadRequestException('Project is required');
      }

      // --- Resolve enableWarmup (preserve if not sent) ---
      const enableWarmup =
        updateSmtpDto.enableWarmup !== undefined
          ? updateSmtpDto.enableWarmup
          : existingSetting.enableWarmup;

      // --- Resolve warmupSettings ---
      let warmupSettings = existingSetting.warmupSettings || null;

      if (enableWarmup) {
        if (updateSmtpDto.warmupSettings) {
          warmupSettings = {
            responseRate: updateSmtpDto.warmupSettings.response_rate,
            emailPerDay: updateSmtpDto.warmupSettings.email_per_day,
          };
        }
      } else {
        warmupSettings = null;
      }

      // --- Build SMTP ---
      const smtpSetting: SmtpSetting = {
        userId,
        host: updateSmtpDto.host ?? existingSetting.host,
        port: updateSmtpDto.port ?? existingSetting.port,
        imapHost: updateSmtpDto.imapHost ?? existingSetting.imapHost,
        imapPort: updateSmtpDto.imapPort ?? existingSetting.imapPort,
        email: updateSmtpDto.email ?? existingSetting.email,
        password: existingSetting.password,
        secure: updateSmtpDto.secure ?? existingSetting.secure,
        from: updateSmtpDto.from ?? existingSetting.from,
        name: updateSmtpDto.name ?? existingSetting.name,
        timeout: updateSmtpDto.timeout ?? existingSetting.timeout,
        knowledgebaseId:
          updateSmtpDto.knowledgebaseId ?? existingSetting.knowledgebaseId,
        isStandAloneAssistant:
          updateSmtpDto.isStandAloneAssistant ??
          existingSetting.isStandAloneAssistant,

        enableWarmup,
        warmupSettings,

        // Same logic as create
        isActive: !enableWarmup,

        warmupStatus: enableWarmup
          ? WarmupStatus.IN_PROGRESS
          : WarmupStatus.NOT_ENABLED,

        createdAt: existingSetting.createdAt,
        updatedAt: new Date(),
      };

      // --- Domain validation ---
      if (smtpSetting.from) {
        const emailDomain = smtpSetting.email.split('@')[1];
        const fromDomain = smtpSetting.from.split('@')[1];

        if (emailDomain !== fromDomain) {
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Email and From address must be from the same domain',
            error: 'Domain mismatch',
            details: { emailDomain, fromDomain },
          };
        }
      }

      // --- Decrypt password for IMAP verification ---
      const decryptedPassword = CryptoService.decryptPasskey(
        existingSetting.password,
      );

      // --- IMAP Verification ---
      Logger.log(`Starting IMAP verification for: ${smtpSetting.email}`);

      let imapResult: { success: boolean; error?: string; details?: string };

      try {
        const imapPromise = this.nodemailerService.verifyImapConfig({
          host: smtpSetting.imapHost,
          port: smtpSetting.imapPort,
          user: smtpSetting.email,
          password: decryptedPassword,
          secure: smtpSetting.imapPort === 993 ? true : false,
          tls: smtpSetting.imapPort === 143 ? true : false,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error('IMAP verification timed out after 60 seconds')),
            60000,
          ),
        );

        imapResult = (await Promise.race([imapPromise, timeoutPromise])) as {
          success: boolean;
          error?: string;
          details?: string;
        };
      } catch (error) {
        imapResult = {
          success: false,
          error: error.message,
          details: error.message,
        };
      }

      if (!imapResult.success) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid IMAP configuration',
          error: imapResult?.error,
          details: imapResult?.details,
        };
      }

      Logger.log(`IMAP verification successful for: ${smtpSetting.email}`);

      // --- Verify SMTP ---
      const verifySmtpConfig = await this.nodemailerService.verifySmtpConfig(
        smtpSetting,
      );

      if (!verifySmtpConfig.data.success) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: verifySmtpConfig.message,
          error: verifySmtpConfig.error,
          details: verifySmtpConfig.details,
        };
      }

      // --- Update DB ---
      const result = await this.smtpSettingsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), userId },
        { $set: smtpSetting },
        { returnDocument: 'after' },
      );

      if (!result.value) {
        throw new NotFoundException(`Failed to update SMTP setting`);
      }

      // =========================
      //Warmup Integration Logic
      // =========================

      const wasWarmupEnabled = existingSetting.enableWarmup;

      // Case 1: Newly enabled warmup
      if (!wasWarmupEnabled && enableWarmup && warmupSettings) {
        const mailiveryDto = this.mapSmtpToMailiveryDto(
          smtpSetting,
          updateSmtpDto.warmupSettings,
        );

        await this.mailiveryWarmupService
          .createSmtpCampaign(mailiveryDto, userId)
          .catch((err) =>
            Logger.error(`Mailivery create failed: ${err.message}`),
          );

        await this.addWarmupCount(userId);
      }

      // Case 2: Warmup still enabled → update settings
      // if (wasWarmupEnabled && enableWarmup && updateSmtpDto.warmupSettings) {
      //   await this.mailiveryWarmupService.createSmtpCampaign(smtpSetting.email, {
      //       email_per_day: updateSmtpDto.warmupSettings.email_per_day,
      //       response_rate: updateSmtpDto.warmupSettings.response_rate,
      //     })
      //     .catch((err) =>
      //       Logger.error(`Mailivery update failed: ${err.message}`),
      //     );
      // }

      // // Case 3: Warmup disabled
      // if (wasWarmupEnabled && !enableWarmup) {
      //   await this.mailiveryWarmupService
      //     .disableSmtpCampaign(smtpSetting.email)
      //     .catch((err) =>
      //       Logger.error(`Mailivery disable failed: ${err.message}`),
      //     );
      // }

      return {
        statusCode: HttpStatus.OK,
        message: 'SMTP setting updated successfully',
        data: result.value,
      };
    } catch (error) {
      Logger.error(`Error updating SMTP setting: ${error.message}`);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message,
        error: error.message || 'Unknown error occurred',
        details: 'Please check your SMTP settings and try again.',
      };
    }
  }

  /**
   * Public method to get SMTP setting (wrapper for findOne)
   * @param userId - ID of the user
   * @returns Result from findOne method
   * @developer : ankur
   */
  async getSmtpSetting(userId: string, email?: string): Promise<any> {
    try {
      const result = await this.findOne(userId, email);
      return result;
    } catch (error) {
      Logger.error(`Error in getSmtpSetting: ${error.message}`);
      throw error;
    }
  }

  /**
   * Public method to delete SMTP setting (wrapper for remove)
   * @param userId - ID of the user
   * @returns Result from remove method
   * @developer : ankur
   */
  async deleteSmtpSetting(userId: string, id: string): Promise<any> {
    try {
      return await this.remove(userId, id);
    } catch (error) {
      Logger.error(`Error in deleteSmtpSetting: ${error.message}`);
      throw error;
    }
  }

  /**
   * Public method to get all SMTP settings (wrapper for findAll)
   * @param userId - ID of the user
   * @returns Result from findAll method
   * @developer : ankur
   */
  async getAllSmtpSetting(
    userId: string,
    page: number,
    limit: number,
  ): Promise<any> {
    try {
      return await this.findAll(userId, page, limit);
    } catch (error) {
      Logger.error(`Error in getAllSmtpSetting: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @returns : Object containing status, message and data
   * @working : Adds warmup count for verified email signatures by counting associated audience records
   */
  async addWarmupCount(userId: string) {
    try {
      Logger.log('Starting addWarmupCount for userId:', userId);

      // Fetch all emails in one query
      const [emails, smtpEmails] = await Promise.all([
        this.campaignEmailPasskeyCollection
          .find({ userId })
          .project({ email: 1, userId: 1, status: 1, _id: 0 })
          .toArray(),
        this.smtpSettingsCollection
          .find({ userId })
          .project({ email: 1, userId: 1, isActive: 1, _id: 0 })
          .toArray(),
      ]);

      Logger.log(
        `Found ${emails.length} emails and ${smtpEmails.length} SMTP emails for userId: ${userId}`,
      );

      // Process both regular and SMTP emails
      const allEmails = [...emails, ...smtpEmails];

      if (allEmails.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDate = new Date();

        const operations = allEmails.map(async (email) => {
          // Count documents for this email
          const warmupCount = await this.campaignAudienceCollection
            .countDocuments({
              addedBy: email.userId,
              senderEmailId: email.email,
              createdAt: { $gte: today, $lte: new Date() },
            })
            .catch(() => 0);

          // Find existing warmup document
          const existingDoc = await this.campaignWarmupCollection.findOne({
            userId: email.userId,
            email: email.email,
          });

          // Determine if it's a new day
          const lastUpdateDate = new Date(existingDoc?.updatedAt || new Date());
          const isNewDay =
            lastUpdateDate.getTime() <
            new Date(currentDate.setHours(0, 0, 0, 0)).getTime();

          // Calculate max limit based on warmup count
          let maxLimit = 100; // Default limit
          if (warmupCount >= 1000 && isNewDay) {
            maxLimit = 3000;
          } else if (warmupCount >= 500 && isNewDay) {
            maxLimit = 1000;
          } else if (warmupCount >= 100 && isNewDay) {
            maxLimit = 500;
          }

          // Prepare warmup data
          const warmupData = {
            userId: email.userId,
            email: email.email,
            status: email.status || 'verified',
            warmupCount,
            updatedMaxLimit:
              existingDoc && existingDoc.maxLimit > warmupCount
                ? existingDoc.maxLimit - warmupCount
                : existingDoc?.maxLimit || maxLimit,
          };

          // Update or insert document
          if (existingDoc) {
            await this.campaignWarmupCollection.updateOne(
              { userId: email.userId, email: email.email },
              {
                $set: {
                  ...(warmupData.warmupCount !== existingDoc.warmupCount
                    ? { ...warmupData, updatedAt: new Date() }
                    : {}),
                  ...(maxLimit !== existingDoc.maxLimit ? { maxLimit } : {}),
                },
              },
            );
          } else {
            await this.campaignWarmupCollection.insertOne({
              ...warmupData,
              isWarmUpEnabled: true,
              mailboxType: MailiveryCampaignType.SMTP,
              createdAt: new Date(),
              updatedAt: new Date(),
              maxLimit,
            });
          }
        });

        await Promise.all(operations);
      }

      Logger.log('All warmup counts processed successfully');
      return {
        statusCode: HttpStatus.OK,
        message: 'Warmup counts processed successfully',
      };
    } catch (error) {
      Logger.error('Error processing warmup counts:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to process warmup counts',
        error: error.message,
      };
    }
  }

  async sendTestEmailToVerifySmtpConfig(
    userId: string,
    createSmtpDto: CreateSmtpDto,
    email: string,
  ): Promise<any> {
    try {
      const smtpSetting: SmtpSetting = {
        userId,
        host: createSmtpDto.host,
        port: createSmtpDto.port,
        imapHost: createSmtpDto.imapHost || createSmtpDto.host,
        imapPort: createSmtpDto.imapPort || 993,
        email: createSmtpDto.email,
        password: CryptoService.encryptPasskey(createSmtpDto.password),
        secure: createSmtpDto.port === 465 ? true : false,
        from: createSmtpDto.from,
        name: createSmtpDto.name,
        timeout: createSmtpDto.timeout,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Check if email and from domains match only if from exists
      if (smtpSetting.from) {
        const emailDomain = smtpSetting.email.split('@')[1];
        const fromDomain = smtpSetting.from.split('@')[1];

        if (emailDomain !== fromDomain) {
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Email and From address must be from the same domain',
            error: 'Domain mismatch',
            details: {
              emailDomain,
              fromDomain,
            },
          };
        }
      }

      const verifySmtpConfig = await this.nodemailerService.verifySmtpConfig(
        smtpSetting,
      );
      if (!verifySmtpConfig.data.success) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: verifySmtpConfig.message,
          error: verifySmtpConfig.error,
          details: verifySmtpConfig.details,
        };
      }

      const sendTestEmail = await this.nodemailerService.sendTestEmail(
        smtpSetting,
        email,
      );
      if (!sendTestEmail.data.success) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: sendTestEmail.message,
          error: sendTestEmail.error,
          details: sendTestEmail.details,
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Test email sent successfully',
        messageId: sendTestEmail.data.messageId,
      };
    } catch (error) {
      Logger.error(
        `Error in sendTestEmailToVerifySmtpConfig: ${error.message}`,
      );
      throw error;
    }
  }

  // In your campaign sender / queue processor
  // const smtp = await this.smtpSettingsCollection.findOne({ email });

  // if (!smtp.isActive || smtp.warmupStatus === WarmupStatus.IN_PROGRESS) {
  //   throw new Error(`Email ${email} is still in warmup and cannot send live campaigns`);
  // }
}
