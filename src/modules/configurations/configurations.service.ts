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
import { BaseResult } from 'src/common/dto/base.response';
import { AuditEntityType } from 'generated/prisma';

@Injectable()
export class ConfigurationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listConfigurations(
    group?: ParameterGroup,
  ): Promise<BaseResult<ConfigurationResponse[]>> {
    const params = await this.prisma.systemParameter.findMany({
      where: {
        isActive: true,
        ...(group ? { paramGroup: group } : {}),
      },
      orderBy: [{ paramGroup: 'asc' }, { paramKey: 'asc' }],
    });

    return {
      data: params.map((p) => this.mapToResponse(p)),
    };
  }

  async updateConfiguration(
    key: string,
    data: UpdateConfigurationDto,
  ): Promise<BaseResult<ConfigurationResponse>> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.systemParameter.findFirst({
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

      const updateData = {
        paramValue: normalizedValue,
        ...(data.description !== undefined && {
          description: data.description,
        }),
        updatedAt: new Date(),
      };

      const updatedParam = await tx.systemParameter.update({
        where: { id: existing.id },
        data: updateData,
      });

      // chỉ log những field thực sự thay đổi
      const oldValue: Record<string, any> = {};
      const newValue: Record<string, any> = {};

      if (existing.paramValue !== normalizedValue) {
        oldValue.paramValue = existing.paramValue;
        newValue.paramValue = normalizedValue;
      }

      if (
        data.description !== undefined &&
        existing.description !== data.description
      ) {
        oldValue.description = existing.description;
        newValue.description = data.description;
      }

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_CONFIGURATION',
          entityId: existing.id.toString(),
          entityType: AuditEntityType.CONFIGURATION,
          entityName: existing.paramKey,
          oldValue,
          newValue,
          actorId: null, // sau này lấy từ request context
          description: `Cập nhật cấu hình hệ thống với key "${existing.paramKey}"`,
        },
      });

      return updatedParam;
    });

    return {
      data: this.mapToResponse(updated),
    };
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
