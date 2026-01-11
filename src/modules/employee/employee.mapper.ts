import { EmployeeResponse } from './dto/response/employee.response';
import { EmployeeStatus } from './enum/employee-status.enum';

export class EmployeeMapper {
  static toResponse(employee: any): EmployeeResponse {
    return {
      id: employee.id,
      fullName: employee.firstName + ' ' + employee.lastName,
      email: employee.email,
      status: employee.publicMetadata?.status as EmployeeStatus,
      phoneNumber: employee.publicMetadata?.phoneNumber,
      role: employee.privateMetadata?.role,
      storeId: employee.publicMetadata?.storeId,
      storeName: employee.publicMetadata?.storeName,
      hireDate: employee.publicMetadata?.hireDate,
      terminatedDate: employee.publicMetadata?.terminatedDate,
      createdAt: new Date(employee.createdAt).toISOString(),
    };
  }

  static toResponseList(employees: any[]): EmployeeResponse[] {
    return employees.map((employee) => this.toResponse(employee));
  }
}
