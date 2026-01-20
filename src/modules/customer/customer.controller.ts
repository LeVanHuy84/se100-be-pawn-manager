import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { File as MulterFile } from 'multer';
import { CustomerService } from './customer.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import { CustomerQueryDTO } from './dto/request/customer.query';
import { CreateCustomerDTO } from './dto/request/create-customer.request';
import { UpdateCustomerRequest } from './dto/request/update-customer.request';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CustomerListResponse,
  CustomerResponse,
} from './dto/response/customer.response';
import { BaseResult } from 'src/common/dto/base.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';
import {
  CurrentUser,
  type CurrentUserInfo,
} from 'src/common/decorators/current-user.decorator';

@ApiExtraModels(BaseResult, CustomerResponse, PaginationMeta)
@ApiTags('Customers')
@Controller({
  version: '1',
  path: 'customers',
})
@ApiErrorResponses()
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOkResponse({
    description: 'Get a list of customers',
    type: CustomerListResponse,
  })
  getList(@Query() query: CustomerQueryDTO) {
    return this.customerService.findAll(query);
  }

  @Get('/:id')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CustomerResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER, Role.STAFF)
  getCustomer(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Post()
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CustomerResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mattruoc', maxCount: 1 },
      { name: 'matsau', maxCount: 1 },
    ]),
  )
  @Roles(Role.MANAGER, Role.STAFF)
  createCustomer(
    @Body() body: CreateCustomerDTO,
    @UploadedFiles()
    files: { mattruoc?: MulterFile[]; matsau?: MulterFile[] },
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.customerService.create(body, files, user);
  }

  @Patch('/:id')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CustomerResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mattruoc', maxCount: 1 },
      { name: 'matsau', maxCount: 1 },
    ]),
  )
  @Roles(Role.MANAGER, Role.STAFF)
  updateCustomer(
    @Param('id') id: string,
    @Body() body: UpdateCustomerRequest,
    @UploadedFiles()
    files: { mattruoc?: MulterFile[]; matsau?: MulterFile[] },
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.customerService.update(id, body, files, user);
  }
}
