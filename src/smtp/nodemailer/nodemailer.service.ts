import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SmtpSetting } from '../entities/smtp.entity';
import { SmtpService } from '../smtp.service';
import { HttpStatus } from '@nestjs/common';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import { CampaignService } from '../../campaign/campaign.service';
import { OpenaiService } from '../../openai/openai.service';
import * as jwt from 'jsonwebtoken';
import * as Handlebars from 'handlebars';
import { ObjectId } from 'mongodb';
import { GPTModels } from '../../campaign/enum/enum';
import * as fs from 'fs';
import * as path from 'path';
import * as Imap from 'node-imap';
/**
 * NodemailerService
 * Handles email sending functionality with dynamic SMTP configurations
 * @developer : ankur
 */
@Injectable()
export class NodemailerService {
  private readonly logger = new Logger('NodemailerService');

  constructor(
    @Inject(forwardRef(() => SmtpService))
    private readonly smtpService: SmtpService,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaignService: CampaignService,
    private readonly openaiService: OpenaiService,
  ) {}
  /**
   * Creates a nodemailer transporter with the provided SMTP configuration
   * @param smtpConfig - SMTP configuration settings
   * @returns Nodemailer transporter
   * @private
   */
  private createTransporter(smtpConfig: SmtpSetting) {
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure || false,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password,
      },
      timeout: smtpConfig.timeout || 60000, // Default timeout of 60 seconds
    });
  }

  /**
   * Sends a single email using the user's SMTP configuration
   * @param userId - ID of the user
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - Email HTML content
   * @param text - Optional plain text content
   * @param attachments - Optional array of attachments
   * @returns Object with status and message
   */
  async sendEmail(
    userId: string,
    to: string,
    subject: string,
    html: string,
    text?: string,
    attachments?: any[],
    email?: string,
    campaignData?: any,
  ): Promise<any> {
    try {
      // Get user's SMTP settings
      const smtpSettingResponse = await this.smtpService.getSmtpSetting(
        userId,
        email,
      );

      if (!smtpSettingResponse.data) {
        throw new Error('SMTP settings not found for this user');
      }

      const smtpConfig = smtpSettingResponse.data;

      const smtpConfigDecrypted = {
        ...smtpConfig,
        password: CryptoService.decryptPasskey(smtpConfig.password),
      };

      // Process campaign data if provided (similar to postmark flow)
      if (campaignData) {
        const campaignUnsubscribeToken = jwt.sign(
          {
            email: to,
            campaignId: campaignData?.data?._id,
            addedBy: userId ?? campaignData?.data?.addedBy,
            isUnsubscriptionForSender: false,
          },
          process.env.SECRET_KEY,
          { expiresIn: '90d' },
        );

        const senderUnsubscribeToken = jwt.sign(
          {
            email: to,
            campaignId: campaignData?.data?._id,
            addedBy: userId ?? campaignData?.data?.addedBy,
            isUnsubscriptionForSender: true,
          },
          process.env.SECRET_KEY,
          { expiresIn: '90d' },
        );

        const campaignUnsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe?_t=${campaignUnsubscribeToken}`;
        const senderUnsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe?_t=${senderUnsubscribeToken}`;

        const campaignDetails = {
          email: to,
          campaignId: campaignData?.data?._id,
          campaigName: campaignData?.data?.campaignName,
          painPoints: campaignData?.data?.painPoints,
          solutionOffer: campaignData?.data?.solutionOffer,
          campaignLanguage: campaignData?.data?.campaignLanguage,
          campaignProject: campaignData?.data?.campaignProject,
          addedBy: campaignData?.data?.addedBy,
        };

        // Generate greet message
        const response = await this.greetGenerater(campaignDetails);

        const token = jwt.sign(
          {
            email: to,
            addedBy: campaignData?.data?.addedBy,
            campaignId: campaignData?.data?._id,
            greetMessage: response.data?.greet || response.data,
          },
          process.env.SECRET_KEY,
          { expiresIn: '15d' },
        );

        const template = Handlebars.compile(html);

        // ALWAYS pass all three keys
        html = template({
          campaignUnsubscribeLink,
          senderUnsubscribeLink,
          token,
        });
      }

      const transporter = this.createTransporter(smtpConfigDecrypted);

      const fromEmail = smtpConfig.from || smtpConfig.email;
      // Prepare email options
      const mailOptions = {
        from: `"${
          smtpConfig.name ? smtpConfig.name : fromEmail.split('@')[0]
        }" <${fromEmail}>`,
        to,
        subject,
        html,
        text: text || '',
        attachments: attachments || [],
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      this.campaignService.addWarmupCountV2(userId, email);

      Logger.log(`Email sent successfully: ${info.messageId}`);
      return {
        statusCode: HttpStatus.OK,
        message: 'Email sent successfully',
        data: {
          success: true,
          messageId: info.messageId,
        },
      };
    } catch (error) {
      Logger.error(`Error sending email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generates a greeting message for campaign emails
   * @param campaignDetails - Campaign details for greeting generation
   * @returns Object with status, message, and greeting data
   */
  async greetGenerater(campaignDetails: any) {
    const {
      targetAudience,
      painPoints,
      solutionOffer,
      campaigName,
      campaignLanguage,
    } = campaignDetails || {};

    const prompt = [
      {
        role: 'system',
        content: `You are an expert marketing copywriter. Your task is to generate a short and polite greeting message in ${campaignDetails.campaignLanguage} language and return it STRICTLY in this JSON format: { "greet": "short greeting message" }. Do not include any other text or explanations - only return the JSON object.`,
      },
      {
        role: 'user',
        content: `Generate a greeting message in ${campaignLanguage} language in JSON format with the key "greet".
  
          Details:
          CampaignName: ${JSON.stringify(campaigName)}
          Target Audience: ${JSON.stringify(targetAudience)}
          Pain Points: ${JSON.stringify(painPoints)}
          Solution: ${JSON.stringify(solutionOffer)}
  
          Message requirements:
  
          1. Start with "Hi" followed by a brief and friendly note.
          2. Mention that you are aware the user received your campaign with campaignName mention in Details.
          3. Acknowledge their pain points.
          4. Briefly reference the solution offer.
          5. End with an open-ended invitation to assist further.
          6. Keep the tone professional, conversational, and short.
          7. Respond only with the JSON object in this format:
  
          { "greet": "short greeting message" }`,
      },
    ];

    if (campaignDetails?.addedBy) {
      try {
        const gptGreetResponse = await this.openaiService.getChatGptCompletion(
          {
            messages: prompt as any,
            temperature: 0.5,
            frequency_penalty: 0,
            presence_penalty: 0,
            top_p: 1,
            model: GPTModels.GPT_5_MINI,
          },
          [],
          new ObjectId(campaignDetails?.addedBy),
          'campaign-email-greeting',
        );

        const gptGreetResponseData = gptGreetResponse.response
          ? JSON.parse(gptGreetResponse.response)
          : {};

        return {
          statusCode: HttpStatus.OK,
          message: 'GPT Generated Greet Message',
          data: gptGreetResponseData,
        };
      } catch (error) {
        Logger.error(
          `Error generating greeting: ${error.message}`,
          error.stack,
        );
        return {
          statusCode: HttpStatus.OK,
          message: 'Error generating greeting',
          data: {
            greet: `Hi ${campaignDetails.email}`,
          },
        };
      }
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'No Added By',
      data: {
        greet: `Hi ${campaignDetails.email}`,
      },
    };
  }

  /**
   * Sends bulk emails to multiple recipients using the user's SMTP configuration
   * @param userId - ID of the user
   * @param recipients - Array of recipient objects with to, subject, and variables
   * @param templateHtml - Email HTML template with variable placeholders
   * @param templateText - Optional plain text template with variable placeholders
   * @param attachments - Optional array of attachments
   * @returns Array of sending results
   */
  async sendBulkEmails(
    userId: string,
    recipients: Array<{
      to: string;
      subject: string;
      variables?: Record<string, any>;
    }>,
    templateHtml: string,
    templateText?: string,
    attachments?: any[],
  ): Promise<any> {
    try {
      // Get user's SMTP settings
      const smtpSettingResponse = await this.smtpService.getSmtpSetting(userId);

      if (!smtpSettingResponse.data) {
        throw new Error('SMTP settings not found for this user');
      }

      const smtpConfig = smtpSettingResponse.data;
      const transporter = this.createTransporter(smtpConfig);

      // Process each recipient in parallel with rate limiting
      const results = await Promise.all(
        recipients.map(async (recipient, index) => {
          try {
            // Add delay to prevent rate limiting issues (100ms between each email)
            if (index > 0) {
              await new Promise((resolve) => setTimeout(resolve, 100 * index));
            }

            // Replace variables in templates
            let personalizedHtml = templateHtml;
            let personalizedText = templateText || '';

            if (recipient.variables) {
              Object.entries(recipient.variables).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                personalizedHtml = personalizedHtml.replace(
                  regex,
                  String(value),
                );
                if (personalizedText) {
                  personalizedText = personalizedText.replace(
                    regex,
                    String(value),
                  );
                }
              });
            }

            // Prepare email options
            const mailOptions = {
              from: `"${smtpConfig.name || 'No Reply'}" <${
                smtpConfig.from || smtpConfig.email
              }>`,
              to: recipient.to,
              subject: recipient.subject,
              html: personalizedHtml,
              text: personalizedText,
              attachments: attachments || [],
            };

            // Send email
            const info = await transporter.sendMail(mailOptions);

            return {
              to: recipient.to,
              success: true,
              messageId: info.messageId,
              message: 'Email sent successfully',
            };
          } catch (error) {
            Logger.error(
              `Error sending email to ${recipient.to}: ${error.message}`,
            );
            return {
              to: recipient.to,
              success: false,
              error: error.message,
            };
          }
        }),
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Bulk emails processed',
        data: results,
      };
    } catch (error) {
      Logger.error(
        `Error in bulk email sending: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifies SMTP configuration by attempting to connect to the SMTP server
   * @param smtpConfig - SMTP configuration to verify
   * @returns Object with verification result
   */
  async verifySmtpConfig(smtpConfig: SmtpSetting): Promise<any> {
    try {
      Logger.log(
        `Attempting to verify SMTP configuration for host: ${smtpConfig.host}:${smtpConfig.port}`,
      );


      const smtpConfigDecrypted = {
        ...smtpConfig,
        password: CryptoService.decryptPasskey(smtpConfig.password),
      };
      const transporter = this.createTransporter(smtpConfigDecrypted);

      // Verify connection configuration
      Logger.log('Verifying SMTP connection...');
      await transporter.verify();

      Logger.log('SMTP connection verified successfully');
      return {
        statusCode: HttpStatus.OK,
        message: 'SMTP configuration is valid',
        data: {
          success: true,
        },
      };
    } catch (error) {
      Logger.error(`SMTP verification failed: ${error.message}`, error.stack);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'SMTP verification failed',
        data: {
          success: false,
          error: error.message,
          details: {
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            errorCode: error.code,
          },
        },
      };
    }
  }

  // Added IMAP configuration verification method
  async verifyImapConfig(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    secure: boolean;
    tls?: boolean;
  }): Promise<{ success: boolean; error?: string; details?: string }> {
    return new Promise((resolve) => {
      const imap = new Imap({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        tls: config.secure || config.tls || config.port === 993,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 30000,
      });

      let isResolved = false;

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          imap.end();
          resolve({
            success: false,
            error: 'IMAP connection timeout',
            details: `Failed to connect to ${config.host}:${config.port} within 30 seconds`,
          });
        }
      }, 30000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;

          // Try to open inbox to verify mailbox access
          imap.openBox('INBOX', false, (err, box) => {
            imap.end();
            if (err) {
              resolve({
                success: false,
                error: 'Cannot access INBOX',
                details: `IMAP connection successful but unable to open INBOX: ${err.message}`,
              });
            } else {
              resolve({
                success: true,
              });
            }
          });
        }
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          this.logger.error(
            `IMAP connection failed for ${config.user}: ${err.message}`,
          );
          resolve({
            success: false,
            error: 'IMAP connection failed',
            details: err.message,
          });
          imap.end();
        }
      });

      imap.connect();
    });
  }

  private renderTemplate(
    templatePath: string,
    variables: Record<string, string>,
  ): string {
    let html = fs.readFileSync(templatePath, 'utf-8');

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(placeholder, value);
    }
    return html;
  }

  /**
   * Sends a test email using the provided SMTP configuration
   * @param smtpConfig - SMTP configuration to test
   * @param testEmailAddress - Email address to send test email to
   * @returns Object with test result
   */
  async sendTestEmail(
    smtpConfig: SmtpSetting,
    testEmailAddress: string,
  ): Promise<any> {
    try {
      const smtpConfigDecrypted = {
        ...smtpConfig,
        password: CryptoService.decryptPasskey(smtpConfig.password),
      };

      const transporter = this.createTransporter(smtpConfigDecrypted);

      // Prepare test email
      const mailOptions = {
        from: `"${smtpConfig.name || 'UltimaBot'}" <${
          smtpConfig.from ? smtpConfig.from : smtpConfig.email
        }>`,
        to: testEmailAddress,
        subject: 'SMTP Configuration Test Successful',
        html: `
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2977FF; margin-bottom: 10px;">SMTP Configuration Successful</h1>
              <div style="height: 3px; background-color: #2977FF; width: 100px; margin: 0 auto;"></div>
            </div>
            <div style="color: #333; line-height: 1.6;">
              <p>Hello,</p>
              <p>This is a confirmation email to verify your SMTP configuration.</p>
              <p>Good news! Your SMTP settings are configured correctly and working as expected.</p>
              <div style="background-color: #f9f9f9; border-left: 4px solid #2977FF; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-style: italic;">This is an automated message. You can safely ignore this email.</p>
              </div>
            </div>
          `,
        text: 'SMTP Configuration Successful. Hello, this is a confirmation email to verify your SMTP configuration. Good news! Your SMTP settings are configured correctly and working as expected. This is an automated message. You can safely ignore this email. Thank you for using our services! Best regards, The Ultimawriter Team',
      };

      let updatedHTML = this.renderTemplate(
        path.join(
          __dirname,
          '../../common/email/templates',
          'email-template-rapper.html',
        ),
        {
          NAME: 'User',
          SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
          EMAIL_MESSAGE: mailOptions.html,
          HEADER: '',
        },
      );
      mailOptions.html = updatedHTML;

      // Send test email
      const info = await transporter.sendMail(mailOptions);

      return {
        statusCode: HttpStatus.OK,
        message: 'Test email sent successfully',
        data: {
          success: true,
          messageId: info.messageId,
        },
      };
    } catch (error) {
      Logger.error(`Test email failed: ${error.message}`, error.stack);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test email failed',
        data: {
          success: false,
          error: error.message,
        },
      };
    }
  }
}
