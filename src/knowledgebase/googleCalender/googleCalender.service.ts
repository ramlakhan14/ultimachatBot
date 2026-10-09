import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { MONGODB } from '../../common/mongo/mongo.module';

import {
  googleCalender,
  GOOGLECALENDER_COLLECTION,
} from './googleCalender.schema';
import { CreateAppointmentDto } from './calender.dto';
import { UserSparse } from '../../user/user.schema';
import { Role } from '../../auth/types/role.enum';
import { checkUserIsOwnerOfKb } from '../knowledgebase-utils';
import { KnowledgebaseDbService } from '../knowledgebase-db.service';
import { google } from 'googleapis';
import { GoogleAuthService } from '../../campaign/email-console/googleconsole.service';
// import * as moment from 'moment';
import * as moment from 'moment-timezone';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { EmailService } from '../../common/email/email.service';
import { AppConfigService } from '../../common/config/appConfig.service';

export class GoogleCalenderService {
  private readonly logger = new Logger('GoogleCalenderService');

  private readonly googleCalenderCollection: Collection<googleCalender>;
  constructor(
    @Inject(MONGODB) private db: Db,
    private kbDbService: KnowledgebaseDbService,
    private googleAuthService: GoogleAuthService,
    private emailService: EmailService,
    private appConfigService: AppConfigService,
  ) {
    this.googleCalenderCollection = this.db.collection<googleCalender>(
      GOOGLECALENDER_COLLECTION,
    );
  }

  private oauth2Client = new google.auth.OAuth2(
    this.appConfigService.get('googleClientId'),
    this.appConfigService.get('googleClientSecret'),
    this.appConfigService.get('googleCalenderRedirectUrl'),
  );

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.insert',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/calendar',
    'https://mail.google.com/',
    'email',
    'https://www.googleapis.com/auth/contacts.readonly',
  ];

  generateAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
    });
  }

  async handleCalenderCallback(code: string) {
    try {
      if (!code) {
        throw new HttpException(
          'Authorization code or email not provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens) {
        throw new HttpException(
          'Failed to retrieve tokens from Google.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // if (!tokens.refresh_token) {
      //   throw new BadRequestException(
      //     'This email is already linked to another project. Please revoke the existing connection before using it here',
      //   );
      // }

      const userInfo = await this.googleAuthService.getUserInfo(
        tokens.access_token,
      );

      if (!userInfo) {
        throw new HttpException('User Details Not Found', HttpStatus.NOT_FOUND);
      }

      // First check if tokens exist in Google Console flow
      const existingConsoleTokens = await this.googleAuthService.getStoredToken(
        userInfo.email,
      );

      if (existingConsoleTokens?.refreshToken && !tokens?.refresh_token) {
        const decryptedRefreshToken = CryptoService.decryptPasskey(
          existingConsoleTokens.refreshToken,
        );
        await this.saveRefreshToken(
          userInfo.email,
          tokens.access_token,
          decryptedRefreshToken,
        );
      } else {
        if (tokens?.refresh_token) {
          await this.saveRefreshToken(
            userInfo.email,
            tokens.access_token,
            tokens.refresh_token,
          );
          await this.googleAuthService.storeTokens(userInfo.email, tokens);
        }
      }

      this.oauth2Client.setCredentials(tokens);
      return { userInfo };
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async saveRefreshToken(
    email: string,
    accessToken: string,
    refreshToken: string,
  ) {
    try {
      const existingData = await this.googleCalenderCollection.findOne({
        email,
      });

      const finalRefreshToken = refreshToken;

      if (existingData) {
        await this.googleCalenderCollection.updateOne(
          { email },
          {
            $set: {
              accessToken,
              refreshToken: finalRefreshToken,
              updatedAt: new Date(),
            },
          },
        );
        return;
      }

      await this.googleCalenderCollection.insertOne({
        email,
        knowledgebaseId: null,
        name: '',
        service: '',
        duration: '',
        slotsTiming: [],
        globalTime: {},
        availableSlotsDays: [],
        isActive: false,
        accessToken,
        refreshToken: finalRefreshToken,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return;
    } catch (err) {
      throw new HttpException(
        'Failed to save Refresh Token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async regenerateAccessToken(
    refreshToken: string,
    globalTime?: any,
    date?: any,
    slotDurations?: any,
    timezone?: string,
  ) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      let availableSlots: any;
      if (date) {
        availableSlots = await this.getBusySlots(
          credentials.access_token,
          date,
          globalTime,
          slotDurations,
          refreshToken,
          timezone,
        );
      }
      return { availableSlots, accessToken: credentials.access_token };
    } catch (error) {
      this.logger.error('Error refreshing access token:', error);
      // throw new Error('Unable to refresh access token');
    }
  }

  async getBusySlots(
    accessToken: string,
    date: string,
    globalTime: object,
    slotDurations?: number,
    refreshToken?: string,
    timezone?: string,
    calendarSettings?: googleCalender,
  ) {
    const calendar = google.calendar('v3');

    this.oauth2Client.setCredentials({ access_token: accessToken });

    // Use provided settings or fall back to a DB lookup (backward compat)
    if (!timezone) {
      if (calendarSettings) {
        timezone = calendarSettings.timezone || 'UTC';
      } else {
        const dbSetting = await this.googleCalenderCollection.findOne({
          refreshToken,
        });
        timezone = dbSetting?.timezone || 'UTC';
      }
    }

    // Convert timezone offset to moment timezone format
    const momentTimezone =
      timezone.startsWith('+') || timezone.startsWith('-')
        ? `Etc/GMT${timezone.startsWith('+') ? '-' : '+'}${timezone.substring(
            1,
          )}`
        : timezone;

    // Create timeMin and timeMax in the specified timezone
    const startOfDay = moment.tz(date, momentTimezone).startOf('day');
    const endOfDay = moment.tz(date, momentTimezone).endOf('day');

    try {
      const eventsResponse = await calendar.events.list({
        auth: this.oauth2Client as any,
        calendarId: 'primary',
        timeMin: startOfDay.format(),
        timeMax: endOfDay.format(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = eventsResponse.data.items || [];

      // Filter out declined and all-day events, then map to busy slots
      const busySlots = events
        .filter((event) => {
          const declined = event.attendees?.some(
            (attendee) =>
              attendee.self && attendee.responseStatus === 'declined',
          );
          const isAllDay = !event.start.dateTime;
          return !declined && !isAllDay;
        })
        .map((event) => ({
          start: event.start.dateTime,
          end: event.end.dateTime,
        }));

      // Convert busy slots to the specified timezone and drop zero-duration ones
      const validBusySlots = busySlots
        .map((slot) => ({
          start: moment.tz(slot.start, momentTimezone),
          end: moment.tz(slot.end, momentTimezone),
        }))
        .filter(
          (slot) => moment.duration(slot.end.diff(slot.start)).asMinutes() > 0,
        );

      // Convert to simple HH:mm format for slot calculation
      const formattedBusySlots = validBusySlots.map((slot) => ({
        start: slot.start.format('HH:mm'),
        end: slot.end.format('HH:mm'),
      }));

      return await this.getAvailableSlots(
        date,
        globalTime,
        formattedBusySlots,
        slotDurations,
        refreshToken,
        timezone,
        calendarSettings,
      );
    } catch (error) {
      this.logger.error(
        '[getBusySlots] Error fetching calendar events:',
        error.response?.data || error.message,
      );
      throw new Error('Unable to fetch busy slots');
    }
  }

  async getAvailableSlots(
    date: string,
    globalTime: any,
    busySlots: any,
    slotDuration?: number,
    refreshToken?: string,
    timezone?: string,
    calendarSettings?: googleCalender,
  ) {
    try {
      // Resolve timezone — prefer passed settings, then DB lookup, then UTC
      if (!timezone) {
        if (calendarSettings) {
          timezone = calendarSettings.timezone || 'UTC';
        } else {
          const dbSetting = await this.googleCalenderCollection.findOne({
            refreshToken,
          });
          timezone = dbSetting?.timezone || 'UTC';
        }
      }

      // Convert timezone offset to moment timezone format
      const momentTimezone =
        timezone.startsWith('+') || timezone.startsWith('-')
          ? `Etc/GMT${timezone.startsWith('+') ? '-' : '+'}${timezone.substring(
              1,
            )}`
          : timezone;

      // Fetch the day from the date using the specified timezone
      const dayOfWeek = moment
        .tz(date, momentTimezone)
        .format('dddd')
        .toLowerCase();

      // Resolve calendar settings — prefer passed object, then DB lookup
      let resolvedSettings = calendarSettings;
      if (!resolvedSettings) {
        resolvedSettings = await this.googleCalenderCollection.findOne({
          refreshToken,
        });
      }

      if (!resolvedSettings) {
        this.logger.error('[getAvailableSlots] No calendar settings found');
        return [];
      }

      // Check if day is available
      const availableDays = resolvedSettings.availableSlotsDays || {};

      if (availableDays[dayOfWeek] === false) {
        return [];
      }

      if (
        Object.keys(availableDays).length > 0 &&
        !Object.prototype.hasOwnProperty.call(availableDays, dayOfWeek)
      ) {
        return [];
      }

      // Resolve globalTime from settings if not provided
      if (!globalTime || !globalTime.from || !globalTime.to) {
        if (
          resolvedSettings.globalTime?.from &&
          resolvedSettings.globalTime?.to
        ) {
          globalTime = resolvedSettings.globalTime;
        } else {
          this.logger.error(
            '[getAvailableSlots] No global time settings available',
          );
          return [];
        }
      }

      // Resolve slot duration
      slotDuration =
        slotDuration ||
        (resolvedSettings.duration ? parseInt(resolvedSettings.duration) : 30);

      // Ensure date format is correct using the specified timezone
      const formattedDate = moment
        .tz(date, momentTimezone)
        .format('YYYY-MM-DD');

      // Set up currentTime and endTime in the correct timezone
      let currentTime = moment.tz(
        `${formattedDate} ${globalTime.from}`,
        'YYYY-MM-DD HH:mm',
        momentTimezone,
      );
      const endTime = moment.tz(
        `${formattedDate} ${globalTime.to}`,
        'YYYY-MM-DD HH:mm',
        momentTimezone,
      );

      // Round current time to nearest 15 minutes
      currentTime.minutes(Math.ceil(currentTime.minutes() / 15) * 15);
      currentTime.seconds(0);
      currentTime.milliseconds(0);

      // Adjust start time if scheduling for today (add 30-min buffer)
      const now = moment.tz(moment(), momentTimezone);
      if (moment.tz(formattedDate, momentTimezone).isSame(now, 'day')) {
        const bufferTime = now.clone().add(30, 'minutes');
        bufferTime.minutes(Math.ceil(bufferTime.minutes() / 15) * 15);
        bufferTime.seconds(0);
        bufferTime.milliseconds(0);
        if (bufferTime.isAfter(currentTime)) {
          currentTime = bufferTime;
        }
      }

      // Sort busy slots by start time
      busySlots.sort((a, b) =>
        moment(`${formattedDate} ${a.start}`, 'YYYY-MM-DD HH:mm').diff(
          moment(`${formattedDate} ${b.start}`, 'YYYY-MM-DD HH:mm'),
        ),
      );

      // Pre-convert busy slots to moment objects (outside the loop)
      const momentBusySlots = busySlots.map((slot) => ({
        start: moment.tz(
          `${formattedDate} ${slot.start}`,
          'YYYY-MM-DD HH:mm',
          momentTimezone,
        ),
        end: moment.tz(
          `${formattedDate} ${slot.end}`,
          'YYYY-MM-DD HH:mm',
          momentTimezone,
        ),
      }));

      // Main slot generation loop
      const availableSlots = [];
      while (true) {
        const slotEndTime = currentTime.clone().add(slotDuration, 'minutes');

        // Only allow slots fully within the global time range
        if (slotEndTime.isAfter(endTime)) {
          break;
        }

        const slotStart = currentTime.format('HH:mm');
        const slotEnd = slotEndTime.format('HH:mm');

        // Check if slot overlaps with any busy slot
        const isSlotAvailable = !momentBusySlots.some(
          (busySlot) =>
            !(
              slotEndTime.isSameOrBefore(busySlot.start) ||
              currentTime.isSameOrAfter(busySlot.end)
            ),
        );

        if (isSlotAvailable) {
          availableSlots.push({ start: slotStart, end: slotEnd });
        }

        // Move to next slot
        currentTime.add(slotDuration, 'minutes');

        if (!currentTime.isBefore(endTime)) {
          break;
        }
      }

      return availableSlots;
    } catch (err) {
      this.logger.error(
        '[getAvailableSlots] Error calculating available slots:',
        err,
      );
      throw new Error(`Failed to calculate available slots: ${err.message}`);
    }
  }

  /**
   * Book a slot in Google Calendar in the provided timezone.
   * @param accessToken
   * @param slot - ISO string or date string in the desired timezone
   * @param email
   * @param duration
   * @param metadata
   * @param timezone - (optional) the timezone to use for booking (e.g. 'Asia/Kolkata', 'America/New_York')
   */
  async bookSlot(
    accessToken: string,
    slot: any,
    email: any,
    duration: number,
    metadata?: string,
    timezone?: string,
  ) {
    const desc = metadata || 'ChatBot';

    // Fetch user info from Google
    const userEmail = await this.googleAuthService.getUserInfo(accessToken);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    // If timezone is not provided, try to get it from the user's calendar settings
    let eventTimeZone = timezone;
    if (!eventTimeZone) {
      // Try to get from googleCalenderCollection by user email
      const calendarSetting = await this.googleCalenderCollection.findOne({
        email: userEmail.email,
      });
      eventTimeZone =
        calendarSetting?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        'UTC';
    }

    // Use moment-timezone to parse the slot in the correct timezone
    // slot is expected to be an ISO string or a date string in the provided timezone
    let startDate = moment.tz(slot, eventTimeZone);
    let endDate = startDate.clone().add(duration || 30, 'minutes');

    // Defensive: If slot is a Date object, convert to string
    if (!startDate.isValid()) {
      startDate = moment.tz(new Date(slot).toISOString(), eventTimeZone);
      endDate = startDate.clone().add(duration || 30, 'minutes');
    }

    // Prepare attendees
    const attendeesEmail = [{ email }];
    attendeesEmail.push({ email: userEmail.email });

    const calendar = google.calendar('v3');

    const event = {
      summary: 'Appointment Booking',
      description: `Meeting booked via the ${desc} system.`,
      start: {
        dateTime: startDate.clone().utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
        timeZone: eventTimeZone,
      },
      end: {
        dateTime: endDate.clone().utc().format('YYYY-MM-DDTHH:mm:ss[Z]'),
        timeZone: eventTimeZone,
      },
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      attendees: attendeesEmail,
      reminders: {
        useDefault: false, // disable default reminders
        overrides: [
          {
            method: 'email', //'email'
            minutes: 30, // 30 minutes before event
          },
          {
            method: 'email', //'email'
            minutes: 60, // 60 minutes before event
          },
          {
            method: 'popup', //'popup'
            minutes: 30, // 30 minutes before event
          },
          {
            method: 'popup', //'popup'
            minutes: 60, // 60 minutes before event
          },
        ],
      },
    };

    /* Added By Nidhi Sharma to add the reminder in the meeting*/
    const voicebotSettingData = await this.db
      .collection('voicebotsetting')
      .findOne({ email: userEmail.email });

    if (
      voicebotSettingData?.setReminderBeforeMeeting &&
      Array.isArray(voicebotSettingData.setReminderBeforeMeeting)
    ) {
      event['reminders'] = {
        useDefault: false,
        overrides: voicebotSettingData.setReminderBeforeMeeting.map(
          (minutes: number) => ({
            method: 'email',
            minutes,
          }),
        ),
      };
    }
    /* End */

    try {
      const response = await calendar.events.insert({
        auth: this.oauth2Client as any,
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // this will help us to send the mail to all users
      });
      const data = {
        id: response.data.id,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        meetingLink: response.data.htmlLink,
      };
      return data as any;
    } catch (error) {
      this.logger.error('Error booking event:', error);
      return 'There was an error booking your appointment. Please try again.';
    }
  }

  async bookSlotForVoicebot(
    accessToken: string,
    slot: string, // ISO string WITH offset
    email: string,
    duration: number,
    adminTimeZone: string,
    metadata?: string,
  ) {
    try {
      const desc = metadata || 'ChatBot';

      const userEmail = await this.googleAuthService.getUserInfo(accessToken);

      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const attendeesEmail = [{ email }];
      attendeesEmail.push({ email: userEmail.email });

      // ✅ Parse slot STRICTLY in admin timezone
      const startDate = moment.tz(slot, adminTimeZone);
      const endDate = startDate.clone().add(duration || 30, 'minutes');


      const calendar = google.calendar('v3');

      const event = {
        summary: 'Appointment Booking',
        description: `Meeting booked via the ${desc} system.`,
        start: {
          dateTime: startDate.format(), // ✅ includes timezone offset
          timeZone: adminTimeZone,
        },
        end: {
          dateTime: endDate.format(),
          timeZone: adminTimeZone,
        },
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        attendees: attendeesEmail,
      };

      // ✅ Reminder logic (unchanged)
      const voicebotSettingData = await this.db
        .collection('voicebotsetting')
        .findOne({ email: userEmail.email });

      if (
        voicebotSettingData?.setReminderBeforeMeeting &&
        Array.isArray(voicebotSettingData.setReminderBeforeMeeting)
      ) {
        event['reminders'] = {
          useDefault: false,
          overrides: voicebotSettingData.setReminderBeforeMeeting.map(
            (minutes: number) => ({
              method: 'email',
              minutes,
            }),
          ),
        };
      }


      const response = await calendar.events.insert({
        auth: this.oauth2Client as any,
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });


      return {
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        meetingLink: response.data.htmlLink,
      };
    } catch (error) {
      this.logger.error('Error booking event:', error);
      return 'There was an error booking your appointment. Please try again.';
    }
  }
  private async sendCalendarMeetEmail(
    calendarResponse: any,
    attendeesEmail: string[],
  ) {
    try {
      const startDateTime = new Date(calendarResponse.start.dateTime);
      const meetData = {
        title: calendarResponse.summary,
        date: startDateTime.toLocaleDateString(),
        time: startDateTime.toLocaleTimeString(),
        meetLink: calendarResponse.hangoutLink,
        description: calendarResponse.description,
        hostName: calendarResponse.creator.email,
      };

      // Send email to each attendee
      for (const email of attendeesEmail) {
        await this.emailService.sendGoogleCalendarMeetEmail(
          email,
          'Meeting Invitation: ' + calendarResponse.summary,
          meetData,
        );
      }
    } catch (error) {
      this.logger.error('Error sending calendar meet email:', error);
      throw new HttpException(
        'Error occurred while sending calendar meet email',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async saveSettings(user: UserSparse, payload: CreateAppointmentDto) {
    try {
      const kb = await this.kbDbService.getKnowledgebaseSparseById(
        new ObjectId(payload.knowledgebaseId),
      );
      if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
        checkUserIsOwnerOfKb(user, kb);
      }

      const updateData = {
        name: payload.name,
        knowledgebaseId: new ObjectId(payload.knowledgebaseId),
        email: payload.email,
        service: payload.service,
        duration: payload.duration,
        slotsTiming: payload.slotsTiming,
        globalTime: payload.globalTime,
        isActive: payload.isActive,
        timezone: payload.timezone,
        availableSlotsDays: payload.availableSlotDays,
        updatedAt: new Date(),
      };

      const result = await this.googleCalenderCollection.findOneAndUpdate(
        {
          email: payload.email,
        },
        {
          $set: updateData,
        },
        {
          returnDocument: 'after',
          upsert: true,
        },
      );

      const message = result.lastErrorObject?.upserted
        ? 'Calendar Settings Created Successfully'
        : 'Calendar Settings Updated Successfully';

      Logger.log(message);
      return { message };
    } catch (err) {
      Logger.error(err);
      throw new HttpException(err.message, err.status);
    }
  }

  // async updateSettings(
  //   user: UserSparse,
  //   data: CreateAppointmentDto,
  //   kbId: string,
  //   id: string,
  // ) {
  //   try {
  //     console.log(kbId, 'knowledgebaseId', id);
  //     const kb = await this.kbDbService.getKnowledgebaseSparseById(
  //       new ObjectId(kbId),
  //     );
  //     console.log(kbId, 'knowledgebaseId', id);
  //     if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
  //       checkUserIsOwnerOfKb(user, kb);
  //     }
  //     data.updatedAt = new Date();
  //     const updatedCalenderData =
  //       await this.googleCalenderCollection.findOneAndUpdate(
  //         {
  //           _id: new ObjectId(id),
  //         },
  //         { $set: data },
  //         { returnDocument: 'after' },
  //       );

  //     return updatedCalenderData;
  //   } catch (error) {
  //     console.log(error, 'error occured');
  //     Logger.error(error);
  //     throw new HttpException(
  //       'Failed to Update Calender Settings ',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  async getCalenderSettings(user: UserSparse, kbId: string) {
    try {
      // const kb = await this.kbDbService.getKnowledgebaseSparseById(
      //   new ObjectId(kbId),
      // );
      // if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
      //   checkUserIsOwnerOfKb(user, kb);
      // }
      const calenderData = await this.googleCalenderCollection
        .find({
          knowledgebaseId: new ObjectId(kbId),
        })
        .toArray();
      if (!calenderData) {
        throw new HttpException('Data Not Found', HttpStatus.NOT_FOUND);
      }

      const encryptedCalenderData = calenderData.map((item) => {
        if (item.refreshToken) {
          const encryptedToken = CryptoService.encryptPasskey(
            item.refreshToken,
          );
          return {
            ...item,
            refreshToken: encryptedToken, // Replace with encrypted token
          };
        }
        return item;
      });

      return encryptedCalenderData;
    } catch (error) {
      Logger.error(error);
      throw new HttpException(
        'Failed To Get Calender Data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteCalenderData(user: UserSparse, kbId: string, id: string) {
    try {
      const kb = await this.kbDbService.getKnowledgebaseSparseById(
        new ObjectId(kbId),
      );
      if (!(user.role == Role.Admin && kb.chatbotType == 'vakmangids')) {
        checkUserIsOwnerOfKb(user, kb);
      }
      const calenderData = await this.googleCalenderCollection.findOne({
        knowledgebaseId: new ObjectId(kbId),
      });
      if (!calenderData) {
        throw new HttpException('Data Not Found', HttpStatus.NOT_FOUND);
      }
      await this.googleCalenderCollection.deleteOne({
        _id: new ObjectId(id),
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Calender Data Deleted Successfully',
      };
    } catch (error) {
      Logger.error(error);
      throw new HttpException('Failed To Delete Data', HttpStatus.BAD_REQUEST);
    }
  }

  async deleteCalenderDataForAnyUser(kbId: string) {
    try {
      const calenderData = await this.googleCalenderCollection.findOne({
        knowledgebaseId: new ObjectId(kbId),
      });
      if (!calenderData) {
        throw new HttpException('Data Not Found', HttpStatus.NOT_FOUND);
      }
      await this.googleCalenderCollection.deleteOne({
        knowledgebaseId: new ObjectId(kbId),
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Calender Data Deleted Successfully',
      };
    } catch (error) {
      Logger.error(error);
      throw new HttpException('Failed To Delete Data', HttpStatus.BAD_REQUEST);
    }
  }

  async findCalenderSettingByKbid(kbId: string) {
    return this.googleCalenderCollection.findOne({
      knowledgebaseId: new ObjectId(kbId),
    });
  }

  async revokeCalenderPermissions(kbId: string, token: string) {
    try {
      const decryptedToken = CryptoService.decryptPasskey(token);
      const calenderData = await this.googleCalenderCollection.findOne({
        knowledgebaseId: new ObjectId(kbId),
      });

      const response = await axios.post(
        'https://oauth2.googleapis.com/revoke',
        `token=${encodeURIComponent(decryptedToken)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      await this.deleteCalenderDataForAnyUser(kbId);
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error revoking token:',
        error.response?.data || error.message,
      );
      throw error;
    }
  } // Replace with your authenticated client

  async getBusySlotsForReduceDuplicateBooking(
    accessToken: string,
    date: string,
  ) {
    const calendar = google.calendar('v3');
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const timeMin = new Date(`${date}T00:00:00Z`);
    const timeMax = new Date(`${date}T23:59:59Z`);

    try {
      const response = await calendar.freebusy.query({
        auth: this.oauth2Client as any,
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = response.data.calendars.primary.busy || [];
      const busySlotsInMoment = busySlots.map((slot) => ({
        start: moment.tz(
          slot.start,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ),
        end: moment.tz(
          slot.end,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ),
      }));
      return busySlotsInMoment;
    } catch (error) {
      this.logger.error(
        'Error fetching busy slots:',
        error.response?.data || error.message,
      );
      throw new Error('Unable to fetch busy slots');
    }
  }

  async getTokenFromCalenderSettingUsingEmail(email: string) {
    return this.googleCalenderCollection.findOne({
      email: email,
    });
  }

  async convertToLocalTimeZone(
    _dateAndTime: Date,
    customerTimeZone: string,
    availableSlots: { start: string; end: string }[],
    adminTimeZone: string,
  ): Promise<{
    requestedSlotAvailable: boolean;
    availableSlots: { start: string; end: string }[];
  }> {
    try {

      // Step 1: Parse the customer date/time in their timezone
      const customerMoment = moment.tz(_dateAndTime, customerTimeZone);

      // Step 2: Convert to admin timezone
      const adminMoment = customerMoment.clone().tz(adminTimeZone);
      const adminTime = adminMoment.format('HH:mm');


      // Step 3: Check if the requested time is in any available slot
      const requestedSlotAvailable = availableSlots.some((slot) => {
        return adminTime >= slot.start && adminTime < slot.end;
      });

      return {
        requestedSlotAvailable,
        availableSlots,
      };
    } catch (error) {
      this.logger.error('Error converting to local time:', error);
      throw new HttpException(
        'Error converting to local time',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
