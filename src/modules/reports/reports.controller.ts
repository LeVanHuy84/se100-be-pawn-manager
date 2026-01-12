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

@ApiTags('Reports')
@ApiBearerAuth()
@ApiErrorResponses()
@UseGuards(ClerkAuthGuard)
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiOperation({
    summary: 'Get revenue report',
    description:
      'Retrieve revenue breakdown with optional date range (30 days) and revenue type filtering',
  })
  @ApiOkResponse({ type: RevenueReportListResponse })
  async getRevenueReport(@Query() query: RevenueReportQuery) {
    return this.reportsService.getRevenueReport(query);
  }

  @Get('daily-log')
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
  @ApiOperation({
    summary: 'Get quarterly report (Mẫu ĐK13)',
    description:
      'Generate comprehensive quarterly report for police compliance (Mẫu ĐK13) including loan statistics, revenue breakdown, and compliance metrics',
  })
  @ApiOkResponse({ type: QuarterlyReportResponse })
  async getQuarterlyReport(@Query() query: QuarterlyReportQuery) {
    return this.reportsService.getQuarterlyReport(query);
  }
}
