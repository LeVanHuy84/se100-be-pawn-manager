import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { File as MulterFile } from 'multer';
import { CollateralService } from './collateral.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import {
  CurrentUser,
  type CurrentUserInfo,
} from 'src/common/decorators/current-user.decorator';
import { CollateralQueryDTO } from './dto/request/collateral.query';
import { CreateCollateralDTO } from './dto/request/create-collateral.request';
import { UpdateLocationRequest } from './dto/request/update-location.request';
import { CreateLiquidationRequest } from './dto/request/liquidation.request';
import { SellCollateralRequest } from './dto/request/sell-collateral.request';
import { PatchCollateralDTO } from './dto/request/patch-collateral.request';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import {
  ApiOkResponse,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CollateralAssetListResponse,
  CollateralAssetResponse,
  LiquidationCollateralResponse,
} from './dto/response/collateral.response';
import { boolean } from 'joi';

@Controller({
  version: '1',
  path: 'collateral-assets',
})
@ApiErrorResponses()
@ApiExtraModels(
  CollateralAssetResponse,
  CollateralAssetListResponse,
  LiquidationCollateralResponse,
)
export class CollateralController {
  constructor(private readonly collateralService: CollateralService) {}

  @Get()
  @ApiOkResponse({
    description: 'Get a list of collateral assets',
    type: CollateralAssetListResponse,
  })
  @Roles(Role.MANAGER, Role.STAFF)
  getList(@Query() query: CollateralQueryDTO) {
    return this.collateralService.findAll(query);
  }

  @Get('/:id')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CollateralAssetResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER, Role.STAFF)
  getCollateral(@Param('id') id: string) {
    return this.collateralService.findOne(id);
  }

  @Post()
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CollateralAssetResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  @Roles(Role.MANAGER, Role.STAFF)
  createCollateral(
    @Body() body: CreateCollateralDTO,
    @UploadedFiles() files: MulterFile[],
    @CurrentUserId() userId: string,
  ) {
    return this.collateralService.create(body, files, userId);
  }

  @Patch('/:id')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CollateralAssetResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @UseInterceptors(FilesInterceptor('files'))
  @Roles(Role.MANAGER, Role.STAFF)
  updateCollateral(
    @Param('id') id: string,
    @Body() body: PatchCollateralDTO,
    @UploadedFiles() files: MulterFile[],
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.collateralService.update(id, body, files, user);
  }
}

@Controller({
  version: '1',
  path: 'collaterals',
})
@ApiErrorResponses()
@ApiExtraModels(boolean)
export class CollateralLocationController {
  constructor(private readonly collateralService: CollateralService) {}

  @Put('/:id/location')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(boolean) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER, Role.STAFF)
  updateLocation(
    @Param('id') id: string,
    @Body() body: UpdateLocationRequest,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.collateralService.updateLocation(id, body, user);
  }
}

@Controller({
  version: '1',
  path: 'liquidations',
})
@ApiErrorResponses()
@ApiExtraModels(LiquidationCollateralResponse)
export class LiquidationController {
  constructor(private readonly collateralService: CollateralService) {}

  @Post()
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(LiquidationCollateralResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER, Role.STAFF)
  createLiquidation(
    @Body() body: CreateLiquidationRequest,
    @CurrentUser() user: CurrentUserInfo,
  ) {
    return this.collateralService.createLiquidation(body, user);
  }

  @Post('/:id/sell')
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(CollateralAssetResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER)
  sellCollateral(@Param('id') id: string, @Body() body: SellCollateralRequest) {
    return this.collateralService.sellCollateral(id, body);
  }
}
