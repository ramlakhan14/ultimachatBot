import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import { ZapierWebhookService } from './zapier-webhook.service';
import { CreateUserUltimaWebhookDto } from './dto/createUserUltimaWebhook.dto';
import { UpdateUserUltimaWebhookDto } from './dto/updateUserUltimaWebhook.dto';
import { CreateZapierWebhookDto } from './dto/createUserZapierWebhook.dto';
import { UpdateUserZapierWebhookDto } from './dto/updateUserZapierWebhook.dto';
import { Public } from '../auth/guards/public.guard';
import { LeadSyncWithCrmDto } from './dto/leadSyncWithCrm.dto';

@Controller('hooks')
export class ZapierWebhookController {
  constructor(private readonly zapierWebhookService: ZapierWebhookService) {}

  @Public()
  @Post('ultimabot/:userId/:secret')
  async generateAndSaveUltmabotWebhook(
    @Res() res: any,
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('secret') secret: string,
    @Body() body: LeadSyncWithCrmDto | LeadSyncWithCrmDto[],
  ) {
    const headers = req.headers;
    const result =
      await this.zapierWebhookService.processUserLeadsUltimabotWebhook(
        userId,
        secret,
        body,
        headers,
      );
    return res.status(result.statusCode).json(result);
  }

  @Post('ultimabot/create')
  async createDynamicUltimabotWebhook(
    @Res() res: any,
    @Body() body: CreateUserUltimaWebhookDto,
    @Req() req: any,
  ) {
    const userId = req.user._id.toHexString();
    const result =
      await this.zapierWebhookService.generateAndSaveUltimabotWebhook(
        userId,
        body.crmName,
      );
    return res.status(result.statusCode).json(result);
  }

  @Get('ultimabot/fetchAllHooks')
  async getUserUltimabotWebhook(
    @Res() res: any,
    @Req() req: any,
    @Query('searchString') searchString: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = req.user._id.toHexString();
    const result = await this.zapierWebhookService.getUserUltimabotWebhook(
      userId,
      Number(page),
      Number(limit),
      searchString,
    );
    return res.status(result.statusCode).json(result);
  }

  @Put('ultimabot/update')
  async updateUserUltmabotWebhook(
    @Res() res: any,
    @Body() body: UpdateUserUltimaWebhookDto,
    @Req() req: any,
  ) {
    const userId = req.user._id.toHexString();
    const webhookId = body.webhookId;
    const result = await this.zapierWebhookService.updateUserUltimabotWebhook(
      userId,
      webhookId,
      body,
    );
    return res.status(result.statusCode).json(result);
  }

  @Delete('ultimabot/delete')
  async deleteUserUltimabotWebhook(
    @Res() res: any,
    @Req() req: any,
    @Body() body: any,
  ) {
    const userId = req.user._id.toHexString();
    const result = await this.zapierWebhookService.deleteUserUltimabotWebhook(
      userId,
      body,
    );
    return res.status(result.statusCode).json(result);
  }

  @Post('zapier/submit')
  async createUserZapierWebhook(
    @Res() res: any,
    @Body() body: CreateZapierWebhookDto,
    @Req() req: any,
  ) {
    const userId = req.user._id.toHexString();
    const result = await this.zapierWebhookService.createUserZapierWebhook(
      body,
      userId,
    );
    return res.status(result.statusCode).json(result);
  }

  @Get('zapier/fetchAllHooks')
  async getUserZapierWebhook(
    @Res() res: any,
    @Req() req: any,
    @Query('searchString') searchString: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = req.user._id.toHexString();
    const result = await this.zapierWebhookService.getUserZapierWebhook(
      userId,
      searchString,
      Number(page),
      Number(limit),
    );
    return res.status(result.statusCode).json(result);
  }

  @Put('zapier/update')
  async updateUserZapierWebhook(
    @Res() res: any,
    @Body() body: UpdateUserZapierWebhookDto,
    @Req() req: any,
  ) {
    const userId = req.user._id.toHexString();
    const zapierWebhookId = body.zapierWebhookId;
    const result = await this.zapierWebhookService.updateUserZapierWebhook(
      userId,
      zapierWebhookId,
      body,
    );
    return res.status(result.statusCode).json(result);
  }

  @Delete('zapier/delete')
  async deleteUserZapierWebhook(
    @Res() res: any,
    @Req() req: any,
    @Body() body: any,
  ) {
    const userId = req.user._id.toHexString();
    const result = await this.zapierWebhookService.deleteUserZapierWebhook(
      userId,
      body,
    );
    return res.status(result.statusCode).json(result);
  }
  @Post('zapier/sendBulkLead')
  async sendBulkLeadToZapier(
    @Res() res: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user._id.toHexString();
    const result =
      await this.zapierWebhookService.sendBulkLeadViaWebhookPayloadToZapier(
        body.webhookUrl,
        body.leadType,
        userId,
      );
    return res.status(result.statusCode).json(result);
  }
}
