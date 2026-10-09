import { Injectable, Logger } from '@nestjs/common';
import * as Imap from 'node-imap';
import {
  extractCleanTextContent,
  extractFirstQuotedPrintable,
} from './nodeImapEmailParser.service';
import * as mimemessage from 'mimemessage';
import { simpleParser } from 'mailparser';

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);

  /**
   * Builds a raw RFC822 MIME message string using the `mimemessage` package's
   * actual API (`factory`/`header`/`body`/`toString`) — the package has no
   * `MIMEMessage` export/constructor, which previously made every call site
   * throw "mimemessage_1.MIMEMessage is not a constructor" and silently no-op.
   */
  private buildRawEmailMessage(
    fromAddress: string,
    emailContent: {
      to: string;
      subject: string;
      body: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    },
  ): string {
    const bodyEntity = mimemessage.factory({
      contentType: 'text/html;charset=utf-8',
      body: emailContent.body,
    });

    const hasAttachments =
      emailContent.attachments && emailContent.attachments.length > 0;

    let topEntity = bodyEntity;

    if (hasAttachments) {
      topEntity = mimemessage.factory({
        contentType: 'multipart/mixed',
        body: [],
      });
      (topEntity.body as any[]).push(bodyEntity);

      for (const attachment of emailContent.attachments) {
        const attachmentEntity = mimemessage.factory({
          contentType: 'application/octet-stream',
          contentTransferEncoding: 'base64',
          body: attachment.content.toString('base64'),
        });
        attachmentEntity.header(
          'Content-Disposition',
          `attachment;filename="${attachment.filename}"`,
        );
        (topEntity.body as any[]).push(attachmentEntity);
      }
    }

    topEntity.header('From', fromAddress);
    topEntity.header('To', emailContent.to);
    topEntity.header('Subject', emailContent.subject);
    topEntity.header('Date', new Date().toUTCString());
    topEntity.header('MIME-Version', '1.0');

    return topEntity.toString();
  }

  /**
   * @developer : Ankur
   * @param emails : emails fetched from imap
   * @returns : all emails fetch based on filter criteria
   * @working : fetch the emails based on filter criteria form mail server through node-imap.
   */

  async fetchEmails(
    emailAddress: string,
    date?: string,
    limit?: number,
    offset?: number,
    imapConfigOverride?: object,
  ): Promise<{ inbox: any[]; sent: any[] }> {
    // const imap = new Imap(imapConfig);
    const imap = new Imap(imapConfigOverride);
    const fetchFromMailbox = async (mailboxName: string) => {
      return new Promise((resolve, reject) => {
        const emails = [];

        imap.openBox(mailboxName, false, (err) => {
          if (err) {
            this.logger.error(`Failed to open ${mailboxName}:`, err.message);
            return reject(err);
          }

          try {
            const searchCriteria = [];
            //todo: uncomment if need to search email based on email address
            // if (emailAddress) {
            //   searchCriteria.push([
            //     'OR',
            //     ['FROM', emailAddress],
            //     [
            //       'OR',
            //       ['TO', emailAddress],
            //       ['OR', ['CC', emailAddress], ['BCC', emailAddress]],
            //     ],
            //   ]);
            // }
            if (date) {
              const searchDate = new Date(date);
              searchCriteria.push(['SINCE', searchDate]);
              const nextDay = new Date(searchDate);
              nextDay.setDate(nextDay.getDate() + 1);
              searchCriteria.push(['BEFORE', nextDay]);
            }

            const finalCriteria =
              searchCriteria.length > 0 ? searchCriteria : ['ALL'];


            imap.search(finalCriteria, (err, results) => {
              if (err) {
                this.logger.error('Search error:', err.message);
                return reject(err);
              }

              if (results.length === 0) {
                return resolve([]);
              }

              // Sort results in descending order to get most recent first
              results.sort((a, b) => b - a);

              // Apply limit if provided, otherwise use all results
              const messagesToFetch = limit ? results.slice(0, limit) : results;

              const fetch = imap.fetch(messagesToFetch, {
                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
                struct: true,
              });

              fetch.on('message', (msg, seqno) => {
                const email = {
                  id: seqno,
                  from: '',
                  to: '',
                  subject: '',
                  date: '',
                  textContent: '',
                  htmlContent: '',
                  attachments: [],
                  mailbox: mailboxName,
                };

                msg.on('body', (stream, info) => {
                  let buffer = '';
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });
                  stream.on('end', async () => {
                    try {
                      if (info.which === 'TEXT') {
                        const parsed = await simpleParser(buffer);
                        email.textContent = parsed.text || buffer.trim();
                        email.htmlContent = parsed.html || '';
                      } else {
                        const header = Imap.parseHeader(buffer);
                        email.from = Array.isArray(header.from)
                          ? header.from[0]
                          : header.from;
                        email.to = Array.isArray(header.to)
                          ? header.to[0]
                          : header.to;
                        email.subject = Array.isArray(header.subject)
                          ? header.subject[0]
                          : header.subject;
                        email.date = Array.isArray(header.date)
                          ? header.date[0]
                          : header.date;
                      }
                    } catch (error) {
                      this.logger.error(
                        'Error parsing message body:',
                        error.message,
                      );
                    }
                  });
                });

                msg.once('attributes', (attrs) => {
                  try {
                    if (attrs.struct) {
                      const attachments = attrs.struct.filter((struct) => {
                        return (
                          struct.disposition &&
                          struct.disposition.type &&
                          struct.disposition.type.toLowerCase() === 'attachment'
                        );
                      });
                      email.attachments = attachments.map((att) => ({
                        filename:
                          att.disposition?.params?.filename || 'unnamed',
                        size: att.size || 0,
                        type: att.type || 'unknown',
                      }));
                    }
                  } catch (error) {
                    this.logger.error(
                      'Error parsing attributes:',
                      error.message,
                    );
                  }
                });

                msg.once('end', () => {
                  emails.push(email);
                  this.logger.debug(
                    `Fetched Email #${seqno} from ${mailboxName}`,
                  );
                });
              });

              fetch.once('error', (err) => {
                this.logger.error('Fetch error:', err.message);
                reject(err);
              });

              fetch.once('end', () => {
                this.logger.log(
                  `Fetched ${emails.length} emails from ${mailboxName}`,
                );
                resolve(emails);
              });
            });
          } catch (error) {
            this.logger.error('Error in fetch operation:', error.message);
            reject(error);
          }
        });
      });
    };

    try {
      return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
          try {
            const inboxEmails = (await fetchFromMailbox('INBOX')) as any[];
            const sentEmails = (await fetchFromMailbox(
              '[Gmail]/Sent Mail',
            )) as any[];

            imap.end();
            resolve({
              inbox: inboxEmails,
              sent: sentEmails,
            });
          } catch (error) {
            reject(error);
          }
        });

        imap.once('error', (err) => {
          this.logger.error('IMAP connection error:', err.message);
          reject(err);
        });

        imap.once('end', () => {
          this.logger.log('IMAP connection ended');
        });

        imap.connect();
      });
    } catch (error) {
      this.logger.error('Connection error:', error.message);
      throw error;
    }
  }
  /**
   * @developer : Ankur
   * @param emails : emails fetched from imap
   * @returns : parsed emails
   * @working : parse the emails and return the parsed emails
   */

  async parsedData(inboxEmails: any[], sentBoxEmails?: any[]) {
    // Clean the email content
    const cleanedInboxEmails = inboxEmails.map((email) => ({
      ...email,
      textContent: extractCleanTextContent(email.textContent),
    }));

    sentBoxEmails.map((email) => ({
      ...email,
      textContent: extractCleanTextContent(email.textContent),
    }));

    return [...cleanedInboxEmails];
  }

  async fetchEmailsV2(
    emailAddress: string,
    date?: string,
    limit?: number,
    offset?: number,
    imapConfigOverride?: any,
  ): Promise<{ inbox: any[]; sent: any[]; drafts: any[] }> {
    const imapConfigDecrypted = {
      user: imapConfigOverride.user,
      password: imapConfigOverride.password,
      host: imapConfigOverride.host,
      port: imapConfigOverride.port || 993,
      tls: imapConfigOverride.tls || true,
      authTimeout: imapConfigOverride.authTimeout || 10000,
      tlsOptions: imapConfigOverride.tlsOptions || {
        rejectUnauthorized: false,
      },
    };

    const isAssistantStandAlone =
      imapConfigOverride?.standAloneAssistant || false;

    const imap = new Imap(imapConfigDecrypted);

    // Log IMAP capabilities when ready
    imap.once('ready', () => {
      this.logger.log('IMAP connection ready');
      this.logger.debug(
        'IMAP Configuration:',
        JSON.stringify(
          { ...imapConfigOverride, password: '[REDACTED]' },
          null,
          2,
        ),
      );
    });

    const fetchFromMailbox = async (mailboxName: string) => {
      return new Promise((resolve, reject) => {
        const emails: any[] = [];

        imap.openBox(mailboxName, false, (err) => {
          if (err) {
            this.logger.error(`Failed to open ${mailboxName}:`, err.message);
            return resolve([]);
          }

          try {
            const searchCriteria = [];
            if (date) {
              const searchDate = new Date(date);
              searchCriteria.push(['SINCE', searchDate]);
              const nextDay = new Date(searchDate);
              nextDay.setDate(nextDay.getDate() + 1);
              searchCriteria.push(['BEFORE', nextDay]);
            }

            const finalCriteria =
              searchCriteria.length > 0 ? searchCriteria : ['ALL'];

            imap.search(finalCriteria, (err, results) => {
              if (err) {
                this.logger.error(
                  `Search error in ${mailboxName}:`,
                  err.message,
                );
                return resolve([]);
              }

              if (!results || results.length === 0) {
                this.logger.log(`No messages found in ${mailboxName}`);
                return resolve([]);
              }

              // Sort results in descending order (newest first)
              results.sort((a, b) => b - a);

              // Apply pagination if limit is provided
              const startIndex = offset || 0;
              const messagesToFetch = limit
                ? results.slice(startIndex, startIndex + limit)
                : results;

              if (messagesToFetch.length === 0) {
                return resolve([]);
              }

              this.logger.log(
                `Fetching ${messagesToFetch.length} messages from ${mailboxName}`,
              );

              const fetch = imap.fetch(messagesToFetch, {
                bodies: [''],
                struct: true,
              });

              fetch.on('message', (msg, seqno) => {
                const email = {
                  id: seqno,
                  messageId: '',
                  inReplyTo: '',
                  references: '',
                  threadIndex: '',
                  gmMsgId: '',
                  gmThreadId: '',
                  from: '',
                  to: '',
                  subject: '',
                  date: '',
                  textContent: '',
                  htmlContent: '',
                  attachments: [] as any[],
                  mailbox: mailboxName,
                };

                msg.on('body', (stream, info) => {
                  const chunks: Buffer[] = [];

                  stream.on('data', (chunk) => {
                    chunks.push(chunk);
                  });

                  stream.on('end', async () => {
                    try {
                      const rawEmail = Buffer.concat(chunks as any);
                      const parsed = await simpleParser(rawEmail);

                      email.from = parsed.from?.text || '';
                      email.to = parsed.to?.text || '';
                      email.subject = parsed.subject || '';
                      email.date = parsed.date?.toString() || '';
                      email.messageId = parsed.messageId || '';

                      // ========== THREAD HEADERS - ADD THESE ==========
                      // In-Reply-To header (which message this is replying to)
                      email.inReplyTo =
                        parsed.headers.get('in-reply-to')?.toString() || '';

                      // References header (thread tracking)
                      email.references =
                        parsed.headers.get('references')?.toString() || '';

                      // Thread-Index (Microsoft/Exchange specific)
                      email.threadIndex =
                        parsed.headers.get('thread-index')?.toString() || '';

                      // Gmail-specific headers
                      email.gmMsgId =
                        parsed.headers.get('x-gm-msgid')?.toString() || '';
                      email.gmThreadId =
                        parsed.headers.get('x-gm-thrid')?.toString() || '';

                      // Body Content
                      email.textContent = parsed.text || '';

                      // Remove newlines from HTML
                      const rawHtml = parsed.html || parsed.textAsHtml || '';
                      email.htmlContent = rawHtml
                        ? rawHtml.replace(/\n/g, '')
                        : parsed.text
                        ? `<p>${parsed.text.replace(/\n/g, '<br>')}</p>`
                        : '';

                      // Attachments
                      email.attachments = parsed.attachments.map((att) => ({
                        filename: att.filename || 'unnamed',
                        contentType: att.contentType,
                        size: att.size,
                      }));

                      // Optional: Log thread info for debugging
                      if (email.inReplyTo || email.references) {
                        this.logger.debug(
                          `Thread detected: MsgId=${
                            email.messageId
                          }, InReplyTo=${
                            email.inReplyTo
                          }, Refs=${email.references?.substring(0, 50)}`,
                        );
                      }
                    } catch (error: any) {
                      this.logger.error(
                        `Mail parse error in ${mailboxName}:`,
                        error.message,
                      );
                    }
                  });
                });

                msg.once('attributes', (attrs) => {
                  try {
                    if (attrs.struct) {
                      const attachments = findAttachmentParts(attrs.struct);
                      email.attachments = attachments.map((att) => ({
                        filename:
                          att.disposition?.params?.filename ||
                          att.params?.name ||
                          'unnamed',
                        size: att.size || 0,
                        type: att.type || 'unknown',
                      }));
                    }
                  } catch (error) {
                    this.logger.error(
                      `Error parsing attributes in ${mailboxName}:`,
                      error.message,
                    );
                  }
                });

                msg.once('end', () => {
                  emails.push(email);
                });
              });

              fetch.once('error', (err) => {
                this.logger.error(
                  `Fetch error in ${mailboxName}:`,
                  err.message,
                );
                resolve(emails);
              });

              fetch.once('end', () => {
                this.logger.log(
                  `Successfully fetched ${emails.length} emails from ${mailboxName}`,
                );
                resolve(emails);
              });
            });
          } catch (error) {
            this.logger.error(
              `Error in fetch operation for ${mailboxName}:`,
              error.message,
            );
            resolve([]);
          }
        });
      });
    };

    // Helper function to find attachments in message structure
    const findAttachmentParts = (struct, attachments = []) => {
      if (!struct) return attachments;

      if (Array.isArray(struct)) {
        struct.forEach((item) => {
          findAttachmentParts(item, attachments);
        });
      } else if (
        struct.disposition &&
        (struct.disposition.type.toLowerCase() === 'attachment' ||
          struct.disposition.type.toLowerCase() === 'inline')
      ) {
        attachments.push(struct);
      } else if (struct.params && struct.params.name) {
        attachments.push(struct);
      }

      return attachments;
    };

    try {
      return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
          try {
            // Try different mailbox names for different email providers
            const inboxEmails = (await fetchFromMailbox('INBOX')) as any[];

            // Try different sent folder names
            let sentEmails = [];
            try {
              sentEmails = (await fetchFromMailbox(
                '[Gmail]/Sent Mail',
              )) as any[];
            } catch (e) {
              try {
                sentEmails = (await fetchFromMailbox('Sent')) as any[];
              } catch (e) {
                try {
                  sentEmails = (await fetchFromMailbox('Sent Items')) as any[];
                } catch (e) {
                  this.logger.warn('Could not find sent mail folder');
                }
              }
            }

            // Try different draft folder names
            let draftEmails = [];
            try {
              draftEmails = (await fetchFromMailbox('[Gmail]/Drafts')) as any[];
            } catch (e) {
              try {
                draftEmails = (await fetchFromMailbox('Drafts')) as any[];
              } catch (e) {
                try {
                  draftEmails = (await fetchFromMailbox('Draft')) as any[];
                } catch (e) {
                  this.logger.warn('Could not find drafts folder');
                }
              }
            }

            imap.end();
            resolve({
              inbox: inboxEmails,
              sent: sentEmails,
              drafts: draftEmails,
            });
          } catch (error) {
            this.logger.error('Error fetching emails:', error.message);
            imap.end();
            resolve({
              inbox: [],
              sent: [],
              drafts: [],
            });
          }
        });

        imap.once('error', (err) => {
          this.logger.error('IMAP connection error:', err.message);
          reject(err);
        });

        imap.once('end', () => {
          this.logger.log('IMAP connection ended');
        });

        imap.connect();
      });
    } catch (error) {
      this.logger.error('Connection error:', error.message);
      throw error;
    }
  }

  async parsedDataV2(
    inboxEmails: any[],
    sentBoxEmails?: any[],
    draftEmails?: any[],
  ) {
    // Ensure arrays exist even if undefined was passed
    const inbox = inboxEmails || [];
    const sent = sentBoxEmails || [];
    const drafts = draftEmails || [];

    // Clean email content for each category
    const cleanedInboxEmails = inbox.map((email) => ({
      ...email,
      textContent: extractCleanTextContent(email.textContent),
    }));

    const cleanedSentEmails = sent.map((email) => ({
      ...email,
      textContent: extractCleanTextContent(email.textContent),
    }));

    const cleanedDraftEmails = drafts.map((email) => ({
      ...email,
      textContent: extractCleanTextContent(email.textContent),
    }));

    // Return all emails in a single array
    return [...cleanedInboxEmails, ...cleanedSentEmails, ...cleanedDraftEmails];
  }

  async createDraftEmail(
    emailAddress: string,
    emailContent: {
      to: string;
      subject: string;
      body: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    },
    imapConfigOverride: any,
  ): Promise<boolean> {
    try {
      this.logger.log('Starting draft email creation process');
      const imapConfigDecrypted = {
        user: imapConfigOverride.user,
        password: imapConfigOverride.password,
        host: imapConfigOverride.host,
        port: imapConfigOverride.port || 993,
        tls: imapConfigOverride.tls || true,
        authTimeout: imapConfigOverride.authTimeout || 10000,
        tlsOptions: imapConfigOverride.tlsOptions || {
          rejectUnauthorized: false,
        },
      };
      this.logger.log(`Connecting to IMAP server: ${imapConfigOverride.host}`);

      const imap = new Imap(imapConfigDecrypted);

      return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
          this.logger.log('IMAP connection ready for draft creation');

          // Try different draft folder names
          const draftFolders = ['[Gmail]/Drafts', 'Drafts', 'Draft'];
          let draftFolderFound = false;
          let draftFolder = '';

          this.logger.log('Searching for available draft folders');
          for (const folder of draftFolders) {
            try {
              await new Promise<void>((res, rej) => {
                imap.openBox(folder, false, (err) => {
                  if (err) {
                    this.logger.warn(
                      `Draft folder ${folder} not found:`,
                      err.message,
                    );
                    res();
                  } else {
                    draftFolderFound = true;
                    draftFolder = folder;
                    this.logger.log(`Found draft folder: ${folder}`);
                    res();
                  }
                });
              });

              if (draftFolderFound) break;
            } catch (error) {
              this.logger.warn(
                `Error checking draft folder ${folder}:`,
                error.message,
              );
            }
          }

          if (!draftFolderFound) {
            this.logger.error('No draft folder found');
            imap.end();
            return resolve(false);
          }

          try {
            this.logger.log('Creating email in RFC822 format');
            // Create email in RFC822 format
            if (
              emailContent.attachments &&
              emailContent.attachments.length > 0
            ) {
              this.logger.log(
                `Adding ${emailContent.attachments.length} attachments to draft email`,
              );
            }
            const messageContent = this.buildRawEmailMessage(
              emailAddress,
              emailContent,
            );
            this.logger.log(
              'Email content prepared, appending to draft folder',
            );

            // Append the message to the drafts folder
            imap.append(
              messageContent,
              { mailbox: draftFolder, flags: ['\\Draft'] },
              (err) => {
                if (err) {
                  this.logger.error('Error appending draft:', err.message);
                  imap.end();
                  return resolve(false);
                }

                this.logger.log('Draft email created successfully');
                imap.end();
                return resolve(true);
              },
            );
          } catch (error) {
            this.logger.error('Error creating draft email:', error.message);
            imap.end();
            resolve(false);
          }
        });

        imap.once('error', (err) => {
          this.logger.error(
            'IMAP connection error during draft creation:',
            err.message,
          );
          reject(err);
        });

        imap.once('end', () => {
          this.logger.log('IMAP connection ended after draft creation');
        });

        this.logger.log('Initiating IMAP connection');
        imap.connect();
      });
    } catch (error) {
      this.logger.error(
        'Connection error during draft creation:',
        error.message,
      );
      throw error;
    }
  }

  async deleteDraftEmail(
    emailAddress: string,
    emailCriteria: {
      to: string;
      subject: string;
      body?: string;
    },
    imapConfigOverride: any,
  ): Promise<boolean> {
    try {
      this.logger.log('Starting draft email deletion process');
      const imapConfigDecrypted = {
        user: imapConfigOverride.user,
        password: imapConfigOverride.password,
        host: imapConfigOverride.host,
        port: imapConfigOverride.port || 993,
        tls: imapConfigOverride.tls || true,
        authTimeout: imapConfigOverride.authTimeout || 10000,
        tlsOptions: imapConfigOverride.tlsOptions || {
          rejectUnauthorized: false,
        },
      };
      this.logger.log(`Connecting to IMAP server: ${imapConfigOverride.host}`);

      const imap = new Imap(imapConfigDecrypted);

      return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
          this.logger.log('IMAP connection ready for draft deletion');

          // Try different draft folder names
          const draftFolders = ['[Gmail]/Drafts', 'Drafts', 'Draft'];
          let draftFolderFound = false;
          let draftFolder = '';

          this.logger.log('Searching for available draft folders');
          for (const folder of draftFolders) {
            try {
              await new Promise<void>((res, rej) => {
                imap.openBox(folder, false, (err) => {
                  if (err) {
                    this.logger.warn(
                      `Draft folder ${folder} not found:`,
                      err.message,
                    );
                    res();
                  } else {
                    draftFolderFound = true;
                    draftFolder = folder;
                    this.logger.log(`Found draft folder: ${folder}`);
                    res();
                  }
                });
              });

              if (draftFolderFound) break;
            } catch (error) {
              this.logger.warn(
                `Error checking draft folder ${folder}:`,
                error.message,
              );
            }
          }

          if (!draftFolderFound) {
            this.logger.error('No draft folder found');
            imap.end();
            return resolve(false);
          }

          try {
            // Open the drafts folder in read-write mode
            this.logger.log(
              `Opening draft folder ${draftFolder} in read-write mode`,
            );
            await new Promise<void>((res, rej) => {
              imap.openBox(draftFolder, false, (err) => {
                if (err) {
                  this.logger.error(
                    `Error opening draft folder: ${err.message}`,
                  );
                  rej(err);
                } else {
                  res();
                }
              });
            });

            // Search for emails matching the criteria
            this.logger.log(
              `Searching for drafts with recipient: ${emailCriteria.to}, subject: ${emailCriteria.subject}`,
            );
            const searchCriteria = [
              ['HEADER', 'TO', emailCriteria.to],
              ['SUBJECT', emailCriteria.subject],
              ['DRAFT'],
            ];

            await new Promise<void>((res, rej) => {
              imap.search(searchCriteria, (err, results) => {
                if (err) {
                  this.logger.error(
                    `Error searching for drafts: ${err.message}`,
                  );
                  rej(err);
                  return;
                }

                if (!results || results.length === 0) {
                  this.logger.warn('No matching draft emails found');
                  res();
                  return;
                }

                this.logger.log(
                  `Found ${results.length} draft emails matching criteria`,
                );

                // If body content is specified, fetch and check the content
                if (emailCriteria.body) {
                  this.logger.log(
                    'Body content specified, checking email content',
                  );
                  const f = imap.fetch(results, { bodies: '' });
                  const messagesToDelete = [];

                  f.on('message', (msg) => {
                    msg.on('body', (stream, info) => {
                      let buffer = '';
                      stream.on('data', (chunk) => {
                        buffer += chunk.toString('utf8');
                      });
                      stream.once('end', () => {
                        if (buffer.includes(emailCriteria.body)) {
                          this.logger.log(
                            `Draft #${info.seqno} matches body content criteria`,
                          );
                          messagesToDelete.push(info.seqno);
                        }
                      });
                    });
                  });

                  f.once('end', () => {
                    if (messagesToDelete.length > 0) {
                      this.logger.log(
                        `Marking ${messagesToDelete.length} drafts for deletion`,
                      );
                      imap.addFlags(messagesToDelete, '\\Deleted', (err) => {
                        if (err) {
                          this.logger.error(
                            `Error marking drafts for deletion: ${err.message}`,
                          );
                          rej(err);
                          return;
                        }

                        this.logger.log('Expunging deleted drafts');
                        imap.expunge((err) => {
                          if (err) {
                            this.logger.error(
                              `Error expunging drafts: ${err.message}`,
                            );
                            rej(err);
                            return;
                          }

                          this.logger.log(
                            `Successfully deleted ${messagesToDelete.length} draft emails`,
                          );
                          res();
                        });
                      });
                    } else {
                      this.logger.warn(
                        'No matching draft emails found with specified body content',
                      );
                      res();
                    }
                  });
                } else {
                  // If no body content specified, delete all matching emails
                  this.logger.log(
                    `Marking ${results.length} drafts for deletion`,
                  );
                  imap.addFlags(results, '\\Deleted', (err) => {
                    if (err) {
                      this.logger.error(
                        `Error marking drafts for deletion: ${err.message}`,
                      );
                      rej(err);
                      return;
                    }

                    this.logger.log('Expunging deleted drafts');
                    imap.expunge((err) => {
                      if (err) {
                        this.logger.error(
                          `Error expunging drafts: ${err.message}`,
                        );
                        rej(err);
                        return;
                      }

                      this.logger.log(
                        `Successfully deleted ${results.length} draft emails`,
                      );
                      res();
                    });
                  });
                }
              });
            });

            imap.end();
            return resolve(true);
          } catch (error) {
            this.logger.error('Error deleting draft email:', error.message);
            imap.end();
            resolve(false);
          }
        });

        imap.once('error', (err) => {
          this.logger.error(
            'IMAP connection error during draft deletion:',
            err.message,
          );
          reject(err);
        });

        imap.once('end', () => {
          this.logger.log('IMAP connection ended after draft deletion');
        });

        this.logger.log('Initiating IMAP connection');
        imap.connect();
      });
    } catch (error) {
      this.logger.error(
        'Connection error during draft deletion:',
        error.message,
      );
      throw error;
    }
  }

  async fetchDraftEmail(data: any): Promise<any> {
    const { email, password, dateAfter, dateBefore } = data;

    try {
      this.logger.log('Starting to fetch emails via IMAP...');
      this.logger.log(
        `Email account: ${email}, Date range: ${dateAfter || 'none'} to ${
          dateBefore || 'none'
        }`,
      );

      return new Promise((resolve, reject) => {
        const imap = new Imap({
          user: email,
          password: password,
          host: 'imap.gmail.com',
          port: 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
        });

        const fetchedEmails = {
          inbox: [],
          sent: [],
          drafts: [],
        };

        const processMailbox = (boxName, callback) => {
          this.logger.log(`Processing ${boxName} mailbox...`);

          imap.openBox(boxName, false, (err, box) => {
            if (err) {
              this.logger.error(`Error opening ${boxName}: ${err.message}`);
              return callback([]);
            }

            const searchCriteria = [];

            if (dateAfter && dateAfter !== '') {
              const afterDate = new Date(dateAfter);
              searchCriteria.push(['SINCE', afterDate]);
              this.logger.log(`Added date filter: SINCE ${afterDate}`);
            }

            if (dateBefore && dateBefore !== '') {
              const beforeDate = new Date(dateBefore);
              searchCriteria.push(['BEFORE', beforeDate]);
              this.logger.log(`Added date filter: BEFORE ${beforeDate}`);
            }

            // If no criteria, fetch all
            if (searchCriteria.length === 0) {
              searchCriteria.push('ALL');
              this.logger.log('No date filters, fetching ALL emails');
            }

            imap.search(searchCriteria, (err, results) => {
              if (err) {
                this.logger.error(`Search error in ${boxName}: ${err.message}`);
                return callback([]);
              }

              if (!results || results.length === 0) {
                this.logger.log(`No messages found in ${boxName}`);
                return callback([]);
              }

              this.logger.log(
                `Found ${results.length} messages in ${boxName}, fetching details`,
              );
              const messages = [];
              const f = imap.fetch(results, { bodies: '', struct: true });

              f.on('message', (msg, seqno) => {
                this.logger.log(`Processing message #${seqno}`);
                const message = {
                  id: null,
                  threadId: null,
                  labelIds: [boxName.toLowerCase()],
                  snippet: '',
                  subject: 'No Subject',
                  from: 'Unknown Email',
                  to: 'Unknown Recipient',
                  body: 'No Body',
                };

                msg.on('body', (stream, info) => {
                  let buffer = '';

                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });

                  stream.once('end', () => {
                    this.logger.log(`Parsing message #${seqno} content`);
                    const parsed = simpleParser(buffer);

                    parsed.then((mail) => {
                      message.id = seqno.toString();
                      message.threadId = seqno.toString();
                      message.subject = mail.subject || 'No Subject';
                      message.from =
                        mail.from?.text?.match(/<(.+)>/)?.[1] ||
                        mail.from?.text ||
                        'Unknown Email';
                      message.to = mail.to?.text || 'Unknown Recipient';
                      message.body = mail.text || mail.html || 'No Body';
                      message.snippet = (mail.text || '').substring(0, 100);

                      messages.push(message);
                      this.logger.log(
                        `Message #${seqno} processed: ${message.subject}`,
                      );
                    });
                  });
                });
              });

              f.once('error', (err) => {
                this.logger.error(`Fetch error in ${boxName}: ${err.message}`);
                callback([]);
              });

              f.once('end', () => {
                this.logger.log(
                  `Fetched ${messages.length} messages from ${boxName}`,
                );
                callback(messages);
              });
            });
          });
        };

        imap.once('ready', () => {
          try {
            this.logger.log(
              'IMAP connection established, processing mailboxes',
            );
            // Process inbox
            processMailbox('INBOX', (inboxMessages) => {
              fetchedEmails.inbox = inboxMessages;
              this.logger.log(
                `Inbox processing complete, found ${inboxMessages.length} messages`,
              );

              // Process sent
              processMailbox('[Gmail]/Sent Mail', (sentMessages) => {
                fetchedEmails.sent = sentMessages;
                this.logger.log(
                  `Sent mail processing complete, found ${sentMessages.length} messages`,
                );

                // Process drafts
                processMailbox('[Gmail]/Drafts', (draftMessages) => {
                  fetchedEmails.drafts = draftMessages;
                  this.logger.log(
                    `Drafts processing complete, found ${draftMessages.length} messages`,
                  );

                  this.logger.log(
                    `Retrieved ${fetchedEmails.inbox.length} inbox messages, ${fetchedEmails.sent.length} sent messages, and ${fetchedEmails.drafts.length} draft messages for recipient ${email}`,
                  );

                  imap.end();
                  resolve(fetchedEmails);
                });
              });
            });
          } catch (error) {
            this.logger.error('Error processing mailboxes:', error.message);
            imap.end();
            resolve(fetchedEmails);
          }
        });

        imap.once('error', (err) => {
          this.logger.error(
            'IMAP connection error during email fetch:',
            err.message,
          );
          reject(err);
        });

        imap.once('end', () => {
          this.logger.log('IMAP connection ended after email fetch');
        });

        this.logger.log('Initiating IMAP connection to Gmail');
        imap.connect();
      });
    } catch (error) {
      this.logger.error('Connection error during email fetch:', error.message);
      throw error;
    }
  }

  async createSpamEmail(
    emailAddress: string,
    emailContent: {
      to: string;
      subject: string;
      body: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    },
    imapConfigOverride: any,
  ): Promise<boolean> {
    try {
      this.logger.log('Starting spam email creation process');
      const imapConfigDecrypted = {
        user: imapConfigOverride.user,
        password: imapConfigOverride.password,
        host: imapConfigOverride.host,
        port: imapConfigOverride.port || 993,
        tls: imapConfigOverride.tls || true,
        authTimeout: imapConfigOverride.authTimeout || 10000,
        tlsOptions: imapConfigOverride.tlsOptions || {
          rejectUnauthorized: false,
        },
      };
      this.logger.log(`Connecting to IMAP server: ${imapConfigOverride.host}`);

      const imap = new Imap(imapConfigDecrypted);

      return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
          this.logger.log('IMAP connection ready for spam email creation');

          // Try different spam folder names
          const spamFolders = [
            '[Gmail]/Spam',
            'Spam',
            'Junk',
            'Junk Email',
            '[Gmail]/Junk',
            'Junk Mail',
            'Bulk Mail',
            'Unwanted',
          ];
          let spamFolderFound = false;
          let spamFolder = '';

          this.logger.log('Searching for available spam folders');
          for (const folder of spamFolders) {
            try {
              await new Promise<void>((res, rej) => {
                imap.openBox(folder, false, (err) => {
                  if (err) {
                    this.logger.warn(
                      `Spam folder ${folder} not found:`,
                      err.message,
                    );
                    res();
                  } else {
                    spamFolderFound = true;
                    spamFolder = folder;
                    this.logger.log(`Found spam folder: ${folder}`);
                    res();
                  }
                });
              });

              if (spamFolderFound) break;
            } catch (error) {
              this.logger.warn(
                `Error checking spam folder ${folder}:`,
                error.message,
              );
            }
          }

          if (!spamFolderFound) {
            this.logger.error('No spam folder found');
            imap.end();
            return resolve(false);
          }

          try {
            this.logger.log('Creating email in RFC822 format');
            // Create email in RFC822 format
            if (
              emailContent.attachments &&
              emailContent.attachments.length > 0
            ) {
              this.logger.log(
                `Adding ${emailContent.attachments.length} attachments to spam email`,
              );
            }
            const messageContent = this.buildRawEmailMessage(
              emailAddress,
              emailContent,
            );
            this.logger.log(`Appending email to spam folder: ${spamFolder}`);

            // Append the message to the spam folder
            imap.append(messageContent, { mailbox: spamFolder }, (err) => {
              if (err) {
                this.logger.error('Error appending spam email:', err.message);
                imap.end();
                return resolve(false);
              }

              this.logger.log('Spam email created successfully');
              imap.end();
              return resolve(true);
            });
          } catch (error) {
            this.logger.error('Error creating spam email:', error.message);
            imap.end();
            resolve(false);
          }
        });

        imap.once('error', (err) => {
          this.logger.error(
            'IMAP connection error during spam email creation:',
            err.message,
          );
          reject(err);
        });

        imap.once('end', () => {
          this.logger.log('IMAP connection ended after spam email creation');
        });

        this.logger.log('Initiating IMAP connection');
        imap.connect();
      });
    } catch (error) {
      this.logger.error(
        'Connection error during spam email creation:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Archives emails based on criteria such as date range or specific email ID
   * @param imapConfig - IMAP configuration for the email account
   * @param criteria - Object containing search criteria (date range or specific email ID)
   * @param targetFolder - Optional target folder to move emails to (defaults to Archive folder)
   * @returns Promise<boolean> - True if archiving was successful
   */
  async archiveEmails(
    imapConfig: {
      user: string;
      password: string;
      host: string;
      port?: number;
      tls?: boolean;
      authTimeout?: number;
      tlsOptions?: { rejectUnauthorized: boolean };
    },
    criteria: {
      since?: Date;
      before?: Date;
      uid?: number;
      subject?: string;
      from?: string | string[];
      to?: string;
    },
    targetFolder?: string,
  ): Promise<boolean> {
    try {
      this.logger.log('Starting email archiving process');
      const imapConfigDecrypted = {
        user: imapConfig.user,
        password: imapConfig.password,
        host: imapConfig.host,
        port: imapConfig.port || 993,
        tls: imapConfig.tls !== undefined ? imapConfig.tls : true,
        authTimeout: imapConfig.authTimeout || 10000,
        tlsOptions: imapConfig.tlsOptions || {
          rejectUnauthorized: false,
        },
      };
      this.logger.log(`Connecting to IMAP server: ${imapConfig.host}`);

      const imap = new Imap(imapConfigDecrypted);

      return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
          this.logger.log('IMAP connection ready for email archiving');

          try {
            // Open the INBOX to search for emails
            this.logger.log('Opening INBOX to search for emails to archive');
            await new Promise<void>((res, rej) => {
              imap.openBox('INBOX', false, (err) => {
                if (err) {
                  this.logger.error('Error opening INBOX:', err.message);
                  rej(err);
                } else {
                  res();
                }
              });
            });

            // Build search criteria
            const searchCriteria: any[] = [];

            if (criteria.since) {
              searchCriteria.push(['SINCE', criteria.since]);
              this.logger.log(`Added criteria: SINCE ${criteria.since}`);
            }

            if (criteria.before) {
              searchCriteria.push(['BEFORE', criteria.before]);
              this.logger.log(`Added criteria: BEFORE ${criteria.before}`);
            }

            if (criteria.uid) {
              searchCriteria.push(['UID', criteria.uid]);
              this.logger.log(`Added criteria: UID ${criteria.uid}`);
            }

            if (criteria.subject) {
              searchCriteria.push(['SUBJECT', criteria.subject]);
              this.logger.log(`Added criteria: SUBJECT ${criteria.subject}`);
            }

            // Handle from field which can be a single email or multiple emails
            if (criteria.from) {
              if (Array.isArray(criteria.from)) {
                // If multiple from addresses, create OR conditions
                const fromConditions = criteria.from.map((email) => [
                  'FROM',
                  email,
                ]);
                if (fromConditions.length > 1) {
                  searchCriteria.push(['OR', ...fromConditions]);
                  this.logger.log(
                    `Added criteria: OR FROM ${criteria.from.join(', ')}`,
                  );
                } else if (fromConditions.length === 1) {
                  searchCriteria.push(fromConditions[0]);
                  this.logger.log(`Added criteria: FROM ${criteria.from[0]}`);
                }
              } else {
                // Single from address
                searchCriteria.push(['FROM', criteria.from]);
                this.logger.log(`Added criteria: FROM ${criteria.from}`);
              }
            }

            if (criteria.to) {
              searchCriteria.push(['TO', criteria.to]);
              this.logger.log(`Added criteria: TO ${criteria.to}`);
            }

            // If no criteria provided, reject
            if (searchCriteria.length === 0) {
              this.logger.error('No search criteria provided for archiving');
              imap.end();
              return resolve(false);
            }

            // Search for emails matching criteria
            this.logger.log('Searching for emails matching criteria');
            const uids = await new Promise<number[]>((res, rej) => {
              imap.search(searchCriteria, (err, results) => {
                if (err) {
                  this.logger.error('Error searching emails:', err.message);
                  rej(err);
                } else {
                  res(results);
                }
              });
            });

            if (uids.length === 0) {
              this.logger.log('No emails found matching the criteria');
              imap.end();
              return resolve(true);
            }

            this.logger.log(`Found ${uids.length} emails to archive`);

            // Determine target archive folder
            const archiveFolders = [
              targetFolder,
              '[Gmail]/All Mail',
              'Archive',
              'Archived',
              'Archived Messages',
            ].filter(Boolean);

            let archiveFolderFound = false;
            let archiveFolder = '';

            this.logger.log('Searching for available archive folders');
            for (const folder of archiveFolders) {
              try {
                // Check if folder exists
                this.logger.log(`Checking if folder exists: ${folder}`);
                const boxes = await new Promise<any>((res, rej) => {
                  imap.getBoxes((err, boxes) => {
                    if (err) {
                      rej(err);
                    } else {
                      res(boxes);
                    }
                  });
                });

                // Recursive function to check if folder exists in nested structure
                const folderExists = (
                  boxes: any,
                  folderPath: string,
                ): boolean => {
                  const parts = folderPath.split('/');
                  let current = boxes;

                  for (const part of parts) {
                    if (!current[part]) return false;
                    current = current[part].children || {};
                  }

                  return true;
                };

                if (folderExists(boxes, folder)) {
                  archiveFolderFound = true;
                  archiveFolder = folder;
                  this.logger.log(`Found archive folder: ${folder}`);
                  break;
                }
              } catch (error) {
                this.logger.warn(
                  `Error checking folder ${folder}:`,
                  error.message,
                );
              }
            }

            if (!archiveFolderFound) {
              // Create Archive folder if it doesn't exist
              this.logger.log('No archive folder found, creating one');
              try {
                await new Promise<void>((res, rej) => {
                  imap.addBox('Archive', (err) => {
                    if (err) {
                      this.logger.error(
                        'Error creating Archive folder:',
                        err.message,
                      );
                      rej(err);
                    } else {
                      archiveFolder = 'Archive';
                      archiveFolderFound = true;
                      this.logger.log('Created new Archive folder');
                      res();
                    }
                  });
                });
              } catch (error) {
                this.logger.error(
                  'Failed to create Archive folder:',
                  error.message,
                );
                imap.end();
                return resolve(false);
              }
            }

            // Move emails to archive folder
            await new Promise<void>((res, rej) => {
              imap.move(uids, archiveFolder, (err) => {
                if (err) {
                  this.logger.error(
                    `Error moving emails to ${archiveFolder}:`,
                    err.message,
                  );
                  rej(err);
                } else {
                  this.logger.log(
                    `Successfully archived ${uids.length} emails to ${archiveFolder}`,
                  );
                  res();
                }
              });
            });

            imap.end();
            return resolve(true);
          } catch (error) {
            this.logger.error(
              'Error during email archiving process:',
              error.message,
            );
            imap.end();
            resolve(false);
          }
        });

        imap.once('error', (err) => {
          this.logger.error(
            'IMAP connection error during email archiving:',
            err.message,
          );
          reject(err);
        });

        imap.once('end', () => {
          this.logger.log('IMAP connection ended after email archiving');
        });

        imap.connect();
      });
    } catch (error) {
      this.logger.error(
        'Connection error during email archiving:',
        error.message,
      );
      throw error;
    }
  }
}
