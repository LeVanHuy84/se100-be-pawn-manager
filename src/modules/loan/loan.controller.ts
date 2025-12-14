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
import type { CreateLoanDto } from './dto/request/create-loan.dto';
import { LoanOrchestrator } from './loan.orchestrator';
import type { ApproveLoanDto } from './dto/request/approve-loan.dto';
import type { ListLoansQuery } from './dto/request/loan.query';
import { LoanService } from './loan.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { UpdateLoanDto } from './dto/request/update-loan.dto';

@Controller('loans')
export class LoanController {
  constructor(
    private loanOrchestrator: LoanOrchestrator,
    private loanService: LoanService,
  ) {}

  @Post()
  async createLoan(@Body() dto: CreateLoanDto) {
    return this.loanOrchestrator.createLoan(dto);
  }

  @Patch(':id/status')
  @Roles(Role.MANAGER)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: ApproveLoanDto,
    @Req() req,
  ) {
    const employeeId = req.user?.id;
    return this.loanOrchestrator.updateStatus(id, dto, employeeId);
  }

  @Patch(':id')
  async updateLoan(@Param('id') id: string, @Body() dto: UpdateLoanDto) {
    return this.loanOrchestrator.updateLoan(id, dto);
  }

  @Get()
  listLoans(@Query() query: ListLoansQuery) {
    return this.loanService.listLoans(query);
  }
}
