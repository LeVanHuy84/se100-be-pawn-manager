import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CreateLoanDto } from './dto/request/create-loan.dto';
import { LoanOrchestrator } from './loan.orchestrator';
import { ApproveLoanDto } from './dto/request/approve-loan.dto';
import { ListLoansQuery, ListLoansQuerySchema } from './dto/request/loan.query';
import { LoanService } from './loan.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  LoanResponseDto,
  LoanSummaryResponseDto,
} from './dto/response/loan.response';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { BaseResult } from 'src/common/dto/base.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';
import { RepaymentScheduleService } from '../repayment-schedule/repayment-schedule.service';
import { OverdueLoansQuery } from '../repayment-schedule/dto/request/overdue-items.query';
import { OverdueLoanResponse } from '../repayment-schedule/dto/response/overdue-loan.response';

@ApiTags('Loans')
@Controller({
  version: '1',
  path: 'loans',
})
@ApiExtraModels(
  BaseResult,
  LoanResponseDto,
  LoanSummaryResponseDto,
  PaginationMeta,
  OverdueLoansQuery,
  OverdueLoanResponse,
)
@ApiErrorResponses()
export class LoanController {
  constructor(
    private loanOrchestrator: LoanOrchestrator,
    private loanService: LoanService,
    private repaymentScheduleService: RepaymentScheduleService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan application' })
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(LoanResponseDto) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @ApiBody({ type: CreateLoanDto })
  async createLoan(
    @Body() dto: CreateLoanDto,
    @Req() req,
  ): Promise<BaseResult<LoanResponseDto>> {
    const employee = {
      id: req.user?.userId,
      name: req.user?.firstName + ' ' + req.user?.lastName,
      storeId: req.user?.clerkUser?.publicMetadata?.storeId,
    };
    return this.loanOrchestrator.createLoan(dto, employee);
  }

  @Patch(':id/status')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Update loan status (approve or reject)' })
  @ApiParam({ name: 'id', description: 'Loan ID', example: 'clx1234567890' })
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(LoanResponseDto) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @ApiBody({ type: ApproveLoanDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: ApproveLoanDto,
    @Req() req,
  ): Promise<BaseResult<LoanResponseDto>> {
    const employee = {
      id: req.user?.userId,
      name: req.user?.firstName + ' ' + req.user?.lastName,
    };
    return this.loanOrchestrator.updateStatus(id, dto, employee);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update loan details (only for PENDING loans)' })
  @ApiParam({ name: 'id', description: 'Loan ID', example: 'clx1234567890' })
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(LoanResponseDto) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @ApiBody({ type: UpdateLoanDto })
  async updateLoan(
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
    @Req() req,
  ): Promise<BaseResult<LoanResponseDto>> {
    const employee = {
      id: req.user?.userId,
      name: req.user?.firstName + ' ' + req.user?.lastName,
    };
    return this.loanOrchestrator.updateLoan(id, dto, employee);
  }

  @Get()
  @ApiOperation({ summary: 'List loans with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Loan list retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResult) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(LoanSummaryResponseDto) },
            },
            meta: { $ref: getSchemaPath(PaginationMeta) },
          },
        },
      ],
    },
  })
  listLoans(
    @Query(new ZodValidationPipe(ListLoansQuerySchema))
    query: ListLoansQuery,
  ): Promise<BaseResult<LoanSummaryResponseDto[]>> {
    return this.loanService.listLoans(query);
  }

  @Get('overdue')
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

  @Get(':id')
  @ApiOperation({ summary: 'Get loan details by ID' })
  @ApiParam({ name: 'id', description: 'Loan ID', example: 'clx1234567890' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(LoanResponseDto) },
          },
          required: ['data'],
        },
      ],
    },
  })
  getLoanById(@Param('id') id: string): Promise<BaseResult<LoanResponseDto>> {
    return this.loanService.getLoanById(id);
  }
}
