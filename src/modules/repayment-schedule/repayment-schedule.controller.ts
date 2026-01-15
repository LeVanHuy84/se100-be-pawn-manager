import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseResult } from 'src/common/dto/base.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';
import { OverdueLoansQuery } from './dto/request/overdue-items.query';
import { RepaymentScheduleItemResponse } from './dto/response/reschedule-payment-item.response';
import { OverdueLoanResponse } from './dto/response/overdue-loan.response';

import { RepaymentScheduleService } from './repayment-schedule.service';

import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@ApiTags('Repayment Schedule')
@ApiBearerAuth()
@ApiExtraModels(
  BaseResult,
  RepaymentScheduleItemResponse,
  PaginationMeta,
  OverdueLoansQuery,
  OverdueLoanResponse,
)
@Controller({
  version: '1',
})
@ApiErrorResponses()
export class RepaymentScheduleController {
  constructor(
    private readonly repaymentScheduleService: RepaymentScheduleService,
  ) {}

  @Get('loans/:loanId/repayment-schedule')
  @ApiOperation({
    summary: 'Get loan repayment schedule',
    description:
      'Retrieve the complete repayment schedule for a specific loan, including all periods with payment details and status',
  })
  @ApiParam({
    name: 'loanId',
    type: String,
    description: 'UUID of the loan',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Repayment schedule retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(RepaymentScheduleItemResponse) },
        },
      },
      required: ['data'],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async getLoanRepaymentSchedule(
    @Param('loanId', new ParseUUIDPipe()) loanId: string,
  ): Promise<BaseResult<RepaymentScheduleItemResponse[]>> {
    return this.repaymentScheduleService.getLoanRepaymentSchedule(loanId);
  }

  @Get('loans/overdue')
  @ApiOperation({
    summary: 'Get overdue loans with their overdue repayment items',
    description:
      'Retrieve paginated list of loans that have overdue repayment items. Each loan includes all its overdue periods. Supports filtering by date range (max 30 days), store, and search. Used for debt collection and customer follow-up.',
  })
  @ApiResponse({
    status: 200,
    description: 'Overdue loans retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResult) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(OverdueLoanResponse) },
            },
            meta: { $ref: getSchemaPath(PaginationMeta) },
          },
        },
      ],
    },
  })
  async getOverdueLoans(
    @Query() query: OverdueLoansQuery,
  ): Promise<BaseResult<OverdueLoanResponse[]>> {
    return this.repaymentScheduleService.getOverdueLoans(query);
  }

  @Get('repayment-schedules/:id')
  @ApiOperation({
    summary: 'Get single repayment schedule item',
    description:
      'Retrieve detailed information about a specific repayment schedule item by its ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the repayment schedule item',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Repayment schedule item retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(RepaymentScheduleItemResponse) },
      },
      required: ['data'],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Repayment schedule item not found',
  })
  async getRepaymentScheduleItem(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BaseResult<RepaymentScheduleItemResponse>> {
    return this.repaymentScheduleService.getRepaymentScheduleItem(id);
  }
}
