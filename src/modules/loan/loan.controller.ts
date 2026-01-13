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
import { ListLoansQuery, ListLoansQuerySchema } from './dto/request/loan.query';
import { LoanService } from './loan.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  CreateLoanResponseDto,
  ListLoansResponseDto,
  LoanResponseDto,
  UpdateLoanResponseDto,
  UpdateLoanStatusResponseDto,
} from './dto/response/loan.response';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import Api from 'twilio/lib/rest/Api';

@ApiTags('Loans')
@Controller({
  version: '1',
  path: 'loans',
})
@ApiErrorResponses()
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
  async createLoan(
    @Body() dto: CreateLoanDto,
    @Req() req,
  ): Promise<CreateLoanResponseDto> {
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
    const employee = {
      id: req.user?.userId,
      name: req.user?.firstName + ' ' + req.user?.lastName,
    };
    return this.loanOrchestrator.updateStatus(id, dto, employee);
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
    @Req() req,
  ): Promise<UpdateLoanResponseDto> {
    const employee = {
      id: req.user?.userId,
      name: req.user?.firstName + ' ' + req.user?.lastName,
    };
    return this.loanOrchestrator.updateLoan(id, dto, employee);
  }

  @Get()
  @ApiOperation({ summary: 'List loans with optional filters' })
  @ApiOkResponse({
    description: 'List of loans retrieved successfully',
    type: ListLoansResponseDto,
  })
  listLoans(
    @Query(new ZodValidationPipe(ListLoansQuerySchema))
    query: ListLoansQuery,
  ) {
    return this.loanService.listLoans(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan details by ID' })
  @ApiParam({ name: 'id', description: 'Loan ID', example: 'clx1234567890' })
  @ApiOkResponse({
    description: 'Loan details retrieved successfully',
    type: LoanResponseDto,
  })
  getLoanById(@Param('id') id: string): Promise<LoanResponseDto> {
    return this.loanService.getLoanById(id);
  }
}
