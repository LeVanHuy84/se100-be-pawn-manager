import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { LogCommunicationDto } from './dto/log-communication.dto';
import { NotificationLogResponse } from './dto/notification-log.response';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';

@ApiTags('Communication / Debt Collection')
@ApiBearerAuth()
@Controller({
  path: 'communications',
  version: '1',
})
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post('log')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Log a communication attempt',
    description:
      'Record a communication attempt with a customer (phone call, SMS, email, in-person). Used for debt collection tracking and promise-to-pay management.',
  })
  @ApiResponse({
    status: 201,
    description: 'Communication logged successfully',
    type: NotificationLogResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  async logCommunication(
    @Body() dto: LogCommunicationDto,
    @CurrentUserId() employeeId: string,
  ): Promise<NotificationLogResponse> {
    return this.communicationService.logCommunication(dto, employeeId);
  }

  @Get('loans/:loanId/history')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get communication history for a loan',
    description:
      'Retrieve all communication attempts made for a specific loan, including calls, SMS, emails, and their outcomes.',
  })
  @ApiParam({
    name: 'loanId',
    type: String,
    description: 'UUID of the loan',
  })
  @ApiResponse({
    status: 200,
    description: 'Communication history retrieved successfully',
    type: [NotificationLogResponse],
  })
  async getLoanHistory(
    @Param('loanId', new ParseUUIDPipe()) loanId: string,
  ): Promise<NotificationLogResponse[]> {
    return this.communicationService.getLoanCommunicationHistory(loanId);
  }

  @Get('promises-to-pay')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'Get upcoming promise-to-pay commitments',
    description:
      'Retrieve list of customers who promised to pay on specific dates. Used for follow-up tracking.',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2026-01-10',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2026-01-20',
  })
  @ApiResponse({
    status: 200,
    description: 'Promise-to-pay list retrieved successfully',
    type: [NotificationLogResponse],
  })
  async getPromisesToPay(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<NotificationLogResponse[]> {
    return this.communicationService.getPromisesToPay({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }
}
