import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignService } from '../campaign.service';
import { BullMqService } from '../bull/bullMq.service';
import { CAMPAIGN_STATUS } from '../enum/enum';
import { CryptoService } from '../campaign-utils/crypto.service';
import { VapiService } from '../../voicebot/voicebot/vapi.service';
import { DistributedLockService } from '../../common/distributed-lock/distributed-lock.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(
    private readonly campaignService: CampaignService,
    private readonly cronQueue: BullMqService,
    private readonly vapiServices: VapiService,
    private readonly distributedLock: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleCampaign() {
    await this.distributedLock.withLock(
      'campaign-daily-10am',
      3_600_000,
      async () => {
        this.logger.log('Starting the campaign...');
        this.logger.log('Campaign started at:', new Date().toISOString());

        const BATCH_SIZE = 10;
        let offset = 0;
        let hasMoreCampaigns = true;

        while (hasMoreCampaigns) {
          const payload = {
            limit: BATCH_SIZE,
            offset: offset,
            $nor: [{ status: CAMPAIGN_STATUS.PAUSED }],
          };
          const allCampaign = await this.campaignService.getAllCampaignForCron(
            payload,
          );

          if (allCampaign.data.length === 0) {
            hasMoreCampaigns = false;
            break;
          }

          await this.cronQueue.addBulkCronJob(allCampaign.data);
          offset += BATCH_SIZE;
          await this.delay(1000);
        }

        this.logger.log('Campaign Ended at:', new Date().toISOString());
      },
    );
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleEmailSenderSignatureStatus() {
    await this.distributedLock.withLock(
      'campaign-email-signature-status',
      540_000,
      async () => {
        this.logger.log('Starting email sender signature status check...');

        const BATCH_SIZE = 20;
        let offset = 0;

        while (true) {
          const pendingEmails =
            await this.campaignService.getPendingEmailSignatures({
              limit: BATCH_SIZE,
              offset,
            });

          if (pendingEmails.length === 0) break;

          await Promise.all(
            pendingEmails.map(async (emailConfig) => {
              try {
                const adminEmailServerConfig =
                  await this.campaignService.getAllAdminEmailServerConfigVerified(
                    emailConfig.userId,
                  );
                const decryptedAuthKey = CryptoService.decryptPasskey(
                  adminEmailServerConfig.data.emailAccountAuthKey,
                );
                await this.campaignService.getEmailSenderSignatureStatus(
                  emailConfig.userId,
                  emailConfig.senderSignatureId,
                  decryptedAuthKey,
                );
              } catch (error) {
                this.logger.error(
                  `Error processing signature status for email ${emailConfig.email}:`,
                  error.message,
                );
              }
            }),
          );

          offset += BATCH_SIZE;
          await this.delay(500);
        }

        this.logger.log('Email signature status check completed');
      },
    );
  }

  // TODO: testing - originally EVERY_2_HOURS
  @Cron(CronExpression.EVERY_2_HOURS)
  async handleEmailConversation() {
    await this.distributedLock.withLock(
      'campaign-email-conversation',
      6_900_000,
      async () => {
        this.logger.log('Starting email conversation Cron...');
        await this.campaignService.fetchAllAdminUsersAndAutoReplyToEmails();
        this.logger.log('Email conversation Cron completed');
      },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleFollowUpEmail() {
    await this.distributedLock.withLock(
      'campaign-follow-up-email',
      3_600_000,
      async () => {
        this.logger.log('Starting follow up email Cron...');
        await this.campaignService.startFollowUps();
        this.logger.log('Follow up email Cron completed');
      },
    );
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleGmailDraft() {
    await this.distributedLock.withLock(
      'campaign-gmail-draft-sync',
      6_900_000,
      async () => {
        this.logger.log('Starting gmail draft Cron...');
        await this.campaignService.syncWithGmailDraft();
        this.logger.log('Gmail draft Cron completed');
      },
    );
  }

  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_11AM)
  // @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async startVoiceBotCampaign() {
    await this.distributedLock.withLock(
      'campaign-voicebot-calls',
      3_600_000,
      async () => {
        this.logger.log('Starting voice bot campaign...');
        await this.vapiServices.startCallToAudience();
        this.logger.log('Ended voice bot campaign...');
      },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_1PM)
  async emailWarmupCountRefresher() {
    await this.distributedLock.withLock(
      'campaign-warmup-count-refresh',
      3_600_000,
      async () => {
        await this.campaignService.emailWarmupCountRefresher();
      },
    );
  }
}
