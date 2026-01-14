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
    const imagesData = customer.images as any;

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
      images: imagesData || undefined,

      // Extract family info from images JSON
      fatherName: imagesData?.family?.father?.name,
      fatherPhone: imagesData?.family?.father?.phone,
      fatherOccupation: imagesData?.family?.father?.occupation,
      motherName: imagesData?.family?.mother?.name,
      motherPhone: imagesData?.family?.mother?.phone,
      motherOccupation: imagesData?.family?.mother?.occupation,
      spouseName: imagesData?.family?.spouse?.name,
      spousePhone: imagesData?.family?.spouse?.phone,
      spouseOccupation: imagesData?.family?.spouse?.occupation,

      // Extract employment info
      occupation: imagesData?.employment?.occupation,
      workplace: imagesData?.employment?.workplace,

      // Extract emergency contact
      emergencyContactName: imagesData?.emergencyContact?.name,
      emergencyContactPhone: imagesData?.emergencyContact?.phone,
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
