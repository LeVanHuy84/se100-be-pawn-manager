import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import { CollateralTypeQueryDTO } from './dto/request/collateral-type.query';
import { CreateCollateralTypeDTO } from './dto/request/create-collateral-type.request';
import { UpdateCollateralTypeDTO } from './dto/request/update-collateral-type.request';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { CollateralTypeService } from './collateral-type.service';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CollateralTypeListResponse,
  CollateralTypeResponse,
} from './dto/response/collateral-type.response';
import { BaseResult } from 'src/common/dto/base.response';
import {
  CurrentUser,
  type CurrentUserInfo,
} from 'src/common/decorators/current-user.decorator';

@Controller({
  version: '1',
  path: 'collateral-types',
})
@ApiExtraModels(BaseResult, CollateralTypeResponse, CollateralTypeListResponse)
@ApiErrorResponses()
export class CollateralTypeController {
  constructor(private readonly collateralTypeService: CollateralTypeService) {}

  @Get()
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOkResponse({
    description: 'Get a list of collateral types',
    type: CollateralTypeListResponse,
  })
  getList(@Query() query: CollateralTypeQueryDTO) {
    return this.collateralTypeService.findAll(query);
  }

  @Get('/:id')
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CollateralTypeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  getCollateralType(@Param('id', ParseIntPipe) id: number) {
    return this.collateralTypeService.findOne(id);
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
            data: { $ref: getSchemaPath(CollateralTypeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  createCollateralType(
    @Body() body: CreateCollateralTypeDTO,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.collateralTypeService.create(body, user);
  }

  @Patch('/:id')
  @Roles(Role.MANAGER)
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CollateralTypeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  updateCollateralType(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCollateralTypeDTO,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.collateralTypeService.update(id, body, user);
  }
}
