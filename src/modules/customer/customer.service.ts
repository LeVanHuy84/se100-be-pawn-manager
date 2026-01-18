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
import {
  CustomerType,
  Prisma,
  AuditEntityType,
} from '../../../generated/prisma';
import type { File as MulterFile } from 'multer';
import pLimit from 'p-limit';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageItem } from 'src/common/interfaces/media.interface';
import { CurrentUserInfo } from 'src/common/decorators/current-user.decorator';

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
        include: {
          ward: {
            include: {
              parent: true,
            },
          },
        },
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

  async findOne(id: string): Promise<BaseResult<CustomerResponse>> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        loans: true,
        ward: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return {
      data: CustomerMapper.toDetailResponse(customer),
    };
  }

  async create(
    data: CreateCustomerDTO,
    files?: { mattruoc?: MulterFile[]; matsau?: MulterFile[] },
    user?: CurrentUserInfo,
  ): Promise<BaseResult<CustomerResponse>> {
    // Validate required images
    if (!files || !files.mattruoc || files.mattruoc.length === 0) {
      throw new BadRequestException(
        'Front ID image (mattruoc) is required. Use form-data key "mattruoc"',
      );
    }

    if (!files.matsau || files.matsau.length === 0) {
      throw new BadRequestException(
        'Back ID image (matsau) is required. Use form-data key "matsau"',
      );
    }

    const location = await this.prisma.location.findFirst({
      where: { id: data.wardId },
    });

    if (location?.parentId == null) {
      throw new BadRequestException(
        'Invalid wardId: must be a ward-level location',
      );
    }

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
      // Prepare images JSON structure with all information
      const imagesData: any = {
        images: [],
        issuedDate: data.nationalIdIssueDate,
        issuedPlace: data.nationalIdIssuePlace,

        // Thông tin gia đình
        family: {
          father: {
            name: data.fatherName,
            phone: data.fatherPhone,
            occupation: data.fatherOccupation,
          },
          mother: {
            name: data.motherName,
            phone: data.motherPhone,
            occupation: data.motherOccupation,
          },
          ...(data.spouseName && {
            spouse: {
              name: data.spouseName,
              phone: data.spousePhone,
              occupation: data.spouseOccupation,
            },
          }),
        },

        // Nghề nghiệp & Thu nhập
        employment: {
          occupation: data.occupation,
          workplace: data.workplace,
        },

        // Người liên hệ khẩn cấp
        emergencyContact: {
          name: data.emergencyContactName,
          phone: data.emergencyContactPhone,
        },
      };

      const folder = `pawnshop/${data.customerType.toString().toLowerCase()}/${data.nationalId}`;

      // Upload front ID (mattruoc)
      const frontResult = await this.cloudinaryService.uploadFile(
        files.mattruoc[0],
        folder,
      );
      imagesData.images.push({
        type: 'FRONT_ID',
        url: frontResult.secure_url,
        publicId: frontResult.public_id,
      });

      // Upload back ID (matsau)
      const backResult = await this.cloudinaryService.uploadFile(
        files.matsau[0],
        folder,
      );
      imagesData.images.push({
        type: 'BACK_ID',
        url: backResult.secure_url,
        publicId: backResult.public_id,
      });

      const customer = await this.prisma.$transaction(async (tx) => {
        const newCustomer = await tx.customer.create({
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
            images: imagesData as Prisma.InputJsonValue,
            wardId: data.wardId,
          },
          include: {
            ward: {
              include: {
                parent: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'CREATE_CUSTOMER',
            entityId: newCustomer.id,
            entityType: AuditEntityType.CUSTOMER,
            entityName: `${data.fullName} - ${data.nationalId}`,
            actorId: user?.userId || null,
            actorName: user
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
              : null,
            oldValue: {},
            newValue: {
              fullName: data.fullName,
              nationalId: data.nationalId,
              phone: data.phone,
              email: data.email,
              customerType: data.customerType,
              monthlyIncome: data.monthlyIncome,
            },
            description: `Tạo khách hàng mới: ${data.fullName}`,
          },
        });

        return newCustomer;
      });

      return {
        data: CustomerMapper.toDetailResponse(customer),
      };
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
    files?: { mattruoc?: MulterFile[]; matsau?: MulterFile[] },
    user?: CurrentUserInfo,
  ): Promise<BaseResult<CustomerResponse>> {
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
    if (data.wardId) {
      const location = await this.prisma.location.findFirst({
        where: { id: data.wardId },
      });

      if (location?.parentId == null) {
        throw new BadRequestException(
          'Invalid wardId: must be a ward-level location',
        );
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
      if (data.wardId !== undefined)
        updateData.ward = { connect: { id: data.wardId } };

      // Update images JSON structure
      const shouldUpdateImages =
        files ||
        data.nationalIdIssueDate !== undefined ||
        data.nationalIdIssuePlace !== undefined ||
        data.fatherName !== undefined ||
        data.motherName !== undefined ||
        data.occupation !== undefined ||
        data.emergencyContactName !== undefined;

      if (shouldUpdateImages) {
        const folder = `pawnshop/${existing.customerType.toString().toLowerCase()}/${existing.nationalId}`;

        // Get current images data
        const currentImagesData = (existing.images as any) || {
          images: [],
          issuedDate: null,
          issuedPlace: null,
          family: {},
          employment: {},
          emergencyContact: {},
        };

        // Update issuedDate and issuedPlace if provided
        if (data.nationalIdIssueDate !== undefined) {
          currentImagesData.issuedDate = data.nationalIdIssueDate;
        }
        if (data.nationalIdIssuePlace !== undefined) {
          currentImagesData.issuedPlace = data.nationalIdIssuePlace;
        }

        // Update family info
        if (
          data.fatherName !== undefined ||
          data.fatherPhone !== undefined ||
          data.fatherOccupation !== undefined
        ) {
          currentImagesData.family = currentImagesData.family || {};
          currentImagesData.family.father = {
            name: data.fatherName ?? currentImagesData.family.father?.name,
            phone: data.fatherPhone ?? currentImagesData.family.father?.phone,
            occupation:
              data.fatherOccupation ??
              currentImagesData.family.father?.occupation,
          };
        }

        if (
          data.motherName !== undefined ||
          data.motherPhone !== undefined ||
          data.motherOccupation !== undefined
        ) {
          currentImagesData.family = currentImagesData.family || {};
          currentImagesData.family.mother = {
            name: data.motherName ?? currentImagesData.family.mother?.name,
            phone: data.motherPhone ?? currentImagesData.family.mother?.phone,
            occupation:
              data.motherOccupation ??
              currentImagesData.family.mother?.occupation,
          };
        }

        if (
          data.spouseName !== undefined ||
          data.spousePhone !== undefined ||
          data.spouseOccupation !== undefined
        ) {
          currentImagesData.family = currentImagesData.family || {};
          currentImagesData.family.spouse = {
            name: data.spouseName ?? currentImagesData.family.spouse?.name,
            phone: data.spousePhone ?? currentImagesData.family.spouse?.phone,
            occupation:
              data.spouseOccupation ??
              currentImagesData.family.spouse?.occupation,
          };
        }

        // Update employment info
        if (data.occupation !== undefined || data.workplace !== undefined) {
          currentImagesData.employment = {
            occupation:
              data.occupation ?? currentImagesData.employment?.occupation,
            workplace:
              data.workplace ?? currentImagesData.employment?.workplace,
          };
        }

        // Update emergency contact
        if (
          data.emergencyContactName !== undefined ||
          data.emergencyContactPhone !== undefined
        ) {
          currentImagesData.emergencyContact = {
            name:
              data.emergencyContactName ??
              currentImagesData.emergencyContact?.name,
            phone:
              data.emergencyContactPhone ??
              currentImagesData.emergencyContact?.phone,
          };
        }

        // Ensure images array exists
        if (!currentImagesData.images) {
          currentImagesData.images = [];
        }

        // Upload and update front ID (mattruoc) if provided
        if (files?.mattruoc && files.mattruoc.length > 0) {
          const result = await this.cloudinaryService.uploadFile(
            files.mattruoc[0],
            folder,
          );

          // Replace existing FRONT_ID or add new
          const frontIndex = currentImagesData.images.findIndex(
            (img: any) => img.type === 'FRONT_ID',
          );
          const newFrontImage = {
            type: 'FRONT_ID',
            url: result.secure_url,
            publicId: result.public_id,
          };

          if (frontIndex >= 0) {
            currentImagesData.images[frontIndex] = newFrontImage;
          } else {
            currentImagesData.images.push(newFrontImage);
          }
        }

        // Upload and update back ID (matsau) if provided
        if (files?.matsau && files.matsau.length > 0) {
          const result = await this.cloudinaryService.uploadFile(
            files.matsau[0],
            folder,
          );

          // Replace existing BACK_ID or add new
          const backIndex = currentImagesData.images.findIndex(
            (img: any) => img.type === 'BACK_ID',
          );
          const newBackImage = {
            type: 'BACK_ID',
            url: result.secure_url,
            publicId: result.public_id,
          };

          if (backIndex >= 0) {
            currentImagesData.images[backIndex] = newBackImage;
          } else {
            currentImagesData.images.push(newBackImage);
          }
        }

        updateData.images = currentImagesData as Prisma.InputJsonValue;
      }

      const customer = await this.prisma.$transaction(async (tx) => {
        const updatedCustomer = await tx.customer.update({
          where: { id },
          data: updateData,
          include: {
            loans: true,
            ward: {
              include: {
                parent: true,
              },
            },
          },
        });

        // Log only changed fields
        const oldValue: Record<string, any> = {};
        const newValue: Record<string, any> = {};

        if (
          data.fullName !== undefined &&
          existing.fullName !== data.fullName
        ) {
          oldValue.fullName = existing.fullName;
          newValue.fullName = data.fullName;
        }
        if (data.phone !== undefined && existing.phone !== data.phone) {
          oldValue.phone = existing.phone;
          newValue.phone = data.phone;
        }
        if (data.email !== undefined && existing.email !== data.email) {
          oldValue.email = existing.email;
          newValue.email = data.email;
        }
        if (data.address !== undefined && existing.address !== data.address) {
          oldValue.address = existing.address;
          newValue.address = data.address;
        }
        if (
          data.customerType !== undefined &&
          existing.customerType !== data.customerType
        ) {
          oldValue.customerType = existing.customerType;
          newValue.customerType = data.customerType;
        }
        if (data.monthlyIncome !== undefined) {
          oldValue.monthlyIncome = existing.monthlyIncome;
          newValue.monthlyIncome = data.monthlyIncome;
        }
        if (data.creditScore !== undefined) {
          oldValue.creditScore = existing.creditScore;
          newValue.creditScore = data.creditScore;
        }
        if (shouldUpdateImages) {
          newValue.imagesUpdated = true;
        }

        if (data.wardId !== undefined && existing.wardId !== data.wardId) {
          oldValue.wardId = existing.wardId;
          newValue.wardId = data.wardId;
        }

        if (Object.keys(newValue).length > 0) {
          await tx.auditLog.create({
            data: {
              action: 'UPDATE_CUSTOMER',
              entityId: id,
              entityType: AuditEntityType.CUSTOMER,
              entityName: `${existing.fullName} - ${existing.nationalId}`,
              actorId: user?.userId || null,
              actorName: user
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : null,
              oldValue,
              newValue,
              description: `Cập nhật thông tin khách hàng: ${existing.fullName}`,
            },
          });
        }

        return updatedCustomer;
      });

      return {
        data: CustomerMapper.toDetailResponse(customer),
      };
    } catch (error) {
      throw new BadRequestException('Failed to update customer');
    }
  }
}
