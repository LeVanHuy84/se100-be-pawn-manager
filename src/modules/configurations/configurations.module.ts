import { Module } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';
import { ConfigurationsController } from './configurations.controller';
import { ConfigurationsHelper } from './configurations.helper';

@Module({
  controllers: [ConfigurationsController],
  providers: [ConfigurationsService, ConfigurationsHelper],
  exports: [ConfigurationsService, ConfigurationsHelper],
})
export class ConfigurationsModule {}
