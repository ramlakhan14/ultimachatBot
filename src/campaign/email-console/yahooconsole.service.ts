import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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

@Injectable()
export class YahooAuthService {
  private readonly tokenEndpoint =
    'https://api.login.yahoo.com/oauth2/get_token';
  private readonly userInfoEndpoint =
    'https://api.login.yahoo.com/openid/v1/userinfo';
  private readonly revokeEndpoint = 'https://api.login.yahoo.com/oauth2/revoke';
  private readonly tokenRepository: Collection<CampaignUserEmailToken>;
  private readonly emailAndPassKey: Collection<CampaignEmailPasskey>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private httpService: HttpService,
  ) {
    this.tokenRepository = this.db.collection<CampaignUserEmailToken>(
      CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
    );
    this.emailAndPassKey = this.db.collection<CampaignEmailPasskey>(
      CAMPAIGN_EMAIL_PASSKEY_COLLECTION,
    );
  }

  /**
   * Generates Yahoo OAuth2 authentication URL
   * @returns {string} The authorization URL
   */
  generateAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.YAHOO_CLIENT_ID,
      redirect_uri: process.env.YAHOO_REDIRECT_URL,
      response_type: 'code',
      scope: 'openid email profile',
      // scope: 'mail-r mail-w mail-y openid email profile mail-rw sdct-r sdct-w',
    });
    return `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
  }

  /**
   * Handles OAuth2 callback and exchanges code for tokens
   * @param {string} code - The authorization code from Yahoo
   * @returns {Promise<{accessToken: string, refreshToken: string}>} The access and refresh tokens
   */
  async handleCallback(code: string): Promise<{
    serverId: any;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const payload = new URLSearchParams({
        client_id: process.env.YAHOO_CLIENT_ID,
        client_secret: process.env.YAHOO_CLIENT_SECRET,
        redirect_uri: process.env.YAHOO_REDIRECT_URL,
        code,
        grant_type: 'authorization_code',
      });

      const response = await firstValueFrom(
        this.httpService.post(this.tokenEndpoint, payload.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const tokens = response.data;
      if (!tokens) {
        throw new BadRequestException('Failed to retrieve tokens from Yahoo.');
      }

      const userInfo = await this.getUserInfo(tokens.access_token);

      const existingPasskey = await this.emailAndPassKey.findOne({
        email: userInfo.email,
        emailHost: EMAIL_HOST_TYPE.YAHOO,
      });
      await this.storeTokens(userInfo.email, tokens);

      return {
        serverId: existingPasskey?.campaignEmailServerId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
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
      emailHost: EMAIL_HOST_TYPE.YAHOO,
    });

    if (existingPasskey) {
      await this.emailAndPassKey.updateOne(
        { email: email, emailHost: EMAIL_HOST_TYPE.YAHOO },
        { $set: { passkey: encryptedAccessToken } },
      );
    }

    const existingToken = await this.tokenRepository.findOne({
      email: email,
      server: EMAIL_SERVER_TYPE.YAHOO,
    });
    const data: any = {
      accessToken: encryptedAccessToken,
      server: EMAIL_SERVER_TYPE.YAHOO,
      idToken: tokens?.id_token ? tokens.id_token : existingToken.idToken || '',
      tokenType: tokens.token_type,
      tokenExpiryDate: tokens?.expires_in
        ? Date.now() + tokens.expires_in * 1000
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
        { email: email, server: EMAIL_SERVER_TYPE.YAHOO },
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
   * @param {string} email - User's email address
   * @returns {Promise<{accessToken: string, refreshToken: string}>} The stored tokens
   */
  async getStoredToken(email: string): Promise<any> {
    const savedata = await this.tokenRepository.findOne({
      email: email,
      server: EMAIL_SERVER_TYPE.YAHOO,
    });
    return savedata;
  }

  /**
   * Fetches user info from Yahoo
   * @param {string} accessToken - The access token to authenticate the request
   * @returns {Promise<any>} The user's profile info
   */
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.userInfoEndpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }

  /**
   * Refreshes the access token for a user
   * @param {string} email - User's email address
   * @param {string} refreshToken - The refresh token to use for refreshing the access token
   * @returns {Promise<string>} The new access token
   */
  async refreshAccessToken(
    refreshToken: string,
    email?: string,
  ): Promise<string> {
    const decryptedRefreshToken = CryptoService.decryptPasskey(refreshToken);
    const payload = new URLSearchParams({
      client_id: process.env.YAHOO_CLIENT_ID,
      client_secret: process.env.YAHOO_CLIENT_SECRET,
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.tokenEndpoint, payload.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      await this.storeTokens(email, response.data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Revokes the token for a user
   * @param {string} token - The token to be revoked
   * @returns {Promise<any>} The response from Yahoo
   */
  async revokeToken(token: string): Promise<any> {
    try {
      const decryptedToken = CryptoService.decryptPasskey(token);
      const response = await axios.post(
        this.revokeEndpoint,
        `token=${encodeURIComponent(decryptedToken)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Error revoking token: ${error.message}`);
    }
  }
}
