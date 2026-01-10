import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigurationResponse } from './dto/request/configurations.response';
import { UpdateConfigurationDto } from './dto/request/update-configuration.request';
import { ParameterGroup } from './enums/parameter-group.enum';
import { SystemParameterDataType } from './enums/system-parameters.type';

@Injectable()
export class ConfigurationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listConfigurations(
    group?: ParameterGroup,
  ): Promise<ConfigurationResponse[]> {
    const params = await this.prisma.systemParameter.findMany({
      where: {
        isActive: true,
        ...(group ? { paramGroup: group } : {}),
      },
      orderBy: [{ paramGroup: 'asc' }, { paramKey: 'asc' }],
    });

    return params.map((p) => this.mapToResponse(p));
  }

  async updateConfiguration(
    key: string,
    data: UpdateConfigurationDto,
  ): Promise<ConfigurationResponse> {
    const existing = await this.prisma.systemParameter.findFirst({
      where: {
        paramKey: key,
        isActive: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Parameter with key "${key}" not found`);
    }

    const normalizedValue = this.normalizeValueByDataType(
      data.value,
      existing.dataType,
      key,
    );

    const updated = await this.prisma.systemParameter.update({
      where: { id: existing.id },
      data: {
        paramValue: normalizedValue,
        ...(data.description !== undefined && {
          description: data.description,
        }),
        updatedAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  private normalizeValueByDataType(
    rawValue: string,
    dataType: SystemParameterDataType | string | null,
    key: string,
  ): string {
    const type = (
      dataType ?? 'STRING'
    ).toUpperCase() as SystemParameterDataType;

    switch (type) {
      case 'DECIMAL': {
        const num = Number(rawValue);
        if (!Number.isFinite(num)) {
          throw new BadRequestException(
            `Value for "${key}" must be a valid decimal number`,
          );
        }
        // Chuẩn hoá về dạng string số (không khoảng trắng, v.v.)
        return num.toString();
      }

      case 'INTEGER': {
        if (!/^-?\d+$/.test(rawValue.trim())) {
          throw new BadRequestException(
            `Value for "${key}" must be an integer number`,
          );
        }
        const intVal = parseInt(rawValue, 10);
        return intVal.toString();
      }

      case 'BOOLEAN': {
        const v = rawValue.trim().toLowerCase();
        if (!['true', 'false', '1', '0'].includes(v)) {
          throw new BadRequestException(
            `Value for "${key}" must be boolean: "true"/"false" or "1"/"0"`,
          );
        }
        // Chuẩn hoá về "true" / "false"
        return v === 'true' || v === '1' ? 'true' : 'false';
      }

      case 'JSON': {
        try {
          const parsed = JSON.parse(rawValue);
          // stringify lại để lưu chuẩn, ví dụ không khoảng trắng thừa
          return JSON.stringify(parsed);
        } catch {
          throw new BadRequestException(
            `Value for "${key}" must be a valid JSON string`,
          );
        }
      }

      case 'STRING':
      default:
        // STRING thì chấp nhận mọi thứ, có thể trim nếu muốn
        return rawValue;
    }
  }

  private mapToResponse(param: any): ConfigurationResponse {
    return {
      key: param.paramKey,
      value: param.paramValue,
      group: param.paramGroup,
      description: param.description,
      dataType: param.dataType ?? 'STRING',
    };
  }
}
