import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { LoanTypeService } from './loan-type.service';
import { BaseResult } from 'src/common/dto/base.response';
import { LoanTypeResponse } from './dto/response/loan-type.response';
import { CreateLoanTypeDto } from './dto/request/create-loan-type.dto';
import { UpdateLoanTypeDto } from './dto/request/update-loan-type.dto';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@Controller({
  version: '1',
  path: 'loan-types',
})
@ApiExtraModels(BaseResult, LoanTypeResponse)
@ApiErrorResponses()
export class LoanTypeController {
  constructor(private readonly loanTypeService: LoanTypeService) {}

  @Get()
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(LoanTypeResponse) },
        },
      },
      required: ['data'],
    },
  })
  @Roles(Role.MANAGER)
  async getAllLoanTypes(): Promise<BaseResult<LoanTypeResponse[]>> {
    return this.loanTypeService.findMany();
  }

  @Post()
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(LoanTypeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER)
  async createLoanType(@Body() body: CreateLoanTypeDto) {
    return this.loanTypeService.create(body);
  }

  @Patch(':id')
  @ApiResponse({
    status: 201,
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            data: { $ref: getSchemaPath(LoanTypeResponse) },
          },
          required: ['data'],
        },
      ],
    },
  })
  @Roles(Role.MANAGER)
  async updateLoanType(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLoanTypeDto,
  ) {
    return this.loanTypeService.update(id, body);
  }
}
