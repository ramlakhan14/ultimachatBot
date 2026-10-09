import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('/getDashboardData')
  async getDashboardData(
    @Req() req: any,
    @Res() res: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('leadType') leadType?: string,
    @Query('knowledgebaseId') knowledgebaseId?: string,
  ) {
    const data = await this.dashboardService.getDashboardDataV2(
      req,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
      leadType,
      knowledgebaseId,
    );
    return res.status(data.status).json(data);
  }

  @Get('/getAllLeads')
  async getAllLeads(
    @Req() req: any,
    @Res() res: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('leadType') leadType?: string,
    @Query('search') search?: string,
    @Query('knowledgebaseId') knowledgebaseId?: string,
    @Query('isMeetingBookedOnGoogleMeet') isMeetingBookedOnGoogleMeet?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('export') exportData?: string,
  ) {
    const data = await this.dashboardService.getAllLeadsV2(
      req,
      page,
      limit,
      leadType,
      search,
      knowledgebaseId,
      isMeetingBookedOnGoogleMeet,
      startDate,
      endDate,
      Boolean(exportData),
    );
    return res.status(data.status).json(data);
  }
}
