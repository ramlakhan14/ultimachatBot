import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { FacebookScrapperService } from './facebook-scrapper.service';
import {
  FacebookScrapeRequestDto,
  ScrapeRequestDto,
} from './dto/scrape-request.dto';
import { RequestWithUser } from '../common/@types/nest.types';
import { Roles } from '../auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';

@Controller('facebook-scrapper')
export class FacebookScrapperController {
  private readonly logger = new Logger('FacebookScrapperController');

  constructor(
    private readonly facebookScrapperService: FacebookScrapperService,
  ) {}

  // Admin scrape-lead variant - returns GMB-shaped candidates for review via
  // /project/save-scrapped-data. Does NOT write to campaignAudience.
  @Roles(Role.Admin)
  @Post('admin/extractLeads')
  async extractLeadsForAdmin(
    @Body() body: { query: string; limit?: number },
    @Req() req: any,
    @Res() res: any,
  ) {
    try {
      const { query, limit } = body;
      const data = await this.facebookScrapperService.extractLeadsForAdmin(
        process.env.OUTSCRAPPER_AUTH_KEY,
        query,
        limit,
      );
      return res.status(200).json({
        status: true,
        message: 'Leads extracted successfully',
        data,
      });
    } catch (error) {
      this.logger.error('Error in extractLeadsForAdmin:', error);
      return res.status(500).json({
        status: false,
        message: 'Error extracting leads',
        error: error.message,
      });
    }
  }

  @Post('extractAndSaveContactInfo')
  async extractAndSaveContactInfo(
    @Body() body: { query: string; campaignId?: string; limit?: number },
    @Req() req: any,
    @Res() res: any,
  ) {
    try {
      const { query, campaignId, limit } = body;
      const results =
        await this.facebookScrapperService.extractAndSaveContactInfo(
          process.env.OUTSCRAPPER_AUTH_KEY,
          query,
          req.user._id.toHexString(),
          campaignId,
          limit,
        );
      return res.status(200).json({
        status: true,
        message: 'Contact info extracted and saved successfully',
        data: results,
      });
    } catch (error) {
      this.logger.error('Error in extractAndSaveContactInfo:', error);
      return res.status(500).json({
        status: false,
        message: 'Error extracting and saving contact info',
        error: error.message,
      });
    }
  }

  @Post('linkedin-scrape')
  async runScraper(
    @Req() req: RequestWithUser,
    @Body() body: ScrapeRequestDto,
    @Res() res: any,
  ) {
    try {
      const userId = req.user._id.toHexString();
      const data = await this.facebookScrapperService.linkedinScrape(
        body,
        userId,
      );
      return res.status(200).json({
        status: true,
        message: 'Users info extracted successfully',
        ...data,
      });
    } catch (error) {
      return res
        .status(
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        )
        .json({
          status: false,
          message:
            error?.response?.data?.error?.message ||
            error?.message ||
            error?.response ||
            error?.response?.data?.message ||
            'Internal Server Error',
        });
    }
  }

  @Post('fb-scrape')
  async facebookScrape(
    @Req() req: RequestWithUser,
    @Body() body: FacebookScrapeRequestDto,
    @Res() res: any,
  ) {
    try {
      const data = await this.facebookScrapperService.facebookScrape(
        body,
        req.user._id.toHexString(),
      );
      return res.status(200).json({
        status: true,
        message: 'Facebook scrape completed successfully',
        ...data,
      });
    } catch (error) {
      this.logger.error('Error in facebookScrape:', error);
      return res
        .status(
          error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        )
        .json({
          status: false,
          message:
            error?.response?.data?.error?.message ||
            error?.message ||
            error?.response ||
            error?.response?.data?.message ||
            'Internal Server Error',
        });
    }
  }
}
