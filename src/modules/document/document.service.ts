import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { File as MulterFile } from 'multer';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { UploadDocumentDto } from './dto/request/upload-document.request';
import { DocumentMapper } from './document.mapper';
import { DocumentResponse } from './dto/response/document.response';
import { EntityType } from './enum/entity-type.enum';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadDocument(
    dto: UploadDocumentDto,
    file: MulterFile,
  ): Promise<DocumentResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Only PDF, JPG, and PNG are allowed',
      );
    }

    // Verify entity exists
    await this.verifyEntityExists(dto.entityType, dto.entityId);

    // Upload to Cloudinary
    const folder = `pawnshop/${dto.entityType.toLowerCase()}/${dto.docType.toLowerCase()}`;
    const uploadResult = await this.cloudinaryService.uploadFile(file, folder);

    // Parse issued date if provided
    let issuedDate: Date | null = null;
    if (dto.issuedDate) {
      issuedDate = new Date(dto.issuedDate);
      if (isNaN(issuedDate.getTime())) {
        throw new BadRequestException('Invalid issued date format');
      }
    }

    // Create document record
    const document = await this.prisma.documentRecord.create({
      data: {
        entityType: dto.entityType as EntityType,
        entityId: dto.entityId,
        docType: dto.docType,
        docNumber: dto.docNumber || "",
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        issuedDate: issuedDate || "",
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
        createdAt: new Date(),
      },
    });

    return DocumentMapper.toResponse(document);
  }

  private async verifyEntityExists(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    let exists = false;

    switch (entityType) {
      case 'CUSTOMER':
        exists = !!(await this.prisma.customer.findUnique({
          where: { id: entityId },
        }));
        break;
      case 'COLLATERAL':
        exists = !!(await this.prisma.collateralAsset.findUnique({
          where: { id: entityId },
        }));
        break;
      case 'LOAN':
        exists = !!(await this.prisma.loan.findUnique({
          where: { id: entityId },
        }));
        break;
      default:
        throw new BadRequestException('Invalid entity type');
    }

    if (!exists) {
      throw new NotFoundException(
        `${entityType} with ID ${entityId} not found`,
      );
    }
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<DocumentResponse[]> {
    const documents = await this.prisma.documentRecord.findMany({
      where: {
        entityType: entityType as EntityType,
        entityId: entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return DocumentMapper.toResponseList(documents);
  }

  async findOne(id: string): Promise<DocumentResponse> {
    const document = await this.prisma.documentRecord.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return DocumentMapper.toResponse(document);
  }

  async deleteDocument(id: string): Promise<void> {
    const document = await this.prisma.documentRecord.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete from Cloudinary
    await this.cloudinaryService.deleteFile(document.filePublicId);

    // Delete from database
    await this.prisma.documentRecord.delete({
      where: { id },
    });
  }
}
