import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  HttpStatus,
  Param,
  HttpCode,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UltimaReviewsService } from './ultima-reviews.service';
import {
  CreateUltimaReviewCampaignDto,
  UltimaReviewCampaignScrapeDTO,
} from './dto/create-ultima-review.dto';
import { Roles } from '../auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
import { RequestWithUser } from '../common/@types/nest.types';
import { ResponseUtil } from '../voicebot/utils/response.util';
import { ObjectId } from 'mongodb';
import { UltimaReviewLeadStatus } from './schema/ultima.reviews.leads';
import { isEmail } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiResponse } from '../voicebot/interfaces/api-response.interface';
import { TargetLeadsDto } from './dto/target.leads.dto';
import { TargetLeadsDTO } from '../voicebot/dto/create-Voicebot-campaign';

@Controller('ultima-reviews')
// @Roles(Role.Admin)
export class UltimaReviewsController {
  constructor(private readonly ultimaReviewsService: UltimaReviewsService) {}

  @Post('create-review-campaign')
  async CreateUltimaReviewCampaign(
    @Req() req: RequestWithUser,
    @Body()
    CreateUltimaReviewCampaignDto: CreateUltimaReviewCampaignDto,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.ultimaReviewsService.CreateUltimaReviewCampaign(
        userId,
        CreateUltimaReviewCampaignDto,
      );
      return ResponseUtil.success(
        result,
        'Leads fetched successfully',
        HttpStatus.CREATED,
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

  @Get('all-review-campaigns')
  async getAllUltimaCampaign(
    @Req() req: RequestWithUser,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.ultimaReviewsService.getAllUltimaCampaign(
        userId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        result,
        'Campaigns fetched successfully',
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

  @Get('all-leads')
  async getAllLeads(
    @Req() req: RequestWithUser,
    @Query('campaignId') campaignId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.ultimaReviewsService.getAllUltimaLeads(
        userId,
        page,
        limit,
        search,
        campaignId,
      );
      return ResponseUtil.success(
        result,
        'Campaigns fetched successfully',
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

  @Get('get-manual-leads')
  async getManualLeads(
    @Req() req: RequestWithUser,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const result = await this.ultimaReviewsService.getManualLeads(
        userId,
        page,
        limit,
        search,
      );
      return ResponseUtil.success(
        result,
        'Leads fetched successfully',
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

  @Post('update-lead-status')
  async updateLeadStatus(
    @Req() req: RequestWithUser,
    @Body('email') email: string,
    @Body('LeadStatus') LeadStatus: UltimaReviewLeadStatus,
  ) {
    try {
      if (!email) {
        return ResponseUtil.error('email is required', HttpStatus.BAD_REQUEST);
      }

      if (!LeadStatus) {
        return ResponseUtil.error('Status is required', HttpStatus.BAD_REQUEST);
      }

      const userId = req.user._id.toHexString();
      const result = await this.ultimaReviewsService.updateLeadStatus(
        userId,
        email,
        LeadStatus,
      );
      return ResponseUtil.success(
        result,
        'Lead status updated successfully',
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

  @Post('create-lead')
  async createLead(@Req() req: RequestWithUser, @Body() body: TargetLeadsDto) {
    try {
      if (!isEmail(body.email) || !body.email) {
        return ResponseUtil.error('Invalid email', HttpStatus.BAD_REQUEST);
      }

      if (!body.businessName) {
        return ResponseUtil.error(
          'Business name is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const userId = req.user._id.toHexString();
      const result = await this.ultimaReviewsService.createUltimaLeads(
        userId,
        body,
      );
      return ResponseUtil.success(
        result,
        'Lead created successfully',
        HttpStatus.CREATED,
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

  @Post('/data-scrapping-through-gmb')
  async dataScrappingThroughGMB(
    @Req() req: RequestWithUser,
    @Body() body: UltimaReviewCampaignScrapeDTO,
  ) {
    try {
      const { user } = req;
      const data = await this.ultimaReviewsService.dataScrappingFromGMB(
        user,
        body,
      );
      return ResponseUtil.success(
        data,
        'Scrapped data successfully',
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

  @HttpCode(HttpStatus.OK)
  @Post('parse-lead-data')
  @UseInterceptors(FileInterceptor('file'))
  async parseLeadData(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse<any>> {
    try {
      if (!file) {
        return ResponseUtil.error('File is required', HttpStatus.BAD_REQUEST);
      }
      const data = await this.ultimaReviewsService.parseUltimaLeads(file);
      return ResponseUtil.success(
        data,
        'CSV data parsed successfully',
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

  @HttpCode(HttpStatus.OK)
  @Post('/merge-leads')
  async mergeLeadsFromMultipleSources(
    @Body('targetLeads') targetLeads: TargetLeadsDTO,
  ) {
    try {
      const data =
        await this.ultimaReviewsService.mergeLeadsFromMultipleSources(
          targetLeads,
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
}
