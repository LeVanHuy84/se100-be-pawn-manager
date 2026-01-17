import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
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
import { RepaymentScheduleItemResponse } from './dto/response/reschedule-payment-item.response';

import { RepaymentScheduleService } from './repayment-schedule.service';

import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@ApiTags('Repayment Schedule')
@ApiBearerAuth()
@ApiExtraModels(BaseResult, RepaymentScheduleItemResponse, PaginationMeta)
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
