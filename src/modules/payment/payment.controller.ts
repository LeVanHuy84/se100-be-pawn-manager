import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseResult } from 'src/common/dto/base.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';
import { ListPaymentsQuery } from './dto/request/payment.query';
import { PaymentRequestDto } from './dto/request/payment.request';
import { PaymentResponse } from './dto/response/payment-details.response';
import { PaymentListItem } from './dto/response/payment-list-item.repsonse';
import { PaymentService } from './payment.service';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@ApiExtraModels(BaseResult, PaymentListItem, PaginationMeta, ListPaymentsQuery)
@Controller({
  path: 'payments',
  version: '1',
})
@ApiErrorResponses()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({
    summary: 'List all payments',
    description:
      'Retrieve paginated list of loan payments with optional filtering by loan, date range, amount, payment type/method',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment list retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResult) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(PaymentListItem) },
            },
            meta: { $ref: getSchemaPath(PaginationMeta) },
          },
        },
      ],
    },
  })
  async listPayments(
    @Query() query: ListPaymentsQuery,
  ): Promise<BaseResult<PaymentListItem[]>> {
    return this.paymentService.listPayments(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a loan payment',
    description:
      'Process a payment for a loan with automatic allocation (waterfall: Interest → Fee → Penalty → Principal). Supports idempotency via Idempotency-Key header to prevent duplicate payments.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Unique key to prevent duplicate payment processing (e.g., UUID)',
    required: true,
    schema: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
  })
  @ApiBody({
    type: PaymentRequestDto,
    description: 'Payment details',
    examples: {
      periodicCash: {
        summary: 'Periodic payment - Cash',
        value: {
          loanId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 2800000,
          paymentMethod: 'CASH',
          paymentType: 'PERIODIC',
          referenceCode: 'PAY-2026-001',
          notes: 'Thanh toán kỳ 1',
        },
      },
      earlyBankTransfer: {
        summary: 'Early payment - Bank Transfer',
        value: {
          loanId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 5000000,
          paymentMethod: 'BANK_TRANSFER',
          paymentType: 'EARLY',
          referenceCode: 'TRF-20260110-123456',
          notes: 'Trả trước 2 kỳ',
        },
      },
      payoff: {
        summary: 'Full payoff',
        value: {
          loanId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 53260000,
          paymentMethod: 'CASH',
          paymentType: 'PAYOFF',
          notes: 'Tất toán khoản vay',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Payment processed successfully',
    type: PaymentResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate payment (Idempotency-Key already used)',
  })
  @ApiResponse({
    status: 422,
    description:
      'Validation error: Loan closed, no outstanding items, amount mismatch for PAYOFF, or overpayment',
  })
  async createPayment(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() body: PaymentRequestDto,
    @Req() req,
  ): Promise<PaymentResponse> {
    const employee = {
      id: req.user?.userId,
      name: req.user?.firstName + ' ' + req.user?.lastName,
    };
    return this.paymentService.createPayment(idempotencyKey, body, employee);
  }
}
