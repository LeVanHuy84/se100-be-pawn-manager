import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProvinceResponse, WardResponse } from './dto/location.response';
import { LocationLevel } from 'generated/prisma';
import { BaseResult } from 'src/common/dto/base.response';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /provinces?search=
   * - Không search: trả tất cả province
   * - Có search: chỉ search trong province
   */
  async getLocations(search?: string): Promise<BaseResult<ProvinceResponse[]>> {
    const provinces = await this.prisma.location.findMany({
      where: {
        level: LocationLevel.PROVINCE,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: provinces.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      })),
    };
  }

  /**
   * GET /provinces/:code/wards?search=
   */
  async getWardsByProvinceCode(
    provinceCode: string,
    search?: string,
  ): Promise<BaseResult<WardResponse[]>> {
    // 1️⃣ Tìm province theo code
    const province = await this.prisma.location.findUnique({
      where: {
        code: provinceCode,
      },
    });

    if (!province || province.level !== LocationLevel.PROVINCE) {
      throw new NotFoundException('Province not found');
    }

    // 2️⃣ Lấy wards theo parentId
    const wards = await this.prisma.location.findMany({
      where: {
        level: LocationLevel.WARD,
        parentId: province.id,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: wards.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        parentId: w.parentId!,
      })),
    };
  }
}
