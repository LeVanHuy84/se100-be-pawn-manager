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
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  StoreListResponse,
  StoreResponse,
} from './dto/response/store.response';
import { BaseResult } from 'src/common/dto/base.response';
import { CurrentUser, type CurrentUserInfo } from 'src/common/decorators/current-user.decorator';

@Controller({
  version: '1',
  path: 'stores',
})
@ApiExtraModels(BaseResult, StoreResponse, StoreListResponse)
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
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(StoreResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER)
  getStore(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }

  @Post()
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(StoreResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER)
  createStore(@Body() body: CreateStoreDTO, @CurrentUser() user: CurrentUserInfo) {
    return this.storeService.create(body, user);
  }

  @Patch('/:id')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(StoreResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER)
  updateStore(@Param('id') id: string, @Body() body: UpdateStoreDTO, @CurrentUser() user: CurrentUserInfo) {
    return this.storeService.update(id, body, user);
  }
}
