import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  HttpStatus,
  forwardRef,
} from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import {
  CommonFolder,
  COMMON_FOLDER_COLLECTION,
} from './schema/emailAssistanceCommonFolder.schema';
import {
  Folder,
  FOLDER_COLLECTION,
} from './schema/emailAssistanceFolder.schema';
import { MONGODB } from '../common/mongo/mongo.module';
import {
  EMAIL_ASSISTANCE_SETTING_COLLECTION,
  EmailAssistanceSetting,
} from './schema/emailAssitanceSetting.schema';
import { CampaignEmailConversation } from '../campaign/schema/campaignEmailConversation.schema';
import { CAMPAIGN_EMAIL_CONVERSATION_COLLECTION } from '../campaign/schema/campaignEmailConversation.schema';
import { CampaignFollowUpEmailConversation } from '../campaign/schema/campaignFollowUpEmails.schema';
import { CAMPAIGNFOLLOWUPSEMAILS_COLLECTION } from '../campaign/schema/campaignFollowUpEmails.schema';
import {
  CAMPAIGN_SPAM_COLLECTION,
  CampaignSpam,
} from '../campaign/schema/campaignSpam.schema';
import {
  CAMPAIGN_ARCHIVE_COLLECTION,
  CampaignArchive,
} from '../campaign/schema/campaignArchive.schema';
import {
  CAMPAIGN_TRASH_COLLECTION,
  CampaignTrash,
} from '../campaign/schema/campaignTrash.schema';
import {
  CAMPAIGN_DRAFT_COLLECTION,
  CampaignDraft,
} from '../campaign/schema/campaignDraft.schema';
import {
  CAMPAIGN_UNRESOLVED_COLLECTION,
  CampaignUnresolved,
} from '../campaign/schema/campaignUnresolved.schema';
import {
  CAMPAIGN_LEAD_GENERATION_COLLECTION,
  CampaignLeadGeneration,
} from '../campaign/schema/campaignLeadGenerated.schema';
import {
  Notification,
  NOTIFICATION_COLLECTION,
} from './schema/emailAssistanceNotification.schema';
import { NotificationType } from './constant/emailAssitance.contant';
import {
  CampaignAudience,
  CAMPAIGNAUDIENCE_COLLECTION,
} from '../campaign/schema/campaignAudience.schema';
import {
  CAMPAIGN_DUPLICATEAUDIENCE_COLLECTION,
  CampaignDuplicateAudience,
} from '../campaign/schema/campaignDuplicateAudience.schema';
import { GmailService } from '../campaign/email-console/googleGmailApiOperation.service';
import {
  CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
  CampaignEmailPasskey,
} from '../campaign/schema/campaignEmailPasskey.schema';
import {
  CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
  CampaignUserEmailToken,
} from '../campaign/schema/campaignUserEmailToken.schema';
import { EMAIL_HOST_TYPE, EMAIL_SERVER_TYPE } from '../campaign/enum/enum';
import { CryptoService } from '../campaign/campaign-utils/crypto.service';
import {
  SMTP_SETUP_COLLECTION,
  SmtpSetting,
} from '../smtp/entities/smtp.entity';
import { ImapService } from '../campaign/campaign-utils/nodeImap.service';
import { User, USER_COLLECTION } from '../user/user.schema';
import { CampaignService } from '../campaign/campaign.service';
import { GoogleAuthService } from '../campaign/email-console/googleconsole.service';
import { UpdateFolderDto_ } from './dto/update-folder.dto';
import { KNOWLEDGEBASE_COLLECTION } from '../knowledgebase/knowledgebase.schema';
import { CAMPAIGNDATA_COLLECTION } from '../campaign/schema/campaign.schema';

@Injectable()
export class EmailAssistanceService {
  private readonly logger = new Logger(EmailAssistanceService.name);
  private commonFolderCollection: Collection<CommonFolder>;
  private folderCollection: Collection<Folder>;
  private emailAssistanceSettingCollection: Collection<EmailAssistanceSetting>;
  private emailConversationCollection: Collection<CampaignEmailConversation>;
  private followUpEmailConversationCollection: Collection<CampaignFollowUpEmailConversation>;
  private campaignSpamCollection: Collection<CampaignSpam>;
  private campaignArchiveCollection: Collection<CampaignArchive>;
  private campaignTrashCollection: Collection<CampaignTrash>;
  private campaignDraftCollection: Collection<CampaignDraft>;
  private campaignUnresolvedCollection: Collection<CampaignUnresolved>;
  private campaignLeadGeneratedCollection: Collection<CampaignLeadGeneration>;
  private notificationCollection: Collection<Notification>;
  private emailAudienceCollection: Collection<CampaignAudience>;
  private emailDuplicateAudienceCollection: Collection<CampaignDuplicateAudience>;
  private campaignEmailPasskeyCollection: Collection<CampaignEmailPasskey>;
  private campaignUserEmailTokenCollection: Collection<CampaignUserEmailToken>;
  private smtpServerConfigCollection: Collection<SmtpSetting>;
  private readonly userCollection: Collection<User>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private readonly gmailServiceApis: GmailService,
    private readonly imapService: ImapService,
    private readonly googleConsoleService: GoogleAuthService,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaignService: CampaignService,
  ) {
    this.commonFolderCollection = this.db.collection<CommonFolder>(
      COMMON_FOLDER_COLLECTION,
    );
    this.folderCollection = this.db.collection<Folder>(FOLDER_COLLECTION);
    this.emailAssistanceSettingCollection =
      this.db.collection<EmailAssistanceSetting>(
        EMAIL_ASSISTANCE_SETTING_COLLECTION,
      );
    this.emailConversationCollection =
      this.db.collection<CampaignEmailConversation>(
        CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
      );
    this.followUpEmailConversationCollection =
      this.db.collection<CampaignFollowUpEmailConversation>(
        CAMPAIGNFOLLOWUPSEMAILS_COLLECTION,
      );
    this.campaignSpamCollection = this.db.collection<CampaignSpam>(
      CAMPAIGN_SPAM_COLLECTION,
    );
    this.campaignArchiveCollection = this.db.collection<CampaignArchive>(
      CAMPAIGN_ARCHIVE_COLLECTION,
    );
    this.campaignTrashCollection = this.db.collection<CampaignTrash>(
      CAMPAIGN_TRASH_COLLECTION,
    );
    this.campaignDraftCollection = this.db.collection<CampaignDraft>(
      CAMPAIGN_DRAFT_COLLECTION,
    );
    this.campaignUnresolvedCollection = this.db.collection<CampaignUnresolved>(
      CAMPAIGN_UNRESOLVED_COLLECTION,
    );
    this.campaignLeadGeneratedCollection =
      this.db.collection<CampaignLeadGeneration>(
        CAMPAIGN_LEAD_GENERATION_COLLECTION,
      );
    this.notificationCollection = this.db.collection<Notification>(
      NOTIFICATION_COLLECTION,
    );
    this.emailAudienceCollection = this.db.collection<CampaignAudience>(
      CAMPAIGNAUDIENCE_COLLECTION,
    );
    this.emailDuplicateAudienceCollection =
      this.db.collection<CampaignDuplicateAudience>(
        CAMPAIGN_DUPLICATEAUDIENCE_COLLECTION,
      );
    this.campaignEmailPasskeyCollection =
      this.db.collection<CampaignEmailPasskey>(
        CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
      );

    this.campaignUserEmailTokenCollection =
      this.db.collection<CampaignUserEmailToken>(
        CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
      );

    this.smtpServerConfigCollection = this.db.collection<SmtpSetting>(
      SMTP_SETUP_COLLECTION,
    );
    this.userCollection = this.db.collection<User>(USER_COLLECTION);
  }

  /**
   * @developer : Ankur
   * @param folderData : Partial CommonFolder object containing folder details
   * @returns : Promise of the created CommonFolder
   * @working : Creates a new common folder if it doesn't already exist
   */
  async createCommonFolder(
    folderData: Partial<CommonFolder>,
  ): Promise<CommonFolder> {
    try {
      this.logger.log('Creating new common folder');

      const existingFolder = await this.commonFolderCollection.findOne({
        folderName: folderData.folderName,
        folderType: folderData.folderType,
      });

      if (existingFolder) {
        throw new BadRequestException(
          'Folder with same name and type already exists',
        );
      }

      const newFolder = {
        ...folderData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.commonFolderCollection.insertOne(
        newFolder as any,
      );
      const savedFolder = {
        ...newFolder,
        _id: result.insertedId,
      } as CommonFolder;
      this.logger.log(`Common folder created with id: ${savedFolder}`);
      return savedFolder;
    } catch (error) {
      this.logger.error(`Error creating common folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @returns : Promise of an array of CommonFolder
   * @working : Fetches all common folders sorted by creation date
   */
  async getAllCommonFolders(): Promise<CommonFolder[]> {
    try {
      this.logger.log('Fetching all common folders');
      return await this.commonFolderCollection
        .find()
        .sort({ createdAt: 1 })
        .toArray();
    } catch (error) {
      this.logger.error(`Error fetching common folders: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param id : string
   * @returns : Promise of the CommonFolder with the specified id
   * @working : Fetches a common folder by its id
   */
  private async getCommonFolderById(id: string): Promise<CommonFolder> {
    try {
      this.logger.log(`Fetching common folder with id: ${id}`);
      const folder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!folder) {
        throw new NotFoundException(`Common folder with id ${id} not found`);
      }

      return folder;
    } catch (error) {
      this.logger.error(`Error fetching common folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param id : string
   * @param updateData : Partial CommonFolder object containing updated folder details
   * @returns : Promise of the updated CommonFolder
   * @working : Updates an existing common folder by its id
   */
  private async updateCommonFolder(
    id: string,
    updateData: Partial<CommonFolder>,
  ): Promise<CommonFolder> {
    try {
      this.logger.log(`Updating common folder with id: ${id}`);

      const folder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!folder) {
        throw new NotFoundException(`Common folder with id ${id} not found`);
      }

      // Only check for duplicates if name or type is being updated
      if (updateData.folderName || updateData.folderType) {
        const existingFolder = await this.commonFolderCollection.findOne({
          _id: { $ne: new ObjectId(id) },
          folderName: updateData.folderName || folder.folderName,
          folderType: updateData.folderType || folder.folderType,
        });

        if (existingFolder) {
          throw new BadRequestException(
            'Folder with same name and type already exists',
          );
        }
      }

      // Only update fields that have changed
      const updatedFields = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && value !== folder[key]) {
          updatedFields[key] = value;
        }
      }

      // Only perform update if there are changes
      if (Object.keys(updatedFields).length > 0) {
        const result = await this.commonFolderCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...updatedFields,
              updatedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        );
        this.logger.log(`Common folder updated successfully`);
        return result.value;
      }

      return folder;
    } catch (error) {
      this.logger.error(`Error updating common folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param id : string
   * @returns : Promise<void>
   * @working : Deletes a common folder by its id
   */
  private async deleteCommonFolder(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting common folder with id: ${id}`);

      const folder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!folder) {
        throw new NotFoundException(`Common folder with id ${id} not found`);
      }

      await this.commonFolderCollection.deleteOne({ _id: new ObjectId(id) });
      this.logger.log(`Common folder deleted successfully`);
    } catch (error) {
      this.logger.error(`Error deleting common folder: ${error.message}`);
      throw error;
    }
  }

  // CRUD operations for Folder

  /**
   * @developer : Ankur
   * @param folderData : Partial Folder object containing folder details
   * @returns : Promise of the created Folder
   * @working : Creates a new folder if it doesn't already exist
   */
  async createFolder(
    folderData: Partial<Folder>,
    userId: string,
  ): Promise<Folder> {
    try {
      this.logger.log('Creating new folder');

      const existingFolder = await this.folderCollection.findOne({
        folderName: folderData.folderName?.toLowerCase(),
        folderType: folderData.folderType,
        userId,
      });

      const existingCommonFolder = await this.commonFolderCollection.findOne({
        folderName: folderData.folderName?.toLowerCase(),
      });

      if (existingFolder || existingCommonFolder) {
        throw new BadRequestException(
          'Folder with same name already exists for this user',
        );
      }

      const { folderName, ...restFolderData } = folderData;
      const newFolder = {
        ...restFolderData,
        folderName: folderName?.toLowerCase(),
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.log(newFolder);

      const result = await this.folderCollection.insertOne(newFolder as any);
      const savedFolder = {
        ...newFolder,
        _id: result.insertedId,
      } as Folder;
      this.logger.log(`Folder created with id: ${savedFolder}`);
      return savedFolder;
    } catch (error) {
      this.logger.error(`Error creating folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : string
   * @returns : Promise of an array of Folder
   * @working : Fetches all folders for a specific user sorted by creation date
   */
  async getAllFolders(userId: string, filterOptions?: any): Promise<any> {
    try {
      this.logger.log('Fetching all folders');

      // Run folder queries in parallel
      const [userFolders, commonFolders] = await Promise.all([
        this.folderCollection
          .find({ userId })
          .sort({ createdAt: -1 })
          .toArray(),
        this.getAllCommonFolders(),
      ]);
      // Put common folders first, then user folders
      const allFolders = [...commonFolders, ...userFolders];

      // Create a map of folder IDs for faster lookup
      const folderIdMap = new Map(
        allFolders.map((folder) => [
          folder.folderName?.toLowerCase(),
          folder._id.toHexString(),
        ]),
      );

      // Run count queries in parallel for common folders
      const [
        inboxCount,
        followupCount,
        draftCount,
        unresolvedCount,
        leadGeneratedCount,
        autoReplies,
      ] = await Promise.all([
        this.emailConversationListing(
          '',
          1,
          1,
          folderIdMap.get('email summary'),
          {
            user: { _id: new ObjectId(userId) },
          },
          filterOptions,
        ).then((res) => res.pagination.totalItems),

        this.followUpConversationListing(
          '',
          1,
          1,
          folderIdMap.get('followup conversations'),
          {
            user: { _id: new ObjectId(userId) },
          },
          filterOptions,
        ).then((res) => res.pagination.totalItems),

        this.draftConversationListing(
          '',
          1,
          1,
          folderIdMap.get('draft'),
          {
            user: { _id: new ObjectId(userId) },
          },
          filterOptions,
        ).then((res) => res.pagination.totalItems),

        this.unresolvedConversationListing(
          '',
          1,
          1,
          folderIdMap.get('unresolved'),
          {
            user: { _id: new ObjectId(userId) },
          },
          filterOptions,
        ).then((res) => res.pagination.totalItems),

        this.leadGeneratedConversationListing(
          '',
          1,
          1,
          folderIdMap.get('leads generated'),
          {
            user: { _id: new ObjectId(userId) },
          },
          filterOptions,
        ).then((res) => res.pagination.totalItems),

        this.autoRepliesConversationListing(
          '',
          1,
          1,
          folderIdMap.get('auto replies'),
          {
            user: { _id: new ObjectId(userId) },
          },
          filterOptions,
        ).then((res) => res.pagination.totalItems),
      ]);

      // Get counts for user folders in parallel
      const userFolderCounts = await Promise.all(
        userFolders.map((folder) =>
          this.manualFolderConversationListing(
            '',
            1,
            1,
            folder._id.toHexString(),
            folder.emailAccountId || '',
            folder.category || '',
            {
              user: { _id: new ObjectId(userId) },
            },
            filterOptions,
          ).then((res) => ({
            folderId: folder._id.toHexString(),
            count: res.pagination.totalItems,
          })),
        ),
      );

      // Create counts map for faster lookup
      const countsMap = new Map<string, number>([
        ['email summary', inboxCount],
        ['followup conversations', followupCount],
        ['draft', draftCount],
        ['unresolved', unresolvedCount],
        ['leads generated', leadGeneratedCount],
        ['auto replies', autoReplies],
      ]);

      // Add user folder counts
      userFolderCounts.forEach((item) => {
        countsMap.set(item.folderId, item.count);
      });

      // Map counts to folders in a single pass
      const foldersWithCounts = allFolders.map((folder) => ({
        ...folder,
        count:
          countsMap.get(folder.folderName?.toLowerCase()) ||
          countsMap.get(folder._id.toHexString()) ||
          0,
      }));

      return foldersWithCounts;
    } catch (error) {
      this.logger.error(`Error fetching folders: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param id : string
   * @param userId : string
   * @returns : Promise of the Folder with the specified id
   * @working : Fetches a folder by its id and user id
   */
  async getFolderById(userId: string): Promise<Folder> {
    try {
      this.logger.log(`Fetching folder with id: ${userId}`);
      const folder = await this.folderCollection.findOne({
        userId: userId,
      });

      if (!folder) {
        throw new NotFoundException(`Folder with id ${userId} not found`);
      }

      return folder;
    } catch (error) {
      this.logger.error(`Error fetching folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param id : string
   * @param userId : string
   * @param updateData : Partial Folder object containing updated folder details
   * @returns : Promise of the updated Folder
   * @working : Updates an existing folder by its id and user id
   */
  async updateFolder(
    folderId: string,
    userId: string,
    updateData: UpdateFolderDto_,
  ): Promise<any> {
    try {
      const folder = await this.folderCollection.findOne({
        _id: new ObjectId(folderId),
        userId,
      });
      if (!folder) {
        throw new NotFoundException(`Folder with id ${folderId} not found`);
      }

      // Only check for duplicates if name or type is being updated
      if (updateData.folderName || updateData.folderType) {
        // Convert folder name to lowercase before saving
        if (updateData.folderName) {
          updateData.folderName = updateData.folderName.toLowerCase();
        }

        const existingFolder = await this.folderCollection.findOne({
          _id: { $ne: new ObjectId(folderId) },
          folderName: updateData.folderName || folder.folderName?.toLowerCase(),
          userId,
        });

        if (existingFolder) {
          throw new BadRequestException(
            'Folder with same name and type already exists for this user',
          );
        }
      }

      // Only update fields that have changed
      const updatedFields = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && value !== folder[key]) {
          updatedFields[key] = value;
        }
      }

      // Only perform update if there are changes
      if (Object.keys(updatedFields).length > 0) {
        const result = await this.folderCollection.findOneAndUpdate(
          { _id: new ObjectId(folderId), userId },
          {
            $set: {
              ...updatedFields,
              updatedAt: new Date(),
            },
          },
          { returnDocument: 'after' },
        );
        this.logger.log(`Folder updated successfully`);
        return {
          statusCode: HttpStatus.OK,
          message: 'Folder updated successfully',
          data: result.value,
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'No changes were made to the folder',
        data: folder,
      };
    } catch (error) {
      this.logger.error(`Error updating folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param id : string
   * @param userId : string
   * @returns : Promise<void>
   * @working : Deletes a folder by its id and user id
   */
  async deleteFolder(id: string, userId: string) {
    try {
      this.logger.log(`Deleting folder with id: ${id}`);

      const folder = await this.folderCollection.findOne({
        _id: new ObjectId(id),
        userId,
      });
      if (!folder) {
        throw new NotFoundException(`Folder with id ${id} not found`);
      }

      await this.folderCollection.deleteOne({ _id: new ObjectId(id), userId });
      this.logger.log(`Folder deleted successfully`);
      return {
        statusCode: HttpStatus.OK,
        message: 'Folder deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Error deleting folder: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : string
   * @param data : any
   * @returns : Promise of created email assistance setting
   * @working : Creates a new email assistance setting for a user
   */
  async createEmailAssistanceSetting(userId: string, data: any) {
    try {
      this.logger.log(
        `Creating or updating email assistance setting for user: ${userId}`,
      );

      const existingSetting =
        await this.emailAssistanceSettingCollection.findOne({ userId });

      if (!existingSetting) {
        const newSetting =
          await this.emailAssistanceSettingCollection.insertOne({
            userId,
            // Default manual reply to ON for a brand-new setting unless the
            // caller explicitly specifies otherwise.
            autoReply: { manualReply: true, ...data },
            emailSetting: {
              size: data.emailSetting?.size || 0,
              language: data.emailSetting?.language || '',
              content: JSON.stringify(data.emailSetting?.content),
              isLeadCollection: data.emailSetting?.isLeadCollection || false,
              leadCollectionInputFields: {
                isName:
                  data.emailSetting?.leadCollectionInputFields?.isName || false,
                isPhone:
                  data.emailSetting?.leadCollectionInputFields?.isPhone ||
                  false,
                isAddress:
                  data.emailSetting?.leadCollectionInputFields?.isAddress ||
                  false,
              },
            },
            ruleSetup: {
              customizeSettings: {
                keywords: data.ruleSetup?.customizeSettings?.keywords || [],
                emailExclusion:
                  data.ruleSetup?.customizeSettings?.emailExclusion || [],
              },
              fallbackMechanism: {
                FALLBACK_MECHANISM_1:
                  data.ruleSetup?.fallbackMechanism?.FALLBACK_MECHANISM_1 ||
                  false,
                FALLBACK_MECHANISM_2:
                  data.ruleSetup?.fallbackMechanism?.FALLBACK_MECHANISM_2 ||
                  false,
                FALLBACK_MECHANISM_3: {
                  isForward:
                    data.ruleSetup?.fallbackMechanism?.FALLBACK_MECHANISM_3
                      ?.isForward || false,
                  forwardTo:
                    data.ruleSetup?.fallbackMechanism?.FALLBACK_MECHANISM_3
                      ?.forwardTo || [],
                },
              },
              archiveManaged: {
                timebasedArchive:
                  data.ruleSetup?.archiveManaged?.timebasedArchive || false,
                timebasedArchiveValue: {
                  from:
                    data.ruleSetup?.archiveManaged?.timebasedArchiveValue
                      ?.from || '',
                  to:
                    data.ruleSetup?.archiveManaged?.timebasedArchiveValue?.to ||
                    '',
                },
                emails: data.ruleSetup?.archiveManaged?.emails || [],
              },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        this.logger.log(`Email assistance setting created successfully`);
        return {
          statusCode: HttpStatus.OK,
          message: 'Email assistance setting created successfully',
          data: newSetting.insertedId,
        };
      } else {
        const updatedSetting =
          await this.emailAssistanceSettingCollection.updateOne(
            { userId },
            {
              $set: {
                autoReply: data,
                updatedAt: new Date(),
              },
            },
          );

        this.logger.log(`Email assistance setting updated successfully`);
        return {
          statusCode: HttpStatus.OK,
          message: 'Email assistance setting updated successfully',
          data: updatedSetting.upsertedId || existingSetting._id,
        };
      }
    } catch (error) {
      this.logger.error(
        `Error creating or updating email assistance setting: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : string
   * @returns : Promise of EmailAssistanceSetting
   * @working : Gets email assistance setting for a user by their user id
   */
  async getEmailAssistanceSetting(
    userId: string,
  ): Promise<EmailAssistanceSetting> {
    try {
      this.logger.log(`Getting email assistance setting for user: ${userId}`);

      const setting = await this.emailAssistanceSettingCollection.findOne({
        userId,
      });
      if (!setting) {
        throw new NotFoundException(
          `Email assistance setting not found for user ${userId}`,
        );
      }

      return setting;
    } catch (error) {
      this.logger.error(
        `Error getting email assistance setting: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : string
   * @param emailSetting : any
   * @returns : Promise of updated EmailAssistanceSetting
   * @working : Updates email settings for a user
   */
  async updateEmailSetting(
    userId: string,
    emailSetting: any,
  ): Promise<EmailAssistanceSetting> {
    try {
      this.logger.log(`Updating or creating email setting for user: ${userId}`);

      const setting = await this.emailAssistanceSettingCollection.findOne({
        userId,
      });

      if (!setting) {
        this.logger.log(
          `No existing setting found, creating new one for user: ${userId}`,
        );
        const newSetting: EmailAssistanceSetting = {
          userId,
          emailSetting,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.emailAssistanceSettingCollection.insertOne(newSetting);
        this.logger.log(`Email setting created successfully`);
        return { ...newSetting };
      } else {
        const result =
          await this.emailAssistanceSettingCollection.findOneAndUpdate(
            { userId },
            {
              $set: {
                emailSetting,
                updatedAt: new Date(),
              },
            },
            { returnDocument: 'after' },
          );
        this.logger.log(`Email setting updated successfully`);
        return result.value;
      }
    } catch (error) {
      this.logger.error(
        `Error updating or creating email setting: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : string
   * @param ruleSetup : any
   * @returns : Promise of updated EmailAssistanceSetting
   * @working : Updates rule setup settings for a user
   */
  async updateRuleSetupSetting(
    userId: string,
    ruleSetup: any,
  ): Promise<EmailAssistanceSetting> {
    try {
      this.logger.log(`Updating or creating rule setup for user: ${userId}`);

      const setting = await this.emailAssistanceSettingCollection.findOne({
        userId,
      });

      if (!setting) {
        this.logger.log(
          `No existing setting found, creating new one for user: ${userId}`,
        );
        const newSetting: EmailAssistanceSetting = {
          userId,
          ruleSetup,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.emailAssistanceSettingCollection.insertOne(newSetting);
        this.logger.log(`Rule setup created successfully`);
        return { ...newSetting };
      } else {
        const result =
          await this.emailAssistanceSettingCollection.findOneAndUpdate(
            { userId },
            {
              $set: {
                ruleSetup,
                updatedAt: new Date(),
              },
            },
            { returnDocument: 'after' },
          );
        this.logger.log(`Rule setup updated successfully`);
        const passkey = await this.campaignEmailPasskeyCollection
          .aggregate([
            {
              $match: {
                userId: userId,
                emailHost: EMAIL_HOST_TYPE.GOOGLE,
              },
            },
          ])
          .toArray();

        const smtpServerConfig = await this.smtpServerConfigCollection
          .find({
            userId: userId,
          })
          .toArray();


        if (passkey.length > 0) {
          passkey.forEach(async (item) => {
            const emailUserOauthToken =
              await this.campaignUserEmailTokenCollection.findOne({
                email: item.email,
                server: EMAIL_SERVER_TYPE.GOOGLE,
              });

            if (!emailUserOauthToken) {
              return;
            }

            const emailServerConfig = {
              refresh_token: CryptoService.decryptPasskey(
                emailUserOauthToken.refreshToken,
              ),
              access_token: CryptoService.decryptPasskey(
                emailUserOauthToken.accessToken,
              ),
              scope: emailUserOauthToken.scope,
              token_type: emailUserOauthToken.tokenType,
              expiry_date: new Date(
                emailUserOauthToken.tokenExpiryDate,
              ).getTime(),
            };

            const data = {
              emailAssistanceSetting: result.value,
              receiverEmail: item.email,
              senderEmail: result.value.ruleSetup.archiveManaged.senderDetails,
              emailServerConfig: emailServerConfig,
            };
            this.markEmailAsArchived(data);
          });
        } else {
          smtpServerConfig.forEach(async (item) => {
            const imapConfig = {
              user: item.email,
              password: item.password,
              host: item.host,
              port: 993,
              tls: true,
              authTimeout: 10000,
              tlsOptions: {
                rejectUnauthorized: false,
              },
            };

            const searchCriteria = {
              from: result.value.ruleSetup.archiveManaged.senderDetails,
            };

            // Add time-based criteria only if timebasedArchive is true
            if (result.value.ruleSetup.archiveManaged.timebasedArchive) {
              searchCriteria['since'] = new Date(
                result.value.ruleSetup.archiveManaged.timebasedArchiveValue?.from,
              );
              searchCriteria['before'] = new Date(
                result.value.ruleSetup.archiveManaged.timebasedArchiveValue?.to,
              );
            }

            this.imapService.archiveEmails(imapConfig, searchCriteria);
          });
        }
        return result.value;
      }
    } catch (error) {
      this.logger.error(
        `Error updating or creating rule setup: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param userId : string
   * @returns : Promise<void>
   * @working : Deletes email assistance setting for a user
   */
  async deleteEmailAssistanceSetting(userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting email assistance setting for user: ${userId}`);

      const setting = await this.emailAssistanceSettingCollection.findOne({
        userId,
      });
      if (!setting) {
        throw new NotFoundException(
          `Email assistance setting not found for user ${userId}`,
        );
      }

      await this.emailAssistanceSettingCollection.deleteOne({ userId });
      this.logger.log(`Email assistance setting deleted successfully`);
    } catch (error) {
      this.logger.error(
        `Error deleting email assistance setting: ${error.message}`,
      );
      throw error;
    }
  }

  private async applyEmailAssistanceFilters(query: any, filterOptions?: any) {
    if (!filterOptions) return;

    if (filterOptions.type === 'emailOutreach') {
      if (filterOptions.campaignId) {
        query.campaignId = filterOptions.campaignId;
      } else if (filterOptions.projectId) {
        const campaigns = await this.db
          .collection(CAMPAIGNDATA_COLLECTION)
          .find({
            'campaignProject.projectId': filterOptions.projectId,
            addedBy: query.userId,
          })
          .project({ _id: 1 })
          .toArray();
        const campaignIds = campaigns.map((c) => c._id.toHexString());
        query.campaignId = { $in: campaignIds };
      }
      query.standAloneAssistant = { $ne: true };
    } else if (filterOptions.type === 'emailAssistant') {
      if (filterOptions.emailId) {
        query.userEmailId = filterOptions.emailId;
      }
      query.standAloneAssistant = true;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of email conversations with pagination
   * @working : Lists email conversations with search and pagination functionality
   */
  async emailConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);


      const skip = (page - 1) * limit;
      // if (!ObjectId.isValid(folderId)) {
      //   throw new BadRequestException('Invalid folder ID format');
      // }

      const inboxFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!inboxFolder) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const trimmedSearch = searchString?.trim();
      let searchFilter = {};
      if (trimmedSearch) {
        const regex = new RegExp(trimmedSearch, 'i');

        searchFilter = {
          $or: [
            { audienceEmailId: regex },
            { userEmailId: regex },
            { receiverEmail: regex },
            { senderEmail: regex },
            { subject: regex },
          ],
        };
      }

      const query: any = {
        userId: req.user._id.toHexString(),
        ...searchFilter,
        // 'emailConversation.isReceivedEmail': { $eq: true },
      };

      await this.applyEmailAssistanceFilters(query, filterOptions);

      // Check if email exists in any conversation with this folderId
      // if (folderId) {
      //   query['emailConversation.folderId'] = folderId;
      // }

      // if (searchString.trim()) {
      //   query['audienceEmailId'] = {
      //     $regex: searchString,
      //     $options: 'i',
      //   };
      // }
      // Added By Nidhi on 14-04-2026 for searching email in sender and receiver both
      // if(searchString.trim()){
      //   query['receiverEmail'] = {
      //     $regex: searchString,
      //     $options: 'i',
      //   };
      // }

      const total = await this.emailConversationCollection.countDocuments(
        query,
      );

      const conversations = await this.emailConversationCollection
        .find(query)
        .project({
          _id: 1,
          knowledgebaseId: 1,
          standAloneAssistant: 1,
          senderEmail: '$userEmailId', // Changed from userEmailId
          campaignId: 1,
          receiverEmail: '$audienceEmailId', // Changed from audienceEmailId
          emailConversation: 1,
          subject: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // console.log('Emails in DB sample:', await this.emailConversationCollection.findOne());

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching email conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of follow-up email conversations with pagination
   * @working : Lists follow-up email conversations with search and pagination functionality
   */
  async followUpConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const skip = (page - 1) * limit;
      if (!ObjectId.isValid(folderId)) {
        throw new BadRequestException('Invalid folder ID format');
      }

      const followUpFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!followUpFolder) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        addedBy: req.user._id.toHexString(),
      };

      // if (folderId) {
      //   query['emailConversation.folderId'] = folderId;
      // }

      if (searchString.trim()) {
        query['receiverEmail'] = {
          $regex: searchString,
          $options: 'i',
        };
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      const total =
        await this.followUpEmailConversationCollection.countDocuments(query);
      const conversations = await this.followUpEmailConversationCollection
        .find({
          ...query,
          // 'emailConversation.isFollowUpEmail': { $eq: true },
        })
        .project({
          _id: 1,
          receiverEmail: 1,
          campaignId: 1,
          senderEmail: 1,
          emailConversation: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching follow-up conversations: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of spam email conversations with pagination
   * @working : Lists spam email conversations with search and pagination functionality
   */
  async spamConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const skip = (page - 1) * limit;
      if (!ObjectId.isValid(folderId)) {
        throw new BadRequestException('Invalid folder ID format');
      }

      const spamFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!spamFolder) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        addedBy: req.user._id.toHexString(),
      };

      if (folderId) {
        query['emailConversation.folderId'] = folderId;
      }

      if (searchString.trim()) {
        query['audienceEmailId'] = {
          $regex: searchString,
          $options: 'i',
        };
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      const total = await this.campaignSpamCollection.countDocuments(query);
      const conversations = await this.campaignSpamCollection
        .find({
          ...query,
          'emailConversation.isSpamEmail': { $eq: true },
        })
        .project({
          _id: 1,
          receiverEmail: 1,
          campaignId: 1,
          senderEmail: 1,
          emailConversation: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching spam conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of archive email conversations with pagination
   * @working : Lists archive email conversations with search and pagination functionality
   */
  async archiveConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const skip = (page - 1) * limit;
      if (!ObjectId.isValid(folderId)) {
        throw new BadRequestException('Invalid folder ID format');
      }

      const archiveFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!archiveFolder) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        addedBy: req.user._id.toHexString(),
      };

      if (folderId) {
        query['emailConversation.folderId'] = folderId;
      }

      if (searchString.trim()) {
        query['audienceEmailId'] = {
          $regex: searchString,
          $options: 'i',
        };
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      const total = await this.campaignArchiveCollection.countDocuments(query);
      const conversations = await this.campaignArchiveCollection
        .find({
          ...query,
          'emailConversation.isArchiveEmail': { $eq: true },
        })
        .project({
          _id: 1,
          receiverEmail: 1,
          campaignId: 1,
          senderEmail: 1,
          emailConversation: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching archive conversations: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of trash email conversations with pagination
   * @working : Lists trash email conversations with search and pagination functionality
   */
  async trashConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const skip = (page - 1) * limit;
      if (!ObjectId.isValid(folderId)) {
        throw new BadRequestException('Invalid folder ID format');
      }

      const trashFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!trashFolder) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        addedBy: req.user._id.toHexString(),
      };

      if (folderId) {
        query['emailConversation.folderId'] = folderId;
      }

      if (searchString.trim()) {
        query['audienceEmailId'] = {
          $regex: searchString,
          $options: 'i',
        };
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      const total = await this.campaignTrashCollection.countDocuments(query);
      const conversations = await this.campaignTrashCollection
        .find({
          ...query,
          'emailConversation.isTrashEmail': { $eq: true },
        })
        .project({
          _id: 1,
          receiverEmail: 1,
          campaignId: 1,
          senderEmail: 1,
          emailConversation: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching trash conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of draft email conversations with pagination
   * @working : Lists draft email conversations with search and pagination functionality
   */
  async draftConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const skip = (page - 1) * limit;
      if (!ObjectId.isValid(folderId)) {
        throw new BadRequestException('Invalid folder ID format');
      }

      const draftFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!draftFolder) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        addedBy: req.user._id.toHexString(),
      };

      // if (folderId) {
      //   query['emailConversation.folderId'] = folderId;
      // }

      if (searchString.trim()) {
        query['receiverEmail'] = {
          $regex: searchString,
          $options: 'i',
        };
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      const total = await this.campaignDraftCollection.countDocuments(query);
      const conversations = await this.campaignDraftCollection
        .find({
          ...query,
          // 'emailConversation.isDraftEmail': { $eq: true },
        })
        .project({
          _id: 1,
          knowledgebaseId: 1,
          standAloneAssistant: 1,
          receiverEmail: 1,
          campaignId: 1,
          senderEmail: 1,
          emailConversation: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching draft conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of unresolved email conversations with pagination
   * @working : Lists unresolved email conversations with search and pagination functionality
   */
  async unresolvedConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const skip = (page - 1) * limit;
      if (!ObjectId.isValid(folderId)) {
        throw new BadRequestException('Invalid folder ID format');
      }

      const unresolvedFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!unresolvedFolder) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        addedBy: req.user._id.toHexString(),
      };

      // if (folderId) {
      //   query['emailConversation.folderId'] = folderId;
      // }

      if (searchString.trim()) {
        query['receiverEmail'] = {
          $regex: searchString,
          $options: 'i',
        };
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      const total = await this.campaignUnresolvedCollection.countDocuments(
        query,
      );
      const conversations = await this.campaignUnresolvedCollection
        .find({
          ...query,
          // 'emailConversation.isUnresolvedEmail': { $eq: true },
        })
        .project({
          _id: 1,
          knowledgebaseId: 1,
          standAloneAssistant: 1,
          receiverEmail: 1,
          campaignId: 1,
          senderEmail: 1,
          emailConversation: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching unresolved conversations: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @returns : Promise of lead generated email conversations with pagination
   * @working : Lists lead generated email conversations with search and pagination functionality
   */
  // async leadGeneratedConversationListing(
  //   searchString = '',
  //   page = 1,
  //   limit = 10,
  //   folderId: string,
  //   req: any,
  // ) {
  //   try {
  //     this.logger.log('Starting leadGeneratedConversationListing');
  //     this.logger.log(
  //       `Input params - searchString: ${searchString}, page: ${page}, limit: ${limit}, folderId: ${folderId}`,
  //     );

  //     page = Math.max(1, page);
  //     limit = Math.min(Math.max(1, limit), 100);
  //     const skip = (page - 1) * limit;

  //     this.logger.log(
  //       `Calculated pagination - page: ${page}, limit: ${limit}, skip: ${skip}`,
  //     );

  //     if (!ObjectId.isValid(folderId)) {
  //       this.logger.error(`Invalid folder ID format: ${folderId}`);
  //       throw new BadRequestException('Invalid folder ID format');
  //     }

  //     const leadGeneratedFolder = await this.commonFolderCollection.findOne({
  //       _id: new ObjectId(folderId),
  //     });

  //     this.logger.log(`Found folder: ${JSON.stringify(leadGeneratedFolder)}`);

  //     if (!leadGeneratedFolder) {
  //       this.logger.error(`Folder not found with id: ${folderId}`);
  //       throw new NotFoundException(
  //         `Folder with id ${folderId} not found in common folder`,
  //       );
  //     }

  //     const query: any = {
  //       addedBy: req.user._id.toHexString(),
  //       receiverEmail: { $ne: null },
  //     };

  //     if (searchString.trim()) {
  //       query['receiverEmail'] = {
  //         $regex: searchString,
  //         $options: 'i',
  //       };
  //     }

  //     this.logger.log(`Built query: ${JSON.stringify(query)}`);

  //     const total = await this.campaignLeadGeneratedCollection.countDocuments(
  //       query,
  //     );

  //     this.logger.log(`Total documents found: ${total}`);

  //     const conversations = await this.campaignLeadGeneratedCollection
  //       .find({
  //         ...query,
  //       })
  //       .project({
  //         _id: 1,
  //         receiverEmail: 1,
  //         campaignId: 1,
  //         senderEmail: 1,
  //         emailConversation: 1,
  //         knowledgebaseId: 1,
  //         standAloneAssistant: 1,
  //         createdAt: 1,
  //         updatedAt: 1,
  //       })
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(limit)
  //       .toArray();

  //     this.logger.log(`Retrieved ${conversations.length} conversations`);

  //     const response = {
  //       data: conversations,
  //       pagination: {
  //         currentPage: page,
  //         pageSize: limit,
  //         totalItems: total,
  //         totalPages: Math.ceil(total / limit),
  //       },
  //     };

  //     this.logger.log(
  //       'Successfully completed leadGeneratedConversationListing',
  //     );
  //     return response;
  //   } catch (error) {
  //     this.logger.error(
  //       `Error fetching lead generated conversations: ${error.message}`,
  //     );
  //     throw error;
  //   }
  // }

  async leadGeneratedConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      this.logger.log('Starting leadGeneratedConversationListing');

      this.logger.log(
        `Input params - searchString: ${searchString}, page: ${page}, limit: ${limit}, folderId: ${folderId}`,
      );

      page = Math.max(1, Number(page));
      limit = Math.min(Math.max(1, Number(limit)), 100);
      const skip = (page - 1) * limit;

      this.logger.log(
        `Calculated pagination - page: ${page}, limit: ${limit}, skip: ${skip}`,
      );

      if (!ObjectId.isValid(folderId)) {
        this.logger.error(`Invalid folder ID format: ${folderId}`);

        throw new BadRequestException('Invalid folder ID format');
      }

      const leadGeneratedFolder = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      this.logger.log(`Found folder: ${JSON.stringify(leadGeneratedFolder)}`);

      if (!leadGeneratedFolder) {
        this.logger.error(`Folder not found with id: ${folderId}`);

        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        addedBy: req.user._id.toHexString(),
        receiverEmail: { $ne: null },
      };

      // search filter
      if (searchString.trim()) {
        query['$or'] = [
          {
            receiverEmail: {
              $regex: searchString,
              $options: 'i',
            },
          },
          {
            senderEmail: {
              $regex: searchString,
              $options: 'i',
            },
          },
          {
            'emailConversation.emailTextContent': {
              $regex: searchString,
              $options: 'i',
            },
          },
        ];
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      this.logger.log(`Built query: ${JSON.stringify(query)}`);

      // TOTAL UNIQUE RECORD COUNT
      const totalData = await this.campaignLeadGeneratedCollection
        .aggregate([
          { $match: query },

          {
            $group: {
              _id: {
                campaignId: '$campaignId',
                receiverEmail: '$receiverEmail',
                senderEmail: '$senderEmail',
              },
            },
          },

          {
            $count: 'total',
          },
        ])
        .toArray();

      const total = totalData[0]?.total || 0;

      this.logger.log(`Total unique documents found: ${total}`);

      const conversations = await this.campaignLeadGeneratedCollection
        .aggregate([
          { $match: query },

          {
            $sort: {
              updatedAt: -1,
            },
          },

          // merge same campaign + sender + receiver
          {
            $group: {
              _id: {
                campaignId: '$campaignId',
                receiverEmail: '$receiverEmail',
                senderEmail: '$senderEmail',
              },

              // latest document
              data: {
                $first: '$$ROOT',
              },

              // merge all email conversations
              allConversations: {
                $push: '$emailConversation',
              },
            },
          },

          // merge & sort conversations
          {
            $addFields: {
              'data.emailConversation': {
                $sortArray: {
                  input: {
                    $reduce: {
                      input: '$allConversations',
                      initialValue: [],
                      in: {
                        $concatArrays: ['$$value', '$$this'],
                      },
                    },
                  },

                  // latest conversation first
                  sortBy: {
                    dateAndTime: -1,
                  },
                },
              },
            },
          },

          // restore full document
          {
            $replaceRoot: {
              newRoot: '$data',
            },
          },

          // latest updated record first
          {
            $sort: {
              updatedAt: -1,
            },
          },

          { $skip: skip },

          { $limit: limit },

          {
            $project: {
              _id: 1,
              receiverEmail: 1,
              campaignId: 1,
              senderEmail: 1,
              knowledgebaseId: 1,
              standAloneAssistant: 1,
              createdAt: 1,
              updatedAt: 1,
              emailConversation: 1,
            },
          },
        ])
        .toArray();

      this.logger.log(`Retrieved ${conversations.length} merged conversations`);

      const response = {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };

      this.logger.log(
        'Successfully completed leadGeneratedConversationListing',
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error fetching lead generated conversations: ${error.message}`,
      );

      throw error;
    }
  }

  //   async autoRepliesConversationListing(
  //   searchString = '',
  //   page = 1,
  //   limit = 10,
  //   folderId: string,
  //   req: any,
  // ) {
  //   try {
  //     page = Math.max(1, Number(page));
  //     limit = Math.min(Math.max(1, Number(limit)), 100);
  //     const skip = (page - 1) * limit;

  //     if (!ObjectId.isValid(folderId)) {
  //       throw new BadRequestException('Invalid folder ID format');
  //     }

  //     const autoReplies = await this.commonFolderCollection.findOne({
  //       _id: new ObjectId(folderId),
  //     });

  //     if (!autoReplies) {
  //       throw new NotFoundException(
  //         `Folder with id ${folderId} not found in common folder`,
  //       );
  //     }

  //     const query: any = {
  //       userId: req.user._id.toHexString(),

  //       // only those docs having auto reply
  //       emailConversation: {
  //         $elemMatch: {
  //           isAutoReply: true,
  //         },
  //       },
  //     };

  //     // SEARCH
  //     if (searchString.trim()) {
  //       query['$or'] = [
  //         {
  //           receiverEmail: {
  //             $regex: searchString,
  //             $options: 'i',
  //           },
  //         },
  //         {
  //           senderEmail: {
  //             $regex: searchString,
  //             $options: 'i',
  //           },
  //         },
  //         {
  //           'emailConversation.emailTextContent': {
  //             $regex: searchString,
  //             $options: 'i',
  //           },
  //         },
  //       ];
  //     }

  //     // TOTAL COUNT
  //     const totalData = await this.emailConversationCollection
  //       .aggregate([
  //         { $match: query },

  //         {
  //           $group: {
  //             _id: {
  //               campaignId: '$campaignId',
  //               receiverEmail: '$audienceEmailId',
  //               senderEmail: '$userEmailId',
  //             },
  //           },
  //         },

  //         {
  //           $count: 'total',
  //         },
  //       ])
  //       .toArray();

  //     const total = totalData[0]?.total || 0;

  //     // MAIN DATA
  //     const conversations = await this.emailConversationCollection
  //       .aggregate([
  //         { $match: query },

  //         { $sort: { updatedAt: -1 } },

  //         // GROUP SAME USER CONVERSATIONS
  //         {
  //           $group: {
  //             _id: {
  //               campaignId: '$campaignId',
  //               receiverEmail: '$audienceEmailId',
  //               senderEmail: '$userEmailId',
  //             },
  //             data: {
  //               $first: '$$ROOT',
  //             },

  //             // collect all emailConversation arrays
  //             allConversations: {
  //               $push: '$emailConversation',
  //             },
  //           },
  //         },

  //         // MERGE ALL CONVERSATIONS
  //         {
  //           $addFields: {
  //             mergedConversations: {
  //               $reduce: {
  //                 input: '$allConversations',
  //                 initialValue: [],
  //                 in: {
  //                   $concatArrays: ['$$value', '$$this'],
  //                 },
  //               },
  //             },
  //           },
  //         },
  //         // no filter on isAutoReply
  //         {
  //           $addFields: {
  //             'data.emailConversation': {
  //               $sortArray: {
  //                 input: '$mergedConversations',
  //                 sortBy: {
  //                   dateAndTime: -1,
  //                 },
  //               },
  //             },
  //           },
  //         },

  //         // RESTORE ORIGINAL DOCUMENT
  //         {
  //           $replaceRoot: {
  //             newRoot: '$data',
  //           },
  //         },

  //         // FINAL SORT
  //         {
  //           $sort: {
  //             updatedAt: -1,
  //           },
  //         },

  //         { $skip: skip },

  //         { $limit: limit },

  //         {
  //           $project: {
  //             _id: 1,
  //             receiverEmail: '$audienceEmailId',
  //             senderEmail: '$userEmailId',
  //             campaignId: 1,
  //             knowledgebaseId: 1,
  //             standAloneAssistant: 1,
  //             createdAt: 1,
  //             updatedAt: 1,
  //             emailConversation: 1,
  //           },
  //         },
  //       ])
  //       .toArray();

  //     console.log(
  //       'ALL EMAIL CONVERSATIONS =>',
  //       JSON.stringify(conversations, null, 2),
  //     );

  //     return {
  //       data: conversations,
  //       pagination: {
  //         currentPage: page,
  //         pageSize: limit,
  //         totalItems: total,
  //         totalPages: Math.ceil(total / limit),
  //       },
  //     };
  //   } catch (error) {
  //     this.logger.error(
  //       `Error fetching auto reply conversations: ${error.message}`,
  //     );

  //     throw error;
  //   }
  // }

  // async autoRepliesConversationListing(
  //     searchString = '',
  //     page = 1,
  //     limit = 10,
  //     folderId: string,
  //     req: any,
  //   ) {
  //     try {
  //       page = Math.max(1, page);
  //       limit = Math.min(Math.max(1, limit), 100);
  //       const skip = (page - 1) * limit;

  //       if (!ObjectId.isValid(folderId)) {
  //         throw new BadRequestException('Invalid folder ID format');
  //       }

  //       const autoReplies = await this.commonFolderCollection.findOne({
  //         _id: new ObjectId(folderId),
  //       });

  //       if (!autoReplies) {
  //         throw new NotFoundException(
  //           `Folder with id ${folderId} not found in common folder`,
  //         );
  //       }

  //       const query: any = {
  //         userId: req.user._id.toHexString(),
  //         emailConversation: {
  //           $elemMatch: {
  //             isAutoReply: true,
  //           },
  //         },
  //       };

  //         if (searchString.trim()) {
  //           query['$or'] = [
  //             {
  //               receiverEmail: {
  //                 $regex: searchString,
  //                 $options: 'i',
  //               },
  //             },
  //             {
  //               senderEmail: {
  //                 $regex: searchString,
  //                 $options: 'i',
  //               },
  //             },
  //             {
  //               'emailConversation.emailTextContent': {
  //                 $regex: searchString,
  //                 $options: 'i',
  //               },
  //             },
  //           ];
  //         }

  //       const totalData = await this.emailConversationCollection
  //       .aggregate([
  //         { $match: query },

  //         {
  //           $group: {
  //             _id: {
  //               campaignId: '$campaignId',
  //               receiverEmail: '$audienceEmailId',
  //               senderEmail: '$userEmailId',
  //             },
  //           },
  //         },

  //         {
  //           $count: 'total',
  //         },
  //       ])
  //       .toArray();

  //     const total = totalData[0]?.total || 0;

  //       const conversations = await this.emailConversationCollection
  //         .aggregate([
  //         { $match: query },
  //         { $sort: { updatedAt: -1 } },
  //         // group by campaign + receiver email
  //         {
  //           $group: {
  //             _id: {
  //               campaignId: '$campaignId',
  //               receiverEmail: '$audienceEmailId',
  //               senderEmail: '$userEmailId',
  //             },

  //             data: { $first: '$$ROOT' },
  //             // merge all conversations
  //             allConversations: {
  //               $push: '$emailConversation',
  //             },
  //           },
  //         },

  //         // merge all emailConversation arrays
  //         {
  //           $addFields: {
  //             'data.emailConversation': {
  //               $sortArray: {
  //                 input: {
  //                   $filter: {
  //                     input: {
  //                       $reduce: {
  //                         input: '$allConversations',
  //                         initialValue: [],
  //                         in: {
  //                           $concatArrays: ['$$value', '$$this'],
  //                         },
  //                       },
  //                     },
  //                     as: 'conv',
  //                     cond: {
  //                       $eq: ['$$conv.isAutoReply', true],
  //                     },
  //                   },
  //                 },

  //                 // latest conversation first
  //                 sortBy: {
  //                   dateAndTime: -1,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //         // restore original document
  //         {
  //           $replaceRoot: {
  //             newRoot: '$data',
  //           },
  //         },
  //         // sort again after grouping
  //         { $sort: { updatedAt: -1 } },
  //           { $skip: skip },
  //           { $limit: limit },
  //           {
  //             $project: {
  //               _id: 1,
  //               receiverEmail: '$audienceEmailId',
  //               campaignId: 1,
  //               knowledgebaseId: 1,
  //               standAloneAssistant: 1,
  //               senderEmail: '$userEmailId',
  //               createdAt: 1,
  //               updatedAt: 1,
  //               emailConversation: 1,
  //               // emailConversation: {
  //               //   $filter: {
  //               //     input: '$emailConversation',
  //               //     as: 'conv',
  //               //     cond: { $eq: ['$$conv.isAutoReply', true] },
  //               //   },
  //               // },
  //             },
  //           },
  //         ])
  //         .toArray();

  //       console.log('conversation', JSON.stringify(conversations));

  //       return {
  //         data: conversations,
  //         pagination: {
  //           currentPage: page,
  //           pageSize: limit,
  //           totalItems: total,
  //           totalPages: Math.ceil(total / limit),
  //         },
  //       };
  //     } catch (error) {
  //       this.logger.error(
  //         `Error fetching lead generated conversations: ${error.message}`,
  //       );
  //       throw error;
  //     }
  //   }

  async autoRepliesConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    filterOptions?: any,
  ) {
    try {
      page = Math.max(1, Number(page));
      limit = Math.min(Math.max(1, Number(limit)), 100);
      const skip = (page - 1) * limit;

      if (!ObjectId.isValid(folderId)) {
        throw new BadRequestException('Invalid folder ID format');
      }

      const autoReplies = await this.commonFolderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!autoReplies) {
        throw new NotFoundException(
          `Folder with id ${folderId} not found in common folder`,
        );
      }

      const query: any = {
        userId: req.user._id.toHexString(),

        // only those docs having auto reply
        emailConversation: {
          $elemMatch: {
            isAutoReply: true,
          },
        },
      };

      // SEARCH
      if (searchString.trim()) {
        query['$or'] = [
          {
            audienceEmailId: {
              $regex: searchString,
              $options: 'i',
            },
          },
          {
            userEmailId: {
              $regex: searchString,
              $options: 'i',
            },
          },
          {
            'emailConversation.emailTextContent': {
              $regex: searchString,
              $options: 'i',
            },
          },
        ];
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      // =========================
      // TOTAL COUNT
      // =========================
      const totalData = await this.emailConversationCollection
        .aggregate([
          { $match: query },

          {
            $group: {
              _id: {
                campaignId: '$campaignId',
                receiverEmail: '$audienceEmailId',
                senderEmail: '$userEmailId',
              },
            },
          },

          {
            $count: 'total',
          },
        ])
        .toArray();

      const total = totalData[0]?.total || 0;

      // =========================
      // MAIN DATA
      // =========================
      const conversations = await this.emailConversationCollection
        .aggregate([
          { $match: query },

          { $sort: { updatedAt: -1 } },

          // GROUP SAME USER CONVERSATIONS
          {
            $group: {
              _id: {
                campaignId: '$campaignId',
                receiverEmail: '$audienceEmailId',
                senderEmail: '$userEmailId',
              },

              data: {
                $first: '$$ROOT',
              },

              // collect all emailConversation arrays
              allConversations: {
                $push: '$emailConversation',
              },
            },
          },

          // MERGE ALL CONVERSATIONS
          {
            $addFields: {
              mergedConversations: {
                $reduce: {
                  input: '$allConversations',
                  initialValue: [],
                  in: {
                    $concatArrays: ['$$value', '$$this'],
                  },
                },
              },
            },
          },

          // IMPORTANT CHANGE:
          // SHOW ALL CONVERSATIONS
          // sender + receiver both
          // no filter on isAutoReply
          {
            $addFields: {
              'data.emailConversation': {
                $sortArray: {
                  input: '$mergedConversations',
                  sortBy: {
                    dateAndTime: -1,
                  },
                },
              },
            },
          },

          // RESTORE ORIGINAL DOCUMENT
          {
            $replaceRoot: {
              newRoot: '$data',
            },
          },

          // FINAL SORT
          {
            $sort: {
              updatedAt: -1,
            },
          },

          { $skip: skip },

          { $limit: limit },

          {
            $project: {
              _id: 1,
              receiverEmail: '$audienceEmailId',
              senderEmail: '$userEmailId',
              campaignId: 1,
              knowledgebaseId: 1,
              standAloneAssistant: 1,
              createdAt: 1,
              updatedAt: 1,

              // ALL CONVERSATIONS
              emailConversation: 1,
            },
          },
        ])
        .toArray();


      return {
        data: conversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching auto reply conversations: ${error.message}`,
      );

      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param req : any
   * @param folderType : string
   * @returns : Promise of email conversations with pagination based on folder type
   * @working : Lists email conversations with search and pagination functionality based on folder type
   */
  async getConversationsByFolderType(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    req: any,
    folderType: string,
    filterOptions?: any,
  ) {
    try {
      this.logger.log(`Getting conversations for folder type: ${folderType}`);
      this.logger.log(
        `Search string: ${searchString}, Page: ${page}, Limit: ${limit}`,
      );

      switch (folderType.toLowerCase()) {
        case 'email summary':
          this.logger.log('Fetching inbox conversations');
          return await this.emailConversationListing(
            searchString,
            page,
            limit,
            folderId,
            req,
            filterOptions,
          );
        case 'followup conversations':
          this.logger.log('Fetching followup conversations');
          return await this.followUpConversationListing(
            searchString,
            page,
            limit,
            folderId,
            req,
            filterOptions,
          );
        // case 'spam':
        //   this.logger.log('Fetching spam conversations');
        //   return await this.spamConversationListing(
        //     searchString,
        //     page,
        //     limit,
        //     folderId,
        //     req,
        //   );
        // case 'archived':
        //   this.logger.log('Fetching archive conversations');
        //   return await this.archiveConversationListing(
        //     searchString,
        //     page,
        //     limit,
        //     folderId,
        //     req,
        //   );
        // case 'trash':
        //   this.logger.log('Fetching trash conversations');
        //   return await this.trashConversationListing(
        //     searchString,
        //     page,
        //     limit,
        //     folderId,
        //     req,
        //   );
        case 'draft':
          this.logger.log('Fetching draft conversations');
          return await this.draftConversationListing(
            searchString,
            page,
            limit,
            folderId,
            req,
            filterOptions,
          );
        case 'unresolved':
          this.logger.log('Fetching unresolved conversations');
          return await this.unresolvedConversationListing(
            searchString,
            page,
            limit,
            folderId,
            req,
            filterOptions,
          );
        case 'leads generated':
          this.logger.log('Fetching lead generated conversations');
          return await this.leadGeneratedConversationListing(
            searchString,
            page,
            limit,
            folderId,
            req,
            filterOptions,
          );

        case 'auto replies':
          this.logger.log('Fetching autoreply conversations');
          return await this.autoRepliesConversationListing(
            searchString,
            page,
            limit,
            folderId,
            req,
            filterOptions,
          );

        default:
          this.logger.log(`Invalid folder type: ${folderType}`);
          throw new BadRequestException('Invalid folder type');
      }
    } catch (error) {
      this.logger.error(`Error fetching conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a notification for email assistance
   * @developer : Ankur
   * @param userId - ID of the user
   * @param audienceEmailId - Email ID of the audience
   * @param notificationType - Type of notification
   * @param notificationData - Additional notification data
   * @returns Created notification
   */
  async createEmailAssistanceNotification(
    userId: string,
    audienceEmailId: string,
    notificationType: string,
    notificationData: any,
  ): Promise<ObjectId> {
    try {
      this.logger.log('Creating notification');

      const notification = await this.notificationCollection.insertOne({
        userId,
        audienceEmailId,
        notificationType: notificationType as NotificationType,
        notificationData,
        isSeen: false,
        seenAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.log(
        `Notification created with ID: ${notification.insertedId}`,
      );
      return notification.insertedId;
    } catch (error) {
      this.logger.error(`Error creating notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates notifications as seen for a user
   * @developer : Ankur
   * @param userId - ID of the user
   * @param notificationId - ID of the notification to update
   * @returns Result of the update operation
   */
  async updateEmailAssistanceNotificationAsSeen(
    userId: string,
    notificationId: string,
  ): Promise<any> {
    try {
      this.logger.log('Updating notifications as seen');


      const id = new ObjectId(notificationId);

      if (!ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid notification ID format');
      }

      const result = await this.notificationCollection.findOneAndUpdate(
        {
          _id: new ObjectId(notificationId),
          userId: userId,
        },
        {
          $set: {
            isSeen: true,
            seenAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' },
      );

      this.logger.log(`Updated ${result.value} notifications as seen`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches email assistance notifications for a user
   * @developer : Ankur
   * @param userId - ID of the user
   * @param notificationType - Type of notification
   * @returns List of notifications
   */

  async getEmailAssistanceNotificationByUserId(
    userId: string,
    notificationType?: string,
    page = 1,
    limit = 10,
  ) {
    try {
      const filter: any = { userId };
      if (notificationType) {
        filter.notificationType = notificationType;
      }

      const skip = (page - 1) * limit;

      const [notifications, totalCount] = await Promise.all([
        this.notificationCollection
          .find(filter)
          .project({
            _id: 1,
            userId: 1,
            audienceEmailId: 1,
            notificationType: 1,
            seenAt: 1,
            isSeen: 1,
            createdAt: 1,
            updatedAt: 1,
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.notificationCollection.countDocuments(filter),
      ]);

      return {
        notifications,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * Deletes notifications for a user
   * @param userId - ID of the user
   * @param notificationId - ID of notification to delete
   * @returns Result of delete operation
   */
  async deleteEmailAssistanceNotification(
    userId: string,
    notificationId: string,
  ) {
    try {
      const result = await this.notificationCollection.deleteOne({
        _id: new ObjectId(notificationId),
        userId: userId,
      });

      if (result.deletedCount === 0) {
        throw new Error('Notification not found');
      }

      this.logger.log(
        `Deleted notification ${notificationId} for user ${userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * Lists all unsubscribed emails across campaign audiences and duplicates
   * @returns List of unsubscribed email addresses
   */
  async emailAssistanceListUnsubscribedEmails(req: any) {
    try {
      // Get unsubscribed emails from both collections
      const unsubscribedAudiences = await this.emailAudienceCollection
        .find({ addedBy: req.user._id.toHexString(), subscribeStatus: false })
        .project({ email: 1, _id: 0 })
        .toArray();

      const unsubscribedDuplicates = await this.emailDuplicateAudienceCollection
        .find({ addedBy: req.user._id.toHexString(), subscribeStatus: false })
        .project({ email: 1, _id: 0 })
        .toArray();

      // Combine and deduplicate emails
      const allEmails = [
        ...unsubscribedAudiences,
        ...unsubscribedDuplicates,
      ].map((doc) => doc.email);
      const uniqueEmails = [...new Set(allEmails)];

      return uniqueEmails;
    } catch (error) {
      this.logger.error(`Error fetching unsubscribed emails: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * Updates subscription status for an email across all instances
   * @param email - Email address to unsubscribe
   * @returns Result of the update operation
   */
  async emailAssistanceUnsubscribeEmail(email: string, req: any) {
    try {
      const updateTime = new Date();

      const audienceResult = await this.emailAudienceCollection.updateMany(
        { email: email, addedBy: req.user._id.toHexString() },
        {
          $set: {
            subscribeStatus: false,
            updatedAt: updateTime,
          },
        },
      );

      const duplicateResult =
        await this.emailDuplicateAudienceCollection.updateMany(
          { email: email, addedBy: req.user._id.toHexString() },
          {
            $set: {
              subscribeStatus: false,
              updatedAt: updateTime,
            },
          },
        );

      this.logger.log(
        `Updated subscription status for email ${email}: ` +
          `${audienceResult.modifiedCount} main records, ` +
          `${duplicateResult.modifiedCount} duplicate records`,
      );

      return {
        message: 'Email unsubscribed successfully',
        mainUpdates: audienceResult.modifiedCount,
        duplicateUpdates: duplicateResult.modifiedCount,
      };
    } catch (error) {
      this.logger.error(`Error unsubscribing email ${email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * Dashboard for email assistance
   * @returns Dashboard data
   */
  async emailAssistanceDashboard(req: any) {
    const userId = req.user._id.toHexString();

    // Run queries in parallel using Promise.all
    const [conversations, unresolvedCount, leadCount, folders] =
      await Promise.all([
        this.emailConversationCollection
          .find({ userId })
          .project({ emailConversation: 1 })
          .toArray(),

        this.campaignUnresolvedCollection.countDocuments({
          addedBy: userId,
        }),

        this.campaignLeadGeneratedCollection.countDocuments({
          addedBy: userId,
        }),

        this.getAllFolders(userId),
      ]);

    // Calculate totals in single pass
    let totalSent = 0;
    let totalReceived = 0;
    for (const conv of conversations) {
      const emailConv = conv.emailConversation;
      if (emailConv.some((e) => e.isSentEmail)) totalSent++;
      if (emailConv.some((e) => e.isReceivedEmail)) totalReceived++;
    }

    const responseRate = totalSent
      ? Number(((totalReceived / totalSent) * 100).toFixed(2))
      : 0;

    return {
      emailInteraction: {
        totalReceived,
        totalSent,
      },
      unresolvedEmails: unresolvedCount,
      responceRate: responseRate,
      totalLeadGenerated: leadCount,
      folders: folders,
    };
  }

  async deleteConversationByFolderType(
    ids: string[],
    folderType: string,
    userId: string,
  ) {
    try {
      let result;
      const objectIds = ids.map((id) => new ObjectId(id));
      const query = { _id: { $in: objectIds } };

      switch (folderType) {
        case 'email summary':
          result = await this.emailConversationCollection.deleteMany({
            ...query,
            userId: userId,
          });
          break;
        case 'leads generated':
          result = await this.campaignLeadGeneratedCollection.deleteMany({
            ...query,
            addedBy: userId,
          });
          break;
        case 'followup conversations':
          result = await this.followUpEmailConversationCollection.deleteMany({
            ...query,
            addedBy: userId,
          });
          break;
        case 'draft':
          result = await this.campaignDraftCollection.deleteMany({
            ...query,
            addedBy: userId,
          });
          break;
        case 'unresolved':
          result = await this.campaignUnresolvedCollection.deleteMany({
            ...query,
            addedBy: userId,
          });
          break;
        case 'auto replies':
          result = await this.emailConversationCollection.deleteMany({
            ...query,
            userId: userId,
          });
          break;
        default:
          this.logger.log(`Invalid folder type: ${folderType}`);
          throw new BadRequestException('Invalid folder type');
      }

      const deletedCount = result.deletedCount;
      if (deletedCount === 0) {
        throw new NotFoundException('No conversations found to delete');
      }

      return {
        message: `Successfully deleted ${deletedCount} conversation${
          deletedCount > 1 ? 's' : ''
        }`,
      };
    } catch (error) {
      this.logger.error(`Error deleting conversation(s): ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Ankur
   * @param searchString : string
   * @param page : number
   * @param limit : number
   * @param folderId : string
   * @param emailid: audience email id
   * @param req : any
   * @returns : Promise of manualFolderConversationListing email conversations with pagination
   * @working : Lists manual folder email conversations with search and pagination functionality
   */
  async manualFolderConversationListing(
    searchString = '',
    page = 1,
    limit = 10,
    folderId: string,
    emailId?: string,
    categories?: string,
    req?: any,
    filterOptions?: any,
  ) {
    try {
      if (!req || !req.user || !req.user._id) {
        throw new BadRequestException('Invalid request - user not found');
      }

      this.logger.log('Starting manual folder conversation listing');

      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);
      this.logger.log(`Pagination params - page: ${page}, limit: ${limit}`);

      const skip = (page - 1) * limit;
      if (!ObjectId.isValid(folderId)) {
        this.logger.error(`Invalid folder ID format: ${folderId}`);
        throw new BadRequestException('Invalid folder ID format');
      }

      this.logger.log(`Fetching manual folder with ID: ${folderId}`);
      const userManualFolder = await this.folderCollection.findOne({
        _id: new ObjectId(folderId),
      });

      if (!userManualFolder) {
        this.logger.error(`Folder not found with ID: ${folderId}`);
        throw new NotFoundException(
          `Folder with id ${folderId} not found in manual folder`,
        );
      }

      const query: any = {
        userId: req.user._id.toHexString(),
      };

      if (emailId) {
        query['audienceEmailId'] = emailId;
      }

      if (searchString.trim()) {
        this.logger.log(`Applying search filter: ${searchString}`);
        query['audienceEmailId'] = {
          $regex: searchString,
          $options: 'i',
        };
      }

      if (categories) {
        // Perform a text search for the given category string inside any emailTextContent of the emailConversation array
        query['emailConversation.emailTextContent'] = {
          $regex: categories,
          $options: 'i',
        };
      }

      await this.applyEmailAssistanceFilters(query, filterOptions);

      this.logger.log('Final query:', query);
      const total = await this.emailConversationCollection.countDocuments(
        query,
      );
      this.logger.log(`Total documents found: ${total}`);

      this.logger.log('Fetching conversations with pagination');
      const conversations = await this.emailConversationCollection
        .find({
          ...query,
        })
        .project({
          _id: 1,
          userEmailId: 1,
          campaignId: 1,
          audienceEmailId: 1,
          emailConversation: 1,
          Subject: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Rename fields after fetching
      const mappedConversations = conversations.map((conv) => ({
        ...conv,
        senderEmail: conv.userEmailId,
        receiverEmail: conv.audienceEmailId,
      }));


      this.logger.log(`Retrieved ${mappedConversations.length} conversations`);

      return {
        statusCode: HttpStatus.OK,
        message: 'Email conversations for user folder fetched successfully',
        data: mappedConversations,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching follow-up conversations: ${error.message}`,
      );
      throw error;
    }
  }

  async markEmailAsArchived(data: any) {
    const emailAssistanceSetting = data.emailAssistanceSetting;
    const archivedEmail = emailAssistanceSetting.ruleSetup.archiveManaged;


    if (archivedEmail.timebasedArchiveValue) {
      archivedEmail.timebasedArchiveValue.map(async (item: any) => {
        const fromDate = new Date(item.from).toISOString().split('T')[0];
        const toDate = new Date(item.to).toISOString().split('T')[0];
        await this.gmailServiceApis.archiveMessagesByDateAndEmail(
          data.receiverEmail,
          data.emailServerConfig,
          fromDate,
          toDate,
          archivedEmail.senderDetails,
        );
      });
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Email archived successfully',
      data: archivedEmail,
    };
  }

  /**
   * Delete email conversations from a manual folder
   * @param ids Array of conversation IDs to delete
   * @param userId User ID
   * @returns Delete operation result
   */
  async deleteEmailConvoFromFolder(ids: string[], userId: string) {
    try {
      const objectIds = ids.map((id) => new ObjectId(id));
      const result = await this.emailConversationCollection.deleteMany({
        _id: { $in: objectIds },
        userId: userId,
      });


      return {
        statusCode: HttpStatus.OK,
        message: 'Conversations deleted successfully',
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      this.logger.error(`Error deleting conversations: ${error.message}`);
      throw error;
    }
  }

  async fetchEmailAndReplyToEmails() {
    try {
      const limit = 10;
      let offset = 0;
      let hasMoreUsers = true;
      while (hasMoreUsers) {
        const allUsers = await this.userCollection
          // Find the active and active subscribed users
          .find({ isActive: 1 })
          .skip(offset)
          .limit(limit)
          .sort({ createdAt: -1, id: 1 })
          .toArray();
        if (allUsers.length === 0) {
          hasMoreUsers = false;
          break;
        }
        await Promise.allSettled(
          allUsers.map(async (user) => {
            const emailSetting =
              await this.emailAssistanceSettingCollection.findOne({
                userId: user._id.toHexString(),
              });
            // Default to manual reply ON for accounts that have never configured this
            // setting at all (no document, or no autoReply block yet) — an explicit
            // false from an existing setting is still respected and not overridden.
            const hasNeverConfiguredAutoReply =
              !emailSetting || emailSetting.autoReply === undefined;
            if (
              hasNeverConfiguredAutoReply ||
              emailSetting?.autoReply?.isAutoReply === true ||
              emailSetting?.autoReply?.manualReply === true
            ) {
              await this.handledAutoReplyByLLM(user._id.toHexString());
            }
          }),
        );
        offset += limit;
      }
      return;
    } catch (error) {
      Logger.log(error);
      throw error;
    }
  }

  async handledAutoReplyByLLM(userId: string) {
    try {
      const emailAssistanceSetting =
        await this.emailAssistanceSettingCollection.findOne({ userId });

      if (!emailAssistanceSetting) return;

      const req = { user: { _id: new ObjectId(userId) } };

      const emailConfigs = await this.smtpServerConfigCollection
        .find({ userId, isStandAloneAssistant: true })
        .toArray();

      for (const config of emailConfigs) {
        try {
          const knowledgebaseId = config?.knowledgebaseId;
          if (!knowledgebaseId) continue;
          // ================== ACCESS TOKEN ==================
          const emailToken =
            await this.campaignUserEmailTokenCollection.findOne({
              email: config.email,
            });

          const isSMTP = !!config?.host;

          let accessToken: string | null = null;

          // ================== IMAP CONFIG (SMTP) ==================
          let imapServerConfig: any;

          if (isSMTP) {
            imapServerConfig = {
              host: config?.imapHost,
              user: config.email,
              password: CryptoService.decryptPasskey(config.password),
              port: 993,
              secure: true,
              authTimeout: config.timeout,
              tlsOptions: { rejectUnauthorized: false },
              standAloneAssistant: true,
            };
          }

          const payload = {
            emailAssistanceSetting,
            token: accessToken, // null for SMTP
            email: config.email,
            date: new Date(),
            limit: 100,
            offset: 0,
          };

          // ================== FETCH EMAILS ==================
          let currentDayConversation: any[] = [];

          // ✅ SMTP → IMAP user/pass
          if (isSMTP) {
            currentDayConversation =
              await this.campaignService.getEmailsFromImapV2(
                payload,
                imapServerConfig,
              );
          }
          if (!currentDayConversation?.length) continue;

          // ================== GROUP EMAILS BY THREAD USING SUBJECT + FROM ==================
          const threadMap = new Map<string, any[]>();

          for (const mail of currentDayConversation) {
            const fromEmail = mail.from?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
            const cleanSubject = mail.subject?.replace(/^Re:\s*/i, '').trim();
            // Create thread key using subject and from email (to group replies in same thread)
            const threadKey = `${cleanSubject}_${fromEmail}`;

            if (!threadMap.has(threadKey)) {
              threadMap.set(threadKey, []);
            }
            threadMap.get(threadKey)!.push(mail);
          }

          // ================== PROCESS ONLY LATEST EMAIL PER THREAD ==================
          for (const [threadKey, threadEmails] of threadMap) {
            // Sort by date (newest first)
            const sortedEmails = threadEmails.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );

            // Get the latest email only
            const mail = sortedEmails[0];

            try {
              // ================== EXTRACT FROM EMAIL ==================
              const fromEmail = mail.from?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0];
              const subject = mail.subject.replace(/^Re:\s*/i, '').trim();

              const isEmailRelatedToCampaign =
                await this.emailConversationCollection.findOne({
                  subject: subject,
                  campaignId: { $exists: true, $ne: null },
                });

              if (isEmailRelatedToCampaign) {
                continue;
              }

              // ================== BASIC FILTERS ==================
              if (
                !fromEmail ||
                fromEmail === config.email ||
                fromEmail.includes('noreply') ||
                fromEmail.includes('no-reply') ||
                mail.subject?.includes('OTP')
              ) {
                continue;
              }

              // ================== CHECK IF ALREADY REPLIED TO THIS THREAD ==================
              // Find if we already have a conversation with this subject and from email
              const existingConversation =
                await this.emailConversationCollection.findOne({
                  userId,
                  knowledgebaseId,
                  userEmailId: config.email,
                  audienceEmailId: fromEmail,
                  subject: subject,
                });

              // If we already replied to this thread, skip
              if (existingConversation?.repliedAt) {
                continue;
              }

              // ================== CHECK FOR DUPLICATE EMAIL ==================
              if (existingConversation) {
                const emailContent = mail.htmlContent || mail.textContent || '';
                const isExistingEmail =
                  existingConversation.emailConversation.some(
                    (conversation) =>
                      conversation.emailTextContent === emailContent ||
                      conversation.emailTextContent === mail.textContent,
                  );
                if (isExistingEmail) {
                  continue;
                }
              }

              // ================== GET PREVIOUS CONVERSATION ==================
              const previousEmailConversation =
                await this.emailConversationCollection.findOne({
                  userId,
                  knowledgebaseId,
                  userEmailId: config.email,
                  audienceEmailId: fromEmail,
                  subject: { $ne: subject },
                });

              // ================== LLM + RULE ENGINE ==================
              const data = {
                ...payload,
                standAloneAssistant: true,
                senderEmail: config.email,
                receiverEmail: fromEmail,
                subject: mail.subject,
                emailContent: mail.htmlContent || mail.textContent || '',
                previousEmailConversation:
                  previousEmailConversation?.emailConversation || [],
                emailConversationId:
                  existingConversation?._id?.toHexString() ||
                  previousEmailConversation?._id?.toHexString(),
                emailResponseReplyDate: mail.date,
                emailAssistanceSetting,
                smtpServerConfig: {
                  email: config.email,
                  host: config.host,
                  password: CryptoService.decryptPasskey(config.password),
                  port: config.port,
                  secure: config.secure,
                  authTimeout: config.timeout,
                  tlsOptions: { rejectUnauthorized: false },
                },
                imapServerConfig,
                addedBy: userId,
                userId,
                knowledgebaseId,
                accessToken,
                campaignDetails: {
                  campaignId: null,
                  standAloneAssistant: true,
                  knowledgebaseId: knowledgebaseId,
                  senderEmail: config.email,
                  receiverEmail: fromEmail,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  addedBy: userId,
                },
              };

              const ruleResult =
                await this.campaignService.handleEmailContentDetectionAndRuleExecution(
                  data,
                  req,
                );

              // ================== RULE BLOCKS ==================
              if (
                ruleResult?.data?.keywordDetectionAndMarkEmailAsSpam?.data
                  ?.isSpam ||
                ruleResult?.data?.keywordDetectionAndMarkEmailAsSpam?.data
                  ?.isRestrictedToReply ||
                ruleResult?.data?.markEmailAsUnresolved?.data?.isUnresolved
              ) {
                continue;
              }

              // ================== AUTO REPLY ==================
              await this.campaignService.autoReplyToEmails(data, req);

              // ================== UPDATE COLLECTION WITH REPLIED AT ==================
              // Mark that we have replied to this thread
              await this.emailConversationCollection.updateOne(
                {
                  userId,
                  knowledgebaseId,
                  userEmailId: config.email,
                  audienceEmailId: fromEmail,
                  subject: subject,
                },
                {
                  $set: {
                    repliedAt: new Date(), // Add this field to track reply
                    updatedAt: new Date(),
                  },
                  $setOnInsert: {
                    campaignId: null,
                    standAloneAssistant: true,
                    emailConversation: [],
                    createdAt: new Date(),
                  },
                },
                { upsert: true },
              );

            } catch (error: any) {
              this.logger.error(
                `Error processing standalone email conversation: ${error.message}`,
              );
            }
          }
        } catch (configErr: any) {
          this.logger.error(`Config error (${config.email}):`, configErr.message);
        }
      }

      return {
        status: 200,
        message: 'Standalone Email Assistant executed successfully',
      };
    } catch (error: any) {
      this.logger.error('handledAutoReplyByLLM error:', error);
      return { status: 500, message: 'Internal server error' };
    }
  }

  /**
   * @developer : Adarsh Srivastav
   * @param userId : string
   * @returns : Promise of an array of Projects for Dropdown
   */
  async getDropdownProjects(userId: string) {
    try {
      this.logger.log(`Fetching dropdown projects for user: ${userId}`);
      const projects = await this.db
        .collection(KNOWLEDGEBASE_COLLECTION)
        .find({ owner: new ObjectId(userId) })
        .project({ _id: 1, name: 1 })
        .toArray();
      if (!projects.length) {
        return {
          statusCode: HttpStatus.OK,
          message: 'no projects found',
          data: [],
        };
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'projects fetched successfully',
        data: projects,
      };
    } catch (error) {
      this.logger.error(`Error fetching dropdown projects: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Adarsh Srivastav
   * @param userId : string
   * @param projectId : string
   * @returns : Promise of an array of Campaigns for Dropdown
   */
  async getDropdownCampaigns(userId: string, projectId: string) {
    try {
      this.logger.log(`Fetching dropdown campaigns for project: ${projectId}`);
      if (!ObjectId.isValid(projectId)) {
        throw new BadRequestException('Invalid project ID');
      }
      const campaigns = await this.db
        .collection(CAMPAIGNDATA_COLLECTION)
        .find({
          addedBy: userId,
          'campaignProject.projectId': projectId,
        })
        .project({ _id: 1, campaignName: 1 })
        .toArray();
      if (!campaigns.length) {
        return {
          statusCode: HttpStatus.OK,
          message: 'No campaigns found with this project',
          data: [],
        };
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'campaigns fetched successfully',
        data: campaigns,
      };
    } catch (error) {
      this.logger.error(`Error fetching dropdown campaigns: ${error.message}`);
      throw error;
    }
  }

  /**
   * @developer : Adarsh Srivastav
   * @param userId : string
   * @returns : Promise of an array of Assistant Emails for Dropdown
   */
  async getDropdownAssistantEmails(userId: string) {
    try {
      this.logger.log(`Fetching dropdown assistant emails for user: ${userId}`);

      const smtpEmails = await this.smtpServerConfigCollection
        .find({
          userId: userId,
          isStandAloneAssistant: true,
        })
        .project({
          _id: 1,
          email: 1,
        })
        .toArray();
      if (!smtpEmails.length) {
        return {
          statusCode: HttpStatus.OK,
          message: 'No stand alone emails found',
          data: [],
        };
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'emails fetched successfully',
        data: smtpEmails,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching dropdown assistant emails: ${error.message}`,
      );
      throw error;
    }
  }
}
