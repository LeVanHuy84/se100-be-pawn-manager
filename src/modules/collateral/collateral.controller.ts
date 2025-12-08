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
} from '@nestjs/common';
import { CollateralService } from './collateral.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';
import { CollateralQueryDTO } from './dto/request/collateral.query';
import { CreateCollateralDTO } from './dto/request/create-collateral.request';
import { UpdateLocationRequest } from './dto/request/update-location.request';
import { CreateLiquidationRequest } from './dto/request/liquidation.request';
import { PatchCollateralDTO } from './dto/request/patch-collateral.request';

@Controller({
  version: '1',
  path: 'collateral-assets',
})
export class CollateralController {
  constructor(private readonly collateralService: CollateralService) {}

  @Get()
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
  @Roles(Role.MANAGER, Role.STAFF)
  createCollateral(@Body() body: CreateCollateralDTO, @Req() req) {
    body.createdBy = req.user.id;
    return this.collateralService.create(body);
  }

  @Patch('/:id')
  @Roles(Role.MANAGER, Role.STAFF)
  updateCollateral(@Param('id') id: string, @Body() body: PatchCollateralDTO, @Req() req) {
    body.updatedBy = req.user.id;
    return this.collateralService.update(id, body);
  }
}

@Controller({
  version: '1',
  path: 'collaterals',
})
export class CollateralLocationController {
  constructor(private readonly collateralService: CollateralService) {}

  @Put('/:id/location')
  @Roles(Role.MANAGER, Role.STAFF)
  updateLocation(@Param('id') id: string, @Body() body: UpdateLocationRequest, @Req() req) {
    body.updatedBy = req.user.id;
    return this.collateralService.updateLocation(id, body);
  }
}

@Controller({
  version: '1',
  path: 'liquidations',
})
export class LiquidationController {
  constructor(private readonly collateralService: CollateralService) {}

  @Post()
  @Roles(Role.MANAGER, Role.STAFF)
  createLiquidation(@Body() body: CreateLiquidationRequest, @Req() req) {
    body.createdBy = req.user.id;
    return this.collateralService.createLiquidation(body);
  }
}
