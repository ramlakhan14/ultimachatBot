import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common';
import { Roles } from '../../auth/guards/role.enum';
import { Role } from '../../auth/types/role.enum';
import { AdminService } from '../admin.service';
import { ResponseUtil } from '../../utils/response.util';
import { EditThresholdEmailDto } from '../dto/threshold.email';

@Roles(Role.Admin)
@Controller('admin-setting')
export class SettingController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/threshold-email-setting')
  async getThresholdEmailSetting() {
    try {
      const result = await this.adminService.getAllThresholdEmailSettings();
      return ResponseUtil.success(
        result,
        'Threshold email settings fetched successfully',
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

  @Patch('/threshold-email-setting')
  async updateThresholdEmailSetting(@Body() body: EditThresholdEmailDto) {
    try {
      const result = await this.adminService.updateThresholdEmailSettings(body);
      return ResponseUtil.success(
        result,
        'Threshold email settings updated successfully',
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
