import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as postmark from 'postmark';
import * as Handlebars from 'handlebars';
import { AppConfigService } from '../config/appConfig.service';
import { EmailTemplateService } from '../../emailTemplate/email.service';
import { HttpStatusCode } from 'axios';
import { MONGODB } from '../mongo/mongo.module';
import { Collection, Db, ObjectId } from 'mongodb';
import thankYouMailTemplate from './templates/thankYouMail';
import { IsLeadType } from '../../knowledgebase/knowledgebase.schema';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import * as nodemailer from 'nodemailer';
import {
  SMTP_SETUP_COLLECTION,
  SmtpSetting,
} from '../../smtp/entities/smtp.entity';
import { USER_COLLECTION } from '../../user/user.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly smtpSettingsCollection: Collection<SmtpSetting>;
  private readonly logger: Logger;
  private isSgInitialized: boolean;
  private isPostmarkInitialized: boolean;
  private postmarkApiKey: string;
  private client: postmark.ServerClient;
  private senderEmail: string;
  private senderName: string;

  constructor(
    @Inject(MONGODB) private db: Db,
    private appConfig: AppConfigService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {
    this.smtpSettingsCollection = this.db.collection<SmtpSetting>(
      SMTP_SETUP_COLLECTION,
    );
    this.logger = new Logger(EmailService.name);
    const postmarkApiKey = this.appConfig.get('postmarkApiKey');
    this.senderEmail = this.appConfig.get('senderEmailId');
    this.senderName = this.appConfig.get('senderName');
    this.client = new postmark.ServerClient(postmarkApiKey);
    const sendGridApiKey = this.appConfig.get('sendGridApiKey');
    if (!postmarkApiKey) {
      this.isPostmarkInitialized = false;
    } else {
      this.isPostmarkInitialized = true;
      sgMail.setApiKey(sendGridApiKey);
      this.isSgInitialized = true;
    }
  }
  private createTransporter(smtpConfig: SmtpSetting) {
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure || false,
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.password,
      },
      timeout: smtpConfig.timeout || 60000,
    });
  }

  async sendWelcomeEmail(email: string, subject: string) {
    if (!this.isPostmarkInitialized) return;
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent('signupEmailText');
      const template = Handlebars.compile(fetchEmailContent.emailBody);
      const htmlContent = template({
        admin_emailid: email,
        superadmin_emailid: this.senderEmail,
      });

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: htmlContent,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${email}
            </h1>`,
        },
      );

      const res = await this.client.sendEmail({
        From: `"${this.senderName}" <${this.senderEmail}>`, // Replace with your verified sender email
        To: email, // Test recipient
        Subject: subject,
        HtmlBody: updatedHTML,
      });
      return res;
    } catch (err) {
      throw new HttpException(
        'An error occurred while sending the email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendScrappingEmail(data: any, subject: string) {
    const fetchEmailContent = await this.emailTemplateService.fetchEmailContent(
      'inviteUserEmailText',
    );
    const template = Handlebars.compile(fetchEmailContent.emailBody);

    const htmlContent = template({
      lead_websiteurl: data.websiteUrl,
      ai_email_message: data.emailContent,
      chatbot_link: data.chatbotUrl,
    });

    let updatedHTML = this.renderTemplate(
      path.join(__dirname, 'templates', 'email-template-rapper.html'),
      {
        NAME: data.email || 'User',
        SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
        EMAIL_MESSAGE: htmlContent,
        HEADER: '',
      },
    );

    return await this.sendEmailViaBothSMTPAndPostmarkSettings({
      userId: data?.userId,
      from: this.senderEmail,
      to: data.email,
      subject,
      html: updatedHTML,
      replyTo: this.senderEmail,
    });
  }

  async sendLeadMsgEmail(
    email: string,
    subject: string,
    data: any,
    isLeadSubmitter?: boolean,
    vakamangidsLead?: boolean,
  ) {
    if (isLeadSubmitter && vakamangidsLead) {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 24px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Hallo ${
            data.msg_name ? data.msg_name : 'Gebruiker'
          },</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Bedankt voor je aanvraag via onze <strong>Vakmangids</strong> chatbot!<br>
            We hebben je gegevens goed ontvangen en zijn op zoek naar een geschikte vakman in jouw regio.
          </p>
          <h3 style="color: #2980b9; margin-top: 32px; margin-bottom: 12px;">Wat gebeurt er nu?</h3>
          <ul style="font-size: 16px; line-height: 1.7; padding-left: 24px; margin-bottom: 24px;">
            <li>🔍 We matchen je aanvraag met betrouwbare vakmensen in jouw buurt.</li>
            <li>📞 Wanneer een vakman interesse heeft, zal hij je binnenkort contacteren om de details te bespreken of een afspraak te maken.</li>
          </ul>
          <div style="background: #fffbe6; border-left: 4px solid #f1c40f; padding: 16px 20px; margin-bottom: 24px; border-radius: 4px;">
            <strong>Na 4 werkdagen nog altijd geen nieuws?</strong><br>
            Plaats uw aanvraag opnieuw met een gedetailleerde opdrachtomschrijving. Hierdoor zullen bedrijven sneller reageren.
          </div>
          <p style="font-size: 16px; margin-top: 32px;">
            Met vriendelijke groet,<br>
            <strong>Het Vakmangids Team</strong>
          </p>
        </div>
      `;
      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: data?.userId,
        from: this.senderEmail,
        to: email,
        subject,
        html: htmlContent,
        replyTo: data.msg_email,
      });
    }
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent('leadsDataEmailText');

      const template = Handlebars.compile(fetchEmailContent.emailBody);
      const emailData: any = {
        redirectLeadLink: data.redirectLeadLink,
        chat_summary: data.chat_summary,
        admin_project_websiteurl: data.website_url,
        name_of_capturedlead: data.msg_name,
        email_of_capturedlead: data.msg_email,
      };
      // Only add phone number and address if they are present
      if (data.msg_number) {
        emailData.phone_number = 'Phone Number:';
        emailData.phonenumber_of_capturedlead = data.msg_number;
      }
      if (data.msg_address) {
        emailData.address = 'Address:';
        emailData.address_of_capturedlead = data.msg_address;
      }

      if (data && data?.appointmentDetails) {
        const { timeSlot, meetingDate } = data?.appointmentDetails || {};
        if (timeSlot && timeSlot.startTime) {
          const startTime = new Date(timeSlot.startTime);
          emailData.start_time = startTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
        }

        if (timeSlot && timeSlot.endTime) {
          const endTime = new Date(timeSlot.endTime);
          emailData.end_time = endTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
        if (meetingDate) {
          emailData.meeting_date = meetingDate;
        }
      }

      const htmlContent = template(emailData);

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: htmlContent,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${email}
            </h1>`,
        },
      );

      return this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: data?.userId,
        from: this.senderEmail,
        to: email,
        subject,
        html: updatedHTML,
        replyTo: data.msg_email,
      });
    } catch (error) {
      return null;
    }
  }

  async sendThankYouLeadEmail(
    email: string,
    subject: string,
    data: any,
    knowledgebaseId: ObjectId,
  ) {
    try {
      // Fetch a template from DB/service (if exists)
      const fetchEmailContent = await this.db
        .collection('knowledgebase')
        .findOne({ _id: knowledgebaseId });
      let templateText =
        fetchEmailContent?.chatWidgeData?.thankyouEmailText ||
        thankYouMailTemplate;

      let htmlContent: string;
      // Compile using Handlebars if a stored template exists
      const template = Handlebars.compile(templateText);
      const emailData: any = {
        lead_name: data.msg_name || 'N/A',
        lead_email: data.msg_email,
        website_url: data.website_url,
        support_email: data.support_email,
      };
      htmlContent = template(emailData);

      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: data?.userId,
        from: 'notifications@ultimabot.ai',
        to: email,
        subject,
        html: htmlContent,
        replyTo: data.support_email,
      });
    } catch (error) {
      this.logger.error('Error sending thank-you lead email:', error);
      return null;
    }
  }

  async sendOfflineMsgEmail(email: string, subject: string, data: any) {
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'offlineMessagesEmailText',
        );
      const template = Handlebars.compile(fetchEmailContent.emailBody);

      const htmlContent = template({
        admin_project_websiteurl: data.website_url,
        name_of_offlinemessagelead: data.msg_name,
        email_of_offlinemessagelead: data.msg_email,
        message_of_offlinemessagelead: data.msg_msg,
      });

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: htmlContent,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${email}
            </h1>`,
        },
      );

      return this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: data?.userId,
        from: this.senderEmail,
        to: email,
        subject,
        html: updatedHTML,
        replyTo: data.msg_email,
      });
    } catch (error) {
      throw new HttpException(
        'An error occurred while sending the email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async passwordResetEmail(
    email: string,
    name: any,
    subject: string,
    resetUrl: string,
  ) {
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'forgetPasswordEmailText',
        );
      const template = Handlebars.compile(fetchEmailContent.emailBody);
      const htmlContent = template({
        email: email,
        resetUrl: resetUrl,
      });

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: htmlContent,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${name || email}
            </h1>`,
        },
      );

      const res = await this.client.sendEmail({
        From: `"${this.senderName}" <${this.senderEmail}>`,
        To: email,
        Subject: subject,
        HtmlBody: updatedHTML,
        // ReplyTo: data.msg_email, // Add your Reply-To address here
      });
      return res;
    } catch (error) {
      throw new HttpException(
        'An error occurred while sending the email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async passwordResetSuccessEmail(
    email: string,
    name: any,
    subject: string,
    // resetUrl: string,
  ) {
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'forgetPasswordSuccessEmailText',
        );
      const template = Handlebars.compile(fetchEmailContent.emailBody);

      const htmlContent = template({
        admin_emailid: email,
        superadmin_emailid: this.senderEmail,
      });

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: htmlContent,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${name || email}
            </h1>`,
        },
      );

      const res = await this.client.sendEmail({
        From: `"${this.senderName}" <${this.senderEmail}>`,
        To: email,
        Subject: subject,
        HtmlBody: updatedHTML,
        // ReplyTo: data.msg_email, // Add your Reply-To address here
      });
      return res;
    } catch (err) {
      throw new HttpException(
        'An error occurred while sending the email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendofflineMsgResponseMail(data: any) {
    try {
      const queryMatch = data.emailContent.match(
        /<b>Query<\/b>:\s*(.*?)<br\/?>/i,
      );

      const messageMatch = data.emailContent.match(
        /<b>Message<\/b>:\s*(.*?)<\/p>/i,
      );

      const extractedQuery = queryMatch
        ? queryMatch[1].trim()
        : 'No query found';
      const extractedMessage = messageMatch
        ? messageMatch[1].trim()
        : 'No answer available';

      // Keep exact required format
      const finalTemplate = `
      <p>
        Thank you for reaching out to us. We’ve successfully received your
        message and details.
      </p>
      <p>Here’s a quick summary of what we received:</p>
      <p>• Name: ${data.name || 'Customer'}</p>
      <p>• Email: ${data.email || data.phone || 'N/A'}</p>
      <p>• Query: ${extractedQuery}</p>
      <p>• Answer : ${extractedMessage}</p>
    `;

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: finalTemplate,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${data.name || 'Customer'}
            </h1>`,
        },
      );

      return this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: data?.userId,
        from: this.senderEmail,
        to: data.email,
        subject: data.subject,
        html: updatedHTML,
        replyTo: this.senderEmail,
      });
    } catch (error) {
      throw error;
    }
  }

  // ! Not used any where
  async sendCampaignEmailToLeads(
    senderEmail: string,
    receiverEmail: string,
    data: any,
    subject: string,
    emailText: string,
  ) {
    if (!this.isPostmarkInitialized) return;
    const template = Handlebars.compile(emailText);

    //template data should include sender details

    const htmlContent = template({
      lead_websiteurl: data.websiteUrl, //TODO: add contact details or admin name and other details
      ai_email_message: receiverEmail,
    });

    const res = await this.client.sendEmail({
      From: `"${this.senderName}" <${this.senderEmail}>`,
      To: receiverEmail,
      Subject: subject,
      HtmlBody: htmlContent,
    });
    return res;
  }

  // ! Not used anymore
  async sendGoogleCalendarMeetEmail(
    email: string,
    subject: string,
    meetData: any,
  ) {
    if (!this.isPostmarkInitialized) return;
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'calendarMeetEmailText',
        );
      const template = Handlebars.compile(fetchEmailContent.emailBody);

      const htmlContent = template({
        meeting_title: meetData.title,
        meeting_date: meetData.date,
        meeting_time: meetData.time,
        meeting_link: meetData.meetLink,
        meeting_description: meetData.description,
        host_name: meetData.hostName,
      });

      const res = await this.client.sendEmail({
        From: `"${this.senderName}" <${this.senderEmail}>`,
        To: email,
        Subject: subject,
        HtmlBody: htmlContent,
        ReplyTo: this.senderEmail,
      });
      return res;
    } catch (error) {
      throw new HttpException(
        'An error occurred while sending the calendar meet email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendMeetingNotificationEmail(
    email: string,
    name: string,
    meetDate: Date,
    userId: string,
  ) {
    // Convert to IST for natural speech
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    const updatedDate = new Date(meetDate);
    const date = new Intl.DateTimeFormat('en-IN', options).format(updatedDate);
    const time = new Intl.DateTimeFormat('en-IN', timeOptions).format(
      updatedDate,
    );

    try {
      const htmlContent = ` 
    
          <p>Hi <strong>${name}</strong>,</p>
          
          <p>Just a quick reminder about our upcoming meeting:</p>
      
          <ul>
              <li><strong>📅 Date:</strong> ${date}</li>
              <li><strong>⏰ Time:</strong> ${time}</li>
          </ul>
      
          <p>Let me know if you have any questions. See you there!</p>
      
          <p style="margin:0px">Best, Regards</p>
          <p><strong style="margin:0px">${this.senderName} UltimaBot</strong></p>`;

      // const template = Handlebars.compile(fetchEmailContent.emailBody);

      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: userId,
        subject: 'Meeting Reminder',
        from: this.senderEmail,
        to: email,
        html: htmlContent,
        replyTo: this.senderEmail,
      });
    } catch (error) {
      throw new HttpException(
        'An error occurred while sending the calendar meet email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendPotentialLeadMailToAdmin(
    adminEmail: string,
    email?: string,
    name?: string,
    contactNumber?: string,
    address?: string,
    callSummery?: string,
    isAdmin: boolean = true,
    meetingData?: {
      startTime: Date;
      endTime: Date;
      isMeetingBookedOnGoogleMeet: boolean;
    },
    customQuestions?: any,
    userId?: string,
  ) {
    try {
      let contentBlocks = '';

      if (name) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Name:</span>
            <span style="color: #222222;">${name}</span>
          </div>`;
      }

      if (contactNumber) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Contact Number:</span>
            <span style="color: #222222;">${contactNumber}</span>
          </div>`;
      }

      if (email) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Email:</span>
            <span style="color: #222222;">${email}</span>
          </div>`;
      }

      if (meetingData && meetingData?.startTime && meetingData?.endTime) {
        const start = new Date(meetingData.startTime);
        const end = new Date(meetingData.endTime);
        const dateStr = start.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const startTimeStr = start.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const endTimeStr = end.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        contentBlocks += `
          <div style="margin-bottom: 12px;">
        <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Date:</span>
        <span style="color: #222222;">${dateStr}</span>
          </div>

          <div style="margin-bottom: 12px;">
        <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Time slot:</span>
        <span style="color: #222222;">${startTimeStr} - ${endTimeStr}</span>
          </div>`;
      }

      if (address) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Address:</span>
            <span style="color: #222222;">${address}</span>
          </div>`;
      }

      if (callSummery) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px; vertical-align: top;">Call Summary:</span>
            <div style="display: inline-block; color: #222222; max-width: 430px; vertical-align: top;">
                 ${callSummery}
           </div>
          </div>`;
      }

      if (customQuestions && customQuestions?.length > 0) {
        contentBlocks += `
          <div style="font-size: 16px; font-weight: bold; margin: 18px 0 10px 0; color: #333333;">
            📝 Custom Question Answers
          </div>
        `;
        customQuestions.forEach((q: any, idx: number) => {
          contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555">${idx + 1}. ${
            q.question
          }:</span>
            <span style="color: #222222;">${q.answer ?? 'N/A'}</span>
          </div>`;
        });
      }
      let meetingInfoBlock = '';
      if (!meetingData?.isMeetingBookedOnGoogleMeet) {
        meetingInfoBlock = `<p style="font-size: 14px; color: #666666; margin-top: 30px;">
            Please confirm the availability and get back to him.
          </p>`;
      }

      const htmlContent = `
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 24px; border-radius: 6px; border: 1px solid #e0e0e0;">
          
          <p style="font-size: 16px; color: #333333;">Hi ${
            isAdmin ? 'Admin' : 'Team'
          },</p>
    
          <p style="font-size: 14px; color: #444444; margin-bottom: 20px;">
            You have received a new potential lead via the <strong>VoiceBot Campaign</strong>. Please review the details below:
          </p>
    
          <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #333333;">
            📩 Lead Information
          </div>
    
          ${contentBlocks}
    
          <p style="font-size: 14px; color: #666666; margin-top: 30px;">
            Kindly follow up with the lead to proceed further. This information was captured during a voicebot interaction initiated by the lead.
          </p>

          ${meetingInfoBlock}
    
          <div style="margin-top: 40px; font-size: 14px; color: #555555; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            Regards,<br />
            <strong>UltimaBot</strong><br />
            Voice Assistant Team<br />
            <a href="mailto:${this.senderEmail}" style="color: #0066cc;">${
        this.senderEmail
      }</a>
          </div>
        </div>
      </body>`;

      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: userId,
        from: this.senderEmail,
        to: adminEmail,
        subject: 'Potential Lead Information',
        html: htmlContent,
        replyTo: adminEmail,
      });
    } catch (error) {
      throw new HttpException(
        'An error occurred while sending the lead information email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendPotentialLeadMailToAdminEMailBot(
    adminEmail: string,
    email?: string,
    name?: string,
    contactNumber?: string,
    address?: string,
    callSummery?: string,
    isAdmin: boolean = true,
    meetingData?: {
      startTime: Date;
      endTime: Date;
      isMeetingBookedOnGoogleMeet: boolean;
    },
    userId?: string,
  ) {
    try {
      let contentBlocks = '';

      if (name) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Name:</span>
            <span style="color: #222222;">${name}</span>
          </div>`;
      }

      if (contactNumber) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Contact Number:</span>
            <span style="color: #222222;">${contactNumber}</span>
          </div>`;
      }

      if (email) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Email:</span>
            <span style="color: #222222;">${email}</span>
          </div>`;
      }

      if (meetingData && meetingData?.startTime && meetingData?.endTime) {
        const start = new Date(meetingData.startTime);
        const end = new Date(meetingData.endTime);
        const dateStr = start.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const startTimeStr = start.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const endTimeStr = end.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        contentBlocks += `
          <div style="margin-bottom: 12px;">
        <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Date:</span>
        <span style="color: #222222;">${dateStr}</span>
          </div>

          <div style="margin-bottom: 12px;">
        <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Time slot:</span>
        <span style="color: #222222;">${startTimeStr} - ${endTimeStr}</span>
          </div>`;
      }

      if (address) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Address:</span>
            <span style="color: #222222;">${address}</span>
          </div>`;
      }

      if (callSummery) {
        contentBlocks += `
          <div style="margin-bottom: 12px;">
            <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px; vertical-align: top;">Call Summary:</span>
            <div style="display: inline-block; color: #222222; max-width: 430px; vertical-align: top;">
                 ${callSummery}
           </div>
          </div>`;
      }

      let meetingInfoBlock = '';
      if (!meetingData?.isMeetingBookedOnGoogleMeet) {
        meetingInfoBlock = `<p style="font-size: 14px; color: #666666; margin-top: 30px;">
            Please confirm the availability and get back to him.
          </p>`;
      }

      const htmlContent = `
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 24px; border-radius: 6px; border: 1px solid #e0e0e0;">
          
          <p style="font-size: 16px; color: #333333;">Hi ${
            isAdmin ? 'Admin' : 'Team'
          },</p>
    
          <p style="font-size: 14px; color: #444444; margin-bottom: 20px;">
            You have received a new potential lead via the <strong>Email Campaign</strong>. Please review the details below:
          </p>
    
          <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #333333;">
            📩 Lead Information
          </div>
    
          ${contentBlocks}
    
          <p style="font-size: 14px; color: #666666; margin-top: 30px;">
            Kindly follow up with the lead to proceed further. This information was captured during a Ultima Mail interaction initiated by the lead.
          </p>

          ${meetingInfoBlock}
    
          <div style="margin-top: 40px; font-size: 14px; color: #555555; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            Regards,<br />
            <strong>UltimaBot</strong><br />
            Ultima Mail Team<br />
            <a href="mailto:${this.senderEmail}" style="color: #0066cc;">${
        this.senderEmail
      }</a>
          </div>
        </div>
      </body>`;

      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: userId,
        from: this.senderEmail,
        to: adminEmail,
        subject: 'Potential Lead Information',
        html: htmlContent,
        replyTo: adminEmail,
      });
    } catch (error) {
      throw new HttpException(
        'An error occurred while sending the lead information email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendMeetingConfirmationToLead(
    leadEmail: string,
    name: string,
    meetingDate: string,
    timeSlot: {
      startTime: string | Date;
      endTime: string | Date;
      timezone?: string;
      fullDateTime?: string;
    },
    isMeetingBookedOnGoogleMeet: boolean,
    leadType: IsLeadType,
    userId: string,
  ) {
    try {
      const timezoneLabel = timeSlot?.timezone || 'UTC';

      const contentBlocks = `
        <div style="margin-bottom: 12px;">
          <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Name:</span>
          <span style="color: #222222;">${name}</span>
        </div>
  
        <div style="margin-bottom: 12px;">
          <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Date:</span>
          <span style="color: #222222;">${meetingDate}</span>
        </div>
  
        <div style="margin-bottom: 12px;">
          <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Time Slot:</span>
          <span style="color: #222222;">
            ${
              timeSlot?.startTime && timeSlot?.endTime
                ? `${timeSlot.startTime} - ${timeSlot.endTime}`
                : 'N/A'
            }
          </span>
        </div>
  
        <div style="margin-bottom: 12px;">
          <span style="font-weight: bold; color: #555555; display: inline-block; width: 150px;">Timezone:</span>
          <span style="color: #222222;">${timezoneLabel}</span>
        </div>
      `;

      const htmlContent = `
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 24px; border-radius: 6px; border: 1px solid #e0e0e0;">
          
          <p style="font-size: 16px; color: #333333;">Hi ${name},</p>
    
          <p style="font-size: 14px; color: #444444; margin-bottom: 20px;">
            Your meeting has been <strong>successfully scheduled</strong>. Here are the details:
          </p>
    
          <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #333333;">
            📅 Meeting Confirmation
          </div>
    
          ${contentBlocks}
    
          ${
            timeSlot?.fullDateTime
              ? `<p style="font-size: 14px; color: #444444;">
                   <strong>Full Schedule:</strong> ${timeSlot.fullDateTime} (${timezoneLabel})
                 </p>`
              : ''
          }
    
          <p style="font-size: 14px; color: #666666; margin-top: 30px;">
          ${
            isMeetingBookedOnGoogleMeet
              ? 'Please join on time. If you need to reschedule, reply to this email.'
              : 'Our team will confirm availability shortly.'
          }
          </p>
    
          <div style="margin-top: 40px; font-size: 14px; color: #555555; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            Regards,<br />
            <strong>UltimaBot</strong><br />
            ${
              leadType.charAt(0).toUpperCase() + leadType.slice(1)
            } Assistant Team<br />
            <a href="mailto:${this.senderEmail}" style="color: #0066cc;">
              ${this.senderEmail}
            </a>
          </div>
        </div>
      </body>`;

      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: userId,
        from: 'notifications@ultimabot.ai',
        to: leadEmail,
        subject: 'Meeting Confirmation',
        html: htmlContent,
        replyTo: this.senderEmail,
      });
    } catch (error) {
      throw new HttpException(
        'An error occurred while sending the meeting confirmation email.',
        HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendEmailToCallerRegardingCampaign(
    callerEmail: string,
    emailBody: string,
    subject: string,
    campaignOwnerEmail: string,
    userId: string,
  ) {
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'voicebotMissedLeadText',
        );
      const htmlContent = emailBody;
      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: userId,
        from: this.senderEmail,
        to: callerEmail,
        subject,
        html: htmlContent,
        replyTo: this.senderEmail,
      });
    } catch (error) {
      this.logger.error('Error sending email to caller:', error.message);
      throw new HttpException(
        error.response.message || 'An error occurred while sending the email.',
        error.response?.status || HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendEmailToCampaignOwner(
    callerPhoneNumber: number,
    campaignOwnerEmail: string,
    userId: string,
  ) {
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'voicebotMissedLeadText',
        );
      const htmlContent = `
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 24px; border-radius: 6px; border: 1px solid #e0e0e0;">
        
        <p style="font-size: 16px; color: #333333;">Hello User,</p>
      

          <p style="font-size: 16px; color: #444444; margin-bottom: 15px;">
            I hope this email finds you well. I wanted to inform you about our recent contact attempts through our voicebot system.
          </p>

          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
            <h3 style="color: #333333; margin-bottom: 15px;">Contact Details:</h3>
            <p style="color: #666666; margin: 5px 0;">📞 Phone Number: ${callerPhoneNumber}</p>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #856404; margin-bottom: 15px;">Attempt Summary:</h3>
            <ul style="color: #856404; margin-bottom: 0;">
              <li style="margin-bottom: 10px;">We have attempted to reach this contact 3 times</li>
              <li style="margin-bottom: 10px;">The contact appears to show no interest in our services</li>
              <li style="margin-bottom: 10px;">We were unable to collect an email address during these interactions</li>
              <li style="margin-bottom: 10px;">No further automated follow-up will be attempted</li>
            </ul>
          </div>

          <p style="font-size: 16px; color: #444444; margin: 20px 0;">
            You may want to consider reaching out to this contact through alternative channels if you believe there's potential value in following up.
          </p>

          <div style="margin-top: 30px; font-size: 14px; color: #555555; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            Best regards,<br />
            <strong>UltimaBot</strong><br />
            Voice Assistant Team<br />
            <a href="mailto:${this.senderEmail}" style="color: #0066cc;">${this.senderEmail}</a>
          </div>
        </div>
      </body>`;

      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId,
        from: this.senderEmail,
        to: campaignOwnerEmail,
        subject: `Unreachable Contact Notification - ${callerPhoneNumber}`,
        html: htmlContent,
      });
    } catch (error) {
      this.logger.error('Error sending email to campaign owner:', error.message);
      throw new HttpException(
        error.response.message || 'An error occurred while sending the email.',
        error.response?.status || HttpStatusCode.UnprocessableEntity,
      );
    }
  }

  async sendBalanceAlertEmail(data: {
    email: string;
    usagePercentage: number;
    name: string;
    userId: string;
  }) {
    if (!this.isPostmarkInitialized) return;
    try {
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'accountBalanceAlertEmailText',
        );
      const template = Handlebars.compile(fetchEmailContent.emailBody);

      const htmlContent = template({
        usagePercentage: data.usagePercentage,
        name: data.name,
        upgradePlanUrl: `${process.env.FRONTEND_URL}/app/subscription`,
      });

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: htmlContent,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${data?.name || data?.email || 'User'}
            </h1>`,
        },
      );

      return await this.sendEmailViaBothSMTPAndPostmarkSettings({
        userId: data.userId,
        from: this.senderEmail,
        to: data.email,
        subject: '⚠️ Your UltimaBot credits are running low',
        html: updatedHTML,
        replyTo: this.senderEmail,
      });
    } catch (error) {
    }
  }

  async sendEmailOnSubscriptionExpires(email: string, deletionReason?: string) {
    try {
      const baseTemplate = (
        title: string,
        subtitle: string,
        message: string,
        highlightText: string,
        buttonText?: string,
        buttonLink?: string,
      ) => `
      <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Segoe UI', Arial, sans-serif;">
        <div style="max-width: 620px; margin: 40px auto; background-color: #ffffff; padding: 32px; border-radius: 10px; border: 1px solid #e3e8ef; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://cdn-icons-png.flaticon.com/512/992/992700.png" alt="Alert Icon" width="60" height="60" style="margin-bottom: 12px;" />
            <h1 style="color: #1e293b; font-size: 24px; margin: 0;">${title}</h1>
            <p style="color: #475569; font-size: 15px; margin-top: 6px;">${subtitle}</p>
          </div>

          <!-- Body -->
          <div style="font-size: 15px; color: #334155; line-height: 1.6;">
            <p>Hi there,</p>
            <p>${message}</p>

            <div style="background-color: #fff6f6; border-left: 4px solid #dc2626; padding: 14px 18px; border-radius: 4px; margin: 20px 0;">
              <strong style="color: #dc2626;">Important:</strong>
              ${highlightText}
            </div>

            ${
              buttonText
                ? `<div style="text-align: center; margin: 32px 0;">
                    <a href="${buttonLink || '#'}" 
                       style="display: inline-block; background-color: #2563eb; color: #ffffff; 
                              text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                              font-weight: 600; font-size: 15px;">
                      ${buttonText}
                    </a>
                  </div>`
                : ''
            }

            <p style="margin-top: 30px;">Warm regards,<br />
            <strong>The UltimaBot Team</strong><br />
            <a href="mailto:${
              this.senderEmail
            }" style="color: #2563eb; text-decoration: none;">
              ${this.senderEmail}
            </a></p>
          </div>

          <!-- Footer -->
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          <div style="text-align: center; font-size: 13px; color: #94a3b8;">
            © ${new Date().getFullYear()} UltimaBot — All rights reserved.
          </div>
        </div>
      </body>
    `;

      let subject = '';
      let htmlContent = '';

      switch (deletionReason) {
        case 'manual':
          subject =
            '⚠️ Account Deactivated — Scheduled for Permanent Deletion in 90 Days';
          htmlContent = baseTemplate(
            'Account Deactivated',
            'Your account has been successfully deactivated',
            `Your <strong>UltimaBot</strong> account was deactivated by you.
             Your account is now inactive, but your data is still securely stored with us.`,
            `If you do not reactivate your account within <strong>90 days</strong>, 
            it will be permanently deleted along with all associated data.`,
            'Reactivate Account',
            process.env.API_BASE_URL + 'app/myprofile',
          );
          break;

        case 'subscription':
          subject =
            '⚠️ Subscription Expired — Your Account Will Be Deleted in 90 Days';
          htmlContent = baseTemplate(
            'Subscription Expired',
            'Your account is currently inactive',
            `Your <strong>UltimaBot</strong> subscription has expired.
             As a result, your account has been moved to an inactive state.`,
            `If the subscription is not renewed within <strong>90 days</strong>, 
             your account and all associated data will be permanently deleted.`,
            'Renew Subscription',
            process.env.API_BASE_URL + 'app/myprofile',
          );
          break;

        case 'permanent_deletion':
          subject = '❌ Account Permanently Deleted';
          htmlContent = baseTemplate(
            'Account Permanently Deleted',
            'Your account and data have been removed',
            `Your <strong>UltimaBot</strong> account and all associated data 
       have now been permanently deleted in accordance with our retention policy.`,
            `This action cannot be reversed. If you wish to use UltimaBot again, 
       you may create a new account anytime.`,
            'Create New Account',
            process.env.API_BASE_URL + 'app/myprofile',
          );
          break;

        default:
          subject = '⚠️ Account Notice — Action May Be Required';
          htmlContent = baseTemplate(
            'Account Notice',
            'Please review your account status',
            `There is an update regarding your <strong>UltimaBot</strong> account.`,
            `Please review your account to ensure uninterrupted access to our services.`,
            'Manage Account',
            process.env.API_BASE_URL + 'app/myprofile',
          );
      }
      // Send email
      await this.client.sendEmail({
        From: `"${this.senderName}" <${this.senderEmail}>`,
        To: email,
        Subject: subject,
        HtmlBody: htmlContent,
        ReplyTo: this.senderEmail,
      });

      return true;
    } catch (error) {
      this.logger.error('sendEmailOnSubscriptionExpires', error);
    }
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

  async sendBillingUpdateEmail(options: {
    email: string;
    name: string;
    type: 'subscription' | 'wallet' | 'cancellation';
    plan?: string;
    billingCycle?: 'MONTHLY' | 'YEARLY';
    status?: string | null;
    endAt?: Date | null;
    creditsAdded?: number | null;
    invoiceUrl?: string;
    isPlanUpgrade?: boolean;
    isExpired?: boolean | null;
  }) {
    try {
      const {
        email,
        type,
        plan,
        billingCycle,
        status,
        creditsAdded,
        invoiceUrl,
        endAt,
        name,
      } = options;

      let subject = '';
      let htmlContent = '';

      if (type === 'subscription') {
        const confirmationTxt = options?.isPlanUpgrade
          ? 'Your subscription has been created successfully.'
          : 'Your subscription has been updated successfully.';

        subject = `Subscription Update - ${plan} ${billingCycle ?? ''}`;

        const problemStatuses = [
          'Cancelled',
          'Expired',
          'Paused',
          'Unpaid',
          'Past_due',
        ];
        const statusColor = problemStatuses.includes(status ?? '')
          ? '#dc3545'
          : '#198754';

        htmlContent = this.renderTemplate(
          path.join(__dirname, 'templates', 'subscription-upgrade.html'),
          {
            NAME: name,
            PLAN: plan ?? '-',
            BILLING_CYCLE: billingCycle ?? '-',
            STATUS: status ?? '-',
            STATUS_COLOR: statusColor,
            VALID_UNTIL: endAt ? new Date(endAt).toDateString() : '',
            INVOICE_URL: invoiceUrl ?? '#',
            CONFIRMATION_TXT: confirmationTxt,
            SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          },
        );
      }

      if (type === 'wallet') {
        subject = 'Wallet Top-up Successful';

        htmlContent = this.renderTemplate(
          path.join(__dirname, 'templates', 'add-credit.html'),
          {
            NAME: name,
            CREDITS_ADDED: (creditsAdded ?? 0).toLocaleString(),
            INVOICE_URL: invoiceUrl ?? '#',
            SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          },
        );
      }

      if (type === 'cancellation') {
        subject = 'Subscription Cancellation Confirmation';
        htmlContent = this.renderTemplate(
          path.join(__dirname, 'templates', 'cancel-subscription.html'),
          {
            NAME: name,
            PLANS_URL: `${process.env.API_BASE_URL}/app/myprofile`,
            SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,

            // BILLING_CYCLE: billingCycle ?? '-',
            // VALID_UNTIL: endAt ? new Date(endAt).toDateString() : '',
          },
        );
      }

      if (options.isExpired === true) {
        subject = 'Subscription Expired';
        htmlContent = this.renderTemplate(
          path.join(__dirname, 'templates', 'subscription-expired.html'),
          {
            NAME: name,
            PLANS_URL: `${process.env.API_BASE_URL}/app/myprofile`,
            SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
            STATUS: 'Expired',
            MESSAGE: `Your subscription has expired. Please update your payment information to avoid interruption of service.`,
          },
        );
      }

      if (
        status &&
        (status === 'Past_due' || status === 'Paused' || status === 'Unpaid')
      ) {
        subject = `Subscription is ${status}`;
        htmlContent = this.renderTemplate(
          path.join(__dirname, 'templates', 'subscription-expired.html'),
          {
            NAME: name,
            PLANS_URL: `${process.env.API_BASE_URL}/app/myprofile`,
            SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
            STATUS: status,
            MESSAGE: `Your subscription status is currently <strong>${status}</strong>. Please update your payment information to avoid interruption of service.`,
          },
        );
      }

      if (!this.isPostmarkInitialized) return;

      await this.client.sendEmail({
        From: `"${this.senderName}" <${this.senderEmail}>`,
        To: email,
        Subject: subject,
        HtmlBody: htmlContent,
        ReplyTo: this.senderEmail,
      });

      this.logger.log(`Billing email sent → ${email}`);
    } catch (error) {
      this.logger.error('Billing email failed', error);
    }
  }

  async sendEmailViaBothSMTPAndPostmarkSettings(params: {
    userId: string;
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    attachments?: Array<any>;
  }) {
    const {
      userId,
      from,
      to,
      subject,
      html,
      text = '',
      replyTo,
      attachments = [],
    } = params;

    try {
      if (!userId) {
        this.logger.error('🚀 UserId is required to send the email', userId);
        return;
      }

      //  STEP 1: Check admin
      const user = await this.db
        .collection(USER_COLLECTION)
        .findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });

      const isAdmin = user?.role === 'admin';

      //  STEP 2: ADMIN → Postmark
      if (isAdmin) {
        if (!this.isPostmarkInitialized) return;

        return await this.client.sendEmail({
          From: `"${this.senderName}" <${this.senderEmail}>`,
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text,
          ReplyTo: replyTo,
        });
      }

      //  STEP 3: USER → SMTP
      const smtpSettingResponse = await this.smtpSettingsCollection
        .find({ userId })
        .toArray();

      if (!smtpSettingResponse || smtpSettingResponse.length === 0) {
        throw new Error('SMTP settings not found for this user');
      }

      const smtpConfig = smtpSettingResponse[0];
      const smtpConfigDecrypted = {
        ...smtpConfig,
        password: CryptoService.decryptPasskey(smtpConfig.password),
      };

      const transporter = this.createTransporter(smtpConfigDecrypted);

      const fromEmail = smtpConfig.from || smtpConfig.email;
      const mailOptions = {
        from: `"${
          smtpConfig.name ? smtpConfig.name : fromEmail.split('@')[0]
        }" <${smtpConfig.from || smtpConfig.email}>`,
        to,
        subject,
        html,
        text,
        replyTo: smtpConfig.from || smtpConfig.email,
        attachments,
      };
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      throw error;
    }
  }

  async sendOTPConformationOnEmail(email, otp) {
    try {
      if (!this.isPostmarkInitialized) return;
      const fetchEmailContent =
        await this.emailTemplateService.fetchEmailContent(
          'otpEmailSendToNewUsers',
        );
      const template = Handlebars.compile(fetchEmailContent.emailBody);
      const htmlContent = template({
        otp: otp,
      });

      let updatedHTML = this.renderTemplate(
        path.join(__dirname, 'templates', 'email-template-rapper.html'),
        {
          SUPER_ADMIN_EMAIL: process.env.SUPPORT_EMAIL,
          EMAIL_MESSAGE: htmlContent,
          HEADER: `<h1 style="font-family: Arial;
               font-weight: 400;
               font-style: Regular;
               font-size: 24px;
               line-height: 36px;
               letter-spacing: -1px;
               vertical-align: middle;
               margin-bottom: 24px;
               color: #1C1E23;
               ">Hi ${email}
            </h1>`,
        },
      );

      const res = await this.client.sendEmail({
        From: `"${this.senderName}" <${this.senderEmail}>`, // Replace with your verified sender email
        To: email, // Test recipient
        Subject: 'Verify your email for UltimaBot',
        HtmlBody: updatedHTML,
      });
      return res;
    } catch (error) {
      throw new HttpException(
        {
          statusCode: 400,
          error: 'Email service error',
          message: 'Unable to send OTP at this time. Please try again later.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
