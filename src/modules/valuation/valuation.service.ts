import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { ValuationRequestDto } from './dto/request/valuation.request';
import { ValuationResponse } from './dto/response/valuation.response';
import { BaseResult } from 'src/common/dto/base.response';

@Injectable()
export class ValuationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async createValuation(
    dto: ValuationRequestDto,
  ): Promise<BaseResult<ValuationResponse>> {
    const collaeralType = await this.prisma.collateralType.findUnique({
      where: { id: dto.collateralTypeId },
      select: { name: true },
    });

    // Get AI-powered market price estimate
    const marketEstimate = await this.geminiService.getMarketPriceEstimate(
      collaeralType?.name || 'UNKNOWN',
      dto.brand,
      dto.model,
      dto.year,
      dto.condition,
      dto.mileage,
    );

    // Calculate depreciation rate
    const currentYear = new Date().getFullYear();
    const age = currentYear - dto.year;
    const depreciationRate = this.calculateDepreciationRate(
      collaeralType?.name || 'UNKNOWN',
      age,
    );

    // Get LTV ratio from system parameters
    const ltvRatio = await this.getLtvRatio(collaeralType?.name || 'UNKNOWN');

    // Calculate max loan amount
    const maxLoanAmount = Math.round(
      marketEstimate.estimatedPrice * (ltvRatio / 100),
    );

    return {
      data: {
        assetType: collaeralType?.name || 'UNKNOWN',
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        condition: dto.condition,
        suggestedMarketValue: marketEstimate.estimatedPrice,
        minValue: marketEstimate.minPrice,
        maxValue: marketEstimate.maxPrice,
        confidenceLevel: marketEstimate.confidence,
        ltvRatio,
        maxLoanAmount,
        depreciationRate,
        valuationDate: new Date(),
        notes: marketEstimate.reasoning,
      },
    };
  }

  private calculateDepreciationRate(assetType: string, age: number): number {
    // Depreciation rate per year (%)
    const ratePerYear = assetType === 'MOTORBIKE' ? 12 : 15;
    return Math.min(ratePerYear * age, 80); // Cap at 80%
  }

  private async getLtvRatio(assetType: string): Promise<number> {
    let paramKey = '';
    const paramGroup = 'LIMITS';

    switch (assetType) {
      case 'MOTORBIKE':
        paramKey = 'BIKE_MAX_LTV';
        break;
      case 'CAR':
        paramKey = 'CAR_MAX_LTV';
        break;
      case 'GOLD':
        paramKey = 'GOLD_MAX_LTV';
        break;
      default:
        paramKey = 'OTHER_MAX_LTV';
    }

    try {
      const param = await this.prisma.systemParameter.findUnique({
        where: {
          paramGroup_paramKey: {
            paramGroup: paramGroup,
            paramKey: paramKey,
          },
        },
      });

      if (param && param.paramValue) {
        return parseFloat(param.paramValue);
      }
    } catch (error) {
      // If parameter not found, use default
    }

    // Default LTV ratios
    return assetType === 'MOTORBIKE'
      ? 70
      : assetType === 'CAR'
        ? 80
        : assetType === 'GOLD'
          ? 85
          : 50;
  }
}
