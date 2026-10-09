import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { CampaignService } from '../campaign.service';
import { CAMPAIGN_SCHEDULER_STATUS } from '../enum/enum';
import { VapiService } from '../../voicebot/voicebot/vapi.service';

@Processor('campaignScheduleQueue', { concurrency: 5 })
export class BullMqScheduleProcessor extends WorkerHost {
  // private vapiService: VapiService;
  constructor(
    @Inject(CampaignService)
    private readonly campaignService: CampaignService,
    private readonly vapiService: VapiService, // private readonly moduleRef: ModuleRef,
  ) {
    super();
  }
  // async onModuleInit() {
  //   this.vapiService = this.moduleRef.get(VapiService, { strict: false });
  // }
  //TODO:can i able to listen to the events so that i can update and perform other operations

  async process(job: Job) {
    const { campaignId, IsCampaignScheduledFor } = job.data;

    if (
      IsCampaignScheduledFor &&
      IsCampaignScheduledFor.toLowerCase() === 'voicebot'
    ) {
      await this.vapiService.startCallToAudience(campaignId);
      return;
    }

    if (
      IsCampaignScheduledFor &&
      IsCampaignScheduledFor.toLowerCase() === 'voicebot-call-follow-up'
    ) {
      await this.vapiService.startCallToFollowUp(job.data);
      return;
    }

    const processingScheduleCampaign =
      await this.campaignService.startCampaignV2(campaignId, job.data);
    this.campaignService.updateCampaignRelatedCollections(
      campaignId,
      'campaignScheduled',
      {
        status: CAMPAIGN_SCHEDULER_STATUS.PROCESSED,
      },
    );
    //call the method here and maintgain the status of the campaign sheduler
    Logger.log(processingScheduleCampaign);
  }
}
