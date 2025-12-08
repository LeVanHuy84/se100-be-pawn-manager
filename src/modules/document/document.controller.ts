import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { File as MulterFile } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { UploadDocumentDto } from './dto/request/upload-document.request';
import { DocumentResponse } from './dto/response/document.response';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';

@Controller({
  version: '1',
  path: 'documents',
})
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @Roles(Role.MANAGER, Role.STAFF)
  async uploadDocument(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: MulterFile,
  ): Promise<DocumentResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentService.uploadDocument(dto, file);
  }

  // @Public()
  // @Get()
  // @Roles(Role.MANAGER, Role.STAFF)

  // async getDocumentsByEntity(
  //   @Query('entityType') entityType: string,
  //   @Query('entityId') entityId: string,
  // ): Promise<DocumentResponse[]> {
  //   if (!entityType || !entityId) {
  //     throw new BadRequestException('entityType and entityId are required');
  //   }
  //   return this.documentService.findByEntity(entityType, entityId);
  // }

  @Get(':id')
  @Roles(Role.MANAGER, Role.STAFF)
  async getDocument(@Param('id') id: string): Promise<DocumentResponse> {
    return this.documentService.findOne(id);
  }

  // @Public()
  // @Delete(':id')
  // @Roles(Role.MANAGER, Role.STAFF)
  // async deleteDocument(@Param('id') id: string): Promise<{ message: string }> {
  //   await this.documentService.deleteDocument(id);
  //   return { message: 'Document deleted successfully' };
  // }
}
