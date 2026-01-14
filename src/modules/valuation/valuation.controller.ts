import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ValuationService } from './valuation.service';
import { ValuationRequestDto } from './dto/request/valuation.request';
import { ValuationResponse } from './dto/response/valuation.response';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

@Controller({
  version: '1',
  path: 'asset-valuations',
})
@ApiExtraModels(ValuationResponse)
@ApiErrorResponses()
export class ValuationController {
  constructor(private readonly valuationService: ValuationService) {}

  @Post()
  @ApiResponse({
        status: 200,
        schema: {
          allOf: [
            {
              type: 'object',
              properties: {
                data: { $ref: getSchemaPath(ValuationResponse) },
              },
              required: ['data'],
            },
          ],
        },
      })
  @Roles(Role.MANAGER, Role.STAFF)
  createValuation(
    @Body() dto: ValuationRequestDto,
  ) {
    return this.valuationService.createValuation(dto);
  }
}
