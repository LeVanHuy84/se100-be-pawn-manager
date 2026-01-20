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
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { RevenueReportListResponse } from './dto/revenue-report.response';
import { DailyLogResponse } from './dto/daily-log.response';
import { QuarterlyReportResponse } from './dto/quarterly-report.dto';
import { RevenueReportQuery } from './dto/revenue-report.query';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import { BaseResult } from 'src/common/dto/base.response';

@ApiTags('Reports')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiExtraModels(
  BaseResult,
  RevenueReportListResponse,
  DailyLogResponse,
  QuarterlyReportResponse,
)
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
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(RevenueReportListResponse) },
      },
      required: ['data'],
    },
    description:
      'Returns daily revenue data array for charts and summary totals. Each data point represents one day with revenue breakdown and expenses.',
  })
  async getRevenueReport(
    @Query() query: RevenueReportQuery,
  ): Promise<BaseResult<RevenueReportListResponse>> {
    return this.reportsService.getRevenueReport(query);
  }

  @Get('daily-log')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get daily log for police book',
    description:
      'Retrieve daily loan activities (new loans and closed loans) for manual police book (Sổ quản lý) documentation',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(DailyLogResponse) },
      },
      required: ['data'],
    },
  })
  async getDailyLog(
    @Query() query: DailyLogQuery,
  ): Promise<BaseResult<DailyLogResponse>> {
    return this.reportsService.getDailyLog(query);
  }

  @Get('quarterly')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Get quarterly report (Mẫu ĐK13)',
    description:
      'Generate comprehensive quarterly report for police compliance (Mẫu ĐK13) including loan statistics, revenue breakdown, and compliance metrics. Only MANAGER can access quarterly reports.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(QuarterlyReportResponse) },
      },
      required: ['data'],
    },
  })
  async getQuarterlyReport(
    @Query() query: QuarterlyReportQuery,
  ): Promise<BaseResult<QuarterlyReportResponse>> {
    return this.reportsService.getQuarterlyReport(query);
  }
}
