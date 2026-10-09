import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import { RequestWithUser } from '../@types/nest.types';
import { Role } from '../../auth/types/role.enum';
import { Roles } from '../../auth/guards/role.enum';
import { OpenAiUsageService } from './openai-usage.service';
import { ResponseUtil } from '../../utils/response.util';

@Controller('openai-usage')
export class OpenAiUsageController {
  constructor(private readonly openAiUsageService: OpenAiUsageService) {}

  /**
   * GET /openai-usage/daily?date=2026-07-24
   * Admin can pass ?userId=xxx to query any user.
   * Regular users always see their own data.
   */
  @Get('/daily')
  async getDailySummary(
    @Req() req: RequestWithUser,
    @Query('date') date?: string,
    @Query('userId') queryUserId?: string,
  ) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const targetDate = date ?? today;
      const userId = this.resolveUserId(req, queryUserId);

      const data = await this.openAiUsageService.getDailySummary(
        userId,
        targetDate,
      );

      return ResponseUtil.success(
        data ?? {
          userId,
          date: targetDate,
          totalRequests: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          totalCostUsd: 0,
          modelBreakdown: {},
        },
        'Daily usage fetched successfully',
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /openai-usage/range?fromDate=2026-07-01&toDate=2026-07-24
   * Admin can pass ?userId=xxx to query any user.
   */
  @Get('/range')
  async getDailyRange(
    @Req() req: RequestWithUser,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('userId') queryUserId?: string,
  ) {
    try {
      if (!fromDate || !toDate) {
        return ResponseUtil.error(
          'fromDate and toDate are required (YYYY-MM-DD)',
          HttpStatus.BAD_REQUEST,
        );
      }

      const userId = this.resolveUserId(req, queryUserId);
      const data = await this.openAiUsageService.getDailyRange(
        userId,
        fromDate,
        toDate,
      );

      return ResponseUtil.success(data, 'Usage range fetched successfully');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /openai-usage/by-model?fromDate=2026-07-01&toDate=2026-07-24
   * Aggregates raw logs by model. Admin can pass ?userId=xxx.
   */
  @Get('/by-model')
  async getByModel(
    @Req() req: RequestWithUser,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('userId') queryUserId?: string,
  ) {
    try {
      const userId = this.resolveUserId(req, queryUserId);
      const data = await this.openAiUsageService.getUsageByModel(
        userId,
        fromDate ? new Date(fromDate) : undefined,
        toDate ? new Date(toDate) : undefined,
      );

      return ResponseUtil.success(data, 'Model usage fetched successfully');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /openai-usage/dashboard/overview
   * Chart data + total spend + today's spend.
   * Filters: year (YYYY, up to the current year), month (1-12). No date range.
   * Header: X-Timezone (optional, e.g. "Asia/Kolkata") — defaults to UTC.
   * Admin can pass ?userId=xxx to view another user.
   */
  @Get('/dashboard/overview')
  async getDashboardOverview(
    @Req() req: RequestWithUser,
    @Headers('x-timezone') timezone?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('userId') queryUserId?: string,
  ) {
    try {
      const userId = this.resolveUserId(req, queryUserId);
      const data = await this.openAiUsageService.getDashboardOverview({
        userId,
        year: this.parseYearParam(year),
        month: this.parseIntParam(month, 'month', 1, 12),
        timezone: timezone || 'UTC',
      });
      return ResponseUtil.success(
        data,
        'Dashboard overview fetched successfully',
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /openai-usage/dashboard/daily-usage
   * Paginated list of daily usage rows: date, models[], requestCount, inputTokens, outputTokens.
   * Filters: year (YYYY, up to the current year), month (1-12), page, limit. No date range.
   * Header: X-Timezone (optional).
   * Admin can pass ?userId=xxx.
   */
  @Get('/dashboard/daily-usage')
  async getDashboardDetails(
    @Req() req: RequestWithUser,
    @Headers('x-timezone') timezone?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') queryUserId?: string,
  ) {
    try {
      const userId = this.resolveUserId(req, queryUserId);
      const data = await this.openAiUsageService.getDashboardDetails({
        userId,
        year: this.parseYearParam(year),
        month: this.parseIntParam(month, 'month', 1, 12),
        page: this.parseIntParam(page, 'page', 1) ?? 1,
        // Preserve the original design: a limit above 100 is clamped, not rejected.
        limit: Math.min(100, this.parseIntParam(limit, 'limit', 1) ?? 10),
        timezone: timezone || 'UTC',
      });
      return ResponseUtil.success(
        data,
        'Dashboard details fetched successfully',
      );
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Admin only — GET /openai-usage/admin/users
   * Lightweight list of all registered users for the dropdown.
   */
  @Get('/admin/users')
  @Roles(Role.Admin)
  async getAdminUserList() {
    try {
      const data = await this.openAiUsageService.getAdminUserList();
      return ResponseUtil.success(data, 'Users fetched successfully');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Admin only — GET /openai-usage/admin/all?date=2026-07-24
   * Returns usage across all users for a given date.
   */
  @Get('/admin/all')
  @Roles(Role.Admin)
  async getAllUsersDaily(@Query('date') date?: string) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await this.openAiUsageService.getAllUsersDailySummary(
        date ?? today,
      );
      return ResponseUtil.success(data, 'All users usage fetched successfully');
    } catch (error) {
      return ResponseUtil.error(
        error.message || 'Something went wrong',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private resolveUserId(req: RequestWithUser, queryUserId?: string): string {
    const isAdmin = req.user?.role === Role.Admin;
    return isAdmin && queryUserId ? queryUserId : req.user._id.toString();
  }

  /**
   * Validates a query param is a whole number, optionally within [min, max].
   * Returns undefined if not supplied; throws 400 if supplied but invalid
   * (e.g. non-numeric, or out of range) instead of silently producing NaN.
   */
  private parseIntParam(
    raw: string | undefined,
    fieldName: string,
    min?: number,
    max?: number,
  ): number | undefined {
    if (raw === undefined || raw === '') return undefined;

    if (!/^-?\d+$/.test(raw.trim())) {
      return ResponseUtil.error(
        `Invalid ${fieldName}: must be a whole number`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = parseInt(raw, 10);
    if (
      (min !== undefined && parsed < min) ||
      (max !== undefined && parsed > max)
    ) {
      return ResponseUtil.error(
        `Invalid ${fieldName}: must be ${
          min !== undefined && max !== undefined
            ? `between ${min} and ${max}`
            : min !== undefined
            ? `at least ${min}`
            : `at most ${max}`
        }`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsed;
  }

  /**
   * Validates a `year` query param is a 4-digit YYYY value that does not
   * exceed the current year. Returns undefined if not supplied; throws 400
   * if supplied but malformed or in the future.
   */
  private parseYearParam(raw: string | undefined): number | undefined {
    if (raw === undefined || raw === '') return undefined;

    const trimmed = raw.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      return ResponseUtil.error(
        'Invalid year: must be a 4-digit year (YYYY)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = parseInt(trimmed, 10);
    const currentYear = new Date().getUTCFullYear();
    if (parsed > currentYear) {
      return ResponseUtil.error(
        `Invalid year: cannot be later than the current year (${currentYear})`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsed;
  }
}
