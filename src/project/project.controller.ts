import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { RequestWithUser } from '../common/@types/nest.types';
import { Roles } from 'src/auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
import { ProjectService } from './project.service';
import { ProjectWebsiteDataDto, ScrapeDTO } from './project.dto';
import { Response } from 'express';
import { Public } from '../auth/guards/public.guard';

@Controller('project')
export class ProjectsController {
  private readonly logger = new Logger('ProjectsController');

  constructor(private projectService: ProjectService) {}

  @Get('/all_knowledgebases')
  @Roles(Role.Admin)
  async getAllKnowlwdgeBasesListForAdmin(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminOnly') adminOnly?: string,
    @Query('search') search?: string,
    @Query('isChatbotEnabled') isChatbotEnabled?: string,
    @Query('isScrapedLeadProject') isScrapedLeadProject?: string,
  ) {
    const { user } = req;

    let pageNumber: number;
    let limitNumber: number;

    if (page && limit) {
      pageNumber = Number(page);
      limitNumber = Number(limit);
    } else {
      pageNumber = 1;
      limitNumber = 10000;
    }

    return this.projectService.listAllKnowledgebasesForAdminV2(
      user,
      pageNumber,
      limitNumber,
      adminOnly === 'true',
      search,
      isChatbotEnabled === undefined ? undefined : isChatbotEnabled === 'true',
      isScrapedLeadProject,
    );
  }

  @Get('all_knowledgebases_chatbot_enabled')
  async listChatbotEnabledKnowledgebases(
    @Req() req: RequestWithUser,
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('adminOnly') adminOnly: string,
    @Query('search') search?: string,
    @Query('isScrapedLeadProject') isScrapedLeadProject?: string,
  ) {
    const { user } = req;
    return this.projectService.listChatbotEnabledKnowledgebasesForAdmin(
      user,
      Number(page),
      Number(limit),
      adminOnly === 'true',
      search,
      isScrapedLeadProject,
    );
  }

  @Post('/inviteUsers')
  @Roles(Role.Admin)
  async inviteUsersFromScrapping(
    @Req() req: RequestWithUser,
    @Body() data: ScrapeDTO,
  ) {
    const { user } = req;
    const jobId = await this.projectService.dataScrappingAndInvoking(
      user,
      data,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Scraping started',
      data: { jobId },
    };
  }

  @Get('/scrape-result/:jobId')
  async getScrapeResult(
    @Req() req: RequestWithUser,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const userId = req.user._id.toHexString();
    const job = await this.projectService.getScrapeResult(jobId, userId);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: job,
      message: `Data Scrapped Successfully`,
    });
  }

  @Post('save-scrapped-data')
  async saveScrappedData(@Req() req: RequestWithUser, @Body() data: any) {
    const { user } = req;
    const result = await this.projectService.saveScrappedData(user, data);
    return {
      statusCode: HttpStatus.OK,
      message: 'Scrapped Data Saved Successfully',
      // data: result,
    };
  }

  @Get('/inviteUsersDetails')
  async getInviteUsers(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Query('page_size') pageSize?: number,
    @Query('page') page?: number,
    @Query('search') searchQuery?: string,
  ) {
    const { user } = req;
    const result = await this.projectService.getInviteUsersDetails(
      user,
      page,
      pageSize || 10,
      searchQuery,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'InviteUser Data Fetched Successfully',
      data: result,
    });
  }

  // @Public()
  // @Get('/categories')
  // async getCategories(@Res() res: Response) {
  //   const responseData = await this.projectService.getOutscrapperCategories();
  //   return res.status(HttpStatus.OK).json({
  //     statusCode: HttpStatus.OK,
  //     message: 'Data Scrapped Successfully',
  //     data: responseData,
  //   });
  // }

  @Roles(Role.Admin)
  @Post('/:id/ScrapLeadsReinvite')
  async InviteUsersMail(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { user } = req;
    await this.projectService.reinviteScrappedUsers(id, user);
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Reinvite Send Successfully',
    });
  }

  @Roles(Role.Admin)
  @Get('/:id/ScrapUserProfile')
  async ScrapUserProfile(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { user } = req;
    const profileData = await this.projectService.scrappedUsersProfileData(
      id,
      user,
    );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      data: profileData,
      message: ' Profile Data Fetched Successfully',
    });
  }

  // crawl api for particular vakmangids project
  @Public()
  @Post('/doCrawl')
  async createSingleChatbot(@Body() data: ProjectWebsiteDataDto) {
    return await this.projectService.createChatbotForVakmangids(data);
  }

  @Public()
  @Post('/getUrlKbId')
  async getVakmangidsKbId(@Body() data: ProjectWebsiteDataDto) {
    return await this.projectService.getVakmangidsUrlKbId(data);
  }

  @Public()
  @Get('/getCategories')
  async getVakmangidsCategories() {
    return await this.projectService.getCategoriesForVakmangids();
  }

  @Public()
  @Get('/getPostalCode')
  async getPostalCodeFromCity(
    @Query('country') countryName: string,
  ): Promise<any> {
    try {
      const response =
        this.projectService.getAllCitiesOnCountryCode(countryName);
      return response;
    } catch (error: any) {
      this.logger.error('Error fetching postal code:', error);
      throw new HttpException(
        error.message || 'Failed to fetch postal codes',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
