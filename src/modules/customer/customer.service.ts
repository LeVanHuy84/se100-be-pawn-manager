import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerQueryDTO } from './dto/request/customer.query';
import { CreateCustomerDTO } from './dto/request/create-customer.request';
import { UpdateCustomerRequest } from './dto/request/update-customer.request';
import { CustomerResponse } from './dto/response/customer.response';
import { CustomerMapper } from './customer.mapper';
import { BaseResult } from 'src/common/dto/base.response';
import { CustomerType, Prisma } from '../../../generated/prisma';
import type { File as MulterFile } from 'multer';
import pLimit from 'p-limit';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CustomerService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(
    query: CustomerQueryDTO,
  ): Promise<BaseResult<CustomerResponse[]>> {
    const { page = 1, limit = 20, search, customerType } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (customerType) {
      where.customerType = customerType as CustomerType;
    }

    // Execute queries in parallel
    const [customers, totalItems] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: CustomerMapper.toResponseList(customers),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  async findOne(id: string): Promise<CustomerResponse> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        loans: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return CustomerMapper.toDetailResponse(customer);
  }

  async create(
    data: CreateCustomerDTO,
    files?: MulterFile[],
  ): Promise<CustomerResponse> {
    try {
      // Check for duplicate nationalId or phone
      const existing = await this.prisma.customer.findFirst({
        where: {
          OR: [
            { nationalId: data.nationalId },
            ...(data.phone ? [{ phone: data.phone }] : []),
          ],
        },
      });

      if (existing) {
        if (existing.nationalId === data.nationalId) {
          throw new ConflictException(
            'Customer with this national ID already exists',
          );
        }
        if (existing.phone === data.phone) {
          throw new ConflictException(
            'Customer with this phone number already exists',
          );
        }
      }

      const imagesToSave: { url: string; publicId: string }[] = [];

      if (files && files.length > 0) {
        const folder = `pawnshop/${data.customerType.toString().toLowerCase()}/${data.fullName.toLowerCase()}`;

        const limit = pLimit(3);

        const uploadResults = await Promise.all(
          files.map((file) =>
            limit(() => this.cloudinaryService.uploadFile(file, folder)),
          ),
        );

        const images = uploadResults.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
        }));
        imagesToSave.push(...images);
      }

      const customer = await this.prisma.customer.create({
        data: {
          fullName: data.fullName,
          dob: new Date(data.dob),
          nationalId: data.nationalId,
          phone: data.phone,
          email: data.email,
          address: data.address,
          customerType: data.customerType as CustomerType,
          monthlyIncome: data.monthlyIncome,
          creditScore: data.creditScore,
          images: imagesToSave as Prisma.InputJsonValue,
        },
      });

      return CustomerMapper.toDetailResponse(customer);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create customer');
    }
  }

  async update(
    id: string,
    data: UpdateCustomerRequest,
    files?: MulterFile[],
  ): Promise<CustomerResponse> {
    // Check if customer exists
    const existing = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Check for duplicate nationalId or phone (excluding current customer)
    if (data.nationalId || data.phone) {
      const duplicate = await this.prisma.customer.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.nationalId ? [{ nationalId: data.nationalId }] : []),
                ...(data.phone ? [{ phone: data.phone }] : []),
              ],
            },
          ],
        },
      });

      if (duplicate) {
        if (duplicate.nationalId === data.nationalId) {
          throw new ConflictException(
            'Another customer with this national ID already exists',
          );
        }
        if (duplicate.phone === data.phone) {
          throw new ConflictException(
            'Another customer with this phone number already exists',
          );
        }
      }
    }

    try {
      const updateData: Prisma.CustomerUpdateInput = {};

      if (data.fullName !== undefined) updateData.fullName = data.fullName;
      if (data.dob !== undefined)
        throw new BadRequestException('DOB cannot be updated');
      if (data.nationalId !== undefined)
        throw new BadRequestException('National ID cannot be updated');
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.customerType !== undefined)
        updateData.customerType = data.customerType as CustomerType;
      if (data.monthlyIncome !== undefined)
        updateData.monthlyIncome = data.monthlyIncome;
      if (data.creditScore !== undefined)
        updateData.creditScore = data.creditScore;

      if (files && files.length > 0) {
        const folder = `pawnshop/${existing.customerType.toString().toLowerCase()}/${existing.fullName.toLowerCase()}`;

        const limit = pLimit(3);

        const uploadResults = await Promise.all(
          files.map((file) =>
            limit(() => this.cloudinaryService.uploadFile(file, folder)),
          ),
        );

        const images = uploadResults.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
        }));

        updateData.images = images as Prisma.InputJsonValue;
      }

      const customer = await this.prisma.customer.update({
        where: { id },
        data: updateData,
        include: { loans: true },
      });

      return CustomerMapper.toDetailResponse(customer);
    } catch (error) {
      throw new BadRequestException('Failed to update customer');
    }
  }
}
