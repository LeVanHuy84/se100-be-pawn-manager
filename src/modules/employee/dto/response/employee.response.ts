import { EmployeeStatus } from '../../enum/employee-status.enum';
import { Role } from '../../enum/role.enum';

export interface EmployeeResponse {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: Role;
  status: EmployeeStatus;
  hireDate: string;
  terminatedDate?: string;
  createdAt: string;
}
