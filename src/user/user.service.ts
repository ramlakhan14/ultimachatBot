import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { Collection, Db, ObjectId, UpdateFilter } from 'mongodb';
import { GoogleUserProfile } from '../auth/google-auth';
import { AppConfigService } from '../common/config/appConfig.service';
import { MONGODB } from '../common/mongo/mongo.module';
import { SubscriptionPlanInfoService } from '../subscription/subscription-plan.service';
import { ChangePasswordDTO, CreateUserDTO } from './user.dto';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
import {
  Subscription,
  SubscriptionData,
  User,
  UserProfile,
  UserSparse,
  USER_COLLECTION,
  WebhookData,
  CREDIT_COSTS,
  CreditUsage,
  CREDIT_USAGE_COLLECTION,
  BOT_COLLECTION,
  Bot,
  BillingCycle,
  BotType,
} from './user.schema';
import {
  addTopUpBalancePlan,
  subscriptionPlanData,
} from '../subscription/subscription.const';
import {
  CustomKeyData,
  Knowledgebase,
  KNOWLEDGEBASE_COLLECTION,
  OpenaiKeyData,
} from '../knowledgebase/knowledgebase.schema';
import { isAdmin } from 'src/auth/guards/role.enum';
import { Role, UserState } from 'src/auth/types/role.enum';
import { EmailService } from '../common/email/email.service';
import {
  THRESHOLD_EMAIL_SCHEMA,
  ThresholdEmailSetting,
} from '../admin/schema/threshold.email.schema';
import {
  WALLET_TRANSACTION_COLLECTION,
  WalletTransaction,
} from '../subscription/wallet-transaction.schema';

/**
 * Sanitise user objcect from sensitive info
 * @param user
 * @returns
 */
function sanitizeUser<T>(user: T): Exclude<T, 'password'> {
  if ((user as any)?.password) (user as any).password = undefined;
  return user as any;
}

function maskApiKey(apiKey?: string): string | undefined {
  if (!apiKey) return apiKey;
  if (apiKey.length <= 8) return 'X'.repeat(apiKey.length);
  return apiKey.slice(0, 4) + 'X'.repeat(apiKey.length - 8) + apiKey.slice(-4);
}

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  private readonly creditUsageCollection: Collection<CreditUsage>;
  private readonly userCollection: Collection<User>;
  private readonly knowledgebaseCollection: Collection<Knowledgebase>;
  private readonly thresholdEmailSetting: Collection<ThresholdEmailSetting>;
  private readonly botCollection: Collection<Bot>;
  private readonly walletTransactionCollection: Collection<WalletTransaction>;

  constructor(
    private appConfig: AppConfigService,
    @Inject(MONGODB) private db: Db,
    private subsPlanService: SubscriptionPlanInfoService,
    private readonly emailService: EmailService,
  ) {
    this.walletTransactionCollection = this.db.collection<WalletTransaction>(
      WALLET_TRANSACTION_COLLECTION,
    );
    this.userCollection = this.db.collection<User>(USER_COLLECTION);
    this.botCollection = this.db.collection<Bot>(BOT_COLLECTION);
    this.creditUsageCollection = this.db.collection<CreditUsage>(
      CREDIT_USAGE_COLLECTION,
    );
    this.knowledgebaseCollection = this.db.collection<Knowledgebase>(
      KNOWLEDGEBASE_COLLECTION,
    );
    this.thresholdEmailSetting = this.db.collection<ThresholdEmailSetting>(
      THRESHOLD_EMAIL_SCHEMA,
    );
  }

  /**
   * Get user by emailId
   * @param email
   * @returns
   */
  async getUserByEmail(email: string) {
    const user = await this.userCollection.findOne({ email });
    return sanitizeUser(user);
  }

  async updateUserData(id: ObjectId, newPassword: string) {
    await this.userCollection.updateOne(
      { _id: id },
      { $set: { password: newPassword } },
    );
  }

  /**
   * Find user by id
   * @param id
   * @returns
   */
  async findUserByIdSparse(id: string): Promise<UserSparse> {
    const user: UserSparse = await this.userCollection.findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          _id: 1,
          email: 1,
          activeSubscription: 1,
          role: 1,
          isActive: 1,
          currentSessionVersion: 1,
        },
      },
    );
    return sanitizeUser(user);
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.userCollection.findOne({
      _id: new ObjectId(id),
    });
    return sanitizeUser(user);
  }

  /**
   * Find user by email, password
   * @param email
   * @param password
   * @returns
   */
  async findByEmailPassword(
    email: string,
    password: string,
  ): Promise<UserSparse> {
    const user: Pick<
      User,
      | '_id'
      | 'email'
      | 'password'
      | 'activeSubscription'
      | 'role'
      | 'isActive'
      | 'loginType'
    > = await this.userCollection.findOne(
      { email },
      { projection: { _id: 1, email: 1, password: 1, loginType: 1 } },
    );
    if (!user) {
      throw new HttpException(
        'Incorrect email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user?.loginType === 'google' && !user.password) {
      throw new BadRequestException(
        'Use Google Sign-In or reset your password to access this account.',
      );
    }

    const isPasswordMatches = await compare(password, user.password);
    if (!isPasswordMatches) {
      throw new HttpException(
        'Password is not correct',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return sanitizeUser(user);
  }

  async updateLastLoginTs(user: UserSparse) {
    await this.userCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          currentSessionVersion: user.currentSessionVersion,
        },
      },
    );
  }

  async deleteManyUserAfter7Years(filter: any): Promise<number> {
    try {
      const usersToBackup = await this.userCollection.find(filter).toArray();
      if (usersToBackup && usersToBackup.length > 0) {
        const records = usersToBackup.map((u) => {
          const safeId =
            u._id && typeof (u._id as any).toString === 'function'
              ? (u._id as any).toString()
              : u._id;
          return {
            userId: safeId,
            email: u.email,
            collection: USER_COLLECTION,
            deletedAt: new Date(),
            deletedDoc: JSON.stringify(u),
          };
        });

        await this.db.collection('gdpr_deleted_records').insertMany(records);
      }
      const result = await this.userCollection.deleteMany(filter);
      return result.deletedCount || 0;
    } catch (error) {
      throw error;
    }
  }

  async createGoogleOAuthUser(userData: GoogleUserProfile) {
    const { email, name, picture, locale } = userData;
    const ts = new Date();
    const user: User = {
      email,
      name,
      avatarUrl: picture,
      locale,
      // activeSubscription: this.appConfig.get('defaultSubscription'),
      createdAt: ts,
      updatedAt: ts,
      role: Role.User,
      isActive: UserState.Active,
      loginType: 'google',
      openaiKeys: { apiKey: '', useOwnKey: false },
      currentSessionVersion: 1,
    };

    const res = await this.userCollection.insertOne(user);

    return sanitizeUser({
      _id: res.insertedId,
      ...user,
    });
  }

  /**
   * Create a new user
   * @param data
   * @returns
   */
  async createUser(data: CreateUserDTO) {
    if (!data.password) {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'Password required',
          message: 'Please enter a password.',
        },
        400,
      );
    }

    const hasLength = data.password.length >= 8 && data.password.length <= 16;
    const hasUpperCase = /[A-Z]/.test(data.password);
    const hasLowerCase = /[a-z]/.test(data.password);
    const hasNumber = /\d/.test(data.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(data.password);

    if (
      !hasLength ||
      !hasUpperCase ||
      !hasLowerCase ||
      !hasNumber ||
      !hasSpecialChar
    ) {
      const errors: string[] = [];

      if (!hasLength)
        errors.push('Password must be between 8 and 16 characters.');
      if (!hasUpperCase) errors.push('Include at least one uppercase letter.');
      if (!hasLowerCase) errors.push('Include at least one lowercase letter.');
      if (!hasNumber) errors.push('Include at least one number.');
      if (!hasSpecialChar)
        errors.push('Include at least one special character.');

      throw new HttpException(
        {
          statusCode: 400,
          error: 'Weak password',
          message: errors,
        },
        400,
      );
    }

    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'Email already registered',
          message:
            'An account with this email already exists. Please log in instead.',
        },
        400,
      );
    }

    const hashedPassword = await hash(data.password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const ts = new Date();

    const userData: User = {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      avatarUrl: data.avatarUrl,
      openaiKeys: {
        apiKey: data?.openaiKey?.apiKey || '',
        useOwnKey: data?.openaiKey?.useOwnKey || false,
      },
      createdAt: ts,
      updatedAt: ts,
      role: Role.User,
      isActive: UserState.Pending,
      currentSessionVersion: 1,
      loginType: 'email',
      otp,
      otpExpiresAt,
      isVerified: false,
    };

    const res = await this.userCollection.insertOne(userData);

    return {
      _id: res.insertedId,
      email: userData.email,
      otp, // needed to send email
    };
  }
  async updateUserResetToken(
    userId: ObjectId,
    resetPasswordToken: string | null,
    resetPasswordExpires: Date | null,
  ) {
    await this.userCollection.findOneAndUpdate(
      { _id: userId },
      {
        $set: { resetPasswordToken, resetPasswordExpires },
      },
    );
  }

  async getUserById(userId: ObjectId) {
    return this.userCollection.findOne({ _id: userId });
  }

  async updateUser(userId: ObjectId, updateData: any) {
    return this.userCollection.findOneAndUpdate(
      { _id: userId },
      { $set: updateData },
    );
  }

  async changePassword(userId: ObjectId, data: ChangePasswordDTO) {
    const { newPassword, confirmPassword } = data;

    const user = await this.getUserById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!newPassword || !confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password are required',
      );
    }
    if (newPassword.length < 8 || newPassword.length > 16) {
      throw new BadRequestException(
        'Password must be between 8 and 16 characters',
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
      throw new BadRequestException('Passwords do not match');
    }

    const hasPassword = !!user.password;

    if (user.loginType === 'google' && !hasPassword) {
      const password = await hash(newPassword, 10);

      await this.updateUser(userId, { password });

      return { message: 'Password set successfully' };
    }

    const isSamePassword = await compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password cannot be same as old password',
      );
    }

    const password = await hash(newPassword, 10);
    await this.updateUser(userId, { password });
    return { message: 'Password changed successfully' };
  }

  async updateUserOpenaiKey(user: UserSparse, data: OpenaiKeyData) {
    try {
      const userData = await this.userCollection.findOne({ _id: user._id });
      if (!userData) {
        throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
      }

      const updateFields: Record<string, any> = {};
      if (data.apiKey) {
        await this.verifyOpenAiKey(data.apiKey);
        updateFields.openaiKeys = {
          useOwnKey: data.useOwnKey ?? userData.openaiKeys?.useOwnKey,
          apiKey: data.apiKey,
        };
      } else if (data.apiKey === '') {
        updateFields.openaiKeys = {
          useOwnKey: false,
          apiKey: '',
        };
      }

      if (data.name) {
        updateFields.name = data.name;
      }

      if (data?.limitType !== undefined && data?.limitValue !== undefined) {
        updateFields.limitType = data.limitType;
        updateFields.limitValue = data.limitValue;
      }

      if (data?.limitValue && data?.limitType === undefined) {
        throw new BadRequestException('Limit type is required');
      }

      if (data?.limitType && data?.limitValue === undefined) {
        throw new BadRequestException('Limit value is required');
      }

      if (Object.keys(updateFields).length === 0) {
        return;
      }

      await this.userCollection.updateOne(
        { _id: user._id },
        { $set: updateFields },
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Verify if the OpenAI API key is valid
   * @param apiKey OpenAI API key to verify
   */
  private async verifyOpenAiKey(apiKey: string): Promise<void> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: 'test',
          dimensions: 512,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorCode = data?.error?.code;
        const errorMessage = data?.error?.message;

        if (response.status === 429 && errorCode === 'insufficient_quota') {
          throw new Error(
            'Your OpenAI API key has no remaining quota. Please add billing or use a different key.',
          );
        }

        //  Invalid key
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please enter a valid key.');
        }

        //  Other API errors
        throw new Error(errorMessage || 'Failed to verify OpenAI API key.');
      }

      //  Success → embedding returned means key works
      if (!data?.data?.[0]?.embedding) {
        throw new Error(
          'OpenAI key verification failed. No response received.',
        );
      }

      return;
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        error.message ||
          'Unable to verify OpenAI API key due to a network issue. Please try again.',
      );
    }
  }

  /**
   * Get user profile
   * @param user
   * @returns
   */
  async getUserProfile(user: UserSparse) {
    const userData = await this.userCollection.findOne(
      { _id: user._id },
      {
        projection: {
          password: 0,
          currentSessionVersion: 0,
        },
      },
    );

    // Modify the month usage to reflect the current month even if in the db
    // its of a previous month (basically no usage in the current month)
    const currentMonth = `${
      new Date().getMonth() + 1
    }/${new Date().getFullYear()}`;
    if (
      userData?.monthUsage?.month === undefined ||
      userData?.monthUsage?.month !== currentMonth
    ) {
      if (userData.monthUsage === undefined) {
        userData.monthUsage = {
          month: '',
          count: 0,
          limitAlertSent: false,
          fullAlertSent: false,
        };
      }
      userData.monthUsage.month = currentMonth;
      userData.monthUsage.count = 0;
      userData.monthUsage.limitAlertSent = false;
      userData.monthUsage.fullAlertSent = false;
    }

    const subscriptionData = {
      totalCredits: userData.tokenCredits,
      activeSubscription: userData.activeSubscription,
      balanceAfterUsage: userData?.balanceAfterUsage,
      BillingCycle: userData.billingCycle,
      status: userData.subscriptionData?.data?.status,
      endsAt: userData.subscriptionData?.data?.endsAt,
    };

    let isLowBalance = false;

    // Check for low balance based on configured alerts
    if (userData?.limitType && userData?.limitValue !== undefined) {
      const { limitType, limitValue } = userData;
      const totalTokens = userData.tokenCredits || 0;
      const remainingBalance = userData.balanceAfterUsage ?? totalTokens;

      // Prevent division by zero
      if (totalTokens > 0) {
        const remainingPercentage = (remainingBalance / totalTokens) * 100;

        // Value-based low balance check: when remaining balance reaches threshold
        if (limitType === 'Value' && remainingBalance <= limitValue) {
          isLowBalance = true;
        }

        // Percentage-based low balance check: when remaining percentage reaches threshold
        // Example: if limitValue = 5, trigger when remainingPercentage <= 5%
        if (limitType === 'Percentage' && remainingPercentage <= limitValue) {
          isLowBalance = true;
        }
      }
    }
    if (userData.balanceAfterUsage <= 0) {
      isLowBalance = true;
    }

    if (userData.openaiKeys?.apiKey) {
      userData.openaiKeys = {
        ...userData.openaiKeys,
        apiKey: maskApiKey(userData.openaiKeys.apiKey),
      };
    }

    return { ...userData, isLowBalance, subscriptionData };
  }

  /** Get Users Payment Status */
  async getUserPaymentStatus(user: UserSparse) {
    const userData = await this.userCollection.findOne(
      { email: user.email },
      {
        projection: {
          email: 1,
          'subscriptionData.data.status': 1,
        },
      },
    );

    return {
      email: userData.email,
      status: userData?.subscriptionData?.data?.status || 'unactive',
    };
  }

  /** Get All Users Profile for Admin */
  async getAllUserProfiles(
    user: UserSparse,
    page: number,
    pageSize: number,
    searchQuery?: string,
  ) {
    const adminStatus = isAdmin(user);
    const itemsPerPage = Math.min(pageSize, 60);
    const filter: any = {};
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        {
          activeSubscription: { $regex: searchQuery, $options: 'i' },
        },
      ];
    }
    if (adminStatus) {
      const [getAllUsers, count] = await Promise.all([
        this.userCollection
          .find(filter, {
            projection: {
              email: 1,
              name: 1,
              avatarUrl: 1,
              monthUsage: 1,
              activeSubscription: 1,
              'customKeys.useOwnKey': 1,
              role: 1,
              subscriptionData: 1,
              createdAt: 1,
            },
            limit: itemsPerPage,
            skip: (page - 1) * pageSize,
          })
          .toArray(),
        this.userCollection.countDocuments(filter),
      ]);
      const allUsersProfileData = await Promise.all(
        getAllUsers.map(async (userData) => {
          // for getting the monthusage of the current month only
          const currentMonth = `${
            new Date().getMonth() + 1
          }/${new Date().getFullYear()}`;
          if (
            userData?.monthUsage?.month === undefined ||
            userData?.monthUsage?.month !== currentMonth
          ) {
            if (userData.monthUsage === undefined) {
              userData.monthUsage = { month: '', count: 0 };
            }
            userData.monthUsage.month = currentMonth;
            userData.monthUsage.count = 0;
            userData.monthUsage.limitAlertSent = false;
            userData.monthUsage.fullAlertSent = false;
          }
          const subscriptionData =
            await this.subsPlanService.getSubscriptionPlanInfo(
              userData.activeSubscription,
            );
          const userProjectsCount =
            await this.knowledgebaseCollection.countDocuments({
              owner: userData._id,
            });
          return { ...userData, subscriptionData, project: userProjectsCount };
        }),
      );
      return {
        allUsersProfileData,
        pages: Math.ceil(count / pageSize),
        totalCount: count,
      };
    } else {
      throw new HttpException('Admin Not Found', HttpStatus.NOT_FOUND);
    }
  }

  /* get all users projects data for admin */

  // async listAllKnowledgebasesForAdmin(user: UserSparse) {
  //   const adminStatus = isAdmin(user);
  //   if (adminStatus) {
  //     const kbs = this.knowledgebaseCollection
  //       .find(
  //         {},
  //         {
  //           projection: {
  //             _id: 1,
  //             name: 1,
  //             status: 1,
  //             monthUsage: 1,
  //             'crawlData.stats': 1,
  //             owner: 1,
  //             'websiteData.websiteUrl': 1,
  //             updatedAt: 1,
  //           },
  //         },
  //       )
  //       .toArray(); // Convert the cursor to an array

  //     return kbs;
  //   } else {
  //     throw new HttpException(
  //       'Failed to retrieve knowledge bases',
  //       HttpStatus.NOT_FOUND,
  //     );
  //   }
  // }

  /** getting userDetails for Admin  */
  async getUserDetails(id: string) {
    const userId = new ObjectId(id);
    const userData: any = await this.userCollection.findOne(
      { _id: userId },
      {
        projection: {
          email: 1,
          name: 1,
          avatarUrl: 1,
          monthUsage: 1,
          activeSubscription: 1,
          'customKeys.useOwnKey': 1,
          role: 1,
        },
      },
    );

    const subscriptionData = this.subsPlanService.getSubscriptionPlanInfo(
      userData.activeSubscription,
    );
    const userProjects = await this.knowledgebaseCollection
      .find({ owner: userId })
      .toArray();
    return { ...userData, subscriptionData, userProjects };
  }

  /** **************************************************
   * SUBSCRIPTION RELATED
   *************************************************** */

  // async setUserSubscription(
  //   email: string,
  //   subscription: Subscription,
  //   payload?: SubscriptionData,
  // ) {
  //   const user = await this.getUserByEmail(email);
  //   console.log(user, 'user');

  //   const update: any = {
  //     activeSubscription: subscription,
  //     updatedAt: new Date(),
  //     monthUsage: {
  //       month: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
  //       count: 0,
  //     },
  //   };

  //   if (payload) {
  //     update['subscriptionData'] = payload;
  //   }

  //   if (
  //     subscription === Subscription.ENTERPRISE_MONTHLY ||
  //     subscription === Subscription.PREMIUM_MONTHLY ||
  //     subscription === Subscription.STANDARD_MONTHLY
  //   ) {
  //     update['openaiKeys'] = {
  //       apiKey: user.openaiKeys?.apiKey || '',
  //       useOwnKey: false,
  //     };
  //   }

  //   if (
  //     user.openaiKeys?.apiKey &&
  //     (subscription === Subscription.ENTERPRISE ||
  //       subscription === Subscription.PREMIUM ||
  //       subscription === Subscription.STANDARD)
  //   ) {
  //     update['openaiKeys'] = {
  //       apiKey: user.openaiKeys.apiKey,
  //       useOwnKey: true,
  //     };
  //   }
  //   // TODO: If the user is not present then we need to create
  //   // TODO: We will need to send email to user with password since this user won't have a password
  //   await this.userCollection.updateOne(
  //     { email },
  //     {
  //       $set: update,
  //     },
  //   );
  //   await this.emailService.sendWelcomeEmail(
  //     user.email,
  //     'Welcome to UltimaBot Platform',
  //   );
  // }
  async setUserSubscription(
    email: string,
    plan: Subscription,
    payload?: SubscriptionData,
    billingCycle?: 'MONTHLY' | 'YEARLY',
  ) {
    const user = await this.getUserByEmail(email);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const expiresAt =
      billingCycle === 'YEARLY'
        ? this.addYears(now, 1)
        : this.addMonths(now, 1);

    const updateQuery: any = {
      $set: {
        activeSubscription: plan,
        billingCycle,
        subscriptionStartedAt: now,
        subscriptionExpiresAt: expiresAt,
        updatedAt: now,
        monthUsage: {
          month: `${now.getMonth() + 1}/${now.getFullYear()}`,
          count: 0,
        },
      },
    };

    if (payload) {
      updateQuery.$set.subscriptionData = payload;
    }

    const newCredits =
      billingCycle === 'YEARLY'
        ? subscriptionPlanData[plan].freeCredits
        : subscriptionPlanData[plan].freeCredits;

    const leftoverCredits = user?.balanceAfterUsage ?? 0;

    const totalCredits = leftoverCredits + newCredits;

    updateQuery.$set.tokenCredits = user?.tokenCredits
      ? user?.tokenCredits + newCredits
      : newCredits;
    updateQuery.$set.balanceAfterUsage = totalCredits;

    // Add webhook idempotency
    if (payload?.data?.subscriptionId) {
      updateQuery.$set.lastProcessedVariantId = payload.data.variantId;
      updateQuery.$set.lastProcessedWebhookAt = now;
    }

    await this.userCollection.updateOne({ _id: user._id }, updateQuery);
  }

  async subscriptionUpdateHandler(
    email: string,
    plan: Subscription,
    subscriptionData: SubscriptionData,
    billingCycle: BillingCycle,
  ) {
    const user = await this.userCollection.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    if (user.gdpr?.isDeleted || user.gdpr?.permanentlyDeleted) {
      return { success: false, reason: 'User is deleted' };
    }

    const sub = subscriptionData.data;
    const now = new Date();
    const endsAtDate = sub.endsAt ? new Date(sub.endsAt) : null;

    const leftBalance = user.balanceAfterUsage ?? 0;
    const lastProcessedVariantId = user.lastProcessedVariantId;
    const currentVariantId = sub.variantId;
    // If this is the same subscription and we processed it recently (within last 5 minutes), skip
    if (sub.status !== 'cancelled') {
      if (
        lastProcessedVariantId === currentVariantId &&
        user.lastProcessedWebhookAt
      ) {
        const timeSinceLastWebhook =
          now.getTime() - new Date(user.lastProcessedWebhookAt).getTime();
        if (timeSinceLastWebhook < 5 * 60 * 1000) {
          // 5 minutes
          return {
            success: true,
            status: sub.status,
            plan: user.activeSubscription,
            tokenCredits: user.tokenCredits,
            balanceAfterUsage: user.balanceAfterUsage,
            skipped: true,
            reason: 'Duplicate webhook within 5 minutes',
          };
        }
      }
    }

    // Calculate new plan credits
    const newPlanCredits =
      billingCycle === 'YEARLY'
        ? subscriptionPlanData[plan].freeCredits
        : subscriptionPlanData[plan].freeCredits;

    const update: Partial<User> & Record<string, any> = {
      updatedAt: now,
      subscriptionData,
      lastProcessedVariantId: currentVariantId,
      lastProcessedWebhookAt: now,
    };

    let shouldSendEmail = false;
    let emailStatus = '';
    let isExpired = false;

    /**
     * ===============================
     * ACTIVE → Upgrade / Downgrade
     * ===============================
     */
    if (sub.status === 'active') {
      update.activeSubscription = plan;
      update.billingCycle = billingCycle;
      update.subscriptionStartedAt = user.subscriptionStartedAt ?? now;
      update.subscriptionExpiresAt = null;

      const mergedBalance = leftBalance + newPlanCredits;

      update.tokenCredits = user?.tokenCredits
        ? user?.tokenCredits + newPlanCredits
        : newPlanCredits;
      update.balanceAfterUsage = mergedBalance;

      if (user.gdpr?.pendingDeletion) {
        update.gdpr = {
          ...user.gdpr,
          pendingDeletion: false,
          deletionReason: undefined,
          deletionScheduledFor: undefined,
          canRecoverUntil: undefined,
        };
      }
    } else if (sub.status === 'cancelled') {
      update.activeSubscription = plan;
      update.billingCycle = billingCycle;
      update.subscriptionExpiresAt = endsAtDate ?? user.subscriptionExpiresAt;

      // Don't send email here; we'll handle it in subscriptionCancelledHandler
    } else if (
      /**
       * ===============================
       * PAUSED / UNPAID / PAST_DUE
       * ===============================
       */
      sub.status === 'paused' ||
      sub.status === 'unpaid' ||
      sub.status === 'past_due'
    ) {
      update.subscriptionExpiresAt = now;
      shouldSendEmail = true;
      emailStatus = sub.status.charAt(0).toUpperCase() + sub.status.slice(1);
    }

    /**
     * ===============================
     * EXPIRED → HARD STOP
     * ===============================
     */
    if (sub.status === 'expired') {
      update.subscriptionExpiresAt = now;
      shouldSendEmail = true;
      emailStatus = 'Expired';
      isExpired = true;
    }

    await this.userCollection.updateOne({ email }, { $set: update });

    if (shouldSendEmail) {
      await this.emailService.sendBillingUpdateEmail({
        email: user.email,
        name: user.name ?? 'User',
        plan,
        type: 'subscription',
        status: emailStatus,
        billingCycle,
        isExpired,
      });
    }

    return {
      success: true,
      status: sub.status,
      plan,
      tokenCredits: update.tokenCredits,
      balanceAfterUsage: update.balanceAfterUsage,
    };
  }

  async SubscriptionCancellationHandler(
    email: string,
    plan: Subscription,
    subscriptionData: SubscriptionData,
    billingCycle: BillingCycle,
  ) {
    const user = await this.userCollection.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const endsAtDate = subscriptionData.data.endsAt
      ? new Date(subscriptionData.data.endsAt)
      : null;

    await this.emailService.sendBillingUpdateEmail({
      email: user.email,
      name: user.name ?? 'User',
      plan,
      type: 'cancellation',
      status: 'Cancelled',
      endAt: endsAtDate,
      billingCycle,
    });
  }

  async setUserWhitelabelSettings(
    email: string,
    whitelabelSettings: User['whitelabelling'],
  ) {
    const update: Partial<User> = {
      whitelabelling: whitelabelSettings,
      updatedAt: new Date(),
    };

    await this.userCollection.updateOne({ email }, { $set: update });
  }

  async getUserWhitelabelSettings(
    userId: ObjectId,
  ): Promise<Pick<User, 'whitelabelling'>> {
    const res = await this.userCollection.findOne(
      { _id: userId },
      { projection: { whitelabelling: 1 } },
    );
    return res;
  }

  async setUserCustomKeys(id: ObjectId, keys: CustomKeyData) {
    const update: Partial<User> = {
      customKeys: keys,
      updatedAt: new Date(),
    };

    await this.userCollection.updateOne({ _id: id }, { $set: update });
  }

  async setUserWebhookData(id: ObjectId, webhookData: User['webhook']) {
    const update: Partial<User> = {
      webhook: webhookData,
      updatedAt: new Date(),
    };

    await this.userCollection.updateOne({ _id: id }, { $set: update });
  }

  async addNewWebhook(id: ObjectId, webhookData: WebhookData) {
    const update: UpdateFilter<User> = {
      $push: {
        webhooks: webhookData,
      },
    };

    const result = await this.userCollection.updateOne({ _id: id }, update);
    if (result.modifiedCount == 1) {
      return webhookData.id;
    }
  }

  async deleteWebhook(userId: ObjectId, webhookId: ObjectId) {
    const update: UpdateFilter<User> = {
      $pull: { webhooks: { id: webhookId } },
    };

    const result = await this.userCollection.updateOne({ _id: userId }, update);
    if (result.matchedCount === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    } else if (result.modifiedCount === 0) {
      throw new HttpException('Webhook not found', HttpStatus.NOT_FOUND);
    }
  }

  async getUserWebhookData(id: ObjectId): Promise<Pick<User, 'webhook'>> {
    const res = await this.userCollection.findOne(
      { _id: id },
      { projection: { webhook: 1 } },
    );
    return res;
  }

  async getUserWebhooksData(id: ObjectId): Promise<Pick<User, 'webhooks'>> {
    const res = await this.userCollection.findOne(
      { _id: id },
      { projection: { webhooks: 1 } },
    );
    return res;
  }

  /** **************************************************
   * CHATBOT MONTHLY USAGE RELATED
   *************************************************** */

  async getUserMonthlyUsageData(
    userId: ObjectId,
  ): Promise<Pick<User, 'monthUsage' | 'tokenCredits' | 'activeSubscription'>> {
    const usageData = await this.userCollection.findOne(
      { _id: userId },
      { projection: { monthUsage: 1, tokenCredits: 1, activeSubscription: 1 } },
    );
    return usageData;
  }

  async updateMonthlyUsageByN(userId: ObjectId, n: number) {
    await this.userCollection.updateOne({ _id: userId }, [
      {
        $set: {
          monthUsage: {
            $cond: {
              if: {
                $eq: [
                  '$monthUsage.month',
                  {
                    $concat: [
                      {
                        $toString: new Date().getMonth() + 1,
                      },
                      '/',
                      {
                        $toString: new Date().getFullYear(),
                      },
                    ],
                  },
                ],
              },
              then: {
                month: '$monthUsage.month',
                count: { $add: ['$monthUsage.count', n] },
              },
              else: {
                month: {
                  $concat: [
                    {
                      $toString: new Date().getMonth() + 1,
                    },
                    '/',
                    {
                      $toString: new Date().getFullYear(),
                    },
                  ],
                },
                count: n,
              },
            },
          },
        },
      },
    ]);
  }

  async userSubscriptionExpires(deletionReason, email: string) {
    try {
      let response;
      if (deletionReason == 'subscription') {
        response = await this.userCollection.updateOne(
          { email: email },
          {
            $set: {
              'gdpr.pendingDeletion': true,
              'gdpr.deletionRequestedAt': new Date(),
              'gdpr.deletionScheduledFor': new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000,
              ),
              'gdpr.canRecoverUntil': new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000,
              ),
              'gdpr.deletionReason': 'subscription',
              'gdpr.isDeleted': true,
            },
          },
        );
        await this.emailService.sendEmailOnSubscriptionExpires(
          email,
          'subscription',
        );
      } else {
        response = await this.userCollection.updateOne(
          { email: email },
          {
            $set: {
              'gdpr.pendingDeletion': true,
              'gdpr.deletionRequestedAt': new Date(),
              'gdpr.deletionScheduledFor': new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000,
              ),
              'gdpr.deletionReason': 'manual',
              'gdpr.canRecoverUntil': new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000,
              ),
              'gdpr.isDeleted': true,
            },
          },
        );
        await this.emailService.sendEmailOnSubscriptionExpires(email, 'manual');
      }

      return response;
    } catch (error) {
    }
  }

  async userSubscriptionRevoke(userId) {
    try {
      await this.userCollection.updateOne(
        { _id: userId },
        {
          $set: {
            'gdpr.pendingDeletion': false,
            'gdpr.deletionRequestedAt': null,
            'gdpr.deletionScheduledFor': null,
            'gdpr.canRecoverUntil': null,
            'gdpr.deletionReason': null,
          },
        },
      );
      return true;
    } catch (error) {
    }
  }

  async permanentlyDeleteData() {
    try {
      const usersToDelete = await this.userCollection
        .find({
          'gdpr.pendingDeletion': true,
          'gdpr.deletionScheduledFor': { $lte: new Date() },
        })
        .toArray();

      for (const user of usersToDelete as any) {
        const objId =
          user._id instanceof ObjectId ? user._id : new ObjectId(user._id);
        const email = user.email;
        const orConditions = [
          { _id: objId },
          { userId: objId },
          { userId: objId.toString() },
          { owner: objId },
          { owner: objId.toString() },
          { ownerId: objId },
          { ownerId: objId.toString() },
          { user_id: objId },
          { user_id: objId.toString() },
          { user: objId },
          { user: objId.toString() },
          { email },
          { userEmail: email },
          { addedBy: objId.toString() },
          { addedBy: objId },
        ];

        const EXCLUDED_TABLES = [
          USER_COLLECTION,
          'gdpr_deleted_records', // backup storage
        ];
        const collections = await this.db.listCollections().toArray();

        for (const collInfo of collections) {
          const collName = collInfo.name;
          if (
            !collName ||
            collName.startsWith('system.') ||
            EXCLUDED_TABLES.includes(collName)
          ) {
            continue;
          }

          try {
            const coll = this.db.collection(collName);
            const docsToDelete = await coll
              .find({ $or: orConditions })
              .toArray();
            if (docsToDelete.length > 0) {
              await this.db.collection('gdpr_deleted_records').insertOne({
                userId: objId,
                email,
                collection: collName,
                deletedAt: new Date(),
                deletedDocs: JSON.stringify(docsToDelete),
              });
            }
            const result = await coll.deleteMany({ $or: orConditions });
            if (result.deletedCount > 0) {
            }
          } catch (err) {
            this.logger.error(
              `Error cleaning collection "${collName}" for user "${email}":`,
              err?.message || err,
            );
          }
        }

        await this.emailService.sendEmailOnSubscriptionExpires(
          user.email,
          'permanent_deletion',
        );

        await this.userCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              'gdpr.pendingDeletion': false,
              'gdpr.permanentlyDeleted': true,
              'gdpr.cleanedAt': new Date(),
            },
          },
        );
      }
    } catch (error) {
      return false;
    }
  }

  async deleteUser(email: string) {
    try {
      const res = await this.userSubscriptionExpires('manual', email);

      return res;
    } catch (error) {
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async recoverAccount(email: string) {
    try {
      const res = await this.userCollection.updateOne(
        { email: email },
        {
          $set: {
            'gdpr.pendingDeletion': false,
            'gdpr.deletionRequestedAt': null,
            'gdpr.deletionScheduledFor': null,
            'gdpr.canRecoverUntil': null,
            'gdpr.deletionReason': null,
            'gdpr.isDeleted': false,
          },
        },
      );
      return res;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error in User Recovery',
        error.status,
      );
    }
  }
  // Added by Nidhi Sharma to calculate credits based on action
  async calculateCredits(action, count, tokens) {
    switch (action) {
      case 'SCRAPING_GMB':
        return count * CREDIT_COSTS.SCRAPING_GMB;

      case 'SCRAPING_LINKEDIN':
        return count * CREDIT_COSTS.SCRAPING_LINKEDIN;

      case 'SCRAPING_FACEBOOK':
        return count * CREDIT_COSTS.SCRAPING_FACEBOOK;

      case 'EMAIL_VALIDATION':
        return count * CREDIT_COSTS.EMAIL_VALIDATION;

      case 'EMAIL_WARMUP':
        return count * CREDIT_COSTS.EMAIL_WARMUP;

      case 'VECTOR_EMBEDDING':
        return (
          Math.ceil(tokens / 1000) * CREDIT_COSTS.VECTOR_EMBEDDING_PER_1K_TOKEN
        );

      default:
        return 0;
    }
  }
  // Added by Nidhi Sharma to consume credits atomically when any action is performed
  async consumeCredits(
    userId: ObjectId,
    action:
      | 'SCRAPING_GMB'
      | 'SCRAPING_LINKEDIN'
      | 'SCRAPING_FACEBOOK'
      | 'EMAIL_VALIDATION'
      | 'EMAIL_WARMUP'
      | 'INBOUND_CALLS'
      | 'OUTBOUND_CALLS'
      | 'VECTOR_EMBEDDING',
    callVoiceCloned?: boolean,
    callDurationInSeconds?: number,
    count?: number,
    tokensForWebsite?: number,
  ) {
    try {
      let finalCreditsToUse = 0;

      // 📞 Handle call-based credit calculation
      if (action === 'INBOUND_CALLS' || action === 'OUTBOUND_CALLS') {
        if (!callDurationInSeconds) {
          throw new Error('Call duration is required for call actions');
        }

        const costPerSecondInEuro = callVoiceCloned
          ? 0.3 / 60 // voice cloned
          : 0.25 / 60; // standard voice

        const creditsPerSecond = costPerSecondInEuro / 0.01;

        finalCreditsToUse = Math.ceil(callDurationInSeconds * creditsPerSecond);
      } else {
        finalCreditsToUse = await this.calculateCredits(
          action,
          count,
          tokensForWebsite,
        );
      }

      // 1️⃣ Atomically deduct credits only if balance is sufficient
      const result = await this.userCollection.findOneAndUpdate(
        {
          _id: userId,
          balanceAfterUsage: { $gte: finalCreditsToUse }, // Changed to balanceAfterUsage
        },
        {
          $inc: { balanceAfterUsage: -finalCreditsToUse },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: 'after' },
      );

      if (!result.value) {
        return {
          success: false,
          message: 'Insufficient credits or user not found',
        };
      }

      // 2️⃣ Persist credit usage history
      await this.creditUsageCollection.insertOne({
        userId,
        action,
        creditsUsed: finalCreditsToUse,
        balanceAfterUsage: result.value.balanceAfterUsage,
        createdAt: new Date(),
      });

      // 3️⃣ Check and send threshold alert emails if needed
      try {
        const userDetails = await this.userCollection.findOne({ _id: userId });
        if (!userDetails?.limitValue || !userDetails.tokenCredits) return;
        const maxTokens = userDetails.tokenCredits;
        const remainingBalance = userDetails.balanceAfterUsage ?? maxTokens;
        const usedTokens = maxTokens - remainingBalance;
        const usedPercentage = maxTokens ? (usedTokens / maxTokens) * 100 : 0;
        const remainingPercentage = maxTokens
          ? (remainingBalance / maxTokens) * 100
          : 0;

        const { limitType, limitValue } = userDetails;

        const currentMonth = `${
          new Date().getMonth() + 1
        }/${new Date().getFullYear()}`;

        let monthUsage = userDetails.monthUsage;
        let needMonthReset = false;

        if (!monthUsage) {
          monthUsage = {
            month: currentMonth,
            count: 0,
            limitAlertSent: false,
            fullAlertSent: false,
          };
          needMonthReset = true;
        } else if (monthUsage.month !== currentMonth) {
          monthUsage = {
            month: currentMonth,
            count: monthUsage.count || 0,
            limitAlertSent: false,
            fullAlertSent: false,
          };
          needMonthReset = true;
        }

        // Update monthUsage if reset is needed
        if (needMonthReset) {
          await this.userCollection.updateOne(
            { _id: userId },
            { $set: { monthUsage } },
          );

          // Refresh userDetails with updated monthUsage
          const updatedUser = await this.userCollection.findOne({
            _id: userId,
          });
          if (updatedUser) {
            monthUsage = updatedUser.monthUsage;
          }
        }

        // Get alert flags from the current monthUsage
        const limitAlertSent = monthUsage?.limitAlertSent ?? false;
        const fullAlertSent = monthUsage?.fullAlertSent ?? false;

        const alertUpdate: Record<string, any> = {
          'monthUsage.limitAlertSent': limitAlertSent,
          'monthUsage.fullAlertSent': fullAlertSent,
        };

        let shouldSendEmail = false;
        let emailUsagePercentage = Math.min(usedPercentage, 100);

        if (!limitAlertSent && limitType && limitValue !== undefined) {
          // Value-based alert: when remaining balance reaches threshold
          if (limitType === 'Value' && remainingBalance <= limitValue) {
            alertUpdate['monthUsage.limitAlertSent'] = true;
            shouldSendEmail = true;
            emailUsagePercentage = Math.min(usedPercentage, 100);
          }

          // Percentage-based alert: when remaining percentage reaches threshold
          // Example: if limitValue = 5, trigger when remainingPercentage <= 5%
          if (limitType === 'Percentage' && remainingPercentage <= limitValue) {
            alertUpdate['monthUsage.limitAlertSent'] = true;
            shouldSendEmail = true;
            emailUsagePercentage = Math.min(usedPercentage, 100);
          }
        }

        // Condition 2: Full usage alert (0% remaining)
        if (!fullAlertSent && remainingBalance <= 0) {
          alertUpdate['monthUsage.fullAlertSent'] = true;
          shouldSendEmail = true;
          emailUsagePercentage = 100;
        }

        if (shouldSendEmail) {
          try {
            await this.emailService.sendBalanceAlertEmail({
              email: userDetails.email,
              name: userDetails?.name || 'User',
              usagePercentage: Number(emailUsagePercentage.toFixed(2)),
              userId: userId.toHexString(),
            });

            await this.userCollection.updateOne(
              { _id: userId },
              { $set: alertUpdate },
            );

          } catch (emailError) {
            this.logger.error('Failed to send balance alert email:', emailError);
          }
        }
      } catch (error) {
        this.logger.error('Error in balance alert check:', error);
      }

      return {
        success: true,
        message: 'Credits deducted successfully',
        remainingCredits: result.value.tokenCredits,
        creditsUsed: finalCreditsToUse,
      };
    } catch (error) {
      this.logger.error('Error consuming credits', error);
      throw new HttpException(
        error.message || 'Error consuming credits',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Added by Nidhi Sharma to check the bot limit before creating a new bot
  async checkBotMaxLimitAndCreate(
    userId: ObjectId,
    botType: BotType,
    refrenceId?: ObjectId,
  ): Promise<Bot> {
    const user = await this.userCollection.findOne({
      _id: userId,
      isActive: UserState.Active,
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const plan = subscriptionPlanData[user.activeSubscription];
    if (!plan) {
      throw new HttpException(
        'Invalid or missing subscription plan',
        HttpStatus.FORBIDDEN,
      );
    }
    // check if credit has left to create bot

    if (user?.balanceAfterUsage <= 100) {
      throw new HttpException(
        'Insufficient credits to create bot. Please top up your balance.',
        HttpStatus.FORBIDDEN,
      );
    }
    //not already exist for the same bot type using Id
    const existingBot = await this.botCollection.findOne({
      userId,
      type: botType,
      referenceId: refrenceId,
      status: { $ne: 'deleted' },
    });

    if (existingBot) {
      return existingBot;
    }

    const { maxBots } = plan;

    // Count only non-deleted bots
    const activeBotCount = await this.botCollection.countDocuments({
      userId,
      status: { $ne: 'deleted' },
    });

    if (maxBots !== 'UNLIMITED' && activeBotCount >= maxBots) {
      throw new HttpException(
        `Bot limit reached (${maxBots}). Please upgrade your plan.`,
        HttpStatus.FORBIDDEN,
      );
    }

    const bot: Bot = {
      userId,
      type: botType,
      name: botType,
      referenceId: refrenceId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.botCollection.insertOne(bot);

    return {
      ...bot,
      _id: result.insertedId,
    };
  }

  async decreaseBotCount(
    userId: ObjectId,
    botType: BotType,
    referenceId?: ObjectId,
  ) {
    if (referenceId) {
      return await this.botCollection.updateOne(
        {
          referenceId,
          status: { $ne: 'deleted' },
        },
        {
          $set: {
            status: 'deleted',
            updatedAt: new Date(),
          },
        },
      );
    } else {
      return await this.botCollection.updateOne(
        { userId, type: botType, status: { $ne: 'deleted' } },
        {
          $set: {
            status: 'deleted',
            updatedAt: new Date(),
          },
        },
      );
    }
  }

  async markBotAsDeletedOnPlanChange(userId: ObjectId) {
    return await this.botCollection.updateMany(
      { userId, status: { $ne: 'deleted' } },
      {
        $set: {
          status: 'deleted',
          isResetOnPlanChange: true,
          updatedAt: new Date(),
        },
      },
    );
  }

  async addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  async addYears(date: Date, years: number) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  // Added by Nidhi Sharma to get bot count for a user
  async canCreateBot(userId: ObjectId): Promise<boolean> {
    const user = await this.userCollection.findOne({
      _id: userId,
      isActive: UserState.Active,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = subscriptionPlanData[user.activeSubscription];
    if (!plan) {
      throw new ForbiddenException('Invalid subscription plan');
    }

    const botCount = await this.botCollection.countDocuments({
      userId,
      status: { $ne: 'deleted' },
    });

    if (plan.maxBots !== 'UNLIMITED' && botCount >= plan.maxBots) {
      throw new ForbiddenException(
        `Bot limit reached (${plan.maxBots}). Please upgrade your plan.`,
      );
    }

    return true;
  }

  async addTopUpBalance(
    userId: ObjectId,
    amount: number,
    orderId: string,
    plan: string,
    currency: string,
    invoiceUrl?: string,
  ) {
    const user = await this.userCollection.findOne({ _id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const alreadyProcessed = await this.walletTransactionCollection.findOne({
      orderId,
    });

    if (alreadyProcessed) {
      return;
    }
    let creditsToAdd = Math.floor(amount / 0.01); // Assuming 1 credit = 0.01 Euro
    const bonusPercentage = addTopUpBalancePlan[plan]?.bonusPercentage || 0;
    const bonusCredits = Math.floor((creditsToAdd * bonusPercentage) / 100);
    creditsToAdd = creditsToAdd + bonusCredits;

    const updatedUser = await this.userCollection.findOneAndUpdate(
      { _id: userId },
      {
        $inc: { tokenCredits: creditsToAdd, balanceAfterUsage: creditsToAdd },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' },
    );

    await this.walletTransactionCollection.insertOne({
      orderId,
      userId,
      amount,
      addedCredits: creditsToAdd,
      bonusPercentage: bonusPercentage,
      plan,
      currency: currency,
      provider: 'lemonsqueezy',
      type: 'topup',
      createdAt: new Date(),
    });

    try {
      await this.emailService.sendBillingUpdateEmail({
        email: user.email,
        name: user.name ?? 'User',
        type: 'wallet',
        status: 'Top-up Successful',
        plan,
        creditsAdded: creditsToAdd,
        invoiceUrl,
      });
    } catch (error) {
    }

    return {
      success: true,
      message: 'Balance topped up successfully',
      newBalance: updatedUser.value?.tokenCredits || 0,
    };
  }

  async sendInvoiceAndPaymentConfirmationEmail(
    email: string,
    plan: string,
    billingCycle: BillingCycle,
    invoiceUrl?: string,
    isPlanUpgrade?: boolean,
  ) {
    try {
      const user = await this.userCollection.findOne(
        { email },
        { projection: { name: 1 } },
      );
      await this.emailService.sendBillingUpdateEmail({
        email,
        name: user?.name ?? 'User',
        type: 'subscription',
        status: isPlanUpgrade ? 'Plan Upgrade Confirmed' : 'Payment Confirmed',
        plan,
        billingCycle,
        invoiceUrl,
        isPlanUpgrade,
      });
      if (isPlanUpgrade) {
        await this.markBotAsDeletedOnPlanChange(user._id);
      }
    } catch (error) {
    }
  }

  async verifyOtp(email: string, otp: string) {
    if (!otp) {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'OTP required',
          message: 'OTP is required.',
        },
        400,
      );
    }

    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'Invalid OTP format',
          message: 'OTP must be exactly 6 digits.',
        },
        400,
      );
    }

    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new HttpException(
        {
          statusCode: 404,
          error: 'User not found',
          message: 'No account found with this email.',
        },
        404,
      );
    }

    if (!user.otp || user.otp !== otp) {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'Invalid OTP',
          message: 'The OTP you entered is incorrect.',
        },
        400,
      );
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'OTP expired',
          message: 'Your OTP has expired. Please request a new one.',
        },
        400,
      );
    }

    await this.userCollection.updateOne(
      { email },
      {
        $set: {
          isActive: UserState.Active,
          updatedAt: new Date(),
          isVerified: true,
        },
        $unset: {
          otp: '',
          otpExpiresAt: '',
        },
      },
    );

    return await this.getUserByEmail(email);
  }

  // async getUserById(id: string) {
  //   const userId = new ObjectId(id);
  //   if (!id) return null;
  //   return this.userCollection.findOne({ _id: userId });
  // }
}
