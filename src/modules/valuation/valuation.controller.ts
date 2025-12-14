import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ValuationService } from './valuation.service';
import { ValuationRequestDto } from './dto/request/valuation.request';
import { ValuationResponse } from './dto/response/valuation.response';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';

@Controller({
    version: '1',
    path: 'asset-valuations',
})
export class ValuationController {
  constructor(private readonly valuationService: ValuationService) {}

  @Post()
  @Roles(Role.MANAGER, Role.STAFF)
  createValuation(
    @Body() dto: ValuationRequestDto,
  ): Promise<ValuationResponse> {
    return this.valuationService.createValuation(dto);
  }
}
