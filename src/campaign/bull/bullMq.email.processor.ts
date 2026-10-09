import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CampaignService } from '../campaign.service';
import { EMAIL_PROCESS_STATUS, EMAIL_STATUS } from '../enum/enum';
import { AdminPostmarkService } from '../postmark/admin-postmark.service';
import { SmtpService } from '../../smtp/smtp.service';
import { NodemailerService } from '../../smtp/nodemailer/nodemailer.service';

@Processor('emailProcessingQueue', { concurrency: 10 })
export class BullMqEmailProcessor extends WorkerHost {
  private readonly logger = new Logger('BullMqEmailProcessor');

  constructor(
    private readonly adminEmailService: AdminPostmarkService,
    private readonly campaignService: CampaignService,
    private readonly smtpService: SmtpService,
    private readonly nodemailerService: NodemailerService,
  ) {
    super();
  }
  async process(job: Job) {

    if (job.data.serverToken && job.data.serverToken !== '') {
      this.adminEmailService
        .sendCampaignEmailToLeads(
          job.data.sender,
          job.data.receiver,
          job.data.campaignDetails,
          job.data.subject,
          job.data.gptEmailResponse,
          job.data.serverToken,
          job.data.userId,
        )
        .then(async (sendEmails) => {

          if (sendEmails.ErrorCode === 0 && sendEmails.Message === 'OK') {
            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignAudience',
              {
                emailStatus: EMAIL_STATUS.SENT || 'sent',
                processStatus: EMAIL_PROCESS_STATUS.COMPLETED || 'completed',
                senderEmailId: job.data.sender,
              },
              job.data.receiver,
              job.data.audienceId,
            );

            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignDuplicateAudience',
              {
                emailStatus: EMAIL_STATUS.SENT || 'sent',
                processStatus: EMAIL_PROCESS_STATUS.COMPLETED || 'completed',
                senderEmailId: job.data.sender,
              },
              job.data.receiver,
              job.data.audienceId,
            );
            this.campaignService.addWarmupCountV2(
              job.data.userId,
              job.data.sender,
            );
            this.campaignService.updateCampaignStatusByAudience(
              job.data.userId,
              job.data.campaignId,
            );
          } else {
            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignAudience',
              {
                emailStatus: EMAIL_STATUS.FAILED || 'failed',
                processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
              },
              job.data.receiver,
              job.data.audienceId,
            );
            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignDuplicateAudience',
              {
                emailStatus: EMAIL_STATUS.FAILED || 'failed',
                processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
                senderEmailId: job.data.sender,
              },
              job.data.receiver,
              job.data.audienceId,
            );

            this.campaignService.updateCampaignStatusByAudience(
              job.data.userId,
              job.data.campaignId,
            );
          }
        })
        .catch(async (error) => {
          this.logger.error('Error sending email:', error);
          await this.campaignService.updateCampaignRelatedCollections(
            job.data?.campaignId,
            'campaignAudience',
            {
              emailStatus: EMAIL_STATUS.FAILED || 'failed',
              processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
            },
            job.data.receiver,
            job.data.audienceId,
          );
          await this.campaignService.updateCampaignRelatedCollections(
            job.data?.campaignId,
            'campaignDuplicateAudience',
            {
              emailStatus: EMAIL_STATUS.FAILED || 'failed',
              processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
            },
            job.data.receiver,
            job.data.audienceId,
          );
          this.campaignService.updateCampaignStatusByAudience(
            job.data.userId,
            job.data.campaignId,
          );
        });
    } else {

      this.nodemailerService
        .sendEmail(
          job.data.userId,
          job.data.receiver,
          job.data.subject,
          job.data.gptEmailResponse,
          '',
          [],
          job.data.sender,
          { data: job.data?.campaignDetails?.data },
        )
        .then(async (sendEmails) => {

          // Check if email was sent successfully
          if (sendEmails && sendEmails.data && sendEmails.data.success) {
            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignAudience',
              {
                emailStatus: EMAIL_STATUS.SENT || 'sent',
                processStatus: EMAIL_PROCESS_STATUS.COMPLETED || 'completed',
                senderEmailId: job.data.sender,
              },
              job.data.receiver,
              job.data.audienceId,
            );
            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignDuplicateAudience',
              {
                emailStatus: EMAIL_STATUS.SENT || 'sent',
                processStatus: EMAIL_PROCESS_STATUS.COMPLETED || 'completed',
                senderEmailId: job.data.sender,
              },
              job.data.receiver,
              job.data.audienceId,
            );

            this.campaignService.addWarmupCountV2(
              job.data.userId,
              job.data.sender,
            );

            this.campaignService.updateCampaignStatusByAudience(
              job.data.userId,
              job.data.campaignId,
            );
          } else {
            this.logger.error('Nodemailer response indicates failure:', sendEmails);
            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignAudience',
              {
                emailStatus: EMAIL_STATUS.FAILED || 'failed',
                processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
              },
              job.data.receiver,
              job.data.audienceId,
            );
            await this.campaignService.updateCampaignRelatedCollections(
              job.data?.campaignId,
              'campaignDuplicateAudience',
              {
                emailStatus: EMAIL_STATUS.FAILED || 'failed',
                processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
              },
              job.data.receiver,
              job.data.audienceId,
            );

            this.campaignService.updateCampaignStatusByAudience(
              job.data.userId,
              job.data.campaignId,
            );
          }
        })
        .catch(async (error) => {
          this.logger.error('Error sending email with nodemailer:', error);
          await this.campaignService.updateCampaignRelatedCollections(
            job.data?.campaignId,
            'campaignAudience',
            {
              emailStatus: EMAIL_STATUS.FAILED || 'failed',
              processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
            },
            job.data.receiver,
            job.data.audienceId,
          );

          await this.campaignService.updateCampaignRelatedCollections(
            job.data?.campaignId,
            'campaignDuplicateAudience',
            {
              emailStatus: EMAIL_STATUS.FAILED || 'failed',
              processStatus: EMAIL_PROCESS_STATUS.FAILED || 'failed',
            },
            job.data.receiver,
            job.data.audienceId,
          );

          this.campaignService.updateCampaignStatusByAudience(
            job.data.userId,
            job.data.campaignId,
          );
        });
    }
  }
}
