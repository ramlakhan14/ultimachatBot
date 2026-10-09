import { Controller, HttpException, Get } from '@nestjs/common';
import { RequestWithUser } from '../../common/@types/nest.types';
import { VoicebotWebhookService } from './voicebot-webhook.service';
import { ResponseUtil } from '../../voicebot/utils/response.util';
import { HttpStatus } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { Public } from '../../auth/guards/public.guard';
// import { VapiPayload } from '../../voicebot/constant/voicebot.constant';

@Controller('voicebot-webhook')
export class VoicebotWebhookController {
  constructor(
    private readonly voicebotWebhookService: VoicebotWebhookService,
  ) {}
  @Post('/slotcheck-webhook')
  @Public()
  async checkBookingSlotToolCallHandler(@Req() req: RequestWithUser) {
    try {
      const { userid, knowledgebaseId } = req.headers as any;
      const payload = req?.body;
      const result =
        await this.voicebotWebhookService.checkBookingSlotToolCallHandler(
          payload,
          userid,
        );
      return result;
    } catch (error) {
      throw new HttpException(
        'Error scheduling campaign',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message,
      );
    }
  }

  @Post('/appoitment-webhook')
  @Public()
  async bookAppoitmentToolCallHandler(@Req() req: any) {
    try {
      const { userid, knowledgebaseId } = req.headers;
      const payload = req.body;
      const result =
        await this.voicebotWebhookService.bookAppoitmentToolCallHandler(
          payload,
          userid,
        );
      return result;
    } catch (error) {
      throw new HttpException(
        'Error scheduling the appointment',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message,
      );
    }
  }

  @Post('/suppress-phone-webhook')
  @Public()
  async addToSuppressListHandler(@Req() req: any) {
    try {
      const { userid } = req.headers;
      const payload = req.body;
      const result =
        await this.voicebotWebhookService.addToSuppressNumberHandler(
          payload,
          userid,
        );
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error to suppress phone number webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
