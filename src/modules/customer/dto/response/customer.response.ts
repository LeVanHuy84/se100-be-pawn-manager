import { ImageItem } from 'src/common/interfaces/media.interface';
import { CustomerType } from '../../enum/customer-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from 'src/common/dto/pagination.type';

export class ActiveLoan {
  id: string;
  loanCode: string;
  loanAmount: number;
  remainingAmount: number;
  status: string;
  startDate: string; // YYYY-MM-DD
}

export class LoanHistory {
  totalLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  defaultCount: number;
}

export class CustomerResponse {
  id: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  nationalId: string;
  phone?: string;
  email?: string;
  address?: string;
  customerType: CustomerType;
  monthlyIncome: number;
  creditScore?: number;
  createdAt: string; // ISO datetime
  activeLoans?: ActiveLoan[];
  loanHistory?: LoanHistory;
  images?: any; // Full JSON with CCCD images, family info, etc.

  // Thông tin gia đình - Bố
  fatherName?: string;
  fatherPhone?: string;
  fatherOccupation?: string;

  // Thông tin gia đình - Mẹ
  motherName?: string;
  motherPhone?: string;
  motherOccupation?: string;

  // Thông tin gia đình - Vợ/Chồng
  spouseName?: string;
  spousePhone?: string;
  spouseOccupation?: string;

  // Nghề nghiệp & Thu nhập
  occupation?: string;
  workplace?: string;

  // Người liên hệ khẩn cấp
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Địa chỉ hành chính
  wardId?: string;
  wardName?: string;
  provinceId?: string;
  provinceName?: string;
}

export class CustomerListResponse {
  @ApiProperty({ description: 'List of customers', type: [CustomerResponse] })
  data: CustomerResponse[];
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
