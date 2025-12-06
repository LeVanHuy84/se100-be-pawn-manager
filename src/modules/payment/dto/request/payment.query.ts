import { PaymentMethod } from '@prisma/client';
import { BaseFilterQuery } from 'src/common/dto/filter.type';
import { PaymentType } from '../../enums/payment-type.enum';

export interface ListPaymentsQuery extends BaseFilterQuery {
  loanId?: string;
  paymentMethod?: PaymentMethod;
  paymentType?: PaymentType;
  dateFrom?: string; // 'YYYY-MM-DD'
  dateTo?: string; // 'YYYY-MM-DD'
  minAmount?: number;
  maxAmount?: number;
}
