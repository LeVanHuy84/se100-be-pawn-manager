import { Customer } from '../../../generated/prisma';
import { CustomerResponse } from './dto/response/customer.response';
import { CustomerType } from './enum/customer-type.enum';

export class CustomerMapper {
  static toResponse(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      fullName: customer.fullName,
      dob: customer.dob.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD
      nationalId: customer.nationalId,
      phone: customer.phone || undefined,
      email: customer.email || undefined,
      address: customer.address || undefined,
      customerType: customer.customerType as CustomerType,
      monthlyIncome: Number(customer.monthlyIncome),
      creditScore: customer.creditScore || undefined,
      createdAt: customer.createdAt.toISOString(),
    };
  }

  static toResponseList(customers: Customer[]): CustomerResponse[] {
    return customers.map((customer) => this.toResponse(customer));
  }
}
