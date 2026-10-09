import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { RequestWithUser } from '../common/@types/nest.types';
import { AdminService } from './admin.service';
import { Roles } from '../auth/guards/role.enum';
import { Role } from '../auth/types/role.enum';
import { FacebookScrapeRequestDto } from '../facebook-scrapper/dto/scrape-request.dto';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  /* Apis for ADMIN */

  @Roles(Role.Admin)
  @Get('/allProfiles')
  async getAllProfiles(
    @Req() req: RequestWithUser,
    @Query('page_size') pageSize?: number,
    @Query('page') page?: number,
    @Query('search') searchQuery?: string,
  ) {
    const { user } = req;
    // if (isNaN(pageSize) || isNaN(page)) {
    //   throw new HttpException(
    //     'Invalid page size or page number',
    //     HttpStatus.EXPECTATION_FAILED,
    //   );
    // }
    return this.adminService.getAllUserProfiles(
      user,
      page,
      pageSize || 10,
      searchQuery,
    );
  }

  @Roles(Role.Admin)
  @Get('/:id/profilePreview')
  async getUserProfileForAdmin(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Roles(Role.Admin)
  @Post('/:id/deleteUser')
  async DeactivateUser(@Param('id') id: string) {
    return this.adminService.deleteUserByAdmin(id);
  }

  // @Roles(Role.Admin)
  @Get('/deleteAllCollections')
  async deleteAllCollections() {
    return this.adminService.deleteAllCollections();
  }

  // ── Scraping endpoints ──────────────────────────────────────────────────────

  @Roles(Role.Admin)
  @Post('/scrape/facebook')
  async scrapeFacebook(
    @Req() req: RequestWithUser,
    @Body() body: FacebookScrapeRequestDto,
  ) {
    return this.adminService.insertFacebookScrapJob(req.user, body);
  }

  @Roles(Role.Admin)
  @Post('/scrape/linkedin')
  async scrapeLinkedin(
    @Req() req: RequestWithUser,
    @Body() body: { query: string; resultsLimit?: number; country?: string },
  ) {
    return this.adminService.insertLinkedinScrapJob(req.user, body);
  }

  @Roles(Role.Admin)
  @Get('/scrape-result/:jobId')
  async getScrapeResult(
    @Req() req: RequestWithUser,
    @Param('jobId') jobId: string,
  ) {
    return this.adminService.getScrapeResult(jobId, req.user._id.toHexString());
  }
}
