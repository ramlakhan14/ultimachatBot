import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../common/config/appConfig.service';
import { CreateUserDTO } from '../user/user.dto';
import { Subscription, USER_COLLECTION, UserSparse } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { GoogleAuthDTO } from './auth.dto';
import { getGoogleUserProfile } from './google-auth';
import { JwtPayload, JwtToken } from './types/jwt-types.dto';
import { EmailService } from '../common/email/email.service';
import { hash, compare } from 'bcrypt';
import { Collection, Db, ObjectId } from 'mongodb';
import { Scrap, SCRAPDATA_COLLECTION } from '../project/project.schema';
import { MONGODB } from '../common/mongo/mongo.module';
import axios from 'axios';
import { UserState } from './types/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  private readonly scrapeCollection: Collection<Scrap>;

  constructor(
    @Inject(MONGODB) private db: Db,
    private jwtService: JwtService,
    private userService: UserService,
    private appConfig: AppConfigService,
    private emailService: EmailService,
  ) {
    this.scrapeCollection = this.db.collection<Scrap>(SCRAPDATA_COLLECTION);
  }

  /**
   * Generates the jet token
   * @param payload
   * @returns the JsonWebToken as string
   */
  private signPayload(payload: JwtPayload) {
    return {
      hasValidSubscription: payload.hasValidSubscription,
      access: this.jwtService.sign(payload),
    };
  }

  /**
   * Validated the user from the JWT token
   * @param payload
   * @returns user object from the payload
   */
  async validateJwtPayload(payload: JwtPayload) {
    const { sub } = payload;
    return this.userService.findUserByIdSparse(sub);
  }

  /**
   * Generate Jwt token from user (used by login controller)
   * @param user .
   * @returns Signed JwtToken
   */
  async getJwtTokenForUser(user: UserSparse): Promise<JwtToken> {
    await this.userService.updateLastLoginTs(user);

    const hasValidSubscription = Boolean(
      user?.activeSubscription &&
        Object.values(Subscription).includes(user.activeSubscription) &&
        user?.subscriptionData?.provider === 'lemonsqueezy' &&
        this.hasActiveAccess(user),
    );

    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionVersion: user.currentSessionVersion,
      hasValidSubscription,
    };

    return this.signPayload(payload);
  }

  private hasActiveAccess(user: UserSparse): boolean {
    const sub = user?.subscriptionData?.data;
    if (!sub) return false;

    const now = new Date();

    if (!sub?.subscriptionId) return false;
    // Active subscription
    if (sub.status === 'active') return true;

    // Cancelled but still valid until period end
    if (
      sub.status === 'cancelled' &&
      sub.endsAt &&
      new Date(sub.endsAt) > now
    ) {
      return true;
    }

    return false;
  }

  async getJwtTokenForUserAdmin(id: string): Promise<JwtToken> {
    const user = await this.userService.findUserByIdSparse(id);

    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: '',
    };

    return this.signPayload(payload);
  }

  /**
   * Validate user based on username / password
   * @param username .
   * @param password .
   * @returns User ob
   */
  async validateEmailPassword(email: string, password: string) {
    return this.userService.findByEmailPassword(email, password);
  }

  /**
   * Signup a new user
   * @param data
   * @returns
   */
  async signup(data: CreateUserDTO) {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email);

    if (!isValidEmail) {
      throw new BadRequestException('Invalid email format');
    }

    const user = await this.userService.createUser(data);

    await this.emailService.sendOTPConformationOnEmail(user.email, user.otp);

    return {
      message: 'Account created. OTP sent to your email.',
      userId: user._id,
      email: user.email,
    };
  }

  async otpVerification(email: string, otp: string) {
    const user = await this.userService.verifyOtp(email, otp);

    const getUser = await this.scrapeCollection.findOne({ email });

    if (getUser) {
      await this.scrapeCollection.findOneAndUpdate(
        { email },
        { $set: { signUpStatus: true } },
      );
    }

    const token = await this.getJwtTokenForUser(user);

    return {
      message: 'OTP verified successfully',
      ...user,
      ...token,
    };
  }

  async resendOTP(email: string) {
    try {
      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
      }
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await this.db
        .collection(USER_COLLECTION)
        .updateOne({ _id: user._id }, { $set: { otp: newOtp, otpExpiresAt } });

      await this.emailService.sendOTPConformationOnEmail(user.email, newOtp);
      return {
        message: 'OTP resent successfully',
      };
    } catch (error) {
      this.logger.error('Error in resendOTP:', error);
      throw new HttpException(
        'Failed to resend OTP. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async googleAuth(data: GoogleAuthDTO) {
    try {
      const userProfile = await getGoogleUserProfile(
        data.token,
        this.appConfig.get('googleClientId'),
      );
      if (!userProfile?.email)
        throw new Error('Invalid Google User profile info');

      let user = await this.userService.getUserByEmail(userProfile.email);

      // 1.Deleted
      if (user?.isActive === UserState.Deleted) {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Your account has been deleted. Please contact support.',
            isActive: UserState.Deleted,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      //  Deactivated by admin
      if (user?.isActive === UserState.Inactive) {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Your account is deactivated. Please contact support.',
            isActive: UserState.Inactive,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (user) {
        if (!user.currentSessionVersion) {
          user.currentSessionVersion = 1;
        }
        user.currentSessionVersion += 1;
        await this.userService.updateLastLoginTs(user);
      } else {
        user = await this.userService.createGoogleOAuthUser(userProfile);
        const getUser = this.scrapeCollection.findOne({ email: user.email });
        if (getUser) {
          await this.scrapeCollection.findOneAndUpdate(
            { email: user.email },
            { $set: { signUpStatus: true } },
          );
        }
        // try {
        //   await this.emailService.sendWelcomeEmail(
        //     user.email,
        //     'Welcome to UltimaBot Platform',
        //   );
        // } catch (error) {
        //   this.logger.error('Error sending welcome email:', error);
        // }
      }
      return {
        ...user,
        ...(await this.getJwtTokenForUser(user)),
      };
    } catch (error) {
      this.logger.error('Error in Google Auth:', error);
      throw error;
    }
  }

  // async forgotPassword(email: string) {
  //   const user = await this.userService.getUserByEmail(email);
  //   if (!user) {
  //     throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
  //   }
  // const resetToken = await this.getJwtTokenForUser(user);

  //   const resetUrl = `${this.appConfig.get('clientUrl')}/reset-password?token=${
  //     resetToken.access
  //   }&email=${email}`;
  //   this.emailService.passwordResetEmail(
  //     email,
  //     'forget Password Email ',
  //     resetUrl,
  //   );
  // }

  async forgotPassword(email: string) {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    if (!isValidEmail) {
      throw new BadRequestException('Invalid email format');
    }

    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
    }

    const payload = { sub: user._id };
    const token = this.jwtService.sign(payload, {
      secret: this.appConfig.get('secretKey'),
      expiresIn: '5m', // token expiry
    });

    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    // Save token in DB
    await this.userService.updateUserResetToken(
      user._id,
      token,
      expiryTime, // 5 min
    );

    const resetUrl = `${this.appConfig.get(
      'clientUrl',
    )}/reset-password?token=${token}&email=${email}`;

    await this.emailService.passwordResetEmail(
      email,
      user?.name,
      'Forgot Password Email',
      resetUrl,
    );
  }

  async resetPasword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (!newPassword || !confirmPassword) {
      throw new HttpException(
        'New password and confirm password are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (newPassword.length < 8 || newPassword.length > 16) {
      throw new HttpException(
        'Password must be between 8 and 16 characters',
        HttpStatus.BAD_REQUEST,
      );
    }
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,16}$/;

    if (!passwordRegex.test(newPassword)) {
      throw new HttpException(
        'Password must include uppercase, lowercase, number, and special character',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (newPassword !== confirmPassword) {
      throw new HttpException(
        'Password does not Match',
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    let decoded: any;

    try {
      decoded = this.jwtService.verify(token, {
        secret: this.appConfig.get('secretKey'),
      });
    } catch (err) {
      throw new HttpException(
        'Invalid or expired token',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.userService.findUserById(decoded.sub);
    if (!user) {
      throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
    }

    // Check token matches DB and expiry
    if (
      user.resetPasswordToken !== token ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new HttpException(
        'Token already used or expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Check expiry from DB
    if (user.resetPasswordExpires < new Date()) {
      throw new HttpException('Token expired', HttpStatus.BAD_REQUEST);
    }

    const password = await hash(newPassword, 10);
    await this.userService.updateUserData(user._id, password);

    // Remove token after use (PREVENT REUSE)
    await this.userService.updateUserResetToken(user._id, null, null);

    await this.emailService.passwordResetSuccessEmail(
      user.email,
      user?.name,
      'Password Reset Success Email ',
    );
    return {
      message: 'Password reset successfully',
    };
  }

  // async resetPasword(
  //   token: string,
  //   newPassword: string,
  //   confirmPassword: string,
  // ) {
  //   const decoded = this.jwtService.verify(token, {
  //     secret: this.appConfig.get('secretKey'),
  //   });
  //   if (!decoded) {
  //     throw new HttpException(
  //       'Invalid or expired token',
  //       HttpStatus.NOT_ACCEPTABLE,
  //     );
  //   }
  //   if (newPassword !== confirmPassword) {
  //     throw new HttpException(
  //       'Password does not Match',
  //       HttpStatus.EXPECTATION_FAILED,
  //     );
  //   }
  //   const user = await this.userService.findUserById(decoded.sub);
  //   if (!user) throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
  //   const password = await hash(newPassword, 10);
  //   await this.userService.updateUserData(user._id, password);
  //   this.emailService.passwordResetSuccessEmail(
  //     user.email,
  //     'Password Reset Success Email ',
  //   );
  // }

  async verifyGoogleCaptcha(token: string) {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      throw new HttpException(
        'Captcha secret key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;
    const response = await axios.post(url);
    if (!response.data.success) {
      throw new HttpException(
        'Captcha verification failed',
        HttpStatus.BAD_REQUEST,
      );
    }
    return response.data;
  }
}
