import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import { StoreQueryDTO } from './dto/request/store.query';
import { CreateStoreDTO } from './dto/request/create-store.request';
import { UpdateStoreDTO } from './dto/request/update-store.request';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { StoreService } from './store.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { StoreListResponse } from './dto/response/store.response';

@Controller({
  version: '1',
  path: 'stores',
})
@ApiErrorResponses()
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @Roles(Role.MANAGER)
  @ApiOkResponse({
    description: 'Get a list of stores',
    type: StoreListResponse,
  })
  getList(@Query() query: StoreQueryDTO) {
    return this.storeService.findAll(query);
  }

  @Get('/:id')
  @Roles(Role.MANAGER)
  getStore(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }

  @Post()
  @Roles(Role.MANAGER)
  createStore(@Body() body: CreateStoreDTO) {
    return this.storeService.create(body);
  }

  @Patch('/:id')
  @Roles(Role.MANAGER)
  updateStore(@Param('id') id: string, @Body() body: UpdateStoreDTO) {
    return this.storeService.update(id, body);
  }
}
