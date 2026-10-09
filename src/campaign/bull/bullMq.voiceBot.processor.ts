import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { VapiService } from '../../voicebot/voicebot/vapi.service';

@Processor('voiceBotCampaignQueue')
export class VoiceBotProcessor extends WorkerHost {
  constructor(private readonly vapiService: VapiService) {
    super();
  }

  async process(job: Job) {
    const { campaignId } = job.data;

    try {
      await this.vapiService.startCallToAudience(campaignId);
    } catch (error) {
      throw error;
    }
  }
}
