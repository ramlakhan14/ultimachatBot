import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDTO, OTPDTO } from '../user/user.dto';
import { Throttle } from '@nestjs/throttler';
import { User } from '../user/user.schema';
import {
  AdminLoginDTO,
  ForgotPasswordDTO,
  GoogleAuthDTO,
  ResetPasswordDTO,
} from './auth.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './guards/public.guard';
import { Roles } from './guards/role.enum';
import { JwtToken } from './types/jwt-types.dto';
import { Role, UserState } from './types/role.enum';
import { UserService } from '../user/user.service';
import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response.util';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  /**
   * Checks the user credentials and logs in the user
   * @param userDTO
   * @returns user object and jwt token
   */
  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: Request & { user: User }): Promise<JwtToken> {
    const userData = await this.userService.findUserById(
      req.user._id.toString(),
    );

    // 1.Deleted
    if (userData?.isActive === UserState.Deleted) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Your account has been deleted. Please contact support.',
          isActive: UserState.Deleted,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 2.  OTP not verified
    if (userData?.isActive === UserState.Pending) {
      await this.authService.resendOTP(userData.email);
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'Email Not Verified',
          message: 'Your email is not verified. A new OTP has been sent.',
          email: userData.email,
          isVerified: false,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    //  Deactivated by admin
    if (userData?.isActive === UserState.Inactive) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Your account is deactivated. Please contact support.',
          isActive: UserState.Inactive,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    // 🚀 Initialize if missing
    if (!userData.currentSessionVersion) {
      userData.currentSessionVersion = 1;
    }
    // 🚀 Increment version on every login
    userData.currentSessionVersion += 1;
    return this.authService.getJwtTokenForUser(userData);
  }

  @Post('/signup')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) //  5 req per 60s
  @Public()
  async signup(@Body() data: CreateUserDTO) {
    return this.authService.signup(data);
  }

  @Put('/otp-verification')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) //  5 req per 60s
  @Public()
  async verifyOTP(@Body() body: OTPDTO) {
    return await this.authService.otpVerification(body.email, body.otp);
  }

  @Put('/resend-otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) //  5 req per 60s
  @Public()
  async resendOTP(@Body() body: { email: string }) {
    return await this.authService.resendOTP(body.email);
  }

  @Post('/google-login')
  @Public()
  async googleAuth(@Body() data: GoogleAuthDTO) {
    try {
      return await this.authService.googleAuth(data);
    } catch (error) {
      return ResponseUtil.error(
        error?.message ||
          error?.response ||
          error.response?.data?.message ||
          'Internal Server Error',
        error?.code ||
          error?.status ||
          error?.statusCode ||
          HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin_login')
  @Roles(Role.Admin)
  async adminLogin(@Body() data: AdminLoginDTO): Promise<JwtToken> {
    return this.authService.getJwtTokenForUserAdmin(data.id);
  }

  @Post('/forgotPassword')
  @Public()
  async forgotPassword(
    @Req() req: Request,
    @Body() data: ForgotPasswordDTO,
    @Res() res: Response,
  ) {
    try {
      await this.authService.forgotPassword(data.email);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Password reset email sent successfully',
      });
    } catch (err) {
      return res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: err.message,
      });
    }
  }

  @Patch('/resetPassword')
  @Public()
  async resetPassword(@Body() data: ResetPasswordDTO, @Res() res: Response) {
    try {
      await this.authService.resetPasword(
        data.token,
        data.newPassword,
        data.confirmPassword,
      );
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Password changed Successfully',
      });
    } catch (err) {
      return res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: err.message,
      });
    }
  }

  @Post('verify-captcha')
  @Public()
  async verifyCaptcha(@Body('token') token: string) {
    const data = await this.authService.verifyGoogleCaptcha(token);
    return { success: true, data };
  }
}
