import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { GoogleCalenderService } from '../googleCalender/googleCalender.service';
import {
  CHAT_SESSION_COLLECTION,
  IsLeadType,
  Lead,
  LEADS_COLLECTION,
} from '../knowledgebase.schema';
import { MONGODB } from '../../common/mongo/mongo.module';
import { Collection, Db, ObjectId } from 'mongodb';
import * as chrono from 'chrono-node';

import {
  GOOGLE_CALENDER_MEETING,
  GoogleCalendarMeeting,
  meetingStatus,
  meetingType,
} from '../google-calender-meeting.schema';
import * as moment from 'moment-timezone';
import { BullMqService } from '../../campaign/bull/bullMq.service';
import { EmailService } from '../../common/email/email.service';
import { VOICE_BOT_CAMPAIGN_SCHEMA } from '../../voicebot/schema/voicebot.campaign.schema';
import { ZapierWebhookService } from '../../zapier-webhook/zapier-webhook.service';
import { USER_ULTIMABOT_WEBHOOK_COLLECTION } from '../../zapier-webhook/schema/userUltmabotWebhookSchema';
import { CAMPAIGN_EMAIL_CONVERSATION_COLLECTION } from '../../campaign/schema/campaignEmailConversation.schema';
import { REDIS } from '../../common/redis/redis.module';
import Redis from 'ioredis';

const BOOKING_LOCK_TTL_SECONDS = 120; // max time a booking can be in-progress before auto-expiry
const BOOKING_DONE_TTL_SECONDS = 3600; // remember completed booking for 1 hour
const BOOKING_LOCK_PREFIX = 'voicebot:booking:lock:';

@Injectable()
export class VoicebotWebhookService {
  private logger = new Logger(VoicebotWebhookService.name);

  private readonly googleCalenderMeetingCollection: Collection<GoogleCalendarMeeting>;
  private readonly leadCollection: Collection<Lead>;

  constructor(
    @Inject(MONGODB) private db: Db,
    @Inject(REDIS) private readonly redisClient: Redis,
    private googleCalenderService: GoogleCalenderService,
    private readonly bullMqService: BullMqService,
    private readonly emailService: EmailService,
    private readonly zapierWebhookService: ZapierWebhookService,
  ) {
    this.leadCollection = this.db.collection<Lead>(LEADS_COLLECTION);
    this.googleCalenderMeetingCollection =
      this.db.collection<GoogleCalendarMeeting>(GOOGLE_CALENDER_MEETING);
  }
  async checkBookingSlotToolCallHandler(payload: any, userID: string) {
    try {
      const { toolCalls } = payload.message;
      const toolCall = toolCalls[0];

      const userId =
        payload.message?.call?.metadata?.userId ||
        userID ||
        payload?.message?.assistant?.server?.headers?.userid;
      const targetAudienceId =
        payload.message?.call?.metadata?.targetAudienceId;
      const knowledgebaseId =
        payload.message?.call?.metadata?.knowledgebaseId ||
        payload?.message?.assistant?.server?.headers?.knowledgebaseId;

      this.logger.log('Inside the check available slots function');

      const { _dateAndTime } = toolCall.function.arguments;

      let parsedDate: moment.Moment;

      if (_dateAndTime) {
        const chronoParsed = chrono.parseDate(_dateAndTime, moment().toDate(), {
          forwardDate: true,
        });

        if (!chronoParsed) {
          throw new Error(`Could not parse date: ${_dateAndTime}`);
        }

        parsedDate = moment(chronoParsed);

        // Check if date is in the past (ignoring time)
        if (parsedDate.isBefore(moment(), 'day')) {
          return {
            results: [
              {
                toolCallId: toolCall.id,
                result:
                  'The selected date is in the past. Please choose a future date.',
              },
            ],
          };
        }
      } else {
        // Default to tomorrow if no date is provided
        parsedDate = moment().add(1, 'day');
      }

      const formattedDate = await this.formatDate(parsedDate.toDate());
      this.logger.log('Formatted Date and Time:', formattedDate);

      const customerPhone = payload.message?.customer?.number;

      //  Fire all independent operations concurrently
      const [userData, audienceData, calendarResult, returningUserSummary] =
        await Promise.all([
          // Fetch user
          this.db.collection('users').findOne({ _id: new ObjectId(userId) }),

          // Fetch target audience email (only if id is present)
          targetAudienceId
            ? this.db
                .collection('targetAudiences')
                .findOne(
                  { _id: new ObjectId(targetAudienceId) },
                  { projection: { email: 1 } },
                )
            : Promise.resolve(null),

          //Fetch calendar + available slots
          this.fetchCalendarSlots(knowledgebaseId, formattedDate),

          //Build returning-user context (non-blocking — never rejects)
          this.buildVoicebotReturningUserSummary(
            null,
            customerPhone,
            userId,
          ).catch((err) => {
            this.logger.error(
              'Error building returning user summary (non-blocking):',
              err?.message,
            );
            return '';
          }),
        ]);

      if (!userData) {
        throw new Error(`User not found for userId: ${userId}`);
      }

      const { availableSlots, calendarIntegrated } = calendarResult;

      const emailMessage = audienceData?.email
        ? `Caller email is ${audienceData.email}.`
        : 'Caller email is not available.';

      let resultMessage: any;
      if (calendarIntegrated) {
        resultMessage =
          !availableSlots || availableSlots.length === 0
            ? 'There are no available slots on this date. Please choose another date.'
            : availableSlots;
      } else {
        resultMessage =
          'Calendar is not integrated or there was an issue accessing it. Please proceed to book the appointment directly.';
      }

      return {
        results: [
          {
            toolCallId: toolCall.id,
            result: {
              resultMessage,
              emailMessage,
              returningUserSummary,
            },
          },
        ],
      };
    } catch (error) {
      this.logger.error(
        'Error in checkBookingSlotToolCallHandler:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Fetches available calendar slots for the given knowledgebase and date.
   * Returns `{ availableSlots, calendarIntegrated }`
   */
  private async fetchCalendarSlots(
    knowledgebaseId: string,
    formattedDate: string,
  ): Promise<{ availableSlots: any; calendarIntegrated: boolean }> {
    try {
      const calendarData =
        await this.googleCalenderService.findCalenderSettingByKbid(
          knowledgebaseId,
        );

      this.logger.log(
        'Calendar data retrieved in checkBookingSlotToolCallHandler',
      );

      const result = await this.googleCalenderService.regenerateAccessToken(
        calendarData?.refreshToken,
        calendarData?.globalTime,
        formattedDate,
        Number(calendarData?.duration),
        calendarData?.timezone,
      );

      return {
        availableSlots: result?.availableSlots ?? null,
        calendarIntegrated: true,
      };
    } catch {
      return { availableSlots: null, calendarIntegrated: false };
    }
  }

  async bookAppoitmentToolCallHandler(payload: any, userID: string) {
    const callId = payload.message?.call?.id;
    const lockKey = callId ? `${BOOKING_LOCK_PREFIX}${callId}` : null;

    // Idempotency guard: prevent duplicate bookings within the same call
    if (lockKey) {
      const existing = await this.redisClient.get(lockKey);

      if (existing === 'COMPLETED') {
        this.logger.warn(
          `[Booking] Duplicate tool call detected for callId=${callId} — booking already completed`,
        );
        const toolCallId = payload.message?.toolCalls?.[0]?.id;
        return {
          results: [
            {
              toolCallId,
              result:
                'The appointment has already been booked for this call. No duplicate booking will be created.',
            },
          ],
        };
      }

      if (existing === 'IN_PROGRESS') {
        this.logger.warn(
          `[Booking] Duplicate tool call detected for callId=${callId} — booking is in progress`,
        );
        const toolCallId = payload.message?.toolCalls?.[0]?.id;
        return {
          results: [
            {
              toolCallId,
              result:
                'Your appointment is currently being booked. Please hold on for a moment while I confirm the details.',
            },
          ],
        };
      }

      // Acquire lock atomically — only set if key does not exist
      const acquired = await this.redisClient.set(
        lockKey,
        'IN_PROGRESS',
        'EX',
        BOOKING_LOCK_TTL_SECONDS,
        'NX',
      );

      if (!acquired) {
        // Another concurrent request beat us to the lock
        this.logger.warn(
          `[Booking] Failed to acquire lock for callId=${callId} — concurrent request already holds it`,
        );
        const toolCallId = payload.message?.toolCalls?.[0]?.id;
        return {
          results: [
            {
              toolCallId,
              result:
                'Your appointment is currently being booked. Please hold on for a moment while I confirm the details.',
            },
          ],
        };
      }

      this.logger.log(`[Booking] Lock acquired for callId=${callId}`);
    }

    try {
      const { toolCalls } = payload.message;
      const toolCall = toolCalls[0];

      const userId =
        payload.message?.call?.metadata?.userId ||
        userID ||
        payload?.message?.assistant?.server?.headers?.userid;
      const knowledgebaseId =
        payload.message?.call?.metadata?.knowledgebaseId ||
        payload?.message?.assistant?.server?.headers?.knowledgebaseId;

      const campaignId = payload.message?.call?.metadata?.campaignId ?? null;
      const targetAudienceId =
        payload.message?.call?.metadata?.targetAudienceId;

      const custmoerContactNumber = payload.message?.customer?.number;

      const { name, arguments: toolCallParameters } = toolCall.function;

      const {
        _email,
        _dateAndTime,
        _fullName,
        _address,
        _firstQuestion,
        _secondQuestion,
        _thirdQuestion,
      } = toolCallParameters;

      if (!_email || !_dateAndTime || !_fullName) {
        return {
          results: [
            {
              toolCallId: toolCall.id,
              result: `Required fields missing.`,
            },
          ],
        };
      }

      //  fetch user + calendar settings in parallel
      const [userData, calenderDataRaw] = await Promise.all([
        this.db.collection('users').findOne({ _id: new ObjectId(userId) }),
        this.googleCalenderService.findCalenderSettingByKbid(knowledgebaseId),
      ]);

      if (!userData) throw new Error('User not found');

      let calenderData: any = calenderDataRaw;
      if (!calenderData) {
        calenderData = {
          email: userData?.email,
          timezone: 'Asia/Kolkata',
          duration: '30',
        };
      }

      const adminTimeZone = calenderData.timezone;

      // Ensure year
      let dateInput = _dateAndTime.trim();
      if (!/\b\d{4}\b/.test(dateInput)) {
        dateInput = `${new Date().getFullYear()} ${dateInput}`;
      }

      const parsedDate = chrono.parseDate(dateInput);
      if (!parsedDate) throw new Error('Invalid date');

      // FORCE admin timezone correctly
      const adminLocalMoment = moment.tz(
        moment(parsedDate).format('YYYY-MM-DD HH:mm:ss'),
        'YYYY-MM-DD HH:mm:ss',
        adminTimeZone,
      );

      const nowInAdminTZ = moment().tz(adminTimeZone);

      if (adminLocalMoment.isBefore(nowInAdminTZ)) {
        return {
          results: [
            {
              toolCallId: toolCall.id,
              result: `Invalid or past date provided`,
            },
          ],
        };
      }

      let calendarIntegrated = true;
      let regenerateData = null;

      try {
        regenerateData = await this.googleCalenderService.regenerateAccessToken(
          calenderData.refreshToken,
          calenderData.globalTime,
          adminLocalMoment.format('YYYY-MM-DD'),
          calenderData.duration,
          adminTimeZone,
        );
      } catch {
        calendarIntegrated = false;
      }

      let result: any;

      if (calendarIntegrated) {
        result = await this.googleCalenderService.bookSlotForVoicebot(
          regenerateData.accessToken,
          adminLocalMoment.format(),
          _email,
          Number(calenderData.duration),
          adminTimeZone,
          'VoiceBot',
        );
        this.logger.log(
          `Meeting booked successfully: start=${result.startTime}, end=${result.endTime}`,
        );
      } else {
        result = {
          startTime: adminLocalMoment.toDate(),
          endTime: adminLocalMoment
            .clone()
            .add(Number(calenderData.duration), 'minutes')
            .toDate(),
          meetingLink: null,
        };
        this.logger.warn(
          `Calendar issue detected. Proceeding with fallback meeting: start=${result.startTime}, end=${result.endTime}`,
        );
      }
      const [firstName = '', lastName = ''] = _fullName.trim().split(' ');
      const startTime = moment(result.startTime).tz(adminTimeZone);
      const endTime = moment(result.endTime).tz(adminTimeZone);

      // post-booking writes + fetches in parallel
      const [, , campaignDoc, settingData] = await Promise.all([
        // Update target audience (fire only if id present)
        targetAudienceId
          ? this.db
              .collection('targetAudiences')
              .updateOne(
                { _id: new ObjectId(targetAudienceId) },
                { $set: { callEndedReason: 'completed' } },
              )
          : Promise.resolve(null),

        // Insert meeting record
        this.updateGoogleCalenderMeetingIntoCollection({
          meetingType: meetingType.VoiceBot,
          status: meetingStatus.Scheduled,
          startTime: startTime.toDate(),
          endTime: endTime.toDate(),
          userId: userId,
          attendees: [
            { email: calenderData.email, role: 'Host' },
            { email: _email, name: _fullName, role: 'Participant' },
          ],
          agenda: `Meeting scheduled for interaction with ${_fullName}`,
          description: `Meeting booked by ${_fullName}`,
          hostEmail: calenderData.email,
          meetingLink: result?.meetingLink,
          isMeetingBookedOnGoogleMeet: calendarIntegrated,
          campaignId: campaignId ?? null,
          targetAudienceId: targetAudienceId ?? null,
        }),

        // Fetch campaign (for custom questions)
        campaignId
          ? this.db
              .collection(VOICE_BOT_CAMPAIGN_SCHEMA)
              .findOne({ _id: new ObjectId(campaignId) })
          : Promise.resolve(null),

        // Fetch voicebot reminder settings
        calendarIntegrated
          ? this.db
              .collection('voicebotsetting')
              .findOne(
                { userId },
                { projection: { setReminderBeforeMeeting: 1, email: 1 } },
              )
          : Promise.resolve(null),
      ]);

      // Build custom questions from pre-fetched campaign doc
      let customQuestions: Array<{ question: string; answer: string }> = [];
      if (campaignDoc) {
        customQuestions = [
          campaignDoc?.customQuestions?.firstQuestion
            ? {
                question: campaignDoc.customQuestions.firstQuestion,
                answer: _firstQuestion ?? '',
              }
            : null,
          campaignDoc?.customQuestions?.secondQuestion
            ? {
                question: campaignDoc.customQuestions.secondQuestion,
                answer: _secondQuestion ?? '',
              }
            : null,
          campaignDoc?.customQuestions?.thirdQuestion
            ? {
                question: campaignDoc.customQuestions.thirdQuestion,
                answer: _thirdQuestion ?? '',
              }
            : null,
        ].filter(Boolean);
      }

      // Update or insert lead
      const data = await this.leadCollection.updateOne(
        {
          email: _email,
          IsLeadType: IsLeadType.voiceBot,
          userId: userId,
          campaignId,
        },
        {
          $set: {
            email: _email,
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            address: _address,
            phone: custmoerContactNumber,
            IsLeadType: IsLeadType.voiceBot,
            standAloneAssistant: null,
            updatedAt: new Date(),
            isSyncedToCrm: false,
            knowledgebaseId,
            userId,
            chatSessionId: null,
            chatbotType: null,
            fieldStatus: null,
            campaignId,
            customQuestions,
            isMeetingBookedOnGoogleMeet: calendarIntegrated,
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );

      // Fire-and-forget: email confirmation (never blocks response)
      this.emailService
        .sendMeetingConfirmationToLead(
          _email,
          _fullName,
          adminLocalMoment.format('MMMM Do, YYYY'),
          {
            startTime: startTime.tz(adminTimeZone).format('hh:mm A'),
            endTime: endTime.tz(adminTimeZone).format('hh:mm A'),
            fullDateTime: adminLocalMoment
              .tz(adminTimeZone)
              .format('dddd, MMMM Do YYYY [at] hh:mm A'),
            timezone: adminTimeZone,
          },
          calendarIntegrated,
          IsLeadType.voiceBot,
          userId,
        )
        .catch((emailError) =>
          this.logger.error(
            `Error sending meeting confirmation email to lead (${_email}):`,
            emailError?.message,
          ),
        );

      if (data.upsertedCount > 0) {
        this.logger.log('✅ New lead inserted:', data.upsertedId);

        // Fire-and-forget: campaign counter + webhook dispatch
        (async () => {
          try {
            await Promise.all([
              // Increment campaign success counter
              campaignId
                ? this.db
                    .collection(VOICE_BOT_CAMPAIGN_SCHEMA)
                    .findOneAndUpdate(
                      { _id: new ObjectId(campaignId) },
                      {
                        $inc: { successCalls: 1 },
                        $set: { updatedAt: new Date() },
                      },
                      { returnDocument: 'after' },
                    )
                : Promise.resolve(null),

              // Process Ultimabot webhooks
              (async () => {
                try {
                  const webhooks = await this.db
                    .collection(USER_ULTIMABOT_WEBHOOK_COLLECTION)
                    .find({
                      userId: userId,
                      webhookType: { $ne: 'syncAllLeads' },
                    })
                    .toArray();

                  for (const webhook of webhooks) {
                    try {
                      this.zapierWebhookService.sendLeadViaWebhookPayloadToZapier(
                        webhook?.webhookUrl,
                        webhook?.requestType,
                        {
                          syncId: data.upsertedId
                            ? data.upsertedId.toHexString()
                            : '',
                          name: _fullName ?? '',
                          email: _email ?? '',
                          phone: custmoerContactNumber ?? '',
                          address: _address ?? '',
                        },
                      );
                    } catch (webhookError) {
                      this.logger.error(
                        `Error sending to Ultimabot webhook (${webhook?.webhookUrl}):`,
                        webhookError.message,
                      );
                    }
                  }
                } catch (error) {
                  this.logger.error(
                    'Error processing Ultimabot webhooks:',
                    error.message,
                  );
                }
              })(),
            ]);
          } catch (err) {
            this.logger.error(
              'Error in post-upsert background tasks:',
              err?.message,
            );
          }
        })();
      } else if (data.modifiedCount > 0) {
        this.logger.log('✏️ Existing lead updated');
      } else {
        this.logger.log('⚠️ No changes made (document already up to date)');
      }

      // Schedule reminders using already-fetched settingData
      if (calendarIntegrated) {
        const reminderTimes = Array.isArray(
          settingData?.setReminderBeforeMeeting,
        )
          ? settingData.setReminderBeforeMeeting
          : [15];

        await Promise.all(
          reminderTimes.map((minutesBefore) => {
            const reminderMoment = adminLocalMoment
              .clone()
              .subtract(minutesBefore, 'minutes');

            if (reminderMoment.isBefore(moment().tz(adminTimeZone))) {
              this.logger.warn(
                `⏳ Skipping ${minutesBefore}-minute reminder — it's already in the past for ${_email}`,
              );
              return;
            }

            this.logger.log(
              `📅 Scheduling ${minutesBefore}-minute reminder for ${_email} at ${reminderMoment.format()}`,
            );

            return this.bullMqService.addMeetingNotification({
              email: _email,
              name: _fullName,
              reminderTime: reminderMoment.toDate(),
              userPhoneNumber: custmoerContactNumber,
              meetDate: adminLocalMoment.toDate(),
              userId,
              jobId: `reminder-${userId}-${_email}-${minutesBefore}`,
            });
          }),
        );
      }

      const message = calendarIntegrated
        ? `Great! Your meeting is confirmed for ${adminLocalMoment.format(
            'dddd, MMMM Do YYYY [at] h:mm A',
          )} (${adminTimeZone}). A calendar invite has been sent to ${_email}.`
        : `Your appointment is noted for ${adminLocalMoment.format(
            'dddd, MMMM Do YYYY [at] h:mm A',
          )} (${adminTimeZone}). However, someone from our team will reach out to you and confirm the appointment.`;

      // Mark booking as completed so any future duplicate tool calls within this call are rejected
      if (lockKey) {
        await this.redisClient.set(
          lockKey,
          'COMPLETED',
          'EX',
          BOOKING_DONE_TTL_SECONDS,
        );
        this.logger.log(`[Booking] Lock marked COMPLETED for callId=${callId}`);
      }

      return {
        results: [
          {
            toolCallId: toolCall.id,
            result: message,
          },
        ],
      };
    } catch (error) {
      this.logger.error(
        'Error in the book appointment handler:',
        error.message,
      );

      // Release the lock on failure so the bot can retry
      if (lockKey) {
        await this.redisClient
          .del(lockKey)
          .catch((redisErr) =>
            this.logger.error(
              `[Booking] Failed to release lock for callId=${callId}:`,
              redisErr?.message,
            ),
          );
        this.logger.log(
          `[Booking] Lock released (due to error) for callId=${callId}`,
        );
      }

      throw new HttpException(
        'Something went wrong while booking the appointment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async buildVoicebotReturningUserSummary(
    email: string | undefined,
    phone: string | undefined,
    userId: string,
  ): Promise<string> {
    try {
      // Need at least one identifier to query with
      const orConditions: any[] = [];
      if (email) orConditions.push({ email });
      if (phone) orConditions.push({ phone });

      if (orConditions.length === 0) {
        this.logger.warn(
          '[ReturningUser] No email or phone provided — skipping lookup',
        );
        return '';
      }

      if (!userId) {
        this.logger.warn(
          '[ReturningUser] No userId provided — skipping lookup',
        );
        return '';
      }

      // Find the most recent lead matching email or phone for this userId
      let existingLead: any = null;
      try {
        existingLead = await this.leadCollection.findOne(
          { $or: orConditions, userId },
          { sort: { createdAt: -1 } },
        );
      } catch (dbErr) {
        this.logger.warn(
          '[ReturningUser] DB error during lead lookup (non-blocking):',
          dbErr?.message || dbErr,
        );
        return '';
      }

      if (!existingLead) {
        this.logger.debug('[ReturningUser] No existing lead found - new user');
        return '';
      }

      this.logger.log(
        `[ReturningUser] Found existing lead - IsLeadType: ${existingLead.IsLeadType}, createdAt: ${existingLead.createdAt}`,
      );

      const summaryLines: string[] = [];

      // ── Channel / Lead type — mapped to a human-friendly label ───────────
      if (existingLead.IsLeadType) {
        const channelLabel: Record<string, string> = {
          voiceBot: 'VoiceBot',
          chatBot: 'ChatBot',
          mailBot: 'EmailBot',
          zapierCrm: 'Zapier CRM',
        };
        const label =
          channelLabel[existingLead.IsLeadType] || existingLead.IsLeadType;
        summaryLines.push(`Previously interacted via: ${label}`);
      }

      // ── Visit timestamps ─────────────────────────────────────────────────
      if (existingLead.name) {
        summaryLines.push(`Name: ${existingLead.name}`);
      }
      if (existingLead?.firstName || existingLead?.lastName) {
        summaryLines.push(
          `Full Name: ${[existingLead?.firstName, existingLead?.lastName]
            .filter(Boolean)
            .join(' ')}`,
        );
      }
      if (existingLead?.email) {
        summaryLines.push(`Email: ${existingLead.email}`);
      }

      if (existingLead.phone) {
        summaryLines.push(`Phone: ${existingLead.phone}`);
      }

      if (existingLead.createdAt) {
        summaryLines.push(
          `First visited on: ${new Date(
            existingLead.createdAt,
          ).toLocaleString()}`,
        );
      }
      if (existingLead.updatedAt) {
        summaryLines.push(
          `Last visited on: ${new Date(
            existingLead.updatedAt,
          ).toLocaleString()}`,
        );
      }
      if (existingLead.isAppointmentBooked && existingLead.meetingDateAndTime) {
        summaryLines.push(
          `Last Appointment booked on: ${new Date(
            existingLead.meetingDateAndTime,
          ).toLocaleString()}`,
        );
      }

      if (existingLead.campaignDetails?.campaignName) {
        summaryLines.push(
          `Previous campaign: ${existingLead.campaignDetails.campaignName}`,
        );
      }

      // ── Conversation summary — routed inline by IsLeadType ───────────────
      let conversationSummary = '';
      try {
        if (!existingLead.IsLeadType) {
          // No lead type — skip conversation summary
          conversationSummary = '';
        } else if (existingLead.IsLeadType === IsLeadType.voiceBot) {
          // voiceBot: callSummery is a plain string stored directly on the lead
          conversationSummary = existingLead.callSummery?.trim() || '';
        } else if (existingLead.IsLeadType === IsLeadType.chatBot) {
          // chatBot: fetch messages[] from linked chat session via chatSessionId
          if (!existingLead.chatSessionId) {
            this.logger.warn(
              '[ReturningUser] chatBot lead missing chatSessionId',
            );
          } else {
            let chatSession: any = null;
            try {
              chatSession = await this.db
                .collection(CHAT_SESSION_COLLECTION)
                .findOne({ _id: new ObjectId(existingLead.chatSessionId) });
            } catch (dbErr) {
              this.logger.warn(
                `[ReturningUser] DB error fetching chatSession (${existingLead.chatSessionId}):`,
                dbErr?.message || dbErr,
              );
            }

            if (!chatSession) {
              this.logger.warn(
                `[ReturningUser] chatSession not found for id: ${existingLead.chatSessionId}`,
              );
            } else if (!Array.isArray(chatSession.messages)) {
              this.logger.warn(
                '[ReturningUser] chatSession.messages is not an array',
              );
            } else {
              conversationSummary = chatSession.messages
                .filter((m: any) => {
                  if (!m || typeof m !== 'object') return false;
                  // Skip internal slot-extraction entries.
                  // These look like: { q: 'user@email.com', a: '{"date":"2026-03-13"}' }
                  // and have no aTokens. Identified by 'a' being JSON with only a 'date' key.
                  try {
                    const p = JSON.parse(m.a);
                    if (
                      p &&
                      typeof p === 'object' &&
                      !Array.isArray(p) &&
                      Object.keys(p).length === 1 &&
                      'date' in p
                    ) {
                      return false;
                    }
                  } catch {
                    // m.a is not JSON → it's a real bot reply → keep it
                  }
                  return true;
                })
                .slice(0, 20) // cap at 20 turns to avoid token overflow
                .map((m: any, i: number) => {
                  try {
                    return `  Turn ${i + 1} — User: ${m.q || ''} | Bot: ${
                      m.a || ''
                    }`;
                  } catch {
                    return '';
                  }
                })
                .filter(Boolean)
                .join('\n');
            }
          }
        } else if (existingLead.IsLeadType === IsLeadType.mailBot) {
          // mailBot: fetch emailConversation[] via emailConversationId
          if (!existingLead.emailConversationId) {
            this.logger.warn(
              '[ReturningUser] mailBot lead missing emailConversationId',
            );
          } else {
            let emailConvDoc: any = null;
            try {
              emailConvDoc = await this.db
                .collection(CAMPAIGN_EMAIL_CONVERSATION_COLLECTION)
                .findOne({
                  _id: new ObjectId(existingLead.emailConversationId),
                });
            } catch (dbErr) {
              this.logger.warn(
                `[ReturningUser] DB error fetching emailConversation (${existingLead.emailConversationId}):`,
                dbErr?.message || dbErr,
              );
            }

            if (!emailConvDoc) {
              this.logger.warn(
                `[ReturningUser] emailConversation not found for id: ${existingLead.emailConversationId}`,
              );
            } else {
              const turns = emailConvDoc.emailConversation;
              if (!Array.isArray(turns) || turns.length === 0) {
                this.logger.warn(
                  '[ReturningUser] mailBot emailConversation.emailConversation is empty or not an array',
                );
              } else {
                const lines: string[] = [];
                if (emailConvDoc.subject) {
                  lines.push(`Subject: ${emailConvDoc.subject}`);
                }
                turns
                  .filter(
                    (t: any) =>
                      t !== null && t !== undefined && typeof t === 'object',
                  )
                  .slice(0, 20)
                  .forEach((turn: any, i: number) => {
                    try {
                      // Strip HTML tags from emailTextContent for clean readable text
                      const rawText = (turn.emailTextContent || '')
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                      if (!rawText) return;
                      const direction = turn.isReceivedEmail
                        ? 'User'
                        : turn.isAutoReply
                        ? 'Bot (auto-reply)'
                        : 'Bot';
                      lines.push(`  Email ${i + 1} — ${direction}: ${rawText}`);
                    } catch {
                      // skip malformed turn silently
                    }
                  });
                conversationSummary = lines.join('\n');
              }
            }
          }
        } else if (existingLead.IsLeadType === IsLeadType.zapierCrm) {
          if (
            !existingLead.chatMessage ||
            !Array.isArray(existingLead.chatMessage) ||
            existingLead.chatMessage.length === 0
          ) {
            conversationSummary = '';
          } else {
            conversationSummary = existingLead.chatMessage
              .filter(
                (m: any) =>
                  m !== null && m !== undefined && typeof m === 'object',
              )
              .slice(0, 20)
              .map((m: any, i: number) => {
                try {
                  // ZapierCrm uses 'query' key instead of 'q'
                  const q = m.query || m.q || '';
                  return q ? `  Message ${i + 1} — User: ${q}` : '';
                } catch {
                  return '';
                }
              })
              .filter(Boolean)
              .join('\n');
          }
        }
      } catch (summaryErr) {
        this.logger.warn(
          '[ReturningUser] Error building conversation summary (non-blocking):',
          summaryErr?.message || summaryErr,
        );
        conversationSummary = '';
      }

      if (conversationSummary) {
        summaryLines.push(`\nPrevious conversation:\n${conversationSummary}`);
      }

      if (summaryLines.length === 0) return '';

      const contextBlock = [
        '[RETURNING CUSTOMER CONTEXT]',
        summaryLines.join('\n'),
        '',
        'Instructions for AI (VoiceBot):',
        '- This is a returning customer. You MUST greet them warmly by name if name is available.',
        '- If previous interaction is available, you MUST mention it. Example: "I can see you previously reached out to us via our VoiceBot."',
        '- If first visit date is available, you MUST mention it. Example: "You first reached out to us on [date]."',
        '- If last visit date is available, you MUST mention it. Example: "We last heard from you on [date]."',
        '- If phone is available, you MUST reference it. Example: "We have your contact number on file."',
        '- If email is available, you MUST confirm it. Example: "We will send the details to [email]."',
        '- If a previous appointment is available, you MUST mention it. Example: "I can see you had a meeting with us on [date]."',
        '- If a previous campaign is available, you MUST reference it. Example: "I see you were part of our [campaign name]."',
        '- If a previous conversation summary is available, you MUST include a brief summary of it in the reply so the user knows we remember their previous interaction. Example: "Last time you were asking about [topic] and we discussed [key points] — let me continue from there."',
        '- You MUST explicitly tell the user what was discussed or asked in the previous conversation, so they feel acknowledged and recognized.',
        '- If any previous question or issue was unresolved, you MUST proactively bring it up. Example: "I noticed your previous query about [topic] may not have been fully resolved — let me help with that now."',
        '- ONLY mention fields that are actually present in the context above. Do NOT assume or fabricate anything.',
        '- Do NOT expose raw field names, JSON, enum values, or ISO timestamps in the email.',
        '- Convert all dates to human-readable format.',
        '- Keep tone warm, professional, and natural.',
        '[END CONTEXT]',
      ].join('\n');

      this.logger.log(
        '[ReturningUser] Context block built successfully for returning voicebot user',
      );
      return `\n\n${contextBlock}`;
    } catch (err) {
      // Non-blocking — any unexpected failure just skips the summary
      this.logger.warn(
        '[ReturningUser] Unexpected error in buildVoicebotReturningUserSummary (non-blocking):',
        err?.message || err,
      );
      return '';
    }
  }

  async updateGoogleCalenderMeetingIntoCollection(data: GoogleCalendarMeeting) {
    try {
      const meetingData = {
        startTime: data.startTime,
        endTime: data.endTime,
        userId: data.userId,
        attendees: data.attendees || [],
        agenda: data.agenda,
        meetingType: data.meetingType,
        description: data.description,
        hostEmail: data.hostEmail,
        status: meetingStatus.Scheduled,
        meetingLink: data.meetingLink || '',
        campaignId: data.campaignId ?? null,
        targetAudienceId: data.targetAudienceId ?? null,
        isMeetingBookedOnGoogleMeet: data.isMeetingBookedOnGoogleMeet,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.googleCalenderMeetingCollection.insertOne(
        meetingData,
      );

      if (!result.acknowledged) {
        throw new Error('Failed to insert meeting data');
      }

      return result.insertedId;
    } catch (error) {
      this.logger.error(
        'Error in updating google calendar meeting collection: ' +
          error.message,
      );
      throw new HttpException(
        'Error in updating google calendar meeting collection: ' +
          error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async formatDate(isoString) {
    const date = new Date(isoString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async addToSuppressNumberHandler(payload: any, userID: string) {
    try {
      // VAPI may use either 'toolCalls' or 'toolCallList' depending on version
      const rawToolCalls =
        payload.message?.toolCalls ||
        payload.message?.toolCallList ||
        payload.message?.toolCallResults ||
        [];
      const toolCall = rawToolCalls[0];

      this.logger.log('Extracted tool call for suppress number');
      this.logger.log(
        'Payload message keys:',
        Object.keys(payload.message || {}),
      );

      const userId = payload.message?.call?.metadata?.userId || userID;
      const customerContactNumber =
        payload.message?.customer?.number ||
        payload.message?.call?.customer?.number ||
        payload.message?.call?.metadata?.callerNumber ||
        null;

      this.logger.log(
        `Resolved customerContactNumber: ${customerContactNumber}`,
      );

      if (!customerContactNumber) {
        this.logger.warn(
          'No customer phone number found in payload. Payload message: ' +
            JSON.stringify(payload.message),
        );
        return {
          results: [
            {
              toolCallId: toolCall?.id,
              result: 'Phone number is required to add to suppress list.',
            },
          ],
        };
      }

      this.logger.log(`Phone number to suppress: ${customerContactNumber}`);

      // Add phone number to suppress list
      const existingDoc = await this.db
        .collection('blockSuppressionPhoneList')
        .findOne({
          userId: new ObjectId(userId),
        });

      if (existingDoc) {
        // If document exists, add number to suppressNumbers if not already present
        await this.db.collection('blockSuppressionPhoneList').updateOne(
          { userId: new ObjectId(userId) },
          {
            $addToSet: { suppressNumbers: customerContactNumber },
            $set: { updatedAt: new Date() },
          },
        );
      } else {
        // If not exists, insert new document with number in suppressNumbers array
        await this.db.collection('blockSuppressionPhoneList').insertOne({
          userId: new ObjectId(userId),
          suppressNumbers: [customerContactNumber],
          blockedNumbers: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      this.logger.log(
        `Successfully added ${customerContactNumber} to suppress list for userId: ${userId}`,
      );

      return {
        results: [
          {
            toolCallId: toolCall?.id,
            result: `Phone number ${customerContactNumber} has been added to the suppress list.`,
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in addToSuppressNumberHandler:', error.message);
      this.logger.error('Payload dump:', JSON.stringify(error.stack));
      throw new HttpException(
        error.message || 'Something went wrong while adding to suppress list',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
