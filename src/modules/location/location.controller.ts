import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import { BaseResult } from 'src/common/dto/base.response';
import { ProvinceResponse, WardResponse } from './dto/location.response';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

@Controller({
  version: '1',
  path: 'provinces',
})
@ApiExtraModels(BaseResult, ProvinceResponse, WardResponse)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ProvinceResponse) },
        },
      },
    },
  })
  getLocations(
    @Query('search') search: string,
  ): Promise<BaseResult<ProvinceResponse[]>> {
    return this.locationService.getLocations(search);
  }

  @Get(':code/wards')
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(WardResponse) },
        },
      },
    },
  })
  getWardsByProvinceCode(
    @Param('code') code: string,
    @Query('search') search: string,
  ): Promise<BaseResult<WardResponse[]>> {
    return this.locationService.getWardsByProvinceCode(code, search);
  }
}
