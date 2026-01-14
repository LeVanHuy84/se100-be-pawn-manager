import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from './enum/role.enum';
import { EmployeeQueryDTO } from './dto/request/employee.query';
import { CreateEmployeeDTO } from './dto/request/create-employee.request';
import { UpdateEmployeeRequest } from './dto/request/update-employee.request';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { BaseResult } from 'src/common/dto/base.response';
import { EmployeeResponse } from './dto/response/employee.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';

@ApiTags('Employees')
@ApiExtraModels(BaseResult, EmployeeResponse, PaginationMeta)
@Controller({
  version: '1',
  path: 'employees',
})
@ApiErrorResponses()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('/:id')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(EmployeeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  getEmployee(@Param('id') id: string): Promise<BaseResult<EmployeeResponse>> {
    return this.employeeService.findOne(id);
  }

  @Get()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Get a list of employees' })
  @ApiResponse({
    status: 200,
    description: 'Employee list retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResult) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(EmployeeResponse) },
            },
            meta: { $ref: getSchemaPath(PaginationMeta) },
          },
        },
      ],
    },
  })
  getList(
    @Query() query: EmployeeQueryDTO,
  ): Promise<BaseResult<EmployeeResponse[]>> {
    return this.employeeService.findAll(query);
  }

  @Post()
  @Roles(Role.MANAGER)
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(EmployeeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  createEmployee(
    @Body() body: CreateEmployeeDTO,
  ): Promise<BaseResult<EmployeeResponse>> {
    return this.employeeService.createEmployee(body);
  }

  @Patch('/:id')
  @Roles(Role.MANAGER)
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(EmployeeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  updateEmployee(
    @Param('id') id: string,
    @Body() body: UpdateEmployeeRequest,
  ): Promise<BaseResult<EmployeeResponse>> {
    return this.employeeService.updateEmployee(id, body);
  }
}
