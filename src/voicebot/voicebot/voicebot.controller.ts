import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  HttpException,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { Response } from 'express';
import { VoicebotService } from './voicebot.service';
import { ResponseUtil } from '../utils/response.util';
import { ApiResponse } from '../interfaces/api-response.interface';
import { RequestWithUser } from '../../common/@types/nest.types';
import { CreatePhoneNumberDTO } from '../dto/create-phonenumber';
import { KeyVerificationDTO } from '../dto/createtool.dto';
import { VapiService } from './vapi.service';
import { Public } from '../../auth/guards/public.guard';
import {
  ChangeMeetingStatus,
  CreateVoicebotCampaignDTO,
  TargetLeadsDTO,
  UpdateVoicebotCampaignDTO,
  VoicebotCampaignScrapeDTO,
} from '../dto/create-Voicebot-campaign';
import { FileInterceptor } from '@nestjs/platform-express';
import * as papaparse from 'papaparse';
import { ObjectId } from 'mongodb';
import { validateLeads } from '../utils/ValidatorLeads';

@Controller('voicebot')
export class VoicebotController {
  constructor(
    private readonly voicebotService: VoicebotService,
    private readonly vapiService: VapiService,
  ) {}

  @Post('verify-vapi-key')
  async verifyVAPIKey(
    @Req() req: RequestWithUser,
    @Body() body: KeyVerificationDTO,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const email = req.user.email;
      const result = await this.voicebotService.verifyVAPIApiKey(
        body,
        userId,
        email,
      );
      return ResponseUtil.success(result, 'VAPI API key verified successfully');
    } catch (error) {
      return ResponseUtil.error(
        `Unable to verify the VAPI API key. Please check your credentials and try again.`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('get-twilio-phone-number')
  async getTwilioPhoneNumber(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.getTwilioNumbers(userId);
      return ResponseUtil.success(
        result,
        'Twilio phone number fetched successfully',
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch Twilio phone numbers. Please try again',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('get-assistant')
  async getAssistant(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.getAssistant(userId);
      return ResponseUtil.success(result, 'Assistant fetched successfully');
    } catch (error) {
      return ResponseUtil.error(
        `Unable to get assistant. Please try again.`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('add-phone-number')
  async attchPhoneNumberInAssistant(
    @Req() req: RequestWithUser,
    @Body() body: CreatePhoneNumberDTO,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.registerPhoneNumber(
        userId,
        body,
      );
      return ResponseUtil.success(result, 'Phone Number attached successfully');
    } catch (error) {
      ResponseUtil.error(
        error.message ||
          'Unable to register your phone number. Phone Number might already be registered with another account.',
        HttpStatus.CONFLICT,
        error,
      );
    }
  }

  @Get('fetch-phone-number')
  async fetchPhoneNumber(
    @Req() req: RequestWithUser,
    @Query('allNumbers') isAllNumber: boolean,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.fetchPhoneNumber(
        userId,
        isAllNumber,
      );
      return ResponseUtil.success(
        result,
        'Phone number fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      ResponseUtil.error(
        'Unable to fetch phone number. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('fetch-config-key')
  async fetchConfigKey(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.fetchConfigKey(userId);
      return ResponseUtil.success(
        result,
        'Config key fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      ResponseUtil.error(
        `Unable to fetch config key, Please try again.`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create-voice-bot-campaign')
  async CreateVoiceBotCampaign(
    @Req() req: RequestWithUser,
    @Body() body: CreateVoicebotCampaignDTO,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const email = req.user.email;
      // Save campaign data
      const campaign = await this.voicebotService.createVoiceBotCampaign(
        userId,
        email,
        body,
      );

      return ResponseUtil.success(
        campaign,
        'Campaign created successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to create campaign. Please check your input and try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('check-document-exists/:projectId')
  async checkDocumentExists(@Param('projectId') projectId: string) {
    try {
      if (!ObjectId.isValid(projectId) || !projectId)
        throw new BadRequestException('Invalid project ID');
      const document = await this.voicebotService.checkDocumentExistence(
        projectId,
      );
      return ResponseUtil.success(
        { documentExists: document },
        'Document fetch successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        `Unable to check document existence. Please try again.`,
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('check-campaign-name')
  async checkCampaignName(
    @Req() req: RequestWithUser,
    @Body() body: { campaignName: string },
  ) {
    try {
      const userId = req.user._id.toHexString();
      const existingCampaign = await this.voicebotService.checkCampaignName(
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

  @Get('get-all-campaigns')
  async getAllCampaigns(
    @Req() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.getAllCampaigns(
        userId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        result,
        'Campaign fetch successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        `Unable to get campaigns list. Please try again.`,
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('campaign-details/:campaignId')
  async getCampaignDetails(
    @Req() req: RequestWithUser,
    @Param('campaignId') campaignId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      if (!ObjectId.isValid(campaignId) || !campaignId)
        throw new BadRequestException('Invalid campaign ID');

      const campaignDetails = await this.voicebotService.getCampaignDetails(
        userId,
        campaignId,
      );
      return ResponseUtil.success(
        campaignDetails,
        'Campaign details fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        `Unable to fetch campaign details. Please try again.`,
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('campaign-recordings')
  async getCampaignRecordings(
    @Req() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const recordings = await this.voicebotService.getCampaignRecordings(
        userId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        recordings,
        'Campaign recordings fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch campaign recordings. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('campaign-phone-recordings/:campaignId')
  async getCampaignPhoneRecordings(
    @Req() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const campaignId = req.params.campaignId;
      if (!ObjectId.isValid(campaignId) || !campaignId)
        throw new BadRequestException('Invalid campaign ID');
      const recordings = await this.voicebotService.getCampaignPhoneRecordings(
        userId,
        campaignId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        recordings,
        'Campaign phone recordings fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        `Unable to fetch campaign phone recordings. Please try again.`,
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('campaign-recording/:phoneNumber')
  async getCallDetails(
    @Req() req: RequestWithUser,
    @Param('phoneNumber') phoneNumber: string,
  ) {
    try {
      if (!phoneNumber)
        throw new BadRequestException('Phone number is required');

      const userId = req.user._id.toHexString();
      const data = await this.voicebotService.getCallDetails(
        userId,
        phoneNumber,
      );
      return ResponseUtil.success(
        data,
        'Campaign recording fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch call details. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('parse-csv-data')
  @UseInterceptors(FileInterceptor('file'))
  async parseCsvData(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse<any>> {
    try {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

      if (!file) {
        throw new BadRequestException('File not found');
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File size exceeds the 10 MB limit');
      }

      const fileContent = file.buffer.toString('utf-8');

      const parsedData = papaparse.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsedData.errors.length > 0) {
        return ResponseUtil.error(
          'Invalid CSV format, Please send the Csv format data',
          HttpStatus.BAD_REQUEST,
        );
      }

      const REQUIRED_HEADERS = [
        'countryCode',
        'phoneNumber',
        'websiteUrl',
        'email',
        'companyName',
      ];

      const actualHeaders = Object.values(parsedData.meta.fields || {});
      const missingHeaders = REQUIRED_HEADERS.filter(
        (field) => !actualHeaders.includes(field),
      );

      if (missingHeaders.length > 0) {
        return ResponseUtil.error(
          `Missing required fields: ${missingHeaders.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const data = validateLeads(parsedData.data, { voicebotMode: true });
      // Final response
      return ResponseUtil.success(
        data,
        'CSV parsed and validated',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to parse CSV data. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('get-leads')
  async getLeads(
    @Req() req: RequestWithUser,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
    @Query('export') exportData?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isMeetingBookedOnGoogleMeet') isMeetingBookedOnGoogleMeet?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.getLeads(
        userId,
        page,
        limit,
        search,
        isMeetingBookedOnGoogleMeet,
        startDate,
        endDate,
        Boolean(exportData),
      );
      return ResponseUtil.success(
        result,
        'Leads fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      ResponseUtil.error(
        'Unable to fetch leads. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Unable to fetch leads. Please try again.',
      );
    }
  }

  @Get('get-base-prompt')
  async getBasePrompt(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.voicebotService.getBasePrompt(userId);
      return ResponseUtil.success(
        { prompt: data },
        'Base prompt fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch base prompt. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // VAPI web hook
  @HttpCode(HttpStatus.OK)
  @Post('/vapi-webhook')
  @Public()
  async handleWebhook(@Req() req: any, @Body() body: any) {
    const { message } = body;
    let userId = null;
    if (req.headers && req.headers.userid) {
      userId = req.headers.userid;
    }
    try {
      return this.vapiService.vapiWebHook(
        message,
        userId,
        req?.headers?.inboundbotid ?? null,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to handle webhook. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/dashboard')
  async Dashboard(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toHexString();
      return await this.voicebotService.Dashboard(userId);
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch dashboard data. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/check-project-and-number')
  async checkProjectAndNumber(@Req() req: RequestWithUser) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.checkProjectAndNumber(userId);
      return ResponseUtil.success(
        result,
        'Project, number and email details fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to check project and number. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/get-calendar-data')
  async getCalenderData(
    @Req() req: RequestWithUser,
    @Query('date') date?: string,
    @Query('month') month?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      return this.voicebotService.getCalenderData(userId, date, month);
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch calendar data. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('change-meeting-status')
  async changeMeetingStatus(@Body() body: ChangeMeetingStatus) {
    try {
      const data = await this.voicebotService.changeMeetingStatus(body);
      return ResponseUtil.success(
        { prompt: data },
        'Status changed successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to change meeting status. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/data-scrapping-through-gmb')
  async dataScrappingThroughGMB(
    @Req() req: RequestWithUser,
    @Body() body: VoicebotCampaignScrapeDTO,
  ) {
    try {
      // const { user } = req;
      // const data = await this.voicebotService.dataScrappingFromGMB(user, body);
      // if (data.length <= 0) {
      //   return ResponseUtil.success(
      //     data,
      //     'Scrapped successfully but No data found',
      //     HttpStatus.NO_CONTENT,
      //   );
      // }
      const { user } = req;

      // save job
      const jobId = await this.voicebotService.insertScrapJob(user, body);

      return ResponseUtil.success({ jobId }, 'Scraping started', HttpStatus.OK);
    } catch (error) {
      return ResponseUtil.error(
        'Unable to start scraping. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/scrape-result/:jobId')
  async getScrapeResult(
    @Req() req: RequestWithUser,
    @Param('jobId') jobId: string,
  ) {
    const userId = req.user._id.toHexString();
    const job = await this.voicebotService.getScrapeResult(jobId, userId);

    return ResponseUtil.success(job, 'Job status', HttpStatus.OK);
  }

  @Patch('update-campaign')
  async updateCampaign(
    @Req() req: RequestWithUser,
    @Body() body: UpdateVoicebotCampaignDTO,
  ) {
    try {
      const { campaignName, _id: campaignId } = body;
      const userId = req.user._id.toHexString();

      if (!ObjectId.isValid(campaignId) || !campaignId) {
        throw new BadRequestException('Invalid campaign ID');
      }

      if (!campaignName || campaignName.trim() === '') {
        throw new BadRequestException('Campaign name is required');
      }

      const updatedCampaign = await this.voicebotService.updateCampaign(
        userId,
        req.user.email,
        body,
      );

      return ResponseUtil.success(
        updatedCampaign,
        'Campaign updated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to update campaign. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('delete-campaign/:campaignId')
  async deleteCampaign(
    @Req() req: RequestWithUser,
    @Param('campaignId') campaignId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();

      if (!ObjectId.isValid(campaignId) || !campaignId) {
        throw new BadRequestException('Invalid campaign ID');
      }

      const result = await this.voicebotService.deleteCampaign(
        userId,
        campaignId,
      );

      return ResponseUtil.success(
        result,
        'Campaign deleted successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to delete campaign. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Pause and Resume Campaign
  @Patch('pause-campaign/:campaignId')
  async pauseCampaign(
    @Req() req: RequestWithUser,
    @Param('campaignId') campaignId: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.pauseCampaign(
        userId,
        campaignId,
      );
      return ResponseUtil.success(
        result,
        'Campaign paused successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to pause campaign. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('resume-campaign/:campaignId')
  async resumeCampaign(
    @Req() req: RequestWithUser,
    @Param('campaignId') campaignId: string,
    @Body('scheduleDate') scheduleDate: string,
    @Body('scheduleTime') scheduleTime: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const email = req.user.email;
      const result = await this.voicebotService.resumeCampaign(
        userId,
        email,
        campaignId,
        scheduleDate,
        scheduleTime,
      );
      return ResponseUtil.success(
        result,
        'Campaign resumed successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to resume campaign. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('campaign-all-recordings/:campaignId')
  async getRecordingsByCampaignId(
    @Req() req: RequestWithUser,
    @Param('campaignId') campaignId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      if (!ObjectId.isValid(campaignId) || !campaignId) {
        throw new BadRequestException('Invalid campaign ID');
      }
      const recordings = await this.voicebotService.getRecordingsByCampaignId(
        userId,
        campaignId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        recordings,
        'Recordings fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch recordings. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('inbound-call-records')
  async getInboundCallRecords(
    @Req() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const records = await this.voicebotService.getInboundCallRecords(
        userId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        records,
        'Inbound call records fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch inbound call records. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/get-all-suppressed-numbers')
  async getAllSuppressedNumbers(
    @Req() req: RequestWithUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.getAllSuppressedNumbers(
        userId,
        search,
        page,
        limit,
      );
      return ResponseUtil.success(
        result,
        'Suppressed numbers fetched successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to fetch suppressed numbers. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('/remove-suppressed-number/:number')
  async deleteSuppressedNumber(
    @Req() req: RequestWithUser,
    @Param('number') number: string,
  ): Promise<ApiResponse<any>> {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.voicebotService.deleteSuppressedNumber(
        userId,
        number,
      );
      return ResponseUtil.success(
        result,
        'Suppressed number deleted successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        'Unable to remove suppressed number. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('/merge-leads')
  async mergeLeadsFromMultipleSources(
    @Req() req: RequestWithUser,
    @Body('targetLeads') targetLeads: TargetLeadsDTO,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.voicebotService.mergeLeadsFromMultipleSources(
        targetLeads,
        userId,
      );
      return ResponseUtil.success(
        data,
        'Leads merged and validated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Unable to merge leads. Please try again.',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('stream-recording/:recordingId')
  async streamRecording(
    @Param('recordingId') recordingId: string,
    @Res() res: Response,
  ) {
    try {
      const { redirectUrl } = await this.voicebotService.streamRecording(
        recordingId,
      );
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.redirect(302, redirectUrl);
    } catch (error) {
      res
        .status(error.status || error.statusCode || 500)
        .json({ message: error.message || 'Failed to get recording URL' });
    }
  }
}
