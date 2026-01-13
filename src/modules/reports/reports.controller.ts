import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';

import { DailyLogQuery } from './dto/daily-log.query';
import { QuarterlyReportQuery } from './dto/quarterly-report.dto';
import { ClerkAuthGuard } from 'src/clerk/clerk-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { RevenueReportListResponse } from './dto/revenue-report.response';
import { DailyLogResponse } from './dto/daily-log.response';
import { QuarterlyReportResponse } from './dto/quarterly-report.dto';
import { RevenueReportQuery } from './dto/revenue-report.query';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@ApiErrorResponses()
@UseGuards(ClerkAuthGuard)
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Get revenue report with daily breakdown',
    description:
      'Retrieve revenue report with daily data points for charting. Returns an array of daily revenue/expense data plus summary totals. Query date range defaults to 30 days. Only MANAGER can access revenue reports.',
  })
  @ApiOkResponse({
    type: RevenueReportListResponse,
    description:
      'Returns daily revenue data array for charts and summary totals. Each data point represents one day with revenue breakdown and expenses.',
  })
  async getRevenueReport(@Query() query: RevenueReportQuery) {
    return this.reportsService.getRevenueReport(query);
  }

  @Get('daily-log')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get daily log for police book',
    description:
      'Retrieve daily loan activities (new loans and closed loans) for manual police book (Sổ quản lý) documentation',
  })
  @ApiOkResponse({ type: DailyLogResponse })
  async getDailyLog(@Query() query: DailyLogQuery) {
    return this.reportsService.getDailyLog(query);
  }

  @Get('quarterly')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Get quarterly report (Mẫu ĐK13)',
    description:
      'Generate comprehensive quarterly report for police compliance (Mẫu ĐK13) including loan statistics, revenue breakdown, and compliance metrics. Only MANAGER can access quarterly reports.',
  })
  @ApiOkResponse({ type: QuarterlyReportResponse })
  async getQuarterlyReport(@Query() query: QuarterlyReportQuery) {
    return this.reportsService.getQuarterlyReport(query);
  }
}
