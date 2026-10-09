import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Collection, Db } from 'mongodb';
import { VoicebotService } from '../voicebot/voicebot.service';
import { VapiService } from '../voicebot/vapi.service';
import { DistributedLockService } from '../../common/distributed-lock/distributed-lock.service';
import { MONGODB } from '../../common/mongo/mongo.module';
import { UserService } from '../../user/user.service';
import { CryptoService } from '../../campaign/campaign-utils/crypto.service';
import {
  BotStatus,
  INBOUND_BOT_SCHEMA,
  InboundBotSchema,
} from '../inbound-bot/schema/inbound.bot.schema';
import {
  InBoundSettings,
  VOICEBOT_SETTING_COLLECTION,
} from '../schema/voicebot-setting.schema';
import { LEAD_COLLECTOR_PROMPT } from '../inbound-bot/utils/prompts';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private readonly inboundBotsCollection: Collection<InboundBotSchema>;

  constructor(
    @Inject(MONGODB) private readonly db: Db,
    private voicebotService: VoicebotService,
    private readonly vapiService: VapiService,
    private readonly userService: UserService,
    private readonly distributedLock: DistributedLockService,
  ) {
    this.inboundBotsCollection =
      this.db.collection<InboundBotSchema>(INBOUND_BOT_SCHEMA);
  }

  private async getVapiKeyForUser(userId: string): Promise<{
    vapi_key: string;
    inBoundSettings: InBoundSettings | null;
  }> {
    const settings = await this.db
      .collection(VOICEBOT_SETTING_COLLECTION)
      .findOne({ userId });
    const voiceConfig: any = await this.db
      .collection('campaignVoiceServerConfig')
      .findOne({ userId });
    const vapi_key = CryptoService.decryptPasskey(voiceConfig.vapiServerAPIkey);
    return { vapi_key, inBoundSettings: settings?.inBoundSettings };
  }

  private buildLeadBotPrompt(opts: {
    callForwardingNumbers: any[];
    supportEmailId: string;
    botName: string;
    companyName: string;
  }): string {
    const { callForwardingNumbers, supportEmailId, botName, companyName } =
      opts;
    let callForwardingInstructions = '';
    if (
      Array.isArray(callForwardingNumbers) &&
      callForwardingNumbers.length > 0
    ) {
      callForwardingInstructions =
        'If the caller requests to speak with a specific person or department, use the following instructions:\n' +
        callForwardingNumbers
          .map(
            (e) =>
              `- If the caller asks for "${e.name}", the assistant should call the transferCall function with "${e.number}".`,
          )
          .join('\n') +
        '\n';
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.voicebotService.interpolatePrompt(LEAD_COLLECTOR_PROMPT, {
      supportEmailId: supportEmailId || '',
      call_forwarding_instructions: callForwardingInstructions,
      botName: botName || '',
      companyName: companyName || '',
      today: fmt(now),
      tomorrow: fmt(tomorrow),
      year: String(now.getFullYear()),
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async changeStatusOfGoogleMeeting() {
    await this.distributedLock.withLock(
      'voicebot-google-meeting-status',
      3_600_000,
      async () => {
        this.logger.log('Changing status of Google Meeting...');
        // await this.voicebotService.changeGoogleMeetingStatusOfAll();
        this.logger.log('Changed status of Google Meeting...');
      },
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async changeVoicebotCampaignStatus() {
    await this.distributedLock.withLock(
      'voicebot-campaign-status',
      3_300_000,
      async () => {
        this.logger.log('Running hourly campaign status update...');
        try {
          await this.voicebotService.changeVoicebotCampaignStatus();
        } catch (error) {
          this.logger.error(
            'Error updating voicebot campaign status:',
            error.message,
          );
        }
      },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshLeadBotDates() {
    await this.distributedLock.withLock(
      'lead-bot-date-refresh',
      3_600_000,
      async () => {
        this.logger.log('Starting daily lead-bot date refresh...');
        const activeBots = await this.inboundBotsCollection
          .find({
            isLeadBot: true,
            status: BotStatus.Active,
            assistantId: { $exists: true, $ne: null },
          })
          .toArray();

        this.logger.log(
          `Found ${activeBots.length} active lead bot(s) to refresh`,
        );

        for (const bot of activeBots) {
          try {
            const userId = bot.userId.toHexString();
            const user = await this.userService.findUserByIdSparse(userId);
            const { vapi_key, inBoundSettings } = await this.getVapiKeyForUser(
              userId,
            );

            const refreshedPrompt = this.buildLeadBotPrompt({
              callForwardingNumbers:
                inBoundSettings?.callForwardingNumbers ?? [],
              supportEmailId: user.email,
              botName: bot.botName,
              companyName: bot.campaignProject?.projectName ?? '',
            });

            await this.vapiService.updateAssistantInboundBot(vapi_key, {
              assistantId: bot.assistantId,
              prompt: refreshedPrompt,
              toolIds: [],
              userId,
              inboundBotId: bot._id?.toHexString?.() ?? userId,
              botName: bot.botName,
              voiceCharacter: bot.voiceCloneId || bot.voiceCharacter,
              knowledgeBaseFile: bot.knowledgebaseDetails,
              projectId: bot.campaignProject?.projectId,
              isLeadBot: true,
            });

            this.logger.log(`Refreshed bot ${bot._id} (${bot.botName})`);
          } catch (err) {
            this.logger.error(
              `Failed to refresh bot ${bot._id}: ${err.message}`,
            );
          }
        }

        this.logger.log('Daily lead-bot date refresh complete');
      },
    );
  }
}
