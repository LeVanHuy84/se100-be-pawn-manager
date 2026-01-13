import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeStatus } from '../../enum/employee-status.enum';
import { Role } from '../../enum/role.enum';
import { PaginationMeta } from 'src/common/dto/pagination.type';

export class EmployeeResponse {
  @ApiProperty({ description: 'Employee ID' })
  id: string;
  @ApiProperty({ description: 'Full name of the employee' })
  fullName: string;
  @ApiProperty({ description: 'Email address of the employee' })
  email: string;
  @ApiProperty({ description: 'Phone number of the employee' })
  phoneNumber: string;
  @ApiProperty({ description: 'Role of the employee', enum: Role })
  role: Role;
  @ApiProperty({ description: 'Store ID where the employee works' })
  storeId: string;
  @ApiPropertyOptional({ description: 'Store name where the employee works' })
  storeName: string;
  @ApiProperty({ description: 'Status of the employee', enum: EmployeeStatus })
  status: EmployeeStatus;
  @ApiProperty({
    description: 'Hire date of the employee',
    example: '2023-01-15',
  })
  hireDate: string;
  @ApiPropertyOptional({
    description: 'Termination date of the employee',
    example: '2023-06-30',
  })
  terminatedDate?: string;
  @ApiProperty({
    description: 'Account creation date',
    example: '2023-01-10T10:00:00Z',
  })
  createdAt: string;
}

export class EmployeeListResponse {
  @ApiProperty({ description: 'List of employees', type: [EmployeeResponse] })
  data: EmployeeResponse[];
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
