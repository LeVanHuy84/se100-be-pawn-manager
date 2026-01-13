import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { File as MulterFile } from 'multer';
import { CollateralService } from './collateral.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import { CollateralQueryDTO } from './dto/request/collateral.query';
import { CreateCollateralDTO } from './dto/request/create-collateral.request';
import { UpdateLocationRequest } from './dto/request/update-location.request';
import { CreateLiquidationRequest } from './dto/request/liquidation.request';
import { PatchCollateralDTO } from './dto/request/patch-collateral.request';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { ApiOkResponse } from '@nestjs/swagger';
import { CollateralAssetListResponse } from './dto/response/collateral.response';

@Controller({
  version: '1',
  path: 'collateral-assets',
})
@ApiErrorResponses()
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
  @Roles(Role.MANAGER, Role.STAFF)
  getCollateral(@Param('id') id: string) {
    return this.collateralService.findOne(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @Roles(Role.MANAGER, Role.STAFF)
  createCollateral(
    @Body() body: CreateCollateralDTO,
    @UploadedFiles() files: MulterFile[],
  ) {
    return this.collateralService.create(body, files);
  }

  @Patch('/:id')
  @UseInterceptors(FilesInterceptor('files'))
  @Roles(Role.MANAGER, Role.STAFF)
  updateCollateral(
    @Param('id') id: string,
    @Body() body: PatchCollateralDTO,
    @UploadedFiles() files: MulterFile[],
  ) {
    return this.collateralService.update(id, body, files);
  }
}

@Controller({
  version: '1',
  path: 'collaterals',
})
@ApiErrorResponses()
export class CollateralLocationController {
  constructor(private readonly collateralService: CollateralService) {}

  @Put('/:id/location')
  @Roles(Role.MANAGER, Role.STAFF)
  updateLocation(@Param('id') id: string, @Body() body: UpdateLocationRequest) {
    return this.collateralService.updateLocation(id, body);
  }
}

@Controller({
  version: '1',
  path: 'liquidations',
})
@ApiErrorResponses()
export class LiquidationController {
  constructor(private readonly collateralService: CollateralService) {}

  @Post()
  @Roles(Role.MANAGER, Role.STAFF)
  createLiquidation(@Body() body: CreateLiquidationRequest) {
    return this.collateralService.createLiquidation(body);
  }
}
