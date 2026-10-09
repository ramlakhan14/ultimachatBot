import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardData() {
    try {
      return await this.dashboardService.getDashboardData();
    } catch (error) {
      throw error;
    }
  }
}
