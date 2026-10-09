import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CreateUltimaReviewCampaignDto,
  UltimaReviewCampaignScrapeDTO,
} from './dto/create-ultima-review.dto';
import {
  ULTIMA_REVIEW_CAMPAIGN_SCHEMA,
  UltimaReviewCampaignSchema,
  UltimaReviewLeadType,
  UltimaReviewStatus,
} from './schema/ultima.review.campaign';
import { Collection, Db, ObjectId } from 'mongodb';
import { MONGODB } from '../common/mongo/mongo.module';
import {
  LeadsPlanName,
  ULTIMA_REVIEW_LEAD_SCHEMA,
  UltimaReviewLeadEmailSendStatus,
  UltimaReviewLeadStatus,
  UltimaReviewSignUpStatus,
  UltimaReviewsLeadSchema,
} from './schema/ultima.reviews.leads';
import { UltimaLeadsApiService } from './ultima.leads.api.service';
import { UserSparse } from '../user/user.schema';
import { ProjectService } from '../project/project.service';
import * as papaparse from 'papaparse';
import { ResponseUtil } from '../voicebot/utils/response.util';
import { TargetLeadsDto } from './dto/target.leads.dto';
import { DATA_SOURCE_FOR_TARGET_AUDIENCE } from '../voicebot/schema/voicebot.campaign.schema';
import { TargetLeadsDTO } from '../voicebot/dto/create-Voicebot-campaign';
import { validateLeads } from '../voicebot/utils/ValidatorLeads';

@Injectable()
export class UltimaReviewsService {
  private logger = new Logger(UltimaReviewsService.name);
  private readonly ultimaReviewCampaignSchema: Collection<UltimaReviewCampaignSchema>;
  private readonly ultimaReviewsLeadSchema: Collection<UltimaReviewsLeadSchema>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private readonly ultimaLeadsApiService: UltimaLeadsApiService,
    private readonly dataScrapperService: ProjectService,
  ) {
    this.ultimaReviewCampaignSchema =
      this.db.collection<UltimaReviewCampaignSchema>(
        ULTIMA_REVIEW_CAMPAIGN_SCHEMA,
      );
    this.ultimaReviewsLeadSchema = this.db.collection<UltimaReviewsLeadSchema>(
      ULTIMA_REVIEW_LEAD_SCHEMA,
    );
  }

  async CreateUltimaReviewCampaign(
    userId: string,
    CreateUltimaReviewCampaignDto: CreateUltimaReviewCampaignDto,
  ) {
    try {
      const { targetLeads, campaignName } = CreateUltimaReviewCampaignDto;

      // Check if the campaign name already exists
      const existingCampaign = await this.ultimaReviewCampaignSchema.findOne({
        userId,
        campaignName: {
          $regex: `^${campaignName}$`,
          $options: 'i',
        },
      });
      if (existingCampaign) {
        throw new HttpException(
          `Campaign ${campaignName} already exists`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if the target leads are empty
      if (targetLeads.length === 0) {
        throw new HttpException(
          'Target leads cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      delete CreateUltimaReviewCampaignDto.targetLeads;
      const result = await this.ultimaReviewCampaignSchema.insertOne({
        ...CreateUltimaReviewCampaignDto,
        userId,
        status: UltimaReviewStatus.Initiated,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const leads = targetLeads.map((lead) => ({
        email: lead.email,
        businessName: lead.businessName,
        ultimaReviewId: result.insertedId.toHexString(),
        userId,
        leadType: lead.leadType,
        plan_name: LeadsPlanName.Business,
        isVerified: lead.isVerified || false,
        signUpStatus: UltimaReviewSignUpStatus.DidNotSignUp,
        emailSendStatus: UltimaReviewLeadEmailSendStatus.NotSent,
        LeadStatus: UltimaReviewLeadStatus.Null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await this.ultimaReviewsLeadSchema.insertMany(leads);
      setTimeout(() => {
        this.startCreatingCustomer(result.insertedId.toHexString());
      }, 10000);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // async deleteAllLeads() {
  //   try {
  //     const leads = await this.ultimaReviewsLeadSchema.find().toArray();
  //     let deletedCount = 0;

  //     for (const lead of leads) {
  //       try {
  //         await this.ultimaLeadsApiService.deleteClient(lead.email);
  //         this.logger.log(
  //           `Successfully deleted lead with email: ${lead.email}`,
  //         );
  //         deletedCount++;
  //       } catch (error) {
  //         this.logger.error(
  //           `Failed to delete lead with email: ${lead.email}`,
  //           error,
  //         );
  //       }
  //       await this.ultimaReviewsLeadSchema.deleteOne({ _id: lead._id });
  //     }

  //     this.logger.log(`Total leads deleted: ${deletedCount}`);
  //     return { deletedCount, totalLeads: leads.length };
  //   } catch (error) {
  //     this.logger.error('Error while deleting all leads', error);
  //     throw error;
  //   }
  // }

  async getAllUltimaCampaign(
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;

      if (isNaN(limitNum) || limitNum <= 0) {
        throw new Error('Limit must be a positive integer');
      }
      const skip = (pageNum - 1) * limitNum;
      const searchFilter = {
        userId,
        ...(search && {
          $or: [{ campaignName: { $regex: search.trim(), $options: 'i' } }],
        }),
      };

      const ultimaReviewCampaigns = await this.ultimaReviewCampaignSchema
        .find(searchFilter, {
          projection: {
            campaignName: 1,
            targetAudience: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        })
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .toArray();

      const totalCount = await this.ultimaReviewCampaignSchema.countDocuments(
        searchFilter,
      );

      return {
        ultimaReviewCampaigns,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        totalCount,
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllUltimaLeads(
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
    ultimaReviewId?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;

      if (isNaN(limitNum) || limitNum <= 0) {
        throw new Error('Limit must be a positive integer');
      }
      const skip = (pageNum - 1) * limitNum;
      const searchFilter = {
        userId,
        ...(search && {
          $or: [
            { email: { $regex: search.trim(), $options: 'i' } },
            { businessName: { $regex: search.trim(), $options: 'i' } },
          ],
        }),
      };
      if (ultimaReviewId) {
        searchFilter['ultimaReviewId'] = ultimaReviewId;
      }
      const ultimaReviewLeadsCampaigns = await this.ultimaReviewsLeadSchema
        .aggregate([
          { $match: searchFilter },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          {
            $lookup: {
              from: ULTIMA_REVIEW_CAMPAIGN_SCHEMA,
              let: { reviewIdStr: '$ultimaReviewId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$_id', { $toObjectId: '$$reviewIdStr' }],
                    },
                  },
                },
                {
                  $project: { campaignName: 1 },
                },
              ],
              as: 'campaignData',
            },
          },
          {
            $addFields: {
              campaignName: { $arrayElemAt: ['$campaignData.campaignName', 0] },
            },
          },
          {
            $project: {
              campaignData: 0,
            },
          },
        ])
        .toArray();

      const totalCount = await this.ultimaReviewsLeadSchema.countDocuments(
        searchFilter,
      );

      return {
        ultimaReviewLeadsCampaigns,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        totalCount,
      };
    } catch (error) {
      throw error;
    }
  }

  async getManualLeads(userId: string, page = 1, limit = 10, search?: string) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;

      if (isNaN(limitNum) || limitNum <= 0) {
        throw new Error('Limit must be a positive integer');
      }
      const skip = (pageNum - 1) * limitNum;
      const searchFilter = {
        userId,
        ultimaReviewId: null,
        ...(search && {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { businessName: { $regex: search, $options: 'i' } },
          ],
        }),
      };
      const ultimaReviewLeadsCampaigns = await this.ultimaReviewsLeadSchema
        .find(searchFilter)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .toArray();

      const totalCount = await this.ultimaReviewsLeadSchema.countDocuments(
        searchFilter,
      );

      return {
        ultimaReviewLeadsCampaigns,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        totalCount,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateLeadStatus(
    userId: string,
    _email: string,
    newStatus: UltimaReviewLeadStatus,
  ) {
    try {
      const filter = {
        userId,
        email: _email.trim(),
        emailSendStatus: UltimaReviewLeadEmailSendStatus.Sent,
      };
      const lead = await this.ultimaReviewsLeadSchema.findOne(filter);

      if (!lead) {
        throw new Error('Lead not found');
      }

      const currentStatus = lead.LeadStatus;

      // Block redundant updates
      if (currentStatus === newStatus) {
        throw new Error(`Lead is already ${newStatus}`);
      }

      if (
        currentStatus === UltimaReviewLeadStatus.Active &&
        newStatus === UltimaReviewLeadStatus.Reactivate
      ) {
        throw new Error('Cannot reactivate an already active lead');
      }

      if (
        currentStatus === UltimaReviewLeadStatus.Suspended &&
        newStatus === UltimaReviewLeadStatus.Suspended
      ) {
        throw new Error('lead is already suspended');
      }

      if (
        currentStatus === UltimaReviewLeadStatus.Suspended &&
        newStatus === UltimaReviewLeadStatus.Active
      ) {
        throw new Error(
          'Cannot directly activate a suspended lead. Please reactivate instead.',
        );
      }

      switch (newStatus) {
        case UltimaReviewLeadStatus.Active:
          const result = await this.ultimaLeadsApiService.addClient({
            seat_name: lead.businessName,
            email: lead.email,
            plan_name: LeadsPlanName.Business,
            full_name:
              lead.email.split('@')[0].charAt(0).toUpperCase() +
              lead.email.split('@')[0].slice(1),
          });
          if (result && result?.seat_id) {
            await this.updateLeadEmailSendStatus(
              lead._id.toHexString(),
              result.seat_id,
              true,
            );
          } else {
            await this.updateLeadEmailSendStatus(
              lead._id.toHexString(),
              null,
              false,
            );
          }
          return;
        case UltimaReviewLeadStatus.Suspended:
          await this.ultimaLeadsApiService.pauseClient(lead.email);
          break;
        case UltimaReviewLeadStatus.Reactivate:
          newStatus = UltimaReviewLeadStatus.Active;
          await this.ultimaLeadsApiService.activateClient(lead.email);
          break;
        default:
          throw new Error('Invalid status');
      }

      delete filter.emailSendStatus;
      // Update the lead status in the database
      const result = await this.ultimaReviewsLeadSchema.updateMany(filter, {
        $set: {
          LeadStatus: newStatus,
          updatedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async createUltimaLeads(userId: string, body: TargetLeadsDto) {
    try {
      const { email, businessName } = body;
      const existingLead = await this.ultimaReviewsLeadSchema.findOne({
        userId,
        email,
        emailSendStatus: UltimaReviewLeadEmailSendStatus.Sent,
      });
      if (existingLead) {
        throw new HttpException(
          `Lead with email ${email} already exists`,
          HttpStatus.BAD_REQUEST,
        );
      }
      let result: any;
      const response = await this.ultimaLeadsApiService.addClient({
        email,
        seat_name: businessName,
        plan_name: LeadsPlanName.Business,
      });
      if (response && response?.seat_id) {
        result = await this.ultimaReviewsLeadSchema.insertOne({
          ultimaReviewId: null,
          userId,
          email,
          businessName,
          leadType: UltimaReviewLeadType.ManualAdded,
          LeadStatus: UltimaReviewLeadStatus.Active,
          signUpStatus: UltimaReviewSignUpStatus.SignedUp,
          emailSendStatus: UltimaReviewLeadEmailSendStatus.Sent,
          seat_id: response.seat_id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await this.updateLeadEmailSendStatus(
          result.insertedId.toHexString(),
          null,
          false,
        );
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  private async updateLeadEmailSendStatus(
    leadId: string,
    seat_id: string | null,
    status: boolean,
  ) {
    if (status) {
      return await this.ultimaReviewsLeadSchema.updateOne(
        { _id: new ObjectId(leadId) },
        {
          $set: {
            seat_id: seat_id,
            emailSendStatus: UltimaReviewLeadEmailSendStatus.Sent,
            signUpStatus: UltimaReviewSignUpStatus.SignedUp,
            LeadStatus: UltimaReviewLeadStatus.Active,
            updatedAt: new Date(),
          },
        },
      );
    } else {
      return await this.ultimaReviewsLeadSchema.updateOne(
        { _id: new ObjectId(leadId) },
        {
          $set: {
            emailSendStatus: UltimaReviewLeadEmailSendStatus.Failed,
            signUpStatus: UltimaReviewSignUpStatus.DidNotSignUp,
            updatedAt: new Date(),
          },
        },
      );
    }
  }
  // This function is called to start the process of creating customers
  async startCreatingCustomer(campaignId: string) {
    try {
      let count = 0;
      const filter = { _id: new ObjectId(campaignId) };
      const campaign = await this.ultimaReviewCampaignSchema.findOne(filter);
      await this.ultimaReviewCampaignSchema.updateOne(filter, {
        $set: {
          status: UltimaReviewStatus.Running,
          updatedAt: new Date(),
        },
      });

      const leads = await this.ultimaReviewsLeadSchema
        .find({
          userId: campaign.userId,
          ultimaReviewId: campaign._id.toHexString(),
        })
        .toArray();

      for (const lead of leads) {
        try {
          const seatData = {
            seat_name: lead.businessName,
            email: lead.email,
            plan_name: LeadsPlanName.Business,
            full_name:
              lead.email.split('@')[0].charAt(0).toUpperCase() +
              lead.email.split('@')[0].slice(1),
          };

          const result = await this.ultimaLeadsApiService.addClient(seatData);

          if (result?.seat_id) {
            await this.updateLeadEmailSendStatus(
              lead._id.toHexString(),
              result.seat_id,
              true,
            );
            count++;
            this.logger.log(
              `Lead with email ${lead.email} created successfully`,
            );
          } else {
            this.logger.error(`Failed to create lead with email ${lead.email}`);
            await this.updateLeadEmailSendStatus(
              lead._id.toHexString(),
              null,
              false,
            );
          }
        } catch (leadError) {
          const errorMessage =
            leadError?.message || leadError?.response?.message || '';
          if (
            leadError?.status === 409 ||
            errorMessage.includes('Duplicated Error') ||
            errorMessage.includes(
              'a user can have ONLY one seat with the same name',
            )
          ) {
            this.logger.warn(`Duplicate seat error for lead ${lead.email}`);
            const currentStatus = await this.ultimaReviewsLeadSchema.findOne({
              email: lead.email,
              emailSendStatus: UltimaReviewLeadEmailSendStatus.Sent,
            });
            await this.ultimaReviewsLeadSchema.updateOne(
              { _id: new ObjectId(lead._id) },
              {
                $set: {
                  emailSendStatus: UltimaReviewLeadEmailSendStatus.AlreadySent,
                  signUpStatus: UltimaReviewSignUpStatus.AlreadySignedUp,
                  LeadStatus: currentStatus.LeadStatus,
                  updatedAt: new Date(),
                },
              },
            );
          } else {
            this.logger.error(
              `Error processing lead ${lead.email}:`,
              leadError,
            );
            await this.updateLeadEmailSendStatus(
              lead._id.toHexString(),
              null,
              false,
            );
          }
        }
      }
      await this.updateUltimaReviewCampaignStatus(campaign._id.toHexString());
      this.logger.log(
        `Ultima reviews leads created successfully! Count: ${count}`,
      );
    } catch (error) {
      this.logger.error('Overall Error in startCreatingCustomer:', error);
      throw error;
    }
  }

  // This function is called to update the status of the campaign
  private async updateUltimaReviewCampaignStatus(campaignId: string) {
    try {
      const filter = { _id: new ObjectId(campaignId) };

      const [totalLeads, sentLeads, finalizedLeads] = await Promise.all([
        this.ultimaReviewsLeadSchema.countDocuments({
          ultimaReviewId: campaignId,
        }),
        this.ultimaReviewsLeadSchema.countDocuments({
          ultimaReviewId: campaignId,
          emailSendStatus: {
            $in: [
              UltimaReviewLeadEmailSendStatus.Sent,
              UltimaReviewLeadEmailSendStatus.AlreadySent,
            ],
          },
        }),
        this.ultimaReviewsLeadSchema.countDocuments({
          ultimaReviewId: campaignId,
          emailSendStatus: {
            $in: [
              UltimaReviewLeadEmailSendStatus.Sent,
              UltimaReviewLeadEmailSendStatus.Failed,
              UltimaReviewLeadEmailSendStatus.AlreadySent,
            ],
          },
        }),
      ]);

      if (totalLeads > 0 && finalizedLeads === totalLeads) {
        let status = UltimaReviewStatus.Completed;

        if (sentLeads === 0) {
          status = UltimaReviewStatus.Failed;
        }

        await this.ultimaReviewCampaignSchema.updateOne(filter, {
          $set: {
            status,
            updatedAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error('Error updating campaign status:', error);
    }
  }

  async dataScrappingFromGMB(
    user: UserSparse,
    data: UltimaReviewCampaignScrapeDTO,
  ) {
    try {
      const ScrapedData = await this.dataScrapperService.dataScrapping(
        user,
        data,
        null,
        null,
        data.userToken,
      );
      const validateResult = new Map<
        string,
        { email: string; businessName: string }
      >();
      if (ScrapedData?.data?.length > 0) {
        for (const item of ScrapedData.data) {
          const email = item?.email?.trim().toLowerCase();
          const businessName = item?.websiteName?.trim();
          if (!email || !businessName || validateResult.has(email)) continue;
          validateResult.set(email, { email, businessName });
        }
      }

      if (validateResult.size === 0) {
        throw new HttpException(
          'No valid leads found during GMB data scrapping',
          HttpStatus.NOT_FOUND,
        );
      }

      return Array.from(validateResult.values());
    } catch (error) {
      throw error;
    }
  }

  async parseUltimaLeads(file: Express.Multer.File) {
    try {
      const MAX_FILE_SIZE = 10 * 1024 * 1024;

      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File size exceeds the 10 MB limit');
      }

      const fileContent = file.buffer.toString('utf-8');

      const parsedData = papaparse.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsedData.errors.length > 0) {
        return ResponseUtil.error(
          'Invalid CSV format, Please send the Csv format data',
          HttpStatus.BAD_REQUEST,
        );
      }
      const REQUIRED_HEADERS = ['Email', 'BusinessName'];
      const actualHeaders = Object.values(parsedData.meta.fields || {});
      const missingHeaders = REQUIRED_HEADERS.filter(
        (field) => !actualHeaders.includes(field),
      );

      if (missingHeaders.length > 0) {
        return ResponseUtil.error(
          `Missing required fields: ${missingHeaders.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (parsedData.data.length === 0) {
        return ResponseUtil.error('No data found in the CSV file', 400);
      }
      const validationResult = validateLeads(parsedData.data);
      return validationResult;
    } catch (error) {
      throw error;
    }
  }

  async mergeLeadsFromMultipleSources(targetLeads: TargetLeadsDTO) {
    try {
      const { csvUploadLeads, linkedinLeads, facebookLeads, gmbLeads } =
        targetLeads;

      const hasLeads =
        (csvUploadLeads && csvUploadLeads.length > 0) ||
        (linkedinLeads && linkedinLeads.length > 0) ||
        (facebookLeads && facebookLeads.length > 0) ||
        (gmbLeads && gmbLeads.length > 0);

      if (!hasLeads) {
        throw new BadRequestException(
          'No leads found. Please provide at least one source of leads (CSV, LinkedIn, Facebook, or GMB).',
        );
      }

      // Add lead type to each lead source
      const allLeads = [
        ...(csvUploadLeads || []).map((lead) => ({
          ...lead,
          leadType: UltimaReviewLeadType.ManualAdded,
        })),
        ...(linkedinLeads || []).map((lead) => ({
          ...lead,
          leadType: UltimaReviewLeadType.Linkedin,
        })),
        ...(facebookLeads || []).map((lead) => ({
          ...lead,
          leadType: UltimaReviewLeadType.FaceBook,
        })),
        ...(gmbLeads || []).map((lead) => ({
          ...lead,
          leadType: UltimaReviewLeadType.Scraped,
        })),
      ];

      const seenEmails = new Set<string>();
      const seenBusinessNames = new Set<string>();

      let validEmailCount = 0;
      let invalidEmailCount = 0;
      let duplicateEmailCount = 0;

      let validBusinessNameCount = 0;
      let invalidBusinessNameCount = 0;
      let duplicateBusinessCount = 0;

      const allRows = allLeads.map((lead, index) => {
        const email = (lead.email || '').trim().toLowerCase();
        const rawLead = lead as any;
        const rawBusinessName = (
          rawLead.businessName ||
          rawLead.companyName ||
          rawLead.websiteName ||
          rawLead.name ||
          rawLead.BusinessName ||
          rawLead.CompanyName ||
          rawLead.WebsiteName ||
          ''
        )
          .toString()
          .trim();
        const businessName = rawBusinessName.toLowerCase();

        const isEmailInvalid = email === '';
        const isEmailDuplicate = !isEmailInvalid && seenEmails.has(email);

        if (isEmailInvalid) {
          invalidEmailCount++;
        } else if (isEmailDuplicate) {
          duplicateEmailCount++;
        } else {
          validEmailCount++;
          seenEmails.add(email);
        }

        const isBusinessNameInvalid = businessName === '';
        const isBusinessDuplicate =
          !isBusinessNameInvalid && seenBusinessNames.has(businessName);

        if (isBusinessNameInvalid) {
          invalidBusinessNameCount++;
        } else if (isBusinessDuplicate) {
          duplicateBusinessCount++;
        } else {
          validBusinessNameCount++;
          seenBusinessNames.add(businessName);
        }

        return {
          ...lead,
          businessName: rawBusinessName,
          rowNumber: index + 2,
          leadType: lead.leadType,
          isPhoneInvalid: false,
          isEmailInvalid,
          isEmailDuplicate,
          isBusinessNameInvalid,
          isBusinessDuplicate,
        };
      });

      const validRows = allRows.filter(
        (lead) =>
          !lead.isEmailInvalid &&
          !lead.isEmailDuplicate &&
          !lead.isBusinessNameInvalid &&
          !lead.isBusinessDuplicate,
      );

      return {
        validEmailCount,
        invalidEmailCount,
        duplicateEmailCount,
        validBusinessNameCount,
        invalidBusinessNameCount,
        duplicateBusinessCount,
        allRows,
        validRows,
      };
    } catch (error) {
      throw error;
    }
  }
}
