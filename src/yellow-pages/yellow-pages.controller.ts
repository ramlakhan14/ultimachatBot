import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithUser } from '../common/@types/nest.types';
import { Roles } from 'src/auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
import { YellowPagesSearchDto } from './yellow-pages.dto';
import { YellowPagesService } from './yellow-pages.service';

@Controller('yellow-pages')
export class YellowPagesController {
  constructor(private readonly yellowPagesService: YellowPagesService) {}

  /**
   * Start scrape job returns jobId immediately
   * POST /yellow-pages/scrape
   * Body: { query: "dentist", location: "New York, NY", limit: 20, campaignId: "..." }
   * Response: { statusCode: 200, message: "Scraping started", data: { jobId: "..." } }
   */
  @Roles(Role.Admin, Role.User)
  @Post('scrape')
  async startScrape(
    @Req() req: RequestWithUser,
    @Body() dto: YellowPagesSearchDto,
    @Res() res: Response,
  ) {
    const userId = req.user._id.toHexString();
    const jobId = await this.yellowPagesService.startScrapeJob(dto, userId);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'Scraping started',
      data: { jobId },
    });
  }

  /**
   * Poll job result
   * GET /yellow-pages/scrape-result/:jobId
   * Response:
   * PROCESSING: { status: 'PROCESSING', message: '...' }
   * COMPLETED: { status: 'COMPLETED', result: { audiences: [...], count: N } }
   *  FAILED: { status: 'FAILED', message: '...' }
   */
  @Roles(Role.Admin, Role.User)
  @Get('scrape-result/:jobId')
  async getScrapeResult(
    @Req() req: RequestWithUser,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const userId = req.user._id.toHexString();
    const result = await this.yellowPagesService.getJobResult(jobId, userId);

    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: `Data Scrapped Successfully`,
      ...result,
    });
  }
}
