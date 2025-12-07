import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import { CustomerQueryDTO } from './dto/request/customer.query';
import { CreateCustomerDTO } from './dto/request/create-customer.request';
import { UpdateCustomerRequest } from './dto/request/update-customer.request';

@Controller({
  version: '1',
  path: 'customers',
})
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Roles(Role.MANAGER, Role.STAFF)
  getList(@Query() query: CustomerQueryDTO) {
    return this.customerService.findAll(query);
  }

  @Get('/:id')
  @Roles(Role.MANAGER, Role.STAFF)
  getCustomer(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Post()
  @Roles(Role.MANAGER, Role.STAFF)
  createCustomer(@Body() body: CreateCustomerDTO) {
    return this.customerService.create(body);
  }

  @Patch('/:id')
  @Roles(Role.MANAGER, Role.STAFF)
  updateCustomer(@Param('id') id: string, @Body() body: UpdateCustomerRequest) {
    return this.customerService.update(id, body);
  }
}
