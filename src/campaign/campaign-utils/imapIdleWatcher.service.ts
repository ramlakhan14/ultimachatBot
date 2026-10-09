import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import * as Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { Collection, Db } from 'mongodb';
import { CryptoService } from './crypto.service';
import { CampaignService } from '../campaign.service';
import { SmtpSetting } from '../../smtp/entities/smtp.entity';
import { MONGODB } from '../../common/mongo/mongo.module';

// Watches mailboxes for new mail via IMAP IDLE, a real-time alternative to the 2-hour poll cron.
@Injectable()
export class ImapIdleWatcherService {
  private readonly logger = new Logger(ImapIdleWatcherService.name);
  private readonly activeWatchers = new Map<string, Imap>();
  // Lowest unprocessed UID per mailbox; seeded to uidnext at watch-start so only new mail is processed.
  private readonly watermarks = new Map<string, number>();
  // Chains fetch cycles per mailbox so at most one runs at a time (overlapping IMAP commands can corrupt data).
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly smtpSettingCollection: Collection<SmtpSetting>;

  constructor(
    @Inject(forwardRef(() => CampaignService))
    private readonly campaignService: CampaignService,
    @Inject(MONGODB) private readonly db: Db,
  ) {
    this.smtpSettingCollection = this.db.collection<SmtpSetting>('smtpSetting');
  }

  isWatching(email: string): boolean {
    return this.activeWatchers.has(email);
  }

  listWatched(): string[] {
    return Array.from(this.activeWatchers.keys());
  }

  stopWatching(email: string): boolean {
    const imap = this.activeWatchers.get(email);
    if (!imap) return false;
    this.activeWatchers.delete(email);
    this.watermarks.delete(email);
    this.inFlight.delete(email);
    try {
      imap.end();
    } catch {
      // already closed, nothing to do
    }
    return true;
  }

  async startWatching(
    email: string,
  ): Promise<{ ok: boolean; message: string }> {
    if (this.activeWatchers.has(email)) {
      return { ok: false, message: `Already watching ${email}` };
    }

    const smtpConfig = await this.smtpSettingCollection.findOne({ email });
    if (!smtpConfig) {
      return { ok: false, message: `No SMTP/IMAP config found for ${email}` };
    }

    this.connect(email, smtpConfig);
    return { ok: true, message: `Started watching ${email}` };
  }

  // Starts a watcher per sender, skipping ones already watched and never letting one failure block the rest.
  async startWatchingForSenders(emails: string[]): Promise<void> {
    const uniqueEmails = Array.from(new Set((emails || []).filter(Boolean)));
    await Promise.allSettled(
      uniqueEmails.map(async (email) => {
        try {
          const result = await this.startWatching(email);
          this.logger.log(`[${email}] ${result.message}`);
        } catch (error) {
          this.logger.error(
            `[${email}] Failed to start IMAP IDLE watcher: ${error.message}`,
            error.stack,
          );
        }
      }),
    );
  }

  private connect(email: string, smtpConfig: SmtpSetting, attempt = 0) {
    const password = CryptoService.decryptPasskey(smtpConfig.password);
    const imap = new Imap({
      user: email,
      password,
      host: smtpConfig.imapHost || smtpConfig.host,
      port: smtpConfig.imapPort || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      keepalive: true,
    });

    this.activeWatchers.set(email, imap);

    imap.once('ready', () => {
      this.logger.log(`[${email}] IMAP IDLE watcher connected, entering IDLE`);
      imap.openBox('INBOX', true, async (err, box) => {
        if (err) {
          this.logger.error(`[${email}] Failed to open INBOX: ${err.message}`);
          imap.end();
          return;
        }
        if (!this.watermarks.has(email)) {
          this.watermarks.set(email, box.uidnext);
        }
        // Catch up on anything that arrived while disconnected/reconnecting.
        try {
          await this.runFetchSerialized(email, imap, 'catch-up');
        } catch (error) {
          this.logger.error(
            `[${email}] Error catching up after connect: ${error.message}`,
            error.stack,
          );
        }
      });
    });

    imap.on('mail', async () => {
      try {
        await this.runFetchSerialized(email, imap, 'mail-event');
      } catch (error) {
        this.logger.error(
          `[${email}] Error processing new mail: ${error.message}`,
          error.stack,
        );
      }
    });

    imap.once('error', (err) => {
      this.logger.error(
        `[${email}] IMAP IDLE connection error: ${err.message}`,
      );
    });

    imap.once('end', () => {
      this.logger.log(`[${email}] IMAP IDLE connection ended`);
      // Only auto-reconnect if this watcher wasn't explicitly stopped.
      if (this.activeWatchers.get(email) === imap) {
        this.activeWatchers.delete(email);
        const backoffMs = Math.min(30000, 2000 * 2 ** attempt);
        this.logger.log(`[${email}] Reconnecting in ${backoffMs}ms`);
        setTimeout(() => {
          this.connect(email, smtpConfig, attempt + 1);
        }, backoffMs);
      }
    });

    imap.connect();
  }

  // Queues onto the in-flight fetch chain for this mailbox instead of running concurrently.
  private runFetchSerialized(
    email: string,
    imap: Imap,
    trigger: string,
  ): Promise<void> {
    const previous = this.inFlight.get(email) ?? Promise.resolve();
    const next = previous
      .catch(() => {
        // already logged where it happened
      })
      .then(() => this.fetchAndProcessNew(email, imap, trigger));
    this.inFlight.set(email, next);
    return next;
  }

  // Processes only UID >= watermark; never touches \Seen since this is a real, actively-used inbox.
  private fetchAndProcessNew(
    email: string,
    imap: Imap,
    trigger: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const watermark = this.watermarks.get(email) ?? 1;
      this.logger.log(
        `[${email}] (${trigger}) searching UID ${watermark}:* for new mail`,
      );
      imap.search([['UID', `${watermark}:*`]], (err, uids) => {
        if (err) return reject(err);
        this.logger.log(
          `[${email}] (${trigger}) search UID ${watermark}:* found ${
            uids?.length || 0
          } message(s)${uids?.length ? `: [${uids.join(', ')}]` : ''}`,
        );
        if (!uids || uids.length === 0) return resolve();

        const fetch = imap.fetch(uids, { bodies: '', struct: false });
        const pending: Promise<void>[] = [];
        let maxUid = watermark - 1;

        fetch.on('message', (msg) => {
          let msgUid: number;
          msg.on('attributes', (attrs) => {
            msgUid = attrs.uid;
            if (msgUid > maxUid) maxUid = msgUid;
          });
          msg.on('body', (stream) => {
            pending.push(
              new Promise<void>((res) => {
                simpleParser(stream, async (parseErr, parsed) => {
                  // Guard against servers clamping "n:*" to the last existing UID when n is past the max.
                  if (msgUid < watermark) {
                    return res();
                  }
                  if (parseErr) {
                    this.logger.error(
                      `[${email}] Failed to parse new message (uid=${msgUid}): ${parseErr.message}`,
                    );
                    return res();
                  }
                  try {
                    await this.campaignService.processInboundReply({
                      senderEmail: email,
                      receiverEmail: parsed.from?.value?.[0]?.address || '',
                      subject: parsed.subject,
                      emailContent: parsed.html || parsed.text || '',
                      receivedDate: parsed.date || new Date(),
                      source: 'imap-idle',
                    });
                  } catch (procErr) {
                    this.logger.error(
                      `[${email}] processInboundReply failed (uid=${msgUid}): ${procErr.message}`,
                    );
                  }
                  res();
                });
              }),
            );
          });
        });

        fetch.once('error', (fetchErr) => reject(fetchErr));
        fetch.once('end', async () => {
          await Promise.all(pending);
          this.logger.log(
            `[${email}] (${trigger}) advancing watermark from ${watermark} to ${
              maxUid + 1
            }`,
          );
          this.watermarks.set(email, maxUid + 1);
          resolve();
        });
      });
    });
  }
}
