import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { MONGODB } from '../common/mongo/mongo.module';
import { Collection, Db, ObjectId } from 'mongodb';
import * as ExcelJS from 'exceljs';
import { User, USER_COLLECTION } from '../user/user.schema';
import {
  ChatSession,
  Lead,
  LEADS_COLLECTION,
  CHAT_SESSION_COLLECTION,
  IsLeadType,
} from '../knowledgebase/knowledgebase.schema';
import {
  Campaign,
  CAMPAIGNDATA_COLLECTION,
} from '../campaign/schema/campaign.schema';
import {
  TARGET_AUDIENCES_SCHEMA,
  TargetAudienceSchema,
  VOICE_BOT_CAMPAIGN_SCHEMA,
  VoiceBotCampaignSchema,
} from '../voicebot/schema/voicebot.campaign.schema';
import {
  TWILIO_PHONE_NUMBER_COLLECTION,
  TwilioPhoneNumber,
} from '../voicebot/schema/phonenumber.schema';
import {
  CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
  CampaignEmailWarmupCount,
} from '../campaign/schema/campaignEmailWarmupCount.schema';
import {
  CampaignAudience,
  CAMPAIGNAUDIENCE_COLLECTION,
} from '../campaign/schema/campaignAudience.schema';
import { EMAIL_STATUS } from '../campaign/enum/enum';
import {
  GOOGLE_CALENDER_MEETING,
  GoogleCalendarMeeting,
  meetingType,
} from '../knowledgebase/google-calender-meeting.schema';
import {
  CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
  CampaignEmailConversation,
} from '../campaign/schema/campaignEmailConversation.schema';
import {
  CampaignRecordingsSchema,
  CAMPAIGN_RECORDINGS_SCHEMA,
} from '../voicebot/schema/campaign.recordings.schema';
import {
  CAMPAIGN_DUPLICATEAUDIENCE_COLLECTION,
  CampaignDuplicateAudience,
} from '../campaign/schema/campaignDuplicateAudience.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger('DashboardService');

  private readonly userCollection: Collection<User>;
  private readonly campaignCollection: Collection<Campaign>;
  private readonly leadCollection: Collection<Lead>;
  private readonly voicebotCampaignCollection: Collection<VoiceBotCampaignSchema>;
  private readonly twilioPhoneNumberCollection: Collection<TwilioPhoneNumber>;
  private readonly emailWarmUpCountCollection: Collection<CampaignEmailWarmupCount>;
  private readonly campaignAudienceCollection: Collection<CampaignAudience>;
  private readonly campaignDuplicateAudienceCollections: Collection<CampaignDuplicateAudience>;
  private readonly voicebotAudienceCollection: Collection<TargetAudienceSchema>;
  private readonly meetingBookingCollection: Collection<GoogleCalendarMeeting>;
  private readonly emailConversationCollection: Collection<CampaignEmailConversation>;
  private readonly chatSessionCollection: Collection<ChatSession>;
  private readonly campaignRecordingCollection: Collection<CampaignRecordingsSchema>;

  constructor(@Inject(MONGODB) private db: Db) {
    this.userCollection = this.db.collection(USER_COLLECTION);
    this.campaignCollection = this.db.collection(CAMPAIGNDATA_COLLECTION);
    this.leadCollection = this.db.collection(LEADS_COLLECTION);
    this.voicebotCampaignCollection = this.db.collection(
      VOICE_BOT_CAMPAIGN_SCHEMA,
    );
    this.twilioPhoneNumberCollection = this.db.collection(
      TWILIO_PHONE_NUMBER_COLLECTION,
    );
    this.emailWarmUpCountCollection = this.db.collection(
      CAMPAIGN_EMAIL_WARMUP_COUNT_COLLECTION,
    );
    this.voicebotAudienceCollection = this.db.collection(
      TARGET_AUDIENCES_SCHEMA,
    );
    this.campaignAudienceCollection = this.db.collection(
      CAMPAIGNAUDIENCE_COLLECTION,
    );
    this.meetingBookingCollection = this.db.collection(GOOGLE_CALENDER_MEETING);
    this.emailConversationCollection = this.db.collection(
      CAMPAIGN_EMAIL_CONVERSATION_COLLECTION,
    );
    this.chatSessionCollection = this.db.collection(CHAT_SESSION_COLLECTION);
    this.campaignRecordingCollection = this.db.collection(
      CAMPAIGN_RECORDINGS_SCHEMA,
    );
    this.campaignDuplicateAudienceCollections = this.db.collection(
      CAMPAIGN_DUPLICATEAUDIENCE_COLLECTION,
    );
  }

  /**
   * V2 - Optimized version of getDashboardData with improved performance.
   * @param req            - Request object containing user information
   * @param year           - Optional year filter (1-based). HTTP delivers as string; controller converts.
   * @param month          - Optional month filter (1-12). If provided without year, current year is used.
   * @param leadType       - Optional lead type filter ('chatBot', 'mailBot', 'voiceBot', 'emailOutreach',
   *                         'emailAssistant', 'zapierCrm', or 'all')
   * @param knowledgebaseId - Optional project (chatbot) filter
   * @returns Dashboard statistics and metrics
   */
  async getDashboardDataV2(
    req: any,
    year?: number,
    month?: number,
    leadType?: string,
    knowledgebaseId?: string,
  ) {
    try {
      Logger.log('Starting getDashboardDataV2 processing');
      const userId = req.user._id.toHexString();
      Logger.log(`Processing dashboard data for user: ${userId}`);

      // ── Parse year/month (HTTP query params arrive as strings; controller
      //    should cast, but we guard here too) ────────────────────────────────
      const parsedMonth = month ? Number(month) : null;
      // If only month is provided (no year) → default to current year
      const parsedYear = year
        ? Number(year)
        : parsedMonth
        ? new Date().getFullYear()
        : null;

      // ── Date filters ──────────────────────────────────────────────────────
      //  dateFilter         → { updatedAt }  for leads / campaign audience
      //  createdAtDateFilter → { createdAt } for chat sessions / meetings / recordings
      const dateFilter: Record<string, any> = {};
      const createdAtDateFilter: Record<string, any> = {};

      if (parsedYear) {
        const startDate = new Date(
          parsedYear,
          parsedMonth ? parsedMonth - 1 : 0,
          1,
        );
        const endDate = parsedMonth
          ? new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999)
          : new Date(parsedYear, 11, 31, 23, 59, 59, 999);

        dateFilter['updatedAt'] = { $gte: startDate, $lte: endDate };
        createdAtDateFilter['createdAt'] = { $gte: startDate, $lte: endDate };
        Logger.log(`Applied date filter: ${startDate} to ${endDate}`);
      }

      // ── AI Analysis comparison window ─────────────────────────────────────
      const now = new Date();
      let aiCurrentStart: Date;
      let aiCurrentEnd: Date;
      let aiPreviousStart: Date;
      let aiPreviousEnd: Date;

      if (parsedYear && parsedMonth) {
        // Month selected → compare vs previous month
        aiCurrentStart = new Date(parsedYear, parsedMonth - 1, 1);
        aiCurrentEnd = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);
        const prevY = parsedMonth === 1 ? parsedYear - 1 : parsedYear;
        const prevM = parsedMonth === 1 ? 12 : parsedMonth - 1;
        aiPreviousStart = new Date(prevY, prevM - 1, 1);
        aiPreviousEnd = new Date(prevY, prevM, 0, 23, 59, 59, 999);
      } else if (parsedYear) {
        // Year selected → compare vs previous year
        aiCurrentStart = new Date(parsedYear, 0, 1);
        aiCurrentEnd = new Date(parsedYear, 11, 31, 23, 59, 59, 999);
        aiPreviousStart = new Date(parsedYear - 1, 0, 1);
        aiPreviousEnd = new Date(parsedYear - 1, 11, 31, 23, 59, 59, 999);
      } else {
        // Default: last 30 days vs previous 30 days
        aiCurrentEnd = new Date(now);
        aiCurrentStart = new Date(now);
        aiCurrentStart.setDate(aiCurrentStart.getDate() - 30);
        aiPreviousEnd = new Date(aiCurrentStart);
        aiPreviousStart = new Date(aiCurrentStart);
        aiPreviousStart.setDate(aiPreviousStart.getDate() - 30);
      }

      // ── Lead-type filter (for leads collection) ────────────────────────────
      let leadTypeQuery: Record<string, any> = {};
      if (leadType && leadType !== 'all') {
        if (leadType === 'emailOutreach') {
          leadTypeQuery = {
            IsLeadType: IsLeadType.mailBot,
            standAloneAssistant: { $ne: true },
          };
        } else if (leadType === 'emailAssistant') {
          leadTypeQuery = {
            IsLeadType: IsLeadType.mailBot,
            standAloneAssistant: true,
          };
        } else {
          leadTypeQuery = { IsLeadType: leadType };
        }
        Logger.log(`Applied lead type filter: ${leadType}`);
      }

      // ── Project (knowledgebase) filter ─────────────────────────────────────
      const kbIdFilter: Record<string, any> =
        knowledgebaseId &&
        knowledgebaseId.trim() !== '' &&
        knowledgebaseId !== 'all'
          ? { knowledgebaseId: new ObjectId(knowledgebaseId) }
          : {};

      let campaignProjectFilter: Record<string, any> = {};
      let emailCampaignIdFilter: Record<string, any> = {};
      let voiceCampaignIdFilter: Record<string, any> = {};
      let allCampaignIdFilter: Record<string, any> = {};

      if (
        knowledgebaseId &&
        knowledgebaseId.trim() !== '' &&
        knowledgebaseId !== 'all'
      ) {
        campaignProjectFilter = {
          'campaignProject.projectId': knowledgebaseId,
        };

        const [emailCampaigns, voiceCampaigns] = await Promise.all([
          this.campaignCollection
            .find(
              { userId, ...campaignProjectFilter },
              { projection: { _id: 1 } },
            )
            .toArray(),
          this.voicebotCampaignCollection
            .find(
              { userId, ...campaignProjectFilter },
              { projection: { _id: 1 } },
            )
            .toArray(),
        ]);

        const emailCampaignIds = emailCampaigns.map((c) => c._id.toHexString());
        const voiceCampaignIds = voiceCampaigns.map((c) => c._id.toHexString());

        emailCampaignIdFilter = { campaignId: { $in: emailCampaignIds } };
        voiceCampaignIdFilter = { campaignId: { $in: voiceCampaignIds } };
        allCampaignIdFilter = {
          campaignId: { $in: [...emailCampaignIds, ...voiceCampaignIds] },
        };
      }

      // typeFilter: for campaign-level lead counts (excludes chatBot)
      Logger.log('Starting parallel queries for dashboard data');
      const typeFilter: Record<string, any> =
        leadType === 'all'
          ? { IsLeadType: { $ne: 'chatBot' } }
          : leadType === 'chatBot'
          ? { _id: { $exists: false } } // always returns 0
          : leadTypeQuery;

      // ── Parallel core queries ──────────────────────────────────────────────
      const [
        totalLeadsCount,
        totalCampaignLeadsCount,
        leadsByTypeData,
        emailCampaignsData,
        emailCampaignsDuplicateData,
        voiceCampaignsData,
        totalEmailCampaignsData,
        totalDuplicateEmailCampaignsData,
        totalVoiceCampaignsData,
        meetingBookingData,
        campaignStatusData,
        voiceBotCampaignStatusData,
        campaignSenderNewEmailData,
        campaignSenderDuplicateEmailData,
        campaignSenderPhoneData,
        totalVoiceBotLeadsCount,
        totalEmailBotLeadsCount,
      ] = await Promise.all([
        // 1. Total leads count (filtered by leadType + project)
        this.leadCollection
          .countDocuments({
            userId,
            ...dateFilter,
            ...leadTypeQuery,
            ...kbIdFilter,
          })
          .catch((error) => {
            Logger.error(`Error counting total leads: ${error.message}`);
            throw error;
          }),

        // 2. Campaign-level lead count (excludes chatBot leads)
        this.leadCollection
          .countDocuments({
            userId,
            ...dateFilter,
            ...typeFilter,
            ...kbIdFilter,
          })
          .catch((error) => {
            Logger.error(
              `Error counting total campaign leads: ${error.message}`,
            );
            throw error;
          }),

        // 3. Leads by type aggregation
        this.leadCollection
          .aggregate([
            {
              $match: {
                userId,
                ...dateFilter,
                ...leadTypeQuery,
                ...kbIdFilter,
              },
            },
            {
              $group: {
                _id: {
                  leadType: '$IsLeadType',
                  standAloneAssistant: '$standAloneAssistant',
                },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                leadType: '$_id.leadType',
                standAloneAssistant: '$_id.standAloneAssistant',
                count: 1,
                _id: 0,
              },
            },
          ])
          .toArray()
          .catch((error) => {
            Logger.error(`Error aggregating leads by type: ${error.message}`);
            throw error;
          }),

        // 4. Email audience with SENT status (primary collection)
        this.campaignAudienceCollection
          .countDocuments({
            addedBy: userId,
            emailStatus: EMAIL_STATUS.SENT,
            ...dateFilter,
            ...emailCampaignIdFilter,
          })
          .catch((error) => {
            Logger.error(`Error counting email campaigns: ${error.message}`);
            throw error;
          }),

        // 5. Email audience with SENT status (duplicate collection)
        this.campaignDuplicateAudienceCollections
          .countDocuments({
            addedBy: userId,
            emailStatus: EMAIL_STATUS.SENT,
            ...dateFilter,
            ...emailCampaignIdFilter,
          })
          .catch((error) => {
            Logger.error(
              `Error counting duplicate email campaigns: ${error.message}`,
            );
            throw error;
          }),

        // 6. Voice audience: completed calls
        this.voicebotAudienceCollection
          .countDocuments({
            userId,
            callCompleted: true,
            ...dateFilter,
            ...voiceCampaignIdFilter,
          })
          .catch((error) => {
            Logger.error(`Error counting voice campaigns: ${error.message}`);
            throw error;
          }),

        // 7. Total email audience — primary collection (all statuses)
        this.campaignAudienceCollection
          .countDocuments({
            addedBy: userId,
            ...dateFilter,
            ...emailCampaignIdFilter,
          })
          .catch((error) => {
            Logger.error(
              `Error counting total email campaigns: ${error.message}`,
            );
            throw error;
          }),

        // 8. Total email audience — duplicate collection (all statuses)
        //    Needed so the denominator in campaignSent covers both audience pools.
        this.campaignDuplicateAudienceCollections
          .countDocuments({
            addedBy: userId,
            ...dateFilter,
            ...emailCampaignIdFilter,
          })
          .catch((error) => {
            Logger.error(
              `Error counting total duplicate email campaigns: ${error.message}`,
            );
            throw error;
          }),

        // 9. Total voice audience (ALL entries, regardless of completion)
        //    Previously this also filtered callCompleted:true (same as #6),
        //    making campaignSent always show "0 / 0" for voiceBot.
        this.voicebotAudienceCollection
          .countDocuments({
            userId,
            ...dateFilter,
            ...voiceCampaignIdFilter,
          })
          .catch((error) => {
            Logger.error(
              `Error counting total voice audience: ${error.message}`,
            );
            throw error;
          }),

        // 9. Unique meeting bookings (host × participant pairs)
        this.meetingBookingCollection
          .aggregate([
            {
              $match: {
                userId,
                ...(leadType && leadType !== 'all'
                  ? {
                      meetingType:
                        leadType === 'emailOutreach' ||
                        leadType === 'emailAssistant' ||
                        leadType === 'mailBot'
                          ? 'emailBot'
                          : leadType,
                    }
                  : {}),
                ...createdAtDateFilter,
                ...allCampaignIdFilter,
              },
            },
            {
              $project: {
                hostParticipantPair: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$attendees',
                        as: 'participant',
                        cond: { $eq: ['$$participant.role', 'Participant'] },
                      },
                    },
                    as: 'participant',
                    in: {
                      host: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$attendees',
                              as: 'host',
                              cond: { $eq: ['$$host.role', 'Host'] },
                            },
                          },
                          0,
                        ],
                      },
                      participant: '$$participant',
                    },
                  },
                },
              },
            },
            { $unwind: '$hostParticipantPair' },
            {
              $group: {
                _id: {
                  hostEmail: '$hostParticipantPair.host.email',
                  participantEmail: '$hostParticipantPair.participant.email',
                },
              },
            },
            { $count: 'uniqueMeetingPairs' },
          ])
          .toArray()
          .catch((error) => {
            Logger.error(
              `Error aggregating meeting bookings: ${error.message}`,
            );
            throw error;
          }),

        // 10. Email campaign status counts
        this.campaignCollection
          .aggregate([
            {
              $match: {
                addedBy: userId,
                ...dateFilter,
                ...campaignProjectFilter,
              },
            },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { status: '$_id', count: 1, _id: 0 } },
          ])
          .toArray()
          .catch((error) => {
            Logger.error(
              `Error aggregating email campaign status: ${error.message}`,
            );
            throw error;
          }),

        // 11. Voice bot campaign status counts
        this.voicebotCampaignCollection
          .aggregate([
            { $match: { userId, ...dateFilter, ...campaignProjectFilter } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $project: { status: '$_id', count: 1, _id: 0 } },
          ])
          .toArray()
          .catch((error) => {
            Logger.error(
              `Error aggregating voice bot campaign status: ${error.message}`,
            );
            throw error;
          }),

        // 12. Campaign sender email list (primary audience)
        this.campaignAudienceCollection
          .aggregate([
            {
              $match: {
                addedBy: userId,
                ...dateFilter,
                ...emailCampaignIdFilter,
              },
            },
            {
              $group: {
                _id: '$senderEmailId',
                totalCampaignsAudience: { $sum: 1 },
              },
            },
            { $project: { email: '$_id', totalCampaignsAudience: 1, _id: 0 } },
            { $match: { email: { $ne: null } } },
          ])
          .toArray()
          .catch((error) => {
            Logger.error(
              `Error aggregating campaign sender emails: ${error.message}`,
            );
            throw error;
          }),

        // 13. Campaign sender email list (duplicate audience)
        this.campaignDuplicateAudienceCollections
          .aggregate([
            {
              $match: {
                addedBy: userId,
                ...dateFilter,
                ...emailCampaignIdFilter,
              },
            },
            {
              $group: {
                _id: '$senderEmailId',
                totalCampaignsAudience: { $sum: 1 },
              },
            },
            { $project: { email: '$_id', totalCampaignsAudience: 1, _id: 0 } },
            { $match: { email: { $ne: null } } },
          ])
          .toArray()
          .catch((error) => {
            Logger.error(
              `Error aggregating duplicate campaign sender emails: ${error.message}`,
            );
            throw error;
          }),

        // 14. Campaign sender phone number list
        this.voicebotAudienceCollection
          .aggregate([
            {
              $match: {
                userId,
                callCompleted: true,
                ...dateFilter,
                ...voiceCampaignIdFilter,
              },
            },
            {
              $group: {
                _id: '$callerNumber',
                totalCampaignsAudience: { $sum: 1 },
              },
            },
            {
              $project: {
                callerNumber: '$_id',
                totalCampaignsAudience: 1,
                _id: 0,
              },
            },
            { $match: { callerNumber: { $ne: null } } },
          ])
          .toArray()
          .catch((error) => {
            Logger.error(
              `Error aggregating campaign sender phone numbers: ${error.message}`,
            );
            throw error;
          }),

        // 15. Total voiceBot leads count
        this.leadCollection
          .countDocuments({
            userId,
            IsLeadType: IsLeadType.voiceBot,
            ...dateFilter,
            ...kbIdFilter,
          })
          .catch((error) => {
            Logger.error(`Error counting voiceBot leads: ${error.message}`);
            throw error;
          }),

        // 16. Total emailBot leads count
        this.leadCollection
          .countDocuments({
            userId,
            IsLeadType: IsLeadType.mailBot,
            ...(leadType === 'emailAssistant'
              ? { standAloneAssistant: true }
              : leadType === 'emailOutreach'
              ? { standAloneAssistant: { $ne: true } }
              : {}),
            ...dateFilter,
            ...kbIdFilter,
          })
          .catch((error) => {
            Logger.error(`Error counting emailBot leads: ${error.message}`);
            throw error;
          }),
      ]);

      // ── Merge campaign sender email lists ──────────────────────────────────
      const emailCountMap = new Map<string, number>();
      campaignSenderNewEmailData.forEach((item) => {
        if (item.email) {
          emailCountMap.set(
            item.email,
            (emailCountMap.get(item.email) || 0) + item.totalCampaignsAudience,
          );
        }
      });
      campaignSenderDuplicateEmailData.forEach((item) => {
        if (item.email) {
          emailCountMap.set(
            item.email,
            (emailCountMap.get(item.email) || 0) + item.totalCampaignsAudience,
          );
        }
      });
      const campaignSenderEmailData = Array.from(emailCountMap.entries()).map(
        ([email, totalCampaignsAudience]) => ({
          email,
          totalCampaignsAudience,
        }),
      );

      Logger.log('All parallel queries completed successfully');

      // ── Campaign status counts ─────────────────────────────────────────────
      Logger.log('Processing campaign status counts');
      const campaignStatusCount: Record<string, number> = {
        initiated: 0,
        running: 0,
        paused: 0,
        completed: 0,
        failed: 0,
        pending: 0,
      };
      const voiceBotCampaignStatusCount: Record<string, number> = {
        ...campaignStatusCount,
      };

      campaignStatusData.forEach(({ status, count }) => {
        const key = status === 'scheduled' ? 'initiated' : status;
        if (campaignStatusCount.hasOwnProperty(key)) {
          campaignStatusCount[key] += count;
        }
      });
      voiceBotCampaignStatusData.forEach(({ status, count }) => {
        if (!status) return;
        const normalized = status.toLowerCase();
        const key = normalized === 'scheduled' ? 'initiated' : normalized;
        if (voiceBotCampaignStatusCount.hasOwnProperty(key)) {
          voiceBotCampaignStatusCount[key] += count;
        }
      });

      const combinedCampaignStatusCount = Object.keys(
        campaignStatusCount,
      ).reduce((combined, key) => {
        combined[key] =
          campaignStatusCount[key] + voiceBotCampaignStatusCount[key];
        return combined;
      }, {} as Record<string, number>);

      // ── Leads by type breakdown ────────────────────────────────────────────
      Logger.log('Processing leads by type');
      const leadGenerated = {
        chatBot: 0,
        emailAssistant: 0,
        emailOutreach: 0,
        voiceBot: 0,
        zapierCrm: 0,
      };
      leadsByTypeData.forEach(
        ({ leadType: lt, standAloneAssistant, count }) => {
          if (lt === 'mailBot') {
            if (standAloneAssistant === true) {
              leadGenerated['emailAssistant'] += count;
            } else {
              leadGenerated['emailOutreach'] += count;
            }
          } else if (lt && leadGenerated.hasOwnProperty(lt)) {
            leadGenerated[lt] = count;
          }
        },
      );

      // ── Chat session count ─────────────────────────────────────────────────
      // Use createdAtDateFilter so it scopes by creation date (not updatedAt)
      const chatSession = await this.chatSessionCollection.countDocuments({
        userId: new ObjectId(userId),
        ...createdAtDateFilter,
        'messages.0': { $exists: true },
        ...kbIdFilter,
      });

      const totalMeetingBookingByuniqueUser =
        meetingBookingData[0]?.uniqueMeetingPairs || 0;

      // ── Campaign audience counts & rates ──────────────────────────────────
      let leadgenerationRate = 0;
      let appointmentBookingRate = 0;
      let campaignAudienceCount = 0;
      let totalCampaignAudienceCount = 0;
      let campaignSent = '0 / 0';

      // Total email audience = primary + duplicate (both pools)
      const totalAllEmailAudience =
        (totalEmailCampaignsData || 0) +
        (totalDuplicateEmailCampaignsData || 0);
      // Emails actually sent = SENT from primary + SENT from duplicate
      const totalEmailSent =
        (emailCampaignsData || 0) + (emailCampaignsDuplicateData || 0);
      // Voice calls completed
      const voiceCompleted = voiceCampaignsData || 0;
      // Total voice audience
      const totalVoiceAudience = totalVoiceCampaignsData || 0;

      if (leadType === 'voiceBot') {
        // campaignSent = completedCalls / totalVoiceAudience
        campaignSent = `${voiceCompleted} / ${totalVoiceAudience}`;
        totalCampaignAudienceCount = totalVoiceAudience;
        campaignAudienceCount = voiceCompleted;
        leadgenerationRate =
          voiceCompleted > 0
            ? Number(
                ((totalVoiceBotLeadsCount / voiceCompleted) * 100).toFixed(2),
              )
            : 0;
      } else if (leadType === 'mailBot' || leadType === 'emailOutreach') {
        // campaignSent = emailsSent / totalEmailAudience (primary + duplicate)
        campaignSent = `${totalEmailSent} / ${totalAllEmailAudience}`;
        totalCampaignAudienceCount = totalAllEmailAudience;
        campaignAudienceCount = totalEmailSent;
        leadgenerationRate =
          totalEmailSent > 0
            ? Number(
                ((totalEmailBotLeadsCount / totalEmailSent) * 100).toFixed(2),
              )
            : 0;
      } else if (leadType === 'emailAssistant') {
        campaignSent = '0 / 0';
        totalCampaignAudienceCount = 0;
        campaignAudienceCount = 0;
        leadgenerationRate = 0;
      } else if (leadType === 'chatBot') {
        campaignAudienceCount = chatSession || 0;
        leadgenerationRate = 0;
      } else if (leadType === 'zapierCrm') {
        campaignAudienceCount = 0;
        leadgenerationRate = 0;
        appointmentBookingRate = 0;
      } else {
        // 'all' or no filter
        // campaignSent = emailsSent / voiceCompleted
        // Both sides show actual activity (matching individual-type patterns):
        //   email side  → how many emails were successfully sent
        //   voice side  → how many voice calls were completed
        campaignSent = `${totalEmailSent} / ${voiceCompleted}`;
        campaignAudienceCount =
          totalEmailSent + voiceCompleted + (chatSession || 0);
        totalCampaignAudienceCount =
          totalAllEmailAudience + totalVoiceAudience + (chatSession || 0);
        const totalEmailAndVoiceActive = voiceCompleted + totalEmailSent;
        const convertedTotalLeadOfVoiceandEmails =
          totalEmailBotLeadsCount + totalVoiceBotLeadsCount;
        leadgenerationRate =
          totalEmailAndVoiceActive > 0
            ? Number(
                (
                  (convertedTotalLeadOfVoiceandEmails /
                    totalEmailAndVoiceActive) *
                  100
                ).toFixed(2),
              )
            : 0;
      }

      // ── Monthly lead chart data ────────────────────────────────────────────
      Logger.log('Fetching monthly lead data');
      const monthAndYearWiseLeadsGenerated = await this.getMonthlyLeadDataV2(
        userId,
        parsedMonth,
        parsedYear,
        leadType,
      ).catch((error) => {
        Logger.error(`Error getting monthly lead data: ${error.message}`);
        throw error;
      });

      appointmentBookingRate =
        campaignAudienceCount > 0
          ? Number(
              (
                (totalMeetingBookingByuniqueUser / campaignAudienceCount) *
                100
              ).toFixed(2),
            )
          : 0;

      Logger.log('Dashboard data processing completed successfully');

      // ── Section visibility (driven by leadType) ────────────────────────────
      const activeLt = leadType || 'all';
      const isAllOrUndefined = !leadType || leadType === 'all';
      const isChatBot = activeLt === 'chatBot';
      const isEmailBot =
        activeLt === 'emailOutreach' ||
        activeLt === 'mailBot' ||
        activeLt === 'emailAssistant';
      const isVoiceBot = activeLt === 'voiceBot';

      const sectionVisibility = {
        // Conversations: chat sessions + email conversations
        recentConversations: isAllOrUndefined || isChatBot || isEmailBot,
        // Voice calls: voiceBot (or all)
        recentVoiceCalls: isAllOrUndefined || isVoiceBot,
        // Meetings: all except zapierCrm
        recentMeetings:
          isAllOrUndefined || isChatBot || isEmailBot || isVoiceBot,
        // Campaign section: email outreach / mailBot / voiceBot (or all)
        campaignSection:
          isAllOrUndefined ||
          activeLt === 'emailOutreach' ||
          activeLt === 'mailBot' ||
          isVoiceBot,
        // AI analysis: always visible
        aiAnalysis: true,
        // Recent leads: always visible
        recentLeads: true,
      };

      // ── Build queries for new table sections ───────────────────────────────

      // Recent Leads query
      const recentLeadsQuery: any = { userId, ...kbIdFilter };
      if (leadType && leadType !== 'all') {
        if (leadType === 'emailOutreach') {
          recentLeadsQuery.IsLeadType = 'mailBot';
          recentLeadsQuery.standAloneAssistant = { $ne: true };
        } else if (leadType === 'emailAssistant') {
          recentLeadsQuery.IsLeadType = 'mailBot';
          recentLeadsQuery.standAloneAssistant = true;
        } else {
          recentLeadsQuery.IsLeadType = leadType;
        }
      }
      // Commented out date filters for recent tables to show all historical data
      // if (parsedYear) {
      //   recentLeadsQuery.updatedAt = dateFilter['updatedAt'];
      // }

      // Recent Chat Sessions query (for recentConversations)
      const recentChatQuery: any = {
        userId: new ObjectId(userId),
        'messages.0': { $exists: true },
        ...kbIdFilter,
      };
      // if (parsedYear) {
      //   recentChatQuery.updatedAt = dateFilter['updatedAt'];
      // }

      // Recent Email Conversations query (for recentConversations when applicable)
      const recentEmailConvQuery: any = { userId, ...kbIdFilter };
      // if (parsedYear) {
      //   recentEmailConvQuery.updatedAt = dateFilter['updatedAt'];
      // }
      if (leadType === 'emailAssistant') {
        recentEmailConvQuery.standAloneAssistant = true;
      } else if (leadType === 'emailOutreach' || leadType === 'mailBot') {
        recentEmailConvQuery.standAloneAssistant = { $ne: true };
      }

      // Recent Voice Calls query
      const recentVoiceQuery: any = { userId, ...voiceCampaignIdFilter };
      // if (parsedYear) {
      //   recentVoiceQuery.createdAt = createdAtDateFilter['createdAt'];
      // }

      // Recent Meetings query
      const recentMeetingsQuery: any = { userId, ...allCampaignIdFilter };
      // if (parsedYear) {
      //   recentMeetingsQuery.createdAt = createdAtDateFilter['createdAt'];
      // }
      if (leadType && leadType !== 'all') {
        const meetingTypeMap: Record<string, string> = {
          emailOutreach: 'emailBot',
          emailAssistant: 'emailBot',
          mailBot: 'emailBot',
          chatBot: 'chatBot',
          voiceBot: 'voiceBot',
        };
        if (meetingTypeMap[leadType]) {
          recentMeetingsQuery.meetingType = meetingTypeMap[leadType];
        }
      }

      // AI analysis lead-type match
      const aiLeadTypeMatch: any =
        leadType && leadType !== 'all' ? { ...leadTypeQuery } : {};

      // ── Fetch all new sections in parallel ─────────────────────────────────
      const [
        aiCurrentLeadsByType,
        aiPreviousLeadsByType,
        recentLeadsRaw,
        recentChatRaw,
        recentEmailConvRaw,
        recentVoiceCallsRaw,
        recentMeetingsRaw,
      ] = await Promise.all([
        // AI current period
        this.leadCollection
          .aggregate([
            {
              $match: {
                userId,
                updatedAt: { $gte: aiCurrentStart, $lte: aiCurrentEnd },
                ...aiLeadTypeMatch,
                ...kbIdFilter,
              },
            },
            {
              $group: {
                _id: {
                  leadType: '$IsLeadType',
                  standAlone: '$standAloneAssistant',
                },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray()
          .catch(() => []),

        // AI previous period
        this.leadCollection
          .aggregate([
            {
              $match: {
                userId,
                updatedAt: { $gte: aiPreviousStart, $lte: aiPreviousEnd },
                ...aiLeadTypeMatch,
                ...kbIdFilter,
              },
            },
            {
              $group: {
                _id: {
                  leadType: '$IsLeadType',
                  standAlone: '$standAloneAssistant',
                },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray()
          .catch(() => []),

        // Recent Leads
        this.leadCollection
          .find(recentLeadsQuery, {
            projection: {
              name: 1,
              email: 1,
              phone: 1,
              IsLeadType: 1,
              standAloneAssistant: 1,
              updatedAt: 1,
              createdAt: 1,
            },
          })
          .sort({ updatedAt: -1 })
          .limit(5)
          .toArray()
          .catch(() => []),

        // Recent Chat Sessions (part of recentConversations)
        this.chatSessionCollection
          .find(recentChatQuery, {
            projection: {
              userData: 1,
              messages: 1,
              updatedAt: 1,
              src: 1,
              knowledgebaseId: 1,
              kbName: 1,
            },
          })
          .sort({ updatedAt: -1 })
          .limit(5)
          .toArray()
          .catch(() => []),

        // Recent Email Conversations (part of recentConversations, only when relevant)
        // Only conversations that produced a qualified lead (a `leads` doc with
        // IsLeadType 'mailBot' pointing back via emailConversationId) are included.
        isAllOrUndefined || isEmailBot
          ? this.emailConversationCollection
              .aggregate([
                { $match: recentEmailConvQuery },
                { $sort: { updatedAt: -1 } },
                {
                  $lookup: {
                    from: LEADS_COLLECTION,
                    let: { convId: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              { $eq: ['$IsLeadType', 'mailBot'] },
                              {
                                $eq: [
                                  { $toString: '$emailConversationId' },
                                  { $toString: '$$convId' },
                                ],
                              },
                            ],
                          },
                        },
                      },
                      { $limit: 1 },
                    ],
                    as: 'qualifiedLead',
                  },
                },
                { $match: { 'qualifiedLead.0': { $exists: true } } },
                { $limit: 5 },
                {
                  $project: {
                    audienceEmailId: 1,
                    userEmailId: 1,
                    subject: 1,
                    emailConversation: 1,
                    updatedAt: 1,
                    standAloneAssistant: 1,
                    knowledgebaseId: 1,
                  },
                },
              ])
              .toArray()
              .catch(() => [])
          : Promise.resolve([] as any[]),

        // Recent Voice Calls
        this.campaignRecordingCollection
          .find(recentVoiceQuery, {
            projection: {
              phoneNumber: 1,
              callType: 1,
              callDuration: 1,
              status: 1,
              campaignName: 1,
              createdAt: 1,
              recordingUrl: 1,
            },
          })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray()
          .catch(() => []),

        // Recent Meetings Booked
        this.meetingBookingCollection
          .find(recentMeetingsQuery, {
            projection: {
              agenda: 1,
              startTime: 1,
              endTime: 1,
              status: 1,
              meetingLink: 1,
              meetingType: 1,
              attendees: 1,
              createdAt: 1,
            },
          })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray()
          .catch(() => []),
      ]);

      // ── AI Analysis ────────────────────────────────────────────────────────
      const sumLeadsByBot = (
        rows: any[],
      ): {
        chatBot: number;
        emailOutreach: number;
        emailAssistant: number;
        voiceBot: number;
      } => {
        const counts = {
          chatBot: 0,
          emailOutreach: 0,
          emailAssistant: 0,
          voiceBot: 0,
        };
        rows.forEach(({ _id, count }) => {
          const lt = _id?.leadType;
          const sa = _id?.standAlone;
          if (lt === 'chatBot') counts.chatBot += count;
          else if (lt === 'mailBot' && sa === true)
            counts.emailAssistant += count;
          else if (lt === 'mailBot') counts.emailOutreach += count;
          else if (lt === 'voiceBot') counts.voiceBot += count;
        });
        return counts;
      };

      const calcPctChange = (curr: number, prev: number): number =>
        prev > 0 ? Number(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

      const aiCurr = sumLeadsByBot(aiCurrentLeadsByType);
      const aiPrev = sumLeadsByBot(aiPreviousLeadsByType);

      const emailCurr = aiCurr.emailOutreach + aiCurr.emailAssistant;
      const emailPrev = aiPrev.emailOutreach + aiPrev.emailAssistant;

      const botChanges = [
        {
          bot: 'EmailBot',
          change: Number(calcPctChange(emailCurr, emailPrev).toFixed(1)),
          current: emailCurr,
          previous: emailPrev,
        },
        {
          bot: 'ChatBot',
          change: Number(
            calcPctChange(aiCurr.chatBot, aiPrev.chatBot).toFixed(1),
          ),
          current: aiCurr.chatBot,
          previous: aiPrev.chatBot,
        },
        {
          bot: 'VoiceBot',
          change: Number(
            calcPctChange(aiCurr.voiceBot, aiPrev.voiceBot).toFixed(1),
          ),
          current: aiCurr.voiceBot,
          previous: aiPrev.voiceBot,
        },
      ];

      const getBotStatusLabel = (change: number): string => {
        if (change > 5) return 'performing strongest';
        if (change >= 0) return 'improved';
        return 'campaigns are underperforming';
      };

      const sortedBots = [...botChanges].sort((a, b) => b.change - a.change);
      const bestBot = sortedBots[0];
      const worstBot = sortedBots[sortedBots.length - 1];

      const aiInsights: {
        text: string;
        type: 'positive' | 'neutral' | 'negative';
        changeValue?: number;
      }[] = [];

      if (bestBot.change > 0) {
        aiInsights.push({
          text: `Your reply rate increased by ${Math.abs(
            bestBot.change,
          )}% compared to last period.`,
          type: 'positive',
          changeValue: bestBot.change,
        });
      }
      aiInsights.push({
        text: 'Performance is stable vs last period.',
        type: 'neutral',
      });
      if (worstBot.change < 0) {
        aiInsights.push({
          text: `Your reply rate dropped by ${Math.abs(
            worstBot.change,
          )}% compared to last period.`,
          type: 'negative',
          changeValue: worstBot.change,
        });
      }

      const aiPeriodLabel =
        parsedYear && parsedMonth
          ? 'Selected Month'
          : parsedYear
          ? 'Selected Year'
          : 'Last 30 Days';

      const aiAnalysis = {
        isVisible: sectionVisibility.aiAnalysis,
        periodLabel: aiPeriodLabel,
        insights: aiInsights,
        perBot: botChanges
          .filter((b) => {
            if (isAllOrUndefined) return true;
            if (isChatBot) return b.bot === 'ChatBot';
            if (isEmailBot) return b.bot === 'EmailBot';
            if (isVoiceBot) return b.bot === 'VoiceBot';
            return true;
          })
          .map((b) => ({ ...b, statusLabel: getBotStatusLabel(b.change) })),
      };

      // ── Format recent leads ────────────────────────────────────────────────
      const recentLeads = {
        isVisible: sectionVisibility.recentLeads,
        data: recentLeadsRaw.map((lead: any) => ({
          ...lead,
          IsLeadType:
            lead.IsLeadType === 'mailBot'
              ? lead.standAloneAssistant
                ? 'emailAssistant'
                : 'emailOutreach'
              : lead.IsLeadType,
        })),
      };

      // ── Format recent conversations (chat + email merged, top 5) ──────────
      const chatConvs = recentChatRaw.map((session: any) => ({
        _id: session._id,
        name: session.userData?.name || session.userData?.email || 'Anonymous',
        email: session.userData?.email || '',
        lastMessage:
          session.messages?.length > 0
            ? session.messages[session.messages.length - 1]?.q || ''
            : '',
        updatedAt: session.updatedAt,
        src: session.src || 'web',
        knowledgebaseId: session.knowledgebaseId,
        kbName: session.kbName || '',
        IsLeadType: 'chatBot',
      }));

      const emailConvs = await Promise.all(
        recentEmailConvRaw.map(async (conv: any) => {
          let kbName = '';
          if (conv.campaignId) {
            const campaign = await this.campaignCollection.findOne(
              { _id: new ObjectId(conv.campaignId) },
              {
                projection: {
                  'campaignProject.projectName': 1,
                  campaignName: 1,
                },
              },
            );
            kbName =
              (campaign?.campaignProject as any)?.projectName ||
              campaign?.campaignName ||
              '';
          }
          if (!kbName && conv.knowledgebaseId) {
            const campaign = await this.campaignCollection.findOne(
              { 'campaignProject.projectId': conv.knowledgebaseId },
              { projection: { 'campaignProject.projectName': 1 } },
            );
            kbName = (campaign?.campaignProject as any)?.projectName || '';
          }

          return {
            _id: conv._id,
            name: conv.audienceEmailId || 'Unknown',
            email: conv.audienceEmailId || '',
            lastMessage:
              conv.emailConversation?.length > 0
                ? conv.emailConversation[conv.emailConversation.length - 1]
                    ?.emailTextContent || ''
                : '',
            updatedAt: conv.updatedAt,
            src: conv.standAloneAssistant ? 'emailAssistant' : 'emailOutreach',
            knowledgebaseId: conv.knowledgebaseId || null,
            kbName,
            IsLeadType: conv.standAloneAssistant
              ? 'emailAssistant'
              : 'emailOutreach',
          };
        }),
      );

      const mergedConversations = [...chatConvs, ...emailConvs]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 5);

      const recentConversations = {
        isVisible: sectionVisibility.recentConversations,
        data: mergedConversations,
      };

      // ── Build final response ───────────────────────────────────────────────
      return {
        status: HttpStatus.OK,
        message: 'Dashboard data fetched successfully',
        data: {
          // ── Original top-level keys — preserved exactly from main branch ──
          totalNumberOfLeads: totalLeadsCount,
          totalNumberOfConversations: campaignAudienceCount,
          campaignSent: campaignSent,
          leadgenerationRate: leadgenerationRate,
          appointmentBookingRate: appointmentBookingRate,
          campaignStatusCount: {
            ...combinedCampaignStatusCount,
            isVisible: sectionVisibility.campaignSection,
          },
          monthAndYearWiseLeadsGenerated,
          leadGenerated,
          campaignSenderEmailList: campaignSenderEmailData,
          campaignSenderPhoneNumberList: campaignSenderPhoneData,

          // ── Campaign section wrapper (with isVisible) ─────────────────────
          // campaignSection: {
          //   isVisible: sectionVisibility.campaignSection,
          //   campaignSent,
          //   campaignStatusCount: combinedCampaignStatusCount,
          //   campaignSenderEmailList: campaignSenderEmailData,
          //   campaignSenderPhoneNumberList: campaignSenderPhoneData,
          // },

          // ── New dashboard sections ─────────────────────────────────────────
          // aiAnalysis,
          recentLeads,
          recentConversations,
          recentVoiceCalls: {
            isVisible: sectionVisibility.recentVoiceCalls,
            data: recentVoiceCallsRaw,
          },
          // recentMeetings: {
          //   isVisible: sectionVisibility.recentMeetings,
          //   data: recentMeetingsRaw,
          // },
        },
      };
    } catch (error) {
      Logger.error(
        `Error in getDashboardDataV2: ${error.message}`,
        error.stack,
      );
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch dashboard data',
        error: error.message,
      };
    }
  }

  /**
   * Helper method to get monthly lead data in a format suitable for frontend charts.
   * @param userId    - User ID to filter leads
   * @param month     - Optional specific month (1-12); already parsed to number
   * @param year      - Optional specific year; already parsed to number
   * @param leadType  - Optional lead type filter
   * @returns Formatted array of lead data for charts
   */
  private async getMonthlyLeadDataV2(
    userId: string,
    month?: number,
    year?: number,
    leadType?: string,
  ) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const user = await this.userCollection.findOne({
      _id: new ObjectId(userId),
    });
    const userCreatedAt = new Date(user.createdAt);

    const creationYear = userCreatedAt.getFullYear();
    const creationMonth = userCreatedAt.getMonth();

    const selectedYear = year ? Number(year) : null;
    const selectedMonth = month ? Number(month) - 1 : null;

    let targetYear: number;
    let startMonth: number;
    let endMonth: number;

    if (selectedYear !== null && selectedMonth !== null) {
      targetYear = selectedYear;
      startMonth = selectedMonth;
      endMonth = selectedMonth;
    } else if (selectedYear !== null) {
      targetYear = selectedYear;
      startMonth = 0;
      endMonth = 11;
    } else {
      targetYear = currentYear;

      if (creationYear === currentYear) {
        startMonth = creationMonth;
      } else {
        startMonth = 0;
      }

      endMonth = currentMonth;
    }

    if (targetYear === creationYear && startMonth < creationMonth) {
      startMonth = creationMonth;
    }

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const monthData = [];

    for (let m = startMonth; m <= endMonth; m++) {
      const startDate = new Date(targetYear, m, 1);
      const endDate = new Date(targetYear, m + 1, 0, 23, 59, 59, 999);

      const match: any = {
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      };

      if (leadType && leadType !== 'all') {
        if (leadType === 'emailOutreach') {
          match.IsLeadType = IsLeadType.mailBot;
          match.standAloneAssistant = { $ne: true };
        } else if (leadType === 'emailAssistant') {
          match.IsLeadType = IsLeadType.mailBot;
          match.standAloneAssistant = true;
        } else {
          match.IsLeadType = leadType;
        }
      }

      const result = await this.leadCollection
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              chatbot: {
                $sum: {
                  $cond: [{ $eq: ['$IsLeadType', IsLeadType.chatBot] }, 1, 0],
                },
              },
              emailAssistant: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$IsLeadType', IsLeadType.mailBot] },
                        { $eq: ['$standAloneAssistant', true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              emailOutreach: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$IsLeadType', IsLeadType.mailBot] },
                        { $ne: ['$standAloneAssistant', true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              voicebot: {
                $sum: {
                  $cond: [{ $eq: ['$IsLeadType', IsLeadType.voiceBot] }, 1, 0],
                },
              },
              zapierCrm: {
                $sum: {
                  $cond: [{ $eq: ['$IsLeadType', IsLeadType.zapierCrm] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray();

      monthData.push({
        name: monthNames[m],
        ChatBot: result[0]?.chatbot || 0,
        EmailAssistant: result[0]?.emailAssistant || 0,
        EmailOutreach: result[0]?.emailOutreach || 0,
        VoiceBot: result[0]?.voicebot || 0,
        ZapierCRM: result[0]?.zapierCrm || 0,
      });
    }

    return monthData;
  }

  /**
   * Fetches all leads for a user with pagination and optional lead type filtering and search
   * @param req - Request object containing user information
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 10)
   * @param leadType - Optional filter for lead type
   * @param search - Optional search term for filtering leads
   * @returns Paginated list of leads with status
   */
  async getAllLeads(
    req: any,
    page = 1,
    limit = 10,
    leadType?: string,
    search?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();

      if (!userId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'User ID is required',
        };
      }

      const pageNum = Number(page);
      const limitNum = Number(limit);

      const skip = (pageNum - 1) * limitNum;

      const query: any = { userId };

      if (leadType && leadType.toLowerCase() !== 'all') {
        if (leadType === 'emailOutreach') {
          query.IsLeadType = 'mailBot';
          query.standAloneAssistant = { $ne: true };
        } else if (leadType === 'emailAssistant') {
          query.IsLeadType = 'mailBot';
          query.standAloneAssistant = true;
        } else {
          query.IsLeadType = leadType;
        }
      }
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ];
      }

      const [total, leads] = await Promise.all([
        this.leadCollection.countDocuments(query),
        this.leadCollection
          .find(query)
          .skip(skip)
          .limit(limitNum)
          .sort({ createdAt: -1 })
          .toArray(),
      ]);

      const formattedLeads = leads.map((lead) => {
        if (lead.IsLeadType === 'mailBot') {
          lead.IsLeadType = (
            lead.standAloneAssistant ? 'emailAssistant' : 'emailOutreach'
          ) as any;
        }
        return lead;
      });

      return {
        status: HttpStatus.OK,
        message: 'Leads fetched successfully',
        data: formattedLeads,
        pagination: {
          currentPage: pageNum,
          pageSize: limitNum,
          totalItems: total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching leads:', error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch leads',
        error: error.message,
      };
    }
  }

  /**
   * V2: Fetches all leads for a user with pagination and optional lead type filtering, campaignId filtering, and search,
   * and enriches leads with related chat, voice, or email data if present.
   * @param req - Request object containing user information
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 10)
   * @param leadType - Optional filter for lead type
   * @param search - Optional search term for filtering leads
   * @param knowledgebaseId - Optional filter for knowledgebaseId (string)
   * @returns Paginated list of enriched leads with status
   */
  async getAllLeadsV2(
    req: any,
    page = 1,
    limit = 10,
    leadType?: string,
    search?: string,
    knowledgebaseId?: string,
    isMeetingBookedOnGoogleMeet?: string,
    startDate?: string,
    endDate?: string,
    exportData?: boolean,
  ) {
    try {
      const userId = req.user._id?.toHexString();
      if (!userId) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'User ID is required',
          data: null,
        };
      }

      const query: any = { userId };

      // Date Range Filtering
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        query.updatedAt = { $gte: start, $lte: end }; //bcz Date Filter is applied on updatedAt field in getDashboardDataV2
      }

      // Lead Type Filter
      if (leadType && leadType.toLowerCase() !== 'all') {
        if (leadType === 'emailOutreach') {
          query.IsLeadType = 'mailBot';
          query.standAloneAssistant = { $ne: true };
        } else if (leadType === 'emailAssistant') {
          query.IsLeadType = 'mailBot';
          query.standAloneAssistant = true;
        } else {
          query.IsLeadType = leadType;
        }
      }

      // Search Filter
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ];
      }

      // Campaign Filter
      if (
        knowledgebaseId &&
        knowledgebaseId.trim() !== '' &&
        knowledgebaseId !== 'all'
      ) {
        query.knowledgebaseId = new ObjectId(knowledgebaseId);
      }

      // Meeting Booked Filter
      if (isMeetingBookedOnGoogleMeet === 'true') {
        query.isMeetingBookedOnGoogleMeet = true;
      } else if (isMeetingBookedOnGoogleMeet === 'false') {
        query.isMeetingBookedOnGoogleMeet = { $ne: true };
      }

      // Fetch Leads (pagination only when not exporting)
      let leadsQuery = this.leadCollection.find(query).sort({ updatedAt: -1 });
      if (!exportData) {
        leadsQuery = leadsQuery.skip((page - 1) * limit).limit(limit);
      }

      const [total, leads] = await Promise.all([
        this.leadCollection.countDocuments(query),
        leadsQuery.toArray(),
      ]);

      // Enrichment Logic
      const enrichedLeads = await Promise.all(
        leads.map(async (lead: any) => {
          // ChatBot
          if (
            lead.chatSessionId &&
            lead.IsLeadType?.toLowerCase() === 'chatbot'
          ) {
            const chatSession = await this.chatSessionCollection.findOne({
              _id: lead.chatSessionId,
            });
            if (chatSession?.messages) lead.chatMessage = chatSession.messages;
          }

          // VoiceBot
          if (
            lead.voiceBotRecordingId &&
            lead.IsLeadType?.toLowerCase() === 'voicebot'
          ) {
            const recording = await this.campaignRecordingCollection.findOne({
              _id: lead.voiceBotRecordingId,
            });
            if (recording?.recordingUrl)
              lead.recordingUrl = recording.recordingUrl;
          }

          // MailBot
          if (
            lead.emailConversationId &&
            lead.IsLeadType?.toLowerCase() === 'mailbot'
          ) {
            const emailConversation =
              await this.emailConversationCollection.findOne({
                _id: new ObjectId(lead.emailConversationId),
              });
            if (emailConversation) lead.emailConversation = emailConversation;
          }

          // Campaign details
          if (lead.campaignId) {
            const collection =
              lead.IsLeadType?.toLowerCase() === 'voicebot'
                ? this.voicebotCampaignCollection
                : this.campaignCollection;

            const campaign = await collection.findOne(
              { _id: new ObjectId(lead.campaignId) },
              { projection: { _id: 1, campaignName: 1 } },
            );
            if (campaign) lead.campaignDetails = campaign;
          }

          if (lead.IsLeadType === 'mailBot') {
            lead.IsLeadType = (
              lead.standAloneAssistant ? 'emailAssistant' : 'emailOutreach'
            ) as any;
          }

          return lead;
        }),
      );

      // XLSX Export Handling
      if (exportData) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Leads');

        // Define Excel columns
        worksheet.columns = [
          { header: 'Name', key: 'name', width: 25 },
          { header: 'First Name', key: 'firstName', width: 20 },
          { header: 'Last Name', key: 'lastName', width: 20 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Phone', key: 'phone', width: 20 },
          { header: 'Country Code', key: 'countryCode', width: 15 },
          { header: 'Address', key: 'address', width: 30 },
          { header: 'City', key: 'city', width: 20 },
          { header: 'Location', key: 'location', width: 25 },
          { header: 'Postal Code', key: 'postalCode', width: 15 },
          { header: 'Website', key: 'website', width: 30 },
          { header: 'Service Type', key: 'serviceType', width: 25 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Sub Category', key: 'subCategory', width: 20 },
          { header: 'Job Description', key: 'jobDescription', width: 40 },
          { header: 'Lead Type', key: 'IsLeadType', width: 15 },
          { header: 'Campaign Name', key: 'campaignName', width: 25 },
          { header: 'Knowledgebase ID', key: 'knowledgebaseId', width: 25 },
          { header: 'Webhook CRM Name', key: 'webhookCrmName', width: 25 },
          { header: 'Email Status', key: 'emailStatus', width: 15 },
          { header: 'Chatbot Type', key: 'chatbotType', width: 15 },
          { header: 'Field Status', key: 'fieldStatus', width: 15 },
          { header: 'Is Synced To CRM', key: 'isSyncedToCrm', width: 15 },
          {
            header: 'Meeting Booked (Google Meet)',
            key: 'isMeetingBookedOnGoogleMeet',
            width: 25,
          },
          { header: 'Created At', key: 'createdAt', width: 25 },
          { header: 'Updated At', key: 'updatedAt', width: 25 },
        ];

        // Add rows
        enrichedLeads.forEach((lead) => {
          worksheet.addRow({
            name: lead?.name ?? '',
            firstName: lead?.firstName ?? '',
            lastName: lead?.lastName ?? '',
            email: lead?.email ?? '',
            phone: lead?.phone ?? '',
            countryCode: lead?.countryCode ?? '',
            address: lead?.address ?? '',
            city: lead?.city ?? '',
            location: lead?.location ?? '',
            postalCode: lead?.postalCode ?? '',
            website: lead?.website ?? '',
            serviceType: lead?.serviceType ?? '',
            category: lead?.category ?? '',
            subCategory: lead?.subCategory ?? '',
            jobDescription: lead?.jobDescription ?? '',
            IsLeadType: lead?.IsLeadType ?? '',
            campaignName: lead?.campaignDetails?.campaignName ?? '',
            knowledgebaseId: lead?.knowledgebaseId ?? '',
            webhookCrmName: lead?.webhookCrmName ?? '',
            emailStatus: lead?.emailStatus ? 'Yes' : 'No',
            chatbotType: lead?.chatbotType ?? '',
            fieldStatus: lead?.fieldStatus ?? '',
            isSyncedToCrm: lead?.isSyncedToCrm ? 'Yes' : 'No',
            isMeetingBookedOnGoogleMeet: lead?.isMeetingBookedOnGoogleMeet
              ? 'Yes'
              : 'No',
            createdAt: lead?.createdAt
              ? new Date(lead.createdAt).toLocaleString()
              : '',
            updatedAt: lead?.updatedAt
              ? new Date(lead.updatedAt).toLocaleString()
              : '',
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        // Return file buffer + filename
        return {
          status: HttpStatus.OK,
          message: 'Leads exported successfully',
          fileName: `leads_${startDate || 'all'}_${endDate || 'today'}.xlsx`,
          fileBuffer: buffer,
        };
      }

      // Normal Paginated JSON Response
      return {
        status: HttpStatus.OK,
        message: 'Leads fetched successfully',
        data: enrichedLeads,
        pagination: {
          currentPage: Number(page),
          pageSize: Number(limit),
          totalItems: total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching leads (V2):', error);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch leads',
        data: null,
        error: error.message,
      };
    }
  }
}
