import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import { CampaignService } from '../campaign.service';
import { ObjectId } from 'mongodb';

@Processor('campaignCronQueue', { concurrency: 5 })
export class BullMqCronProcessor extends WorkerHost {
  constructor(
    @Inject(CampaignService)
    private readonly campaignService: CampaignService,
  ) {
    super();
  }
  async process(job: Job) {
    const data = JSON.parse(job.data);
    const { _id, addedBy } = data;
    // const processingCronCampaign = await this.campaignService.startCampaign(
    //   campaignId,
    // );

    const req = {
      user: {
        _id: new ObjectId(addedBy),
      },
    };
    const processingCronCampaign = await this.campaignService.startCampaignV2(
      _id,
      req,
    );
    Logger.log(processingCronCampaign);
  }
}
