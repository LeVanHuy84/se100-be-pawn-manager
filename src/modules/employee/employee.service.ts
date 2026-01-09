import { BadRequestException, Injectable } from '@nestjs/common';
import { clerkClient } from 'src/clerk/clerk.config';
import { EmployeeQueryDTO } from './dto/request/employee.query';
import { BaseResult } from 'src/common/dto/base.response';
import { EmployeeResponse } from './dto/response/employee.response';
import { EmployeeMapper } from './employee.mapper';
import { CreateEmployeeDTO } from './dto/request/create-employee.request';
import { EmployeeStatus } from './enum/employee-status.enum';
import { UpdateEmployeeRequest } from './dto/request/update-employee.request';

@Injectable()
export class EmployeeService {
  async findOne(id: string): Promise<EmployeeResponse> {
    const employee = await clerkClient.users.getUser(id);
    return EmployeeMapper.toResponse(employee);
  }

  async findAll(
    query: EmployeeQueryDTO,
  ): Promise<BaseResult<EmployeeResponse[]>> {
    const { page = 1, limit = 20, status } = query;
    const offset = (page - 1) * limit;

    const clerkUsers = await clerkClient.users.getUserList({
      limit: limit,
      offset: offset,
    });

    let users = clerkUsers.data;

    if (status) {
      users = users.filter((u) => u.publicMetadata?.status === status);
    }

    return {
      data: EmployeeMapper.toResponseList(users),
      meta: {
        totalItems: clerkUsers.totalCount,
        totalPages: Math.ceil(clerkUsers.totalCount / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async createEmployee(body: CreateEmployeeDTO): Promise<EmployeeResponse> {
    try {
      const hireDate = body.hireDate || new Date().toISOString().split('T')[0];
      const newEmployee = await clerkClient.users.createUser({
        emailAddress: [body.email],
        firstName: body.firstName,
        lastName: body.lastName,
        password: body.password,
        publicMetadata: {
          status: EmployeeStatus.ACTIVE,
          phoneNumber: body.phoneNumber,
          hireDate: hireDate,
        },
        privateMetadata: {
          role: body.role,
        },
      });

      return EmployeeMapper.toResponse(newEmployee);
    } catch (error: any) {
      throw new BadRequestException(
        error.errors[0]?.longMessage || 'Failed to create employee',
      );
    }
  }

  async updateEmployee(
    id: string,
    body: UpdateEmployeeRequest,
  ): Promise<EmployeeResponse> {
    try {
      const currentUser = await clerkClient.users.getUser(id);

      const currentPublic = currentUser.publicMetadata || {};
      const currentPrivate = currentUser.privateMetadata || {};

      const clerkPayload: any = {};

      if (body.firstName !== undefined) clerkPayload.firstName = body.firstName;
      if (body.lastName !== undefined) clerkPayload.lastName = body.lastName;
      if (body.password !== undefined) clerkPayload.password = body.password;
      if (body.email !== undefined) clerkPayload.emailAddress = body.email;

      clerkPayload.publicMetadata = {
        ...currentPublic,
        ...(body.status !== undefined && { status: body.status }),
        ...(body.phoneNumber !== undefined && {
          phoneNumber: body.phoneNumber,
        }),
        ...(body.terminatedDate !== undefined && {
          terminatedDate: body.terminatedDate,
        }),
      };

      clerkPayload.privateMetadata = {
        ...currentPrivate,
        ...(body.role !== undefined && { role: body.role }),
      };

      const updatedEmployee = await clerkClient.users.updateUser(
        id,
        clerkPayload,
      );

      return EmployeeMapper.toResponse(updatedEmployee);
    } catch (error: any) {
      throw new BadRequestException(
        error?.errors?.[0]?.longMessage || 'Failed to update employee',
      );
    }
  }
}
