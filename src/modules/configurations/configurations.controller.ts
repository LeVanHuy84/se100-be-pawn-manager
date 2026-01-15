import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '../employee/enum/role.enum';
import { ConfigurationsService } from './configurations.service';
import { ListConfigurationsQueryDto } from './dto/request/configurations.query';
import { ConfigurationResponse } from './dto/request/configurations.response';
import { UpdateConfigurationDto } from './dto/request/update-configuration.request';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';
import { BaseResult } from 'src/common/dto/base.response';

@ApiTags('System Configurations')
@ApiExtraModels(BaseResult, ConfigurationResponse)
@Controller({
  version: '1',
  path: 'configurations',
})
@ApiErrorResponses()
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Roles(Role.MANAGER, Role.STAFF)
  @Get()
  @ApiOperation({
    summary: 'List all system configurations',
    description:
      'Retrieve all active system parameters, optionally filtered by parameter group (RATES, LIMITS, SYSTEM). These configurations control business rules like interest rates, LTV limits, and system behaviors.',
  })
  @ApiQuery({
    name: 'group',
    enum: ['RATES', 'LIMITS', 'SYSTEM'],
    required: false,
    description: 'Filter parameters by group',
  })
  @ApiResponse({
    status: 200,
    description: 'List of configurations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ConfigurationResponse) },
        },
      },
      required: ['data'],
    },
  })
  async listConfigurations(
    @Query() query: ListConfigurationsQueryDto,
  ): Promise<BaseResult<ConfigurationResponse[]>> {
    return this.configurationsService.listConfigurations(query.group);
  }

  @Roles(Role.MANAGER)
  @Put(':key')
  @ApiOperation({
    summary: 'Update system configuration',
    description:
      'Update a system parameter value by key. Only MANAGER role can modify configurations. Changes take effect immediately for applicable business logic.',
  })
  @ApiParam({
    name: 'key',
    description:
      'Parameter key (e.g., LEGAL_INTEREST_CAP, BIKE_DEFAULT_INTEREST, MIN_INCOME_REQUIRED)',
    example: 'LEGAL_INTEREST_CAP',
  })
  @ApiBody({
    type: UpdateConfigurationDto,
    examples: {
      decimal: {
        summary: 'Update interest cap',
        value: {
          value: '20.0',
          description: 'Legal maximum annual interest rate in Vietnam (%)',
        },
      },
      boolean: {
        summary: 'Toggle auto approval',
        value: {
          value: 'true',
          description: 'Enable automatic loan approval for low-risk cases',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(ConfigurationResponse) },
      },
      required: ['data'],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid value format for the specified data type',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuration key not found',
  })
  async updateConfiguration(
    @Param('key') key: string,
    @Body() body: UpdateConfigurationDto,
  ): Promise<BaseResult<ConfigurationResponse>> {
    return this.configurationsService.updateConfiguration(key, body);
  }
}
