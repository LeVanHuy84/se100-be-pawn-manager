import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractResponse } from './dto/response/contract.response';
import { ContractQueryDto } from './dto/request/contract.query';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@Controller({
  version: '1',
  path: 'contracts',
})
@ApiErrorResponses()
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // @Get()
  // @Roles(Role.MANAGER, Role.STAFF)
  // findAll(@Query() query: ContractQueryDto) {
  //   return this.contractService.findAll(query);
  // }

  // @Get(':id')
  // @Roles(Role.MANAGER, Role.STAFF)
  // findOne(@Param('id') id: string) {
  //   return this.contractService.findOne(id);
  // }
}
