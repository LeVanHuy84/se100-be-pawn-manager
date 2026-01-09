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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateLoanDto } from './dto/request/create-loan.dto';
import { LoanOrchestrator } from './loan.orchestrator';
import { ApproveLoanDto } from './dto/request/approve-loan.dto';
import {
  ListLoansQuerySchema,
  type ListLoansQuery,
} from './dto/request/loan.query';
import { LoanService } from './loan.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  CreateLoanResponseDto,
  ListLoansResponseDto,
  UpdateLoanResponseDto,
  UpdateLoanStatusResponseDto,
} from './dto/response/loan.response';

@ApiTags('Loans')
@Controller({
  version: '1',
  path: 'loans',
})
export class LoanController {
  constructor(
    private loanOrchestrator: LoanOrchestrator,
    private loanService: LoanService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan application' })
  @ApiCreatedResponse({
    description: 'Loan application created successfully',
    type: CreateLoanResponseDto,
  })
  @ApiBody({ type: CreateLoanDto })
  async createLoan(@Body() dto: CreateLoanDto): Promise<CreateLoanResponseDto> {
    return this.loanOrchestrator.createLoan(dto);
  }

  @Patch(':id/status')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Update loan status (approve or reject)' })
  @ApiParam({ name: 'id', description: 'Loan ID', example: 'clx1234567890' })
  @ApiOkResponse({
    description: 'Loan status updated successfully',
    type: UpdateLoanStatusResponseDto,
  })
  @ApiBody({ type: ApproveLoanDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: ApproveLoanDto,
    @Req() req,
  ): Promise<UpdateLoanStatusResponseDto> {
    const employeeId = req.user?.userId;
    return this.loanOrchestrator.updateStatus(id, dto, employeeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update loan details (only for PENDING loans)' })
  @ApiParam({ name: 'id', description: 'Loan ID', example: 'clx1234567890' })
  @ApiOkResponse({
    description: 'Loan updated successfully',
    type: UpdateLoanResponseDto,
  })
  @ApiBody({ type: UpdateLoanDto })
  async updateLoan(
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
  ): Promise<UpdateLoanResponseDto> {
    return this.loanOrchestrator.updateLoan(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all loans with pagination and filtering' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by loan status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Filter by customer ID',
    example: 'cus_123',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiOkResponse({
    description: 'List of loans retrieved successfully',
    type: ListLoansResponseDto,
  })
  listLoans(
    @Query(new ZodValidationPipe(ListLoansQuerySchema)) query: ListLoansQuery,
  ) {
    return this.loanService.listLoans(query);
  }
}
