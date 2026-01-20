import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { clerkClient } from 'src/clerk/clerk.config';
import { EmployeeQueryDTO } from './dto/request/employee.query';
import { BaseResult } from 'src/common/dto/base.response';
import { EmployeeResponse } from './dto/response/employee.response';
import { EmployeeMapper } from './employee.mapper';
import { CreateEmployeeDTO } from './dto/request/create-employee.request';
import { EmployeeStatus } from './enum/employee-status.enum';
import { UpdateEmployeeRequest } from './dto/request/update-employee.request';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}
  async findOne(id: string): Promise<BaseResult<EmployeeResponse>> {
    try {
      const employee = await clerkClient.users.getUser(id);
      return {
        data: EmployeeMapper.toResponse(employee),
      };
    } catch (error: any) {
      // Clerk user not found
      if (error?.status === 404) {
        throw new NotFoundException('Employee not found');
      }

      // Invalid ID or bad request
      if (error?.status === 400) {
        throw new BadRequestException('Invalid employee id');
      }

      // Clerk service error
      throw new ServiceUnavailableException(
        'Employee service is temporarily unavailable',
      );
    }
  }

  async findAll(
    query: EmployeeQueryDTO,
  ): Promise<BaseResult<EmployeeResponse[]>> {
    const { page = 1, limit = 20, status, storeId, q } = query;

    const clerkUsers = await clerkClient.users.getUserList();
    let users = clerkUsers.data;

    // ========================
    // FILTER
    // ========================
    if (status) {
      users = users.filter((u) => u.publicMetadata?.status === status);
    }

    if (storeId) {
      users = users.filter((u) => u.publicMetadata?.storeId === storeId);
    }

    // ========================
    // SEARCH
    // ========================
    const keyword = q?.trim().toLowerCase();

    if (keyword) {
      users = users.filter((u) => {
        const fullName =
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
        const email = u.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? '';
        const phone =
          (
            u.publicMetadata?.phoneNumber as string | undefined
          )?.toLowerCase() ?? '';

        return (
          fullName.includes(keyword) ||
          email.includes(keyword) ||
          phone.includes(keyword)
        );
      });
    }

    // ========================
    // PAGINATION
    // ========================
    const totalItems = users.length;
    const start = (page - 1) * limit;
    const paginatedUsers = users.slice(start, start + limit);

    return {
      data: EmployeeMapper.toResponseList(paginatedUsers),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async createEmployee(
    body: CreateEmployeeDTO,
  ): Promise<BaseResult<EmployeeResponse>> {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id: body.storeId },
      });
      if (!store) {
        throw new BadRequestException('Store not found');
      } else if (!store.isActive) {
        throw new BadRequestException('Cannot add employee to inactive store');
      }
      const hireDate = body.hireDate || new Date().toISOString().split('T')[0];
      const newEmployee = await clerkClient.users.createUser({
        emailAddress: [body.email],
        firstName: body.firstName,
        lastName: body.lastName,
        password: body.password,
        publicMetadata: {
          storeId: body.storeId,
          storeName: store.name,
          status: EmployeeStatus.ACTIVE,
          phoneNumber: body.phoneNumber,
          hireDate: hireDate,
        },
        privateMetadata: {
          role: body.role,
        },
      });

      return {
        data: EmployeeMapper.toResponse(newEmployee),
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.errors?.[0]?.longMessage ||
          error.message ||
          'Failed to create employee',
      );
    }
  }

  async updateEmployee(
    id: string,
    body: UpdateEmployeeRequest,
  ): Promise<BaseResult<EmployeeResponse>> {
    try {
      const currentUser = await clerkClient.users.getUser(id);

      const currentPublic = currentUser.publicMetadata || {};
      const currentPrivate = currentUser.privateMetadata || {};

      const clerkPayload: any = {};

      // ========================
      // BASIC INFO
      // ========================
      if (body.firstName !== undefined) clerkPayload.firstName = body.firstName;
      if (body.lastName !== undefined) clerkPayload.lastName = body.lastName;
      if (body.password !== undefined) clerkPayload.password = body.password;
      if (body.email !== undefined) clerkPayload.emailAddress = body.email;

      // ========================
      // STORE UPDATE
      // ========================
      let storeUpdateMetadata = {};

      if (body.storeId !== undefined) {
        const store = await this.prisma.store.findUnique({
          where: { id: body.storeId },
        });

        if (!store) {
          throw new BadRequestException('Store not found');
        }

        if (!store.isActive) {
          throw new BadRequestException(
            'Cannot assign employee to inactive store',
          );
        }

        storeUpdateMetadata = {
          storeId: store.id,
          storeName: store.name,
        };
      }

      // ========================
      // PUBLIC METADATA
      // ========================
      clerkPayload.publicMetadata = {
        ...currentPublic,
        ...storeUpdateMetadata,
        ...(body.status !== undefined && { status: body.status }),
        ...(body.phoneNumber !== undefined && {
          phoneNumber: body.phoneNumber,
        }),
        ...(body.terminatedDate !== undefined && {
          terminatedDate: body.terminatedDate,
        }),
      };

      // ========================
      // PRIVATE METADATA
      // ========================
      clerkPayload.privateMetadata = {
        ...currentPrivate,
        ...(body.role !== undefined && { role: body.role }),
      };

      const updatedEmployee = await clerkClient.users.updateUser(
        id,
        clerkPayload,
      );

      return {
        data: EmployeeMapper.toResponse(updatedEmployee),
      };
    } catch (error: any) {
      throw new BadRequestException(
        error?.errors?.[0]?.longMessage || 'Failed to update employee',
      );
    }
  }
}
