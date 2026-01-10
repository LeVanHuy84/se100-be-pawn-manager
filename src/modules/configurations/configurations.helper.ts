import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConfigurationsHelper {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get LEGAL_INTEREST_CAP from SystemParameter
   * @returns Interest cap as number (e.g., 20.0 for 20%)
   */
  async getLegalInterestCap(): Promise<number> {
    const param = await this.prisma.systemParameter.findFirst({
      where: {
        paramKey: 'LEGAL_INTEREST_CAP',
        isActive: true,
      },
    });

    if (!param) {
      // Default to 20% if not configured (Vietnam Civil Code 2015)
      return 20.0;
    }

    return parseFloat(param.paramValue);
  }

  /**
   * Check if total interest rate exceeds legal cap
   * @param annualRate Total annual interest rate (%)
   * @returns true if exceeds cap, false otherwise
   */
  async exceedsLegalCap(annualRate: number): Promise<boolean> {
    const cap = await this.getLegalInterestCap();
    return annualRate > cap;
  }

  /**
   * Get configuration value by key
   * @param key Parameter key
   * @returns Parameter value as string, or null if not found
   */
  async getConfigValue(key: string): Promise<string | null> {
    const param = await this.prisma.systemParameter.findFirst({
      where: {
        paramKey: key,
        isActive: true,
      },
    });

    return param?.paramValue ?? null;
  }

  /**
   * Get configuration value as decimal
   * @param key Parameter key
   * @param defaultValue Default value if not found
   * @returns Parameter value as number
   */
  async getConfigDecimal(key: string, defaultValue: number): Promise<number> {
    const value = await this.getConfigValue(key);
    if (!value) return defaultValue;

    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get configuration value as integer
   * @param key Parameter key
   * @param defaultValue Default value if not found
   * @returns Parameter value as integer
   */
  async getConfigInteger(key: string, defaultValue: number): Promise<number> {
    const value = await this.getConfigValue(key);
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get configuration value as boolean
   * @param key Parameter key
   * @param defaultValue Default value if not found
   * @returns Parameter value as boolean
   */
  async getConfigBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const value = await this.getConfigValue(key);
    if (!value) return defaultValue;

    return value === 'true' || value === '1';
  }
}
