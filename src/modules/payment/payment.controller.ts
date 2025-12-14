import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { ListPaymentsQuery } from './dto/request/payment.query';
import { BaseResult } from 'src/common/dto/base.response';
import { PaymentListItem } from './dto/response/payment-list-item.repsonse';
import { PaymentRequestDto } from './dto/request/payment.request';
import { PaymentResponse } from './dto/response/payment-details.response';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';

@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async listPayments(
    @Query() query: ListPaymentsQuery,
  ): Promise<BaseResult<PaymentListItem[]>> {
    return this.paymentService.listPayments(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() body: PaymentRequestDto,
    @CurrentUserId() employeeId: string,
  ): Promise<PaymentResponse> {
    return this.paymentService.createPayment(idempotencyKey, body, employeeId);
  }
}
