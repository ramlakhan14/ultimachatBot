import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CAMPAIGN_USER_EMAIL_TOKEN_COLLECTION,
  CampaignUserEmailToken,
} from '../schema/campaignUserEmailToken.schema';
import { Collection, Db } from 'mongodb';
import { CryptoService } from '../campaign-utils/crypto.service';
import { CAMPAIGN_EMAIL_PASSKEY_COLLECTION } from '../schema/campaignEmailPasskey.schema';
import { MONGODB } from '../../common/mongo/mongo.module';
import { CampaignEmailPasskey } from '../schema/campaignEmailPasskey.schema';
import { EMAIL_HOST_TYPE, EMAIL_SERVER_TYPE } from '../enum/enum';
import { extractCleanTextContent } from '../campaign-utils/nodeImapEmailParser.service';

@Injectable()
export class MicrosoftAuthService {
  private readonly logger = new Logger('MicrosoftAuthService');

  private readonly tokenRepository: Collection<CampaignUserEmailToken>;
  private readonly emailAndPassKey: Collection<CampaignEmailPasskey>;
  private clientId = process.env.MICROSOFT_CLIENT_ID;
  private clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  private redirectUri = process.env.MICROSOFT_REDIRECT_URL;
  private authUrl = process.env.MICROSOFT_AUTH_URL;

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

  // Step 1: Generate Microsoft OAuth URL
  getAuthUrl(): string {
    const scope =
      'email openid Mail.ReadWrite Mail.Send user.read offline_access IMAP.AccessAsUser.All https://graph.microsoft.com/IMAP.AccessAsUser.All https://graph.microsoft.com/mail.read';

    return `${this.authUrl}/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&response_mode=query&scope=${scope}`;
  }

  // Step 2: Exchange Authorization Code for Tokens
  async getTokens(code: string): Promise<any> {
    const tokenUrl = `${this.authUrl}/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const userProfile = await this.getMicrosoftProfile(
        response.data.access_token,
      );

      const existingPasskey = await this.emailAndPassKey.findOne({
        email: userProfile.mail,
        emailHost: EMAIL_HOST_TYPE.MICROSOFT,
      });

      await this.storeTokens(userProfile.mail, response.data);

      return {
        serverId: existingPasskey?.campaignEmailServerId || '',
        accessToken: response.data?.access_token,
        refreshToken: response.data?.refresh_token,
      };
    } catch (error) {
      this.logger.error('Token exchange failed:', error);
      throw new HttpException('Token exchange failed', HttpStatus.BAD_REQUEST);
    }
  }

  // Step 3: Refresh Access Token
  async refreshAccessToken(refreshToken: string, email?: string): Promise<any> {
    const decryptedRefreshToken = CryptoService.decryptPasskey(refreshToken);
    const tokenUrl = `${this.authUrl}/token`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Update the access token in the database
      const encryptedAccessToken = CryptoService.encryptPasskey(
        response.data.access_token,
      );

      const encryptedRefreshToken = CryptoService.encryptPasskey(
        response.data.refresh_token,
      );

      await this.emailAndPassKey.updateOne(
        { email: email, emailHost: EMAIL_HOST_TYPE.MICROSOFT },
        { $set: { passkey: encryptedAccessToken } },
      );

      await this.tokenRepository.updateOne(
        { email: email, server: EMAIL_SERVER_TYPE.MICROSOFT },
        {
          $set: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiryDate: new Date(
              Date.now() + response.data.expires_in * 1000,
            ),
            tokenExpiresIn: response.data.expires_in,
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new HttpException('Token refresh failed', HttpStatus.BAD_REQUEST);
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
      emailHost: EMAIL_HOST_TYPE.MICROSOFT,
    });

    if (existingPasskey) {
      await this.emailAndPassKey.updateOne(
        { email: email, emailHost: EMAIL_HOST_TYPE.MICROSOFT },
        { $set: { passkey: encryptedAccessToken } },
      );
    }

    const existingToken = await this.tokenRepository.findOne({
      email: email,
      server: EMAIL_SERVER_TYPE.MICROSOFT,
    });
    const data: any = {
      accessToken: encryptedAccessToken,
      server: EMAIL_SERVER_TYPE.MICROSOFT,
      idToken: tokens.id_token,
      tokenType: tokens.token_type,
      tokenExpiryDate: new Date(Date.now() + tokens.expires_in * 1000),
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
        { email: email, server: EMAIL_SERVER_TYPE.MICROSOFT },
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

  async getMicrosoftProfile(accessToken: string): Promise<any> {
    const profileUrl = 'https://graph.microsoft.com/v1.0/me';

    try {
      const response = await firstValueFrom(
        this.httpService.get(profileUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch Microsoft profile:', error);
    }
  }

  async revokeMicrosoftPermissions(
    accessToken: string,
    userEmail: string,
  ): Promise<any> {
    const revokeUrl = `https://graph.microsoft.com/v1.0/users/${userEmail}/revokeSignInSessions`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(revokeUrl, null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data || { message: 'Permissions revoked successfully' };
    } catch (error) {
      this.logger.error('Failed to revoke Microsoft permissions:', error);
      throw new HttpException(
        error.response?.data?.error?.message || 'Failed to revoke permissions',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchEmails(
    accessToken: string,
    date?: string,
    limit?: number,
    offset?: number,
  ): Promise<any> {
    const emails = await this.fetchEmailsData(accessToken, date, limit, offset);
    const parsedEmails = this.parseEmails(emails);
    return parsedEmails;
  }

  async fetchEmailsData(
    accessToken: string,
    date?: string,
    limit?: number,
    offset?: number,
  ): Promise<any> {
    const emailUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?`;
    const queryParams = new URLSearchParams();
    if (date) {
      const last24Hours = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
      queryParams.append(
        '$filter',
        `receivedDateTime ge ${last24Hours.toISOString()}`,
      );
    }
    if (limit) queryParams.append('$top', limit.toString());
    if (offset) queryParams.append('$skip', offset.toString());

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${emailUrl}${queryParams}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data.value;
    } catch (error) {
      this.logger.error('Failed to fetch emails:', error);
    }
  }

  parseEmails(emails: any): any {
    // Clean the email content
    const cleanedInboxEmails = emails.map((email) => ({
      // ...emails,
      id: email.id,
      date: email.receivedDateTime,
      from: email.from.emailAddress.address,
      to: email.toRecipients[0].emailAddress.address,
      subjects: email.subject,
      textContent: extractCleanTextContent(email.body.content),
    }));

    return [...cleanedInboxEmails];
  }
}
