import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Public } from '../../auth/guards/public.guard';
import { RequestWithUser } from '../../common/@types/nest.types';
import { NewOfflineMsgDTO, ResponseMailDTO } from './offline-msg.dto';
import { OfflineMsgService } from './offline-msg.service';
import { Response } from 'express';

@Controller('offline_msg')
export class OfflineMessageController {
  constructor(private readonly offlineMsgService: OfflineMsgService) {}

  @Public()
  @Post('/')
  async addOfflineMsg(@Body() data: NewOfflineMsgDTO) {
    return this.offlineMsgService.createOfflineMessage(data);
  }

  @Get('/:kbId')
  async getOfflineMessagesList(
    @Req() req: RequestWithUser,
    @Param('kbId') kbId: string,
    @Query('page_size') pageSize: number,
    @Query('page') page?: number,
    @Query('sortType') sort?: number,
    @Query('search') searchQuery?: string,
  ) {
    const { user } = req;

    if (!kbId || kbId.length === 0) {
      throw new HttpException('Invalid KbId', HttpStatus.BAD_REQUEST);
    }

    return this.offlineMsgService.getOfflineMsgsForKnowledgebase(
      user,
      kbId,
      pageSize || 10,
      page,
      sort,
      searchQuery,
    );
  }

  @Post('/:kbId/sendResponseEmail/:id')
  async sendOfflineMsgResponse(
    @Req() req: RequestWithUser,
    @Body() data: ResponseMailDTO,
    @Param('kbId') kbId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { user } = req;
    await this.offlineMsgService.offlineMsgResponseMail(user, data, kbId, id);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Mail Sent Successfully ',
    });
  }
}
