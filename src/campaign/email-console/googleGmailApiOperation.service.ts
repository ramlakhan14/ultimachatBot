import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GmailTokens } from './interface/gmail.interface';
import { AppConfigService } from '../../common/config/appConfig.service';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  // private oauth2Client: OAuth2Client;

  constructor(private appConfigService: AppConfigService) {
    //  this.oauth2Client = new google.auth.OAuth2(
    //   process.env.GOOGLE_CLIENT_ID,
    //   process.env.GOOGLE_CLIENT_SECRET,
    //   process.env.GOOGLE_REDIRECT_URI,
  }
  private oauth2Client = new google.auth.OAuth2(
    this.appConfigService.get('googleClientId'),
    this.appConfigService.get('googleClientSecret'),
    this.appConfigService.get('googleRedirectUrl'),
  );

  private async getGmailService(tokens: GmailTokens) {
    try {
      this.oauth2Client.setCredentials(tokens);
      return google.gmail({ version: 'v1', auth: this.oauth2Client as any });
    } catch (error) {
      this.logger.error('Error creating Gmail service:', error);
      throw new UnauthorizedException('Invalid tokens');
    }
  }
  private extractMessageId(fullMessageId: string): string {
    if (!fullMessageId) return '';

    if (fullMessageId.includes('@mail.gmail.com')) {
      return fullMessageId.split('@mail.gmail.com')[0];
    }

    return fullMessageId;
  }
  async getMessageDetails(
    recipientEmail: string,
    messageId: string,
    tokens: GmailTokens,
  ): Promise<{ sender: string }> {
    try {
      const gmail = await this.getGmailService(tokens);

      const message = await gmail.users.messages.get({
        userId: recipientEmail,
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['From'],
      });

      const fromHeader = message.data.payload.headers.find(
        (header: { name: string }) => header.name === 'From',
      );

      return {
        sender: fromHeader?.value || 'unknown',
      };
    } catch (error) {
      this.logger.error(
        `Error fetching message details for ${messageId}:`,
        error,
      );
      throw error;
    }
  }

  async moveToTrash(
    recipientEmail: string,
    messageId: string,
    tokens: GmailTokens,
  ): Promise<void> {
    try {
      const gmail = await this.getGmailService(tokens);
      const cleanMessageId = this.extractMessageId(messageId);


      if (!cleanMessageId) {
        throw new Error('Invalid message ID format');
      }

      await gmail.users.messages.trash({
        userId: recipientEmail,
        id: cleanMessageId,
      });

      this.logger.log(
        `Message ${messageId} moved to trash for recipient ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error(`Error moving message ${messageId} to trash:`, error);
      throw error;
    }
  }

  async listMessages(
    recipientEmail: string,
    tokens: GmailTokens,
    date?: string,
    senderEmail?: string,
  ): Promise<any> {
    try {
      const gmail = await this.getGmailService(tokens);

      const filters = [];
      if (senderEmail) filters.push(`from:${senderEmail}`);
      if (date && date != '') {
        filters.push(`after:${date}`);
        filters.push(`before:${date}`);
      }
      const query = filters.join(' ');
      const response = await gmail.users.messages.list({
        userId: recipientEmail || 'me',
        q: query,
      });

      const messages = response.data.messages || [];
      const fullMessages = [];
      await Promise.all(
        messages.map(async (message) => {
          const fullMessage = await gmail.users.messages.get({
            userId: recipientEmail || 'me',
            id: message.id,
            format: 'full',
          });

          const headers = fullMessage.data.payload.headers;
          const subjectHeader = headers.find(
            (header: { name: string }) => header.name === 'Subject',
          );
          const fromHeader = headers.find(
            (header: { name: string }) => header.name === 'From',
          );
          const toHeader = headers.find(
            (header: { name: string }) => header.name === 'To',
          );

          const subject = subjectHeader ? subjectHeader.value : 'No Subject';
          const fromEmail = fromHeader
            ? fromHeader.value.match(/<(.+)>/)[1]
            : 'Unknown Email';
          const to = toHeader ? toHeader.value : 'Unknown Recipient';

          const body = fullMessage.data.payload.body.data
            ? Buffer.from(
                fullMessage.data.payload.body.data,
                'base64',
              ).toString('utf-8')
            : 'No Body';

          fullMessages.push({
            id: fullMessage.data.id,
            threadId: fullMessage.data.threadId,
            labelIds: fullMessage.data.labelIds,
            snippet: fullMessage.data.snippet,
            subject: subject,
            from: fromEmail,
            to: to,
            body: body,
          });
        }),
      );

      this.logger.log(
        `Retrieved ${fullMessages.length} full messages for recipient ${recipientEmail}`,
      );


      return fullMessages;
    } catch (error) {
      this.logger.error(`Error listing messages for ${recipientEmail}:`, error);
      throw error;
    }
  }

  async listMessagesV2(
    recipientEmail: string,
    tokens: GmailTokens,
    dateAfter?: string,
    dateBefore?: string,
    senderEmail?: string,
  ): Promise<any> {
    try {
      this.logger.log('Starting to list messages...');

      const gmail = await this.getGmailService(tokens);
      this.logger.log('Gmail service initialized.');

      const filters = [];
      if (senderEmail) filters.push(`from:${senderEmail}`);
      if (dateAfter && dateAfter != '') {
        filters.push(`after:${dateAfter}`);
      }
      if (dateBefore && dateBefore != '') {
        filters.push(`before:${dateBefore}`);
      }
      const query = filters.join(' ');
      this.logger.log(`Query: ${query}`);

      const inboxResponse = await gmail.users.messages.list({
        userId: recipientEmail,
        q: query + ' in:inbox',
      });
      this.logger.log('Inbox messages listed.');

      const sentResponse = await gmail.users.messages.list({
        userId: recipientEmail,
        q: query + ' in:sent',
      });
      this.logger.log('Sent messages listed.');

      const draftResponse = await gmail.users.messages.list({
        userId: recipientEmail,
        q: query + ' in:drafts',
      });
      this.logger.log('Draft messages listed.');

      const processMessages = async (messages: any[]) => {
        if (!messages) return [];
        const fullMessages = [];
        await Promise.all(
          messages.map(async (message) => {
            const fullMessage = await gmail.users.messages.get({
              userId: recipientEmail || 'me',
              id: message.id,
              format: 'full',
            });
            this.logger.log(`Message ${message.id} processed.`);

            const headers = fullMessage.data.payload.headers;
            const subjectHeader = headers.find(
              (header: { name: string }) => header.name === 'Subject',
            );
            const fromHeader = headers.find(
              (header: { name: string }) => header.name === 'From',
            );
            const toHeader = headers.find(
              (header: { name: string }) => header.name === 'To',
            );

            const subject = subjectHeader ? subjectHeader.value : 'No Subject';
            const fromEmail = fromHeader
              ? fromHeader.value.match(/<(.+)>/)?.[1] || fromHeader.value
              : 'Unknown Email';
            const to = toHeader ? toHeader.value : 'Unknown Recipient';

            const body = fullMessage.data.payload.body.data
              ? Buffer.from(
                  fullMessage.data.payload.body.data,
                  'base64',
                ).toString('utf-8')
              : 'No Body';

            fullMessages.push({
              id: fullMessage.data.id,
              threadId: fullMessage.data.threadId,
              labelIds: fullMessage.data.labelIds,
              snippet: fullMessage.data.snippet,
              subject: subject,
              from: fromEmail,
              to: to,
              body: body,
            });
            this.logger.log(
              `Full message ${fullMessage.data.id} added to the list.`,
            );
          }),
        );
        return fullMessages;
      };
      this.logger.log('Processing inbox messages...');
      const inboxMessages = await processMessages(inboxResponse.data.messages);
      this.logger.log('Inbox messages processed.');

      this.logger.log('Processing sent messages...');
      const sentMessages = await processMessages(sentResponse.data.messages);
      this.logger.log('Sent messages processed.');

      this.logger.log('Processing draft messages...');
      const draftMessages = await processMessages(draftResponse.data.messages);
      this.logger.log('Draft messages processed.');

      this.logger.log(
        `Retrieved ${inboxMessages.length} inbox messages, ${sentMessages.length} sent messages, and ${draftMessages.length} draft messages for recipient ${recipientEmail}`,
      );

      return {
        inbox: inboxMessages,
        sent: sentMessages,
        drafts: draftMessages,
      };
    } catch (error) {
      this.logger.error(`Error listing messages for ${recipientEmail}:`, error);
      throw error;
    }
  }

  async deleteMessage(
    recipientEmail: string,
    messageId: string,
    tokens: GmailTokens,
  ): Promise<void> {
    try {
      const gmail = await this.getGmailService(tokens);

      await gmail.users.messages.delete({
        userId: recipientEmail,
        id: messageId,
      });

      this.logger.log(
        `Message ${messageId} deleted for recipient ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting message ${messageId} for ${recipientEmail}:`,
        error,
      );
      throw error;
    }
  }

  async moveToDraftAndDelete(
    recipientEmail: string,
    messageId: string,
    tokens: GmailTokens,
  ): Promise<void> {
    try {
      const gmail = await this.getGmailService(tokens);

      // Get the full message
      const message = await gmail.users.messages.get({
        userId: recipientEmail,
        id: messageId,
        format: 'raw',
      });

      // Create a draft with the message
      await gmail.users.drafts.create({
        userId: recipientEmail,
        requestBody: {
          message: {
            raw: message.data.raw,
          },
        },
      });

      this.logger.log(
        `Message ${messageId} moved to drafts for recipient ${recipientEmail}`,
      );

      // Delete the original message from inbox
      await gmail.users.messages.delete({
        userId: recipientEmail,
        id: messageId,
      });

      this.logger.log(
        `Message ${messageId} deleted from inbox for recipient ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Error moving message ${messageId} to drafts and deleting from inbox for ${recipientEmail}:`,
        error,
      );
      throw error;
    }
  }

  async archiveMessagesByDateAndEmail(
    recipientEmail: string,
    tokens: GmailTokens,
    startDate: string,
    endDate: string,
    senderEmails: string[] = [],
  ): Promise<void> {
    try {
      const gmail = await this.getGmailService(tokens);
      let query = `after:${startDate} before:${endDate}`;
      if (senderEmails.length > 0) {
        const fromQuery = senderEmails.join(' OR ');
        query += ` from:(${fromQuery})`;
      }
      this.logger.log(`Archive query: ${query}`);
      const res = await gmail.users.messages.list({
        userId: recipientEmail,
        q: query,
      });
      const messages = res.data.messages || [];
      if (messages.length === 0) {
        this.logger.log('No messages found for archiving.');
        return;
      }
      await Promise.all(
        messages.map(async (msg) => {
          await gmail.users.messages.modify({
            userId: recipientEmail,
            id: msg.id,
            requestBody: {
              removeLabelIds: ['INBOX'],
            },
          });
          this.logger.log(`Archived message ID: ${msg.id}`);
        }),
      );

      this.logger.log(
        `Successfully archived ${messages.length} messages between ${startDate} and ${endDate} for ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error('Error archiving messages:', error);
      throw error;
    }
  }

  async createDraft(
    recipientEmail: string,
    tokens: GmailTokens,
    emailData: any,
  ): Promise<void> {
    try {
      const gmail = await this.getGmailService(tokens);

      // Create email content
      const emailContent = emailData.emailConversation[0].emailTextContent;

      // Create email headers
      const emailLines = [];
      emailLines.push(`From: ${emailData.senderEmail}`);
      emailLines.push(`To: ${emailData.receiverEmail}`);
      emailLines.push(`Subject: ${emailData.subject}`);
      emailLines.push('Content-Type: text/html; charset=utf-8');
      emailLines.push('');
      emailLines.push(emailContent);

      // Join lines and encode
      const email = emailLines.join('\r\n');
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Create draft
      await gmail.users.drafts.create({
        userId: recipientEmail,
        requestBody: {
          message: {
            raw: encodedEmail,
          },
        },
      });

      this.logger.log(
        `Draft email created successfully for recipient ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error('Error creating draft email:', error);
      throw error;
    }
  }

  async deleteDraftByEmailSubjectAndContent(
    recipientEmail: string,
    tokens: GmailTokens,
    emailSubject: string,
    emailContent: string,
  ): Promise<void> {
    try {
      const gmail = await this.getGmailService(tokens);

      // Search for drafts with the specified subject and content
      const query = `subject:${emailSubject} "${emailContent}"`;
      const res = await gmail.users.drafts.list({
        userId: recipientEmail,
        q: query,
      });

      const drafts = res.data.drafts || [];
      if (drafts.length === 0) {
        this.logger.log('No drafts found for deletion.');
        return;
      }

      // Delete each matching draft
      await Promise.all(
        drafts.map(async (draft) => {
          await gmail.users.drafts.delete({
            userId: recipientEmail,
            id: draft.id,
          });
          this.logger.log(`Deleted draft ID: ${draft.id}`);
        }),
      );

      this.logger.log(
        `Successfully deleted ${drafts.length} drafts with subject "${emailSubject}" and specified content for ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error('Error deleting draft email:', error);
      throw error;
    }
  }

  async createSpam(
    recipientEmail: string,
    tokens: GmailTokens,
    emailData: any,
  ): Promise<void> {
    try {
      const gmail = await this.getGmailService(tokens);

      // Create email content with spam markers
      const emailContent = emailData.emailContent;

      // Create email headers with spam indicators
      const emailLines = [];
      emailLines.push(`From: ${emailData.senderEmail}`);
      emailLines.push(`To: ${emailData.receiverEmail}`);
      emailLines.push(`Subject: ${emailData.subject}`);
      emailLines.push('Content-Type: text/html; charset=utf-8');
      emailLines.push('X-Spam-Flag: YES');
      emailLines.push('X-Spam-Status: Yes, score=5.0');
      emailLines.push('');
      emailLines.push(emailContent);

      // Join lines and encode
      const email = emailLines.join('\r\n');
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Create message in spam folder
      await gmail.users.messages.insert({
        userId: recipientEmail,
        requestBody: {
          raw: encodedEmail,
          labelIds: ['SPAM'],
        },
      });

      this.logger.log(
        `Spam email created successfully for recipient ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error('Error creating spam email:', error);
      throw error;
    }
  }
}
