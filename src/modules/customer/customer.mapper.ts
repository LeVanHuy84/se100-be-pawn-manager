import { ImageItem } from 'src/common/interfaces/media.interface';
import { Customer, Loan } from '../../../generated/prisma';
import {
  CustomerResponse,
  ActiveLoan,
  LoanHistory,
} from './dto/response/customer.response';
import { CustomerType } from './enum/customer-type.enum';

type CustomerWithLoans = Customer & {
  loans?: Loan[];
};

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
      images: (customer.images as unknown as ImageItem[]) || undefined,
    };
  }

  static toDetailResponse(customer: CustomerWithLoans): CustomerResponse {
    const loans = customer.loans || [];

    // Filter active loans
    const activeLoans: ActiveLoan[] = loans
      .filter((loan) => loan.status === 'ACTIVE')
      .map((loan) => ({
        id: loan.id,
        loanCode: loan.id.substring(0, 8).toUpperCase(), // Generate code from ID
        loanAmount: Number(loan.loanAmount),
        remainingAmount: Number(loan.remainingAmount),
        status: loan.status,
        startDate: loan.activatedAt
          ? loan.activatedAt.toISOString().split('T')[0]
          : '',
      }));

    // Calculate loan history
    const loanHistory: LoanHistory = {
      totalLoans: loans.length,
      totalBorrowed: loans.reduce(
        (sum, loan) => sum + Number(loan.loanAmount),
        0,
      ),
      totalRepaid: loans.reduce(
        (sum, loan) =>
          sum +
          Number(
            (loan.loanAmount as unknown as number) -
              (loan.remainingAmount as unknown as number),
          ),
        0,
      ),
      defaultCount: loans.filter((loan) => loan.status === 'OVERDUE').length,
    };

    return {
      ...this.toResponse(customer),
      activeLoans,
      loanHistory,
    };
  }

  static toResponseList(customers: Customer[]): CustomerResponse[] {
    return customers.map((customer) => this.toResponse(customer));
  }
}
