import {
  Controller,
  Post,
  Body,
  Query,
  Res,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { LinkedinScrapperService } from './linkedin-scrapper.service';
import { config } from 'dotenv';
import { Roles } from '../auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
config();

@Controller('linkedin-scrapper')
export class LinkedinScrapperController {
  constructor(
    private readonly linkedinScrapperService: LinkedinScrapperService,
  ) {}

  @Post('emails')
  async scrapeLinkedinEmails(
    @Req() req: any,
    @Body('keywords') keywords: string[],
    @Body('location') location: string,
    @Body('customDomains') customDomains: string[],
    @Body('platform') platform: string,
    @Body('campaignId') campaignId: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : undefined;
    const result = await this.linkedinScrapperService.scrapeLinkedinEmails(
      req.user._id.toHexString(),
      campaignId,
      keywords,
      location,
      customDomains,
      platform,
      parsedLimit,
    );
    return res.status(result.statusCode || HttpStatus.OK).json(result);
  }

  @Post('phone-numbers')
  async scrapeLinkedinPhoneNumbers(
    @Req() req: any,
    @Body('keywords') keywords: string[],
    @Body('platform') platform: string,
    @Body('country') country: string,
    @Body('campaignId') campaignId: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : undefined;
    const result =
      await this.linkedinScrapperService.scrapeLinkedinPhoneNumbers(
        req.user._id.toHexString(),
        req.body.campaignId,
        keywords,
        platform,
        country,
        parsedLimit,
      );
    return res.status(result.statusCode || HttpStatus.OK).json(result);
  }

  // Admin scrape-lead variant - returns GMB-shaped candidates for review via
  // /project/save-scrapped-data. Does NOT write to campaignAudience/targetAudiences.
  @Roles(Role.Admin)
  @Post('admin/emails')
  async scrapeLinkedinEmailsForAdmin(
    @Body('keywords') keywords: string[],
    @Body('location') location: string,
    @Body('customDomains') customDomains: string[],
    @Body('platform') platform: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : undefined;
    const data =
      await this.linkedinScrapperService.scrapeLinkedinEmailsForAdmin(
        keywords,
        location,
        customDomains,
        platform,
        parsedLimit,
      );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'LinkedIn email scraping completed successfully.',
      data,
    });
  }

  @Roles(Role.Admin)
  @Post('admin/phone-numbers')
  async scrapeLinkedinPhoneNumbersForAdmin(
    @Body('keywords') keywords: string[],
    @Body('platform') platform: string,
    @Body('country') country: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : undefined;
    const data =
      await this.linkedinScrapperService.scrapeLinkedinPhoneNumbersForAdmin(
        keywords,
        platform,
        country,
        parsedLimit,
      );
    return res.status(HttpStatus.OK).json({
      statusCode: HttpStatus.OK,
      message: 'LinkedIn phone number scraping completed successfully.',
      data,
    });
  }
}
