import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { InboundBotService } from './inbound-bot.service';
import {
  CreateInboundBotDto,
  TalkToUltimaBotDto,
} from './dto/create-inbound-bot.dto';
import { UpdateInboundBotDto } from './dto/update-inbound-bot.dto';
import { RequestWithUser } from '../../common/@types/nest.types';
import { ResponseUtil } from '../utils/response.util';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DEFAULT_PROMPT } from './utils/prompts';
import { Public } from '../../auth/guards/public.guard';
import { CallSuccess } from './schema/inbound.bot.leads.schema';

@Controller('inbound-bot')
export class InboundBotController {
  constructor(private readonly inboundBotService: InboundBotService) {}

  private errorResponse = (error: any) => {
    return ResponseUtil.error(
      error.message ||
        error.response ||
        error.response?.data?.message ||
        'Internal Server Error',
      error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  };

  @Post('add')
  async createInboundBot(
    @Req() req: RequestWithUser,
    @Body() createInboundBotDto: CreateInboundBotDto,
  ) {
    try {
      const userDetails = req.user;
      const data = await this.inboundBotService.createInboundBot(
        createInboundBotDto,
        userDetails,
      );
      return ResponseUtil.success(
        data,
        'Inbound bot created successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Failed to create Inbound bot, Please try again.',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('lists')
  async findAllInboundBots(
    @Req() req: RequestWithUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.findAllInboundBots(
        userId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        { ...data },
        'Inbound bots fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('details/:botId')
  async findOneInboundBots(
    @Req() req: RequestWithUser,
    @Param('botId') botId: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.findOneInboundBots(
        botId,
        userId,
      );
      return ResponseUtil.success(
        data,
        'Inbound bot fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Patch('update')
  async updateInboundBots(
    @Req() req: RequestWithUser,
    @Body() updateInboundBotDto: UpdateInboundBotDto,
  ) {
    try {
      const data = await this.inboundBotService.updateInboundBots(
        updateInboundBotDto,
        req.user._id.toHexString(),
        req.user.email,
      );
      return ResponseUtil.success(
        data,
        'Inbound bot updated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Delete('bot/:id')
  async removeInboundBots(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      await this.inboundBotService.removeInboundBots(id, userId);
      return ResponseUtil.success(
        [],
        'Inbound bot deleted successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Delete('bulk-delete')
  async bulkDeleteBot(
    @Req() req: RequestWithUser,
    @Body() body: { botIds: string[] },
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.bulkDeleteBot(
        body.botIds,
        userId,
      );
      return ResponseUtil.success(
        data,
        'All Inbound bot deleted successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('numbers')
  async getInboundBotNumbers(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.getInboundBotNumbers(userId);
      return ResponseUtil.success(
        data,
        'Inbound bot numbers fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('inbound-calls/:botId')
  async inBoundCallsLists(
    @Req() req: RequestWithUser,
    @Param('botId') botId: string,
    @Query('status') status?: CallSuccess,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.getInboundCalls(userId, botId, {
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });

      return ResponseUtil.success(
        data,
        'Inbound calls fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Patch('bot-status')
  async updateBotStatus(
    @Body() body: { isActive: boolean; botId: string },
    @Req() req: RequestWithUser,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.updateBotStatus(
        body.isActive,
        body.botId,
        userId,
      );

      return ResponseUtil.success(
        data,
        `Inbound bot ${
          body.isActive ? 'Activated' : 'Deactivated'
        } successfully`,
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('upload-knowledgebase')
  @UseInterceptors(FileInterceptor('file'))
  async uploadKnowledgebase(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('File not found');
      }
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.uploadKnowledgebase(
        userId,
        file,
      );
      return ResponseUtil.success(
        data,
        'Knowledge added successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('download-csv')
  async downloadToCSV(
    @Req() req: RequestWithUser,
    @Query('botId') botId: string,
    @Res() res: Response,
  ) {
    try {
      if (!botId) {
        throw new BadRequestException('Inbound bot id is required');
      }
      const userId = req.user._id.toHexString();
      const data = await this.inboundBotService.downloadToCSV(botId, userId);
      res.send(data);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Get('get-prompt')
  async getPrompt() {
    try {
      return ResponseUtil.success({
        prompt: DEFAULT_PROMPT,
      });
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  @Public()
  async handleWebhook(@Req() req: any, @Body() body: any) {
    const { message } = body;
    let userId = null;
    if (req.headers && req.headers.userid) {
      userId = req.headers.userid;
    }
    try {
      return this.inboundBotService.handleWebhook(
        message,
        userId,
        req.headers.inboundbotid,
      );
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Post('talktobot')
  @Public()
  async talkToUltimaBot(@Body() body: TalkToUltimaBotDto) {
    try {
      if (body?.message && body?.message?.trim().length !== 0) {
        return await this.inboundBotService.talkToMeWidget(body);
      }
      return await this.inboundBotService.callMeRequestFromUltima(body);
    } catch (error) {
      return this.errorResponse(error);
    }
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('talktobot-request-tool')
  @Post('')
  @Public()
  async handleTalkToMeWidget(@Body() body: any) {
    const { message } = body;
    try {
      return await this.inboundBotService.handleTalkToMeWidgets(message);
    } catch (error) {
      return this.errorResponse(error);
    }
  }
}
