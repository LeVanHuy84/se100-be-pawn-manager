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
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmployeeListResponse } from './dto/response/employee.response';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@ApiTags('Employees')
@Controller({
  version: '1',
  path: 'employees',
})
@ApiErrorResponses()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('/:id')
  getEmployee(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Get()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Get a list of employees' })
  @ApiOkResponse({ type: EmployeeListResponse })
  getList(@Query() query: EmployeeQueryDTO) {
    return this.employeeService.findAll(query);
  }

  @Post()
  @Roles(Role.MANAGER)
  createEmployee(@Body() body: CreateEmployeeDTO) {
    return this.employeeService.createEmployee(body);
  }

  @Patch('/:id')
  @Roles(Role.MANAGER)
  updateEmployee(@Param('id') id: string, @Body() body: UpdateEmployeeRequest) {
    return this.employeeService.updateEmployee(id, body);
  }
}
