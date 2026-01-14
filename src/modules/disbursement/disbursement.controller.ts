import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseResult } from 'src/common/dto/base.response';
import { PaginationMeta } from 'src/common/dto/pagination.type';
import { ListDisbursementsQuery } from './dto/request/disbursement.query';
import { DisbursementRequestDto } from './dto/request/disbursement.request';
import { DisbursementDetailsResponse } from './dto/response/disbursement-details.response';
import { DisbursementListItem } from './dto/response/disbursement-list-item.response';
import { DisbursementService } from './disbursement.service';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/modules/employee/enum/role.enum';

@ApiTags('Disbursements')
@ApiBearerAuth()
@ApiExtraModels(
  BaseResult,
  DisbursementListItem,
  DisbursementDetailsResponse,
  PaginationMeta,
  ListDisbursementsQuery,
)
@Controller({
  path: 'disbursements',
  version: '1',
})
@ApiErrorResponses()
export class DisbursementController {
  constructor(private readonly disbursementService: DisbursementService) {}

  @Get()
  @Roles(Role.MANAGER, Role.STAFF)
  @ApiOperation({
    summary: 'List all disbursements',
    description:
      'Retrieve paginated list of loan disbursements with optional filtering by loan, date range, amount, disbursement method, and recipient name',
  })
  @ApiResponse({
    status: 200,
    description: 'Disbursement list retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResult) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(DisbursementListItem) },
            },
            meta: { $ref: getSchemaPath(PaginationMeta) },
          },
        },
      ],
    },
  })
  async listDisbursements(
    @Query() query: ListDisbursementsQuery,
  ): Promise<BaseResult<DisbursementListItem[]>> {
    return this.disbursementService.listDisbursements(query);
  }

  @Post()
  @Roles(Role.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a disbursement log',
    description:
      'Record a loan disbursement with automatic reference code generation (DSB-YYYY-NNNNNN). Loan must be in ACTIVE status. Only MANAGER can create disbursements. Supports idempotency via Idempotency-Key header.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Unique key to prevent duplicate disbursement processing (e.g., UUID)',
    required: true,
    schema: { type: 'string', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' },
  })
  @ApiBody({
    type: DisbursementRequestDto,
    description: 'Disbursement details',
  })
  @ApiResponse({
    status: 201,
    description: 'Disbursement created successfully',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(DisbursementDetailsResponse) },
      },
      required: ['data'],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Loan not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Loan is not in ACTIVE status',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate disbursement (Idempotency-Key already used)',
  })
  async createDisbursement(
    @Headers('Idempotency-Key') idempotencyKey: string,
    @Body() dto: DisbursementRequestDto,
  ): Promise<BaseResult<DisbursementDetailsResponse>> {
    return this.disbursementService.createDisbursement(idempotencyKey, dto);
  }
}
