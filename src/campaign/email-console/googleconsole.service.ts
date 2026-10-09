import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { google } from 'googleapis';
import {
  CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
  CampaignUserEmailToken,
} from '../schema/campaignUserEmailToken.schema';
import {
  CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
  CampaignEmailPasskey,
} from '../schema/campaignEmailPasskey.schema';
import { MONGODB } from '../../common/mongo/mongo.module';
import { Collection } from 'mongodb';
import { Db } from 'mongodb';
import { EMAIL_HOST_TYPE, EMAIL_SERVER_TYPE } from '../enum/enum';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { CryptoService } from '../campaign-utils/crypto.service';
import axios from 'axios';
import { AppConfigService } from '../../common/config/appConfig.service';
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger('GoogleAuthService');

  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token';
  private readonly tokenRepository: Collection<CampaignUserEmailToken>;
  private readonly emailAndPassKey: Collection<CampaignEmailPasskey>;
  private readonly googleCalenderCollection: Collection<any>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private httpService: HttpService,
    private appConfigService: AppConfigService,
  ) {
    this.tokenRepository = this.db.collection<CampaignUserEmailToken>(
      CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
    );
    this.emailAndPassKey = this.db.collection<CampaignEmailPasskey>(
      CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
    );
    this.googleCalenderCollection = this.db.collection('googleCalender');
  }

  private oauth2Client = new google.auth.OAuth2(
    this.appConfigService.get('googleClientId'),
    this.appConfigService.get('googleClientSecret'),
    this.appConfigService.get('googleRedirectUrl'),
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

  /**
   * Generates Google OAuth2 authentication URL
   * @author Ankur
   * @returns {string} The authorization URL
   */
  generateAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
    });
  }

  /**
   * Handles OAuth2 callback and exchanges code for tokens
   * @author Ankur
   * @param {string} code - The authorization code from Google
   * @param {string} email - User's email address
   * @returns {Promise<{accessToken: string, refreshToken: string}>} The access and refresh tokens
   */
  async handleCallback(code: string): Promise<{
    serverId: any;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens) {
        throw new BadRequestException('Failed to retrieve tokens from Google.');
      }

      const userInfo = await this.getUserInfo(tokens.access_token);

      // Check if refresh token exists in calendar flow
      const calendarTokens = await this.googleCalenderCollection.findOne({
        email: userInfo.email,
      });


      if (!tokens?.refresh_token) {
        tokens.refresh_token = calendarTokens?.refreshToken;
        await this.storeTokens(userInfo.email, tokens);
      } else {
        await this.storeTokens(userInfo.email, tokens);
        if (tokens.refresh_token) {
          await this.updateCalendarTokens(userInfo.email, tokens);
        }
      }

      const existingPasskey = await this.emailAndPassKey.findOne({
        email: userInfo.email,
        emailHost: EMAIL_HOST_TYPE.GOOGLE,
      });

      return {
        serverId: existingPasskey?.campaignEmailServerId,
        accessToken: tokens?.access_token,
        refreshToken: tokens?.refresh_token,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error during token exchange.',
        error.message,
      );
    }
  }

  /**
   * Stores user tokens in database
   * @author Ankur
   * @param {string} email - User's email address
   * @param {any} tokens - The tokens to store
   */
  async storeTokens(email: string, tokens: any): Promise<void> {
    let encryptedRefreshToken;
    if (tokens.refresh_token && tokens.refresh_token !== '') {
      encryptedRefreshToken = CryptoService.encryptPasskey(
        tokens.refresh_token,
      );
    }

    let encryptedAccessToken;
    if (tokens.access_token && tokens.access_token !== '') {
      encryptedAccessToken = CryptoService.encryptPasskey(tokens.access_token);
    }

    const existingPasskey = await this.emailAndPassKey.findOne({
      email: email,
      emailHost: EMAIL_HOST_TYPE.GOOGLE,
    });

    if (existingPasskey) {
      await this.emailAndPassKey.updateOne(
        { email: email, emailHost: EMAIL_HOST_TYPE.GOOGLE },
        { $set: { passkey: encryptedAccessToken } },
      );
    }

    const existingToken = await this.tokenRepository.findOne({
      email: email,
      server: EMAIL_SERVER_TYPE.GOOGLE,
    });
    const data: any = {
      accessToken: encryptedAccessToken,
      server: EMAIL_SERVER_TYPE.GOOGLE,
      idToken: tokens.id_token,
      tokenType: tokens.token_type,
      tokenExpiryDate: tokens?.expiry_date
        ? tokens.expiry_date
        : existingToken?.tokenExpiryDate,
      tokenExpiresIn: tokens?.expires_in
        ? tokens.expires_in
        : existingToken?.tokenExpiresIn,
      refreshToken: encryptedRefreshToken
        ? encryptedRefreshToken
        : existingToken?.refreshToken,
      scope: tokens.scope,
      updatedAt: new Date(),
    };
    if (existingToken) {
      await this.tokenRepository.updateOne(
        { email: email, server: EMAIL_SERVER_TYPE.GOOGLE },
        { $set: data },
      );
    } else {
      await this.tokenRepository.insertOne({
        email,
        ...data,
        createdAt: new Date(),
      });
    }
  }

  /**
   * Retrieves stored tokens for a user
   * @author Ankur
   * @param {string} email - User's email address
   * @returns {Promise<{accessToken: string, refreshToken: string}>} The stored tokens
   */
  async getStoredToken(email: string): Promise<any> {
    const savedata = await this.tokenRepository.findOne({ email: email });
    return savedata;
  }

  async getUserInfo(accessToken: string): Promise<any> {
    const url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data; // Contains the user's profile info, including email
    } catch (error) {
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }

  /**
   * Refreshes the access token for a user
   * @author Ankur
   * @param {string} email - User's email address
   * @param {string} refreshToken - The refresh token to use for refreshing the access token
   * @returns {Promise<string>} The new access token
   */
  async refreshAccessToken(
    email: string,
    refreshToken: string,
  ): Promise<string> {
    const decryptedRefreshToken = CryptoService.decryptPasskey(refreshToken);
    const payload = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.tokenEndpoint, payload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
      await this.storeTokens(email, response.data);
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  async revokeToken(token: string) {
    try {
      const decryptedToken = CryptoService.decryptPasskey(token);
      const response = await axios.post(
        'https://oauth2.googleapis.com/revoke',
        `token=${encodeURIComponent(decryptedToken)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error revoking token:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  private async updateCalendarTokens(
    email: string,
    tokens: any,
  ): Promise<void> {
    const existingCalendarData = await this.googleCalenderCollection.findOne({
      email,
    });

    if (existingCalendarData) {
      await this.googleCalenderCollection.updateOne(
        { email },
        {
          $set: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            updatedAt: new Date(),
          },
        },
      );
    } else {
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
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}
