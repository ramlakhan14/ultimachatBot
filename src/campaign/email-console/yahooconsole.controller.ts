import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  Redirect,
  Post,
  Body,
  Param,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { YahooAuthService } from './yahooconsole.service';
import { Response } from 'express';
import { Public } from '../../auth/guards/public.guard';

@Controller('campaign/yahoo')
export class YahooAuthController {
  private readonly logger = new Logger('YahooAuthController');

  constructor(private readonly yahooAuthService: YahooAuthService) {}

  /**
   * Redirect to Yahoo OAuth2 for authentication (user provides email accounts).
   */
  @Public()
  @Get('auth')
  @Redirect()
  async redirectToYahoo() {
    const url = this.yahooAuthService.generateAuthUrl();
    return { url };
  }

  /**
   * Handle Yahoo OAuth2 callback and exchange code for tokens.
   * @param code The authorization code from Yahoo
   */
  @Public()
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('email') email: string,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new HttpException('Authorization code or email not provided.', 400);
    }

    try {
      const tokens = await this.yahooAuthService.handleCallback(code);
      return res.status(200).json({
        message: `Authentication successful!`,
        serverId: tokens.serverId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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
   * Refreshes the access token for a user
   * @param {string} email - User's email address
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<string>} The new access token
   */
  @Public()
  @Post('refreshToken')
  async refreshAccessToken(
    @Body('refreshToken') refreshToken: string,
    @Body('email') email: string,
  ): Promise<{ tokens: any }> {
    const accessToken = await this.yahooAuthService.refreshAccessToken(
      refreshToken,
      email,
    );
    return { tokens: accessToken };
  }

  /**
   * Revokes a given token
   * @param {string} token - The token to revoke
   * @returns {Promise<any>} Revocation result
   */
  @Public()
  @Post('revokeToken')
  async revokeToken(
    @Body('accessToken') accessToken: string,
  ): Promise<{ data: any; message: string }> {
    const response = await this.yahooAuthService.revokeToken(accessToken);
    return { data: response, message: 'Token revoked successfully' };
  }

  /**
   * Retrieves stored tokens for a user
   * @param {string} email - User's email address
   * @returns {Promise<any>} The stored tokens
   */
  @Public()
  @Get('stored-token/:email')
  async getStoredToken(@Param('email') email: string): Promise<any> {
    return await this.yahooAuthService.getStoredToken(email);
  }
}
