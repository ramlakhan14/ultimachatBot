import {
  Controller,
  Get,
  Query,
  Res,
  Redirect,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MicrosoftAuthService } from './microsoftconsole.service';
import { Response } from 'express';
import { Public } from '../../auth/guards/public.guard';

@Controller('campaign/microsoft')
export class MicrosoftAuthController {
  private readonly logger = new Logger('MicrosoftAuthController');

  constructor(private readonly microsoftAuthService: MicrosoftAuthService) {}

  /**
   * Redirect to Microsoft OAuth2 for authentication (user provides email accounts).
   */
  @Public()
  @Get('auth')
  @Redirect()
  async redirectToMicrosoft() {
    const url = await this.microsoftAuthService.getAuthUrl();
    return { url };
  }

  /**
   * Handle Microsoft OAuth2 callback and exchange code for tokens.
   * @param code The authorization code from Microsoft
   */
  @Public()
  @Get('callback')
  async handleCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const tokens = await this.microsoftAuthService.getTokens(code);
      return res.status(200).json({
        serverId: tokens.serverId,
        message: `Authentication successful!`,
        accessToken: tokens.accessToken,
      });
    } catch (error) {
      this.logger.error('Error in callback:', error);
      return res.status(422).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Authentication failed.',
      });
    }
  }

  /**
   * Refreshes the access token using the refresh token.
   * @param refreshToken The refresh token to use for refreshing the access token.
   */
  @Public()
  @Get('refreshToken')
  async refreshToken(
    @Query('refreshToken') refreshToken: string,
    @Res() res: Response,
  ) {
    try {
      const tokens = await this.microsoftAuthService.refreshAccessToken(
        refreshToken,
      );
      return res.status(200).json({
        message: `Access token refreshed successfully!`,
        accessToken: tokens,
      });
    } catch (error) {
      this.logger.error('Error in refreshing token:', error);
      return res.status(500).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Authentication failed.',
      });
    }
  }

  @Public()
  @Get('revoke')
  async revokeMicrosoftPermissions(
    @Query('accessToken') accessToken: string,
    @Query('userEmail') userEmail: string,
    @Res() res: Response,
  ) {
    const revoke = await this.microsoftAuthService.revokeMicrosoftPermissions(
      accessToken,
      userEmail,
    );
    return res.status(200).json({
      revoke,
    });
  }

  @Public()
  @Get('profile')
  async getMicrosoftProfile(
    @Query('accessToken') accessToken: string,
    @Res() res: Response,
  ) {
    const profile = await this.microsoftAuthService.getMicrosoftProfile(
      accessToken,
    );

    return res.status(200).json({
      profile,
    });
  }

  @Public()
  @Get('fetch-emails')
  async fetchEmails(
    @Res() res: Response,
    @Query('accessToken') accessToken: string,
    @Query('date') date?: Date,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      const emails = await this.microsoftAuthService.fetchEmails(
        accessToken,
        date?.toISOString(),
        limit,
        offset,
      );
      return res.status(200).json({
        emails,
      });
    } catch (error) {
      this.logger.error('Error fetching emails:', error);
      return res.status(500).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to fetch emails.',
      });
    }
  }
}
