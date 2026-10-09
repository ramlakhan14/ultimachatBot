import {
  Controller,
  Get,
  Query,
  Res,
  HttpException,
  Redirect,
  Post,
  Body,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GoogleAuthService } from './googleconsole.service';
import { Response } from 'express';
import { Public } from '../../auth/guards/public.guard';

@Controller('campaign/google')
export class GoogleAuthController {
  private readonly logger = new Logger('GoogleAuthController');

  constructor(private readonly googleAuthService: GoogleAuthService) {}

  /**
   * Redirect to Google OAuth2 for authentication (user provides email accounts).
   */
  @Public()
  @Get('auth')
  @Redirect()
  async redirectToGoogle() {
    const url = await this.googleAuthService.generateAuthUrl();
    return { url };
  }

  /**
   * Handle Google OAuth2 callback and exchange code for tokens.
   * @param code The authorization code from Google
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
      const response = await this.googleAuthService.handleCallback(code);
      return res.status(200).json({
        statusCode: HttpStatus.OK,
        serverId: response?.serverId || '',
        message: `Authentication successful`,
      });
    } catch (error) {
      this.logger.error('Error in callback:', error);
      return res.status(422).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Authentication failed.',
      });
    }
  }

  @Public()
  @Get('refreshToken')
  async refreshAccessToken(
    @Query('email') email: string,
    @Query('refreshToken') refreshToken: string,
    @Res() res: Response,
  ) {
    const refreshAccessToken = await this.googleAuthService.refreshAccessToken(
      email,
      refreshToken,
    );
    return res.status(200).json({
      message: 'Refresh token successful',
      refreshAccessToken,
    });
  }
  @Public()
  @Get('get-stored-token')
  async getStoredToken(@Query('email') email: string, @Res() res: Response) {
    const storedToken = await this.googleAuthService.getStoredToken(email);
    return res.status(200).json({
      message: 'Retrieved stored token successful',
      storedToken,
    });
  }

  @Public()
  @Post('/revokeToken')
  async revokeToken(@Res() res: Response, @Body() data: any) {
    try {
      const { token } = data;
      await this.googleAuthService.revokeToken(token);
      return res.status(200).json({ message: 'Token revoked successfully' });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to revoke token',
        message: error.message,
      });
    }
  }
}
