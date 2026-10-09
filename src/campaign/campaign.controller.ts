import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { RequestWithUser } from '../common/@types/nest.types';
import {
  CreateCampaignDto,
  TargetEmailLeadsDTO,
} from './dto/createCampaign.dto';
import { GetCampaignDto } from './dto/getCampaign.dto';
import { UpdateCampaignDto } from './dto/updateCampaign.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetAllCampaignAudeinceDto } from './dto/getAllCampaignAudience.dto';
import { Roles } from '../auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
import { ImapService } from './campaign-utils/nodeImap.service';
import { ImapIdleWatcherService } from './campaign-utils/imapIdleWatcher.service';
import { CampaignSchedulerDto } from './dto/campaignScheduler.dto';
import { DuplicateLeadDto } from './dto/duplicateLead.dto';
import { CampaignScrapeDTO, EditDraftEmailDto } from './dto/campaignScrapeDto';
import { Public } from '../auth/guards/public.guard';
import { Response } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { CreateEmailSenderSignatureDto } from './dto/createemailsendersignature.sto';
import { ChatSummaryDto, EmailSummaryDto } from './dto/chatSummary.dto';

@Controller('campaign')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly imapService: ImapService,
    private readonly imapIdleWatcherService: ImapIdleWatcherService,
  ) {}

  @Post('/createCampaign')
  async createCampaign(
    @Body() payload: CreateCampaignDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.createCampaign(req, payload);
  }

  @Post('/updateCampaign')
  async updateCampaign(
    @Body() payload: UpdateCampaignDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.updateCampaign(req, payload);
  }

  @Get('/getAllCampaign')
  async getAllCampaign(
    @Query() payload: GetCampaignDto,
    @Req() req: RequestWithUser,
  ) {
    // return await this.campaignService.getAllCampaign(req, payload);
    return await this.campaignService.getAllCampaignV2(req, payload);
  }

  @Get('/getCampaignDetails')
  async getCampaignDetails(@Query() payload: any, @Req() req: RequestWithUser) {
    return await this.campaignService.getCampaignDetails(
      req,
      payload.campaignId,
    );
  }

  @Post('/check-campaign-name')
  async checkCampaignName(
    @Req() req: RequestWithUser,
    @Body() body: { campaignName: string },
  ) {
    try {
      if (!body.campaignName?.trim()) {
        return ResponseUtil.error(
          'Campaign name is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const userId = req.user._id.toHexString();
      const existingCampaign = await this.campaignService.checkCampaignName(
        userId,
        body.campaignName,
      );

      if (existingCampaign) {
        return ResponseUtil.error(
          `Campaign name "${body.campaignName.trim()}" is already in use. Please choose a different name.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return ResponseUtil.success(
        null,
        'Campaign name is available',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Unable to check campaign name. Please try again.',
        error.getStatus?.() ||
          error.status ||
          error.statusCode ||
          HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/csvParseAndSaveData')
  @UseInterceptors(FileInterceptor('file'))
  async csvParseAndSaveData(
    @Req() req: RequestWithUser,
    @UploadedFile()
    file: Express.Multer.File,
    @Body() payload: any,
  ) {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }
    return await this.campaignService.csvParserV3(req, payload, file);
  }

  @HttpCode(HttpStatus.OK)
  @Post('merge-leads')
  async mergeLeadsFromMultipleSources(
    @Req() req: RequestWithUser,
    @Body() targetEmailLeads: TargetEmailLeadsDTO,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.campaignService.mergeLeadsFromMultipleSources(
        targetEmailLeads,
        userId,
      );
      return ResponseUtil.success(
        data,
        'Leads merged and validated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message ||
          error.response ||
          error.response?.data?.message ||
          'Internal Server Error',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/insertCampaignAudience')
  async insertCampaignAudience(
    @Body() payload: any,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user._id.toHexString();

    return await this.campaignService.insertVerifiedLeadsToCampaign(
      payload.leads,
      payload.campaignId,
      userId,
      req,
    );
  }

  @Post('/campaignScheduler')
  async scheduleCampaign(
    @Body() payload: CampaignSchedulerDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.campaignScheduler(req, payload);
  }

  @Post('/duplicateLead')
  async duplicateLead(
    @Body() payload: DuplicateLeadDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.duplicateLeadEntry(req, payload);
  }

  @Get('/getAllLeads')
  async getAllCampaignAudience(
    @Query() payload: GetAllCampaignAudeinceDto,
    @Req() req: RequestWithUser,
  ) {
    payload.limit = Number(payload.limit);
    payload.offset = Number(payload.offset);
    return await this.campaignService.getAllCampaignAudience(req, payload);
  }

  @Get('/getAllLeadsWithCount')
  async getAllLeadsWithCount(
    @Query() payload: GetAllCampaignAudeinceDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.getAllCampaignWithCount(req, payload);
  }

  @Post('/dataScrappingForCampaign')
  @Roles(Role.User, Role.Admin)
  async dataScrappingForCampaign(
    @Req() req: RequestWithUser,
    @Body() data: CampaignScrapeDTO,
  ) {
    const { user } = req;

    // save job
    const jobId = await this.campaignService.insertScrapJob(user, data);

    return ResponseUtil.success({ jobId }, 'Scraping started', HttpStatus.OK);
  }

  @Get('/scrape-result/:jobId')
  async getScrapeResult(
    @Req() req: RequestWithUser,
    @Param('jobId') jobId: string,
  ) {
    const userId = req.user._id.toHexString();
    const job = await this.campaignService.getScrapeResult(jobId, userId);

    return ResponseUtil.success(job, 'Job status', HttpStatus.OK);
  }

  @Post('/triggerCampaign')
  @Roles(Role.User, Role.Admin)
  async triggerCamapign(@Req() req: RequestWithUser, @Body() data: any) {
    return await this.campaignService.triggerCampaign(data.campaignId, req);
  }

  @Post('/pauseCampaign')
  @Roles(Role.User, Role.Admin)
  async pauseCamapign(req: RequestWithUser, @Body() data: any) {
    return await this.campaignService.pauseCampaignV2(data.campaignId);
  }

  @Post('/resumeCampaign')
  @Roles(Role.User, Role.Admin)
  async resumeCampaign(@Req() req: RequestWithUser, @Body() data: any) {
    return await this.campaignService.resumeCampaign(data.campaignId, req);
  }

  @Public()
  @Get('imap/getEmails')
  async getEmails(@Body() data: any) {
    try {
      const emails = await this.campaignService.getEmailsFromImap(data, null);
      return { success: true, emails: emails };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('/emailServerConfig')
  async getEmailServerConfig(@Req() req: RequestWithUser) {
    return await this.campaignService.getAllEmailServerConfig(
      req.user._id.toHexString(),
    );
  }

  @Get('/allEmailAndPasskeyConfig')
  async getAllAdminEmailAndPasskeyConfig(
    @Req() req: RequestWithUser,
    @Query() data: any,
  ) {
    return await this.campaignService.getAllAdminEmailAndPasskeyConfig(
      req.user._id.toHexString(),
      data.campaignEmailServerId,
      Number(data.page),
      Number(data.limit),
    );
  }

  @Post('/verifyPostmarkAuthAndSecretKey')
  async verifyPostmarkAuthAndSecretKey(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Body() data: any,
  ) {
    return await this.campaignService.verifyPostmarkKey(
      data.authKey,
      data.secretKey,
      req.user._id.toHexString(),
      res,
    );
  }

  @Post('/updatePasskeyAndEmailHost')
  async updatePasskeyAndEmailHost(
    @Req() req: RequestWithUser,
    @Body() data: any,
    @Res() res: Response,
  ) {
    const { id, emailHost } = data || {};
    return await this.campaignService.updatePasskeyAndEmailHost(
      req.user._id.toHexString(),
      id,
      emailHost,
      res,
    );
  }

  @Post('/createEmailSenderSignature')
  async createEmailSenderSignature(
    @Req() req: RequestWithUser,
    @Body() data: CreateEmailSenderSignatureDto,
  ) {
    try {
      const result = await this.campaignService.createEmailSenderSignature(
        req.user._id.toHexString(),
        data,
      );
      return {
        message: 'Email Sender Signature created successfully',
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creating Email Sender Signature',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/resendEmailSenderSignatureRequest')
  async resendEmailSenderSignatureRequest(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Body() data: any,
  ) {
    const { senderSignatureId, authKey } = data;
    return await this.campaignService.resendEmailSenderSignatureRequest(
      req.user._id.toHexString(),
      senderSignatureId,
      authKey,
      res,
    );
  }

  @Delete('/deleteEmailAndPasskeyConfig')
  async deleteEmailAndPasskeyConfig(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Body() data: any,
  ) {
    return await this.campaignService.deleteEmailAndPasskeyConfig(
      data.id,
      req.user._id.toHexString(),
      data.emailId,
      res,
      data.authKey,
    );
  }

  @Get('/getEmailsByUserId')
  async getEmailsByUserId(@Req() req: RequestWithUser) {
    const userId = req.user._id.toHexString();
    return await this.campaignService.getEmailsByUserId(userId);
  }

  @Public()
  @Post('/checkAndAutoReplyToEmails')
  async checkAndAutoReplyToEmails() {
    return await this.campaignService.fetchAllAdminUsersAndAutoReplyToEmails();
  }

  // Starts a real-time IMAP IDLE watcher for one mailbox instead of waiting for the 2-hour poll cron.
  @Public()
  @Post('/startImapIdleWatch')
  async startImapIdleWatch(@Body() body: { email: string }) {
    return await this.imapIdleWatcherService.startWatching(body.email);
  }

  @Public()
  @Post('/stopImapIdleWatch')
  async stopImapIdleWatch(@Body() body: { email: string }) {
    const stopped = this.imapIdleWatcherService.stopWatching(body.email);
    return {
      statusCode: HttpStatus.OK,
      message: stopped
        ? `Stopped watching ${body.email}`
        : `Not watching ${body.email}`,
    };
  }

  @Public()
  @Get('/imapIdleWatchStatus')
  async imapIdleWatchStatus() {
    return {
      statusCode: HttpStatus.OK,
      watching: this.imapIdleWatcherService.listWatched(),
    };
  }

  @Public()
  @Post('/unsubscribeFromCampaign')
  async unsubscribeFromCampaign(@Body() data: any, @Res() res: Response) {
    return await this.campaignService.unsubscribeFromCampaign(data?.token, res);
  }

  @Post('/addEmailAsAudience')
  async addEmailAsAudience(@Req() req: RequestWithUser, @Body() data: any) {
    const { email, websiteName, websiteUrl, campaignId, campaignName } = data;
    return await this.campaignService.addEmailAsAudience(
      email,
      websiteName,
      websiteUrl,
      campaignId,
      campaignName,
      req,
    );
  }

  @Delete('/deleteAudienceFromCampaign')
  async deleteAudienceFromCampaign(
    @Req() req: RequestWithUser,
    @Body() data: any,
  ) {
    const { campaignId, email } = data;
    return await this.campaignService.deleteAudienceFromCampaign(
      campaignId,
      email,
      req,
    );
  }

  @Get('/getCampaignAudience')
  async getCampaignAudience(
    @Query('campaignId') campaignId: string,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.getCampaignAudience(campaignId, req);
  }

  @Post('/multipleCampaignAudiences')
  async getCampaignAudiences(@Body() data: any, @Req() req: RequestWithUser) {
    return await this.campaignService.getCampaignAudiences(data, req);
  }

  @Public()
  @Post('/admin/addWarmupCount')
  async addWarmupCount(@Body() data: any) {
    return await this.campaignService.addWarmupCount(data.userId);
  }

  @Post('/addDuplicateCampaignAudience')
  async addDuplicateCampaignAudience(
    @Req() req: RequestWithUser,
    @Body() data: any,
  ) {
    return await this.campaignService.addDuplicateCampaignAudience(
      data.campaignId,
      data.oldCampaignAudiences,
      data.newCampaignAudiences,
      req,
    );
  }

  @Public()
  @Post('/startFollowUpEmails')
  async startFollowUpEmails() {
    return await this.campaignService.startFollowUps();
  }

  @Post('emailAssitance/approveDraftEmail')
  async approveEmailFromDraft(
    @Req() req: RequestWithUser,
    @Body('emails') emails: [],
  ) {
    return await this.campaignService.approveEmailsAndSend(emails, req);
  }

  @Post('emailAssistance/editDraftEmail')
  async editDraft(@Body() body: EditDraftEmailDto) {
    return await this.campaignService.editDraftEmail(body);
  }

  @Post('emailAssitance/chatSummaryForEmails')
  async getChatSummaryForEmails(
    @Body() body: EmailSummaryDto,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.chatSummaryForEmails(body.emails, req);
  }

  @Post('emailAssitance/chatSummaryForMessages')
  async getChatSummaryForMessages(
    @Body() body: ChatSummaryDto,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const summary = await this.campaignService.chatSummaryForMessages(
      body.messages,
      req,
    );
    return res.status(summary.statusCode).json(summary);
  }

  @Post('emailAssitance/rejectEmailsFromApproval')
  async rejectEmailsFromApproval(
    @Body() data: any,
    @Req() req: RequestWithUser,
  ) {
    return await this.campaignService.rejectEmailsFromApproval(
      data.draftEmailId,
      req,
    );
  }

  @Post('emailAssitance/moveEmailsToFolder')
  async moveEmailsToFolder(@Req() req: RequestWithUser, @Body() data: any) {
    const { emails, currentFolder, moveToFolder } = data;
    return await this.campaignService.moveEmailsToFolder(
      emails,
      currentFolder,
      moveToFolder,
      req,
    );
  }

  @Public()
  @Post('syncWithGmailDraft')
  async syncWithGmailDraft() {
    return await this.campaignService.syncWithGmailDraft();
  }

  @Public()
  @Post('outscrapperGoogleSearch')
  async outscrapperGoogleSearch(@Body() data: any) {
    return await this.campaignService.outscrapperGoogleSearch(
      data.query,
      data.async,
      data.pagesPerQuery,
    );
  }

  @Public()
  @Post('imap/fetchEmailsV2')
  async fetchEmailsV2(@Body() data: any) {
    return await this.campaignService.getEmailsFromImapV2(data);
  }

  @Get('leads/byZapierWebhookId')
  async getLeadsByZapierWebhookIdAndUserId(
    @Req() req: RequestWithUser,
    @Query('zapierWebhookId') zapierWebhookId: string,
  ) {
    if (!zapierWebhookId) {
      throw new Error('zapierWebhookId query parameter is required');
    }
    const userId = req.user?._id?.toHexString();
    return await this.campaignService.getLeadsByZapierWebhookIdAndUserId(
      zapierWebhookId,
      userId,
    );
  }

  @Post('/addUnsubscriptionEmail')
  async addUnsubscriptionEmail(@Body() data: any, @Req() req: RequestWithUser) {
    try {
      const userId = req.user?._id?.toHexString();
      const { email } = data;
      const result = await this.campaignService.addEmailToSuppressionList(
        email,
        userId,
      );
      return ResponseUtil.success(
        result,
        'add Email into Unsubscription List',
        HttpStatus.OK,
      );
    } catch (error) {
      return {
        success: false,
        message:
          error.message ||
          error.response ||
          error.response?.data?.message ||
          'Internal Server Error',
        statusCode:
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.response?.data || error,
      };
    }
  }

  @Get('/getUnsubscriptionEmails')
  async getUnsubscriptionEmails(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string,
    @Req() req: RequestWithUser,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.campaignService.getSuppressionEmailList(
        Number(page),
        Number(limit),
        search,
        userId,
      );
      return ResponseUtil.success(
        result,
        'Get the Subscription List',
        HttpStatus.OK,
      );
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get the Unsubscription List',
        statusCode:
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.response?.data || error,
      };
    }
  }

  @Delete('/deleteUnsubscriptionEmail/:email')
  async deleteUnsubscriptionEmail(
    @Req() req: RequestWithUser,
    @Param('email') email: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.campaignService.removeEmailFromSuppressionList(
        email,
        userId,
      );
      return ResponseUtil.success(
        result,
        'Remove Email from Unsubscription List',
        HttpStatus.OK,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Error removing email from Unsubscription List',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
