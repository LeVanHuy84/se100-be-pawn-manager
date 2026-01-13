import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller({
  version: '1',
  path: 'provinces',
})
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  getLocations(@Query('search') search: string) {
    return this.locationService.getLocations(search);
  }

  @Get(':code/wards')
  getWardsByProvinceCode(
    @Param('code') code: string,
    @Query('search') search: string,
  ) {
    return this.locationService.getWardsByProvinceCode(code, search);
  }
}
