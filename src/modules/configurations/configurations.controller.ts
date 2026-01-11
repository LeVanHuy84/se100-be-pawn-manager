import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { ConfigurationsService } from './configurations.service';
import { ListConfigurationsQueryDto } from './dto/request/configurations.query';
import { ConfigurationResponse } from './dto/request/configurations.response';
import { UpdateConfigurationDto } from './dto/request/update-configuration.request';
import { ApiErrorResponses } from 'src/common/decorators/api-error-responses.decorator';

@Controller({
  version: '1',
  path: 'configurations',
})
@ApiErrorResponses()
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Public()
  @Get()
  async listConfigurations(
    @Query() query: ListConfigurationsQueryDto,
  ): Promise<ConfigurationResponse[]> {
    return this.configurationsService.listConfigurations(query.group);
  }

  @Public()
  @Put(':key')
  async updateConfiguration(
    @Param('key') key: string,
    @Body() body: UpdateConfigurationDto,
  ): Promise<ConfigurationResponse> {
    return this.configurationsService.updateConfiguration(key, body);
  }
}
