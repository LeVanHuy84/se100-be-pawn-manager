import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.client = new GoogleGenAI({ apiKey });
  }

  async getMarketPriceEstimate(
    assetType: string,
    brand: string,
    model: string,
    year: number,
    condition: string,
    mileage?: number,
  ): Promise<{
    estimatedPrice: number;
    minPrice: number;
    maxPrice: number;
    confidence: string;
    reasoning: string;
  }> {
    try {
      const prompt = this.buildValuationPrompt(
        assetType,
        brand,
        model,
        year,
        condition,
        mileage,
      );

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text;

      return this.parseGeminiResponse(text || '');
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      // Fallback to basic estimation
      return this.getFallbackEstimate(assetType, brand, year, condition);
    }
  }

  private buildValuationPrompt(
    assetType: string,
    brand: string,
    model: string,
    year: number,
    condition: string,
    mileage?: number,
  ): string {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    return `You are a Vietnamese vehicle valuation expert. Analyze current market prices for the following asset and provide a realistic price estimate in Vietnamese Dong (VND).

Asset Details:
- Type: ${assetType}
- Brand: ${brand}
- Model: ${model}
- Year: ${year} (${age} years old)
- Condition: ${condition}
${mileage ? `- Mileage: ${mileage} km` : ''}

Consider:
1. Current market prices on Chợ Tốt (chotot.com), Carmudi (carmudi.vn), and Bonbanh (bonbanh.com)
2. Vehicle age and depreciation (typical ${assetType === 'MOTORBIKE' ? '10-15%' : '15-20%'} per year)
3. Condition impact (EXCELLENT: +15%, GOOD: 0%, FAIR: -15%, POOR: -30%)
4. Popular models in Vietnam (Honda Wave, Vision, Air Blade for bikes; Toyota Vios, Honda City for cars)
5. Supply and demand in Ho Chi Minh City market

Provide response in this exact JSON format (numbers only, no commas):
{
  "estimatedPrice": <number in VND>,
  "minPrice": <number in VND>,
  "maxPrice": <number in VND>,
  "confidence": "<HIGH|MEDIUM|LOW>",
  "reasoning": "<brief explanation in Vietnamese>"
}`;
  }

  private parseGeminiResponse(text: string): {
    estimatedPrice: number;
    minPrice: number;
    maxPrice: number;
    confidence: string;
    reasoning: string;
  } {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        estimatedPrice: parsed.estimatedPrice || 0,
        minPrice: parsed.minPrice || 0,
        maxPrice: parsed.maxPrice || 0,
        confidence: parsed.confidence || 'MEDIUM',
        reasoning: parsed.reasoning || 'AI-generated estimate',
      };
    } catch (error) {
      this.logger.error('Failed to parse Gemini response:', error);
      throw error;
    }
  }

  private getFallbackEstimate(
    assetType: string,
    brand: string,
    year: number,
    condition: string,
  ): {
    estimatedPrice: number;
    minPrice: number;
    maxPrice: number;
    confidence: string;
    reasoning: string;
  } {
    // Basic fallback pricing logic
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    let basePrice = 0;
    if (assetType === 'MOTORBIKE') {
      basePrice = brand.toLowerCase().includes('honda') ? 30000000 : 25000000;
    } else if (assetType === 'CAR') {
      basePrice = 400000000;
    }

    // Apply depreciation (15% per year)
    const depreciationRate = 0.15;
    const depreciatedPrice = basePrice * Math.pow(1 - depreciationRate, age);

    // Apply condition modifier
    const conditionMultiplier =
      condition === 'EXCELLENT'
        ? 1.15
        : condition === 'GOOD'
          ? 1.0
          : condition === 'FAIR'
            ? 0.85
            : 0.7;

    const estimatedPrice = Math.round(depreciatedPrice * conditionMultiplier);
    const variance = estimatedPrice * 0.15;

    return {
      estimatedPrice,
      minPrice: Math.round(estimatedPrice - variance),
      maxPrice: Math.round(estimatedPrice + variance),
      confidence: 'LOW',
      reasoning:
        'Giá ước tính dựa trên mô hình cơ bản (Gemini API không khả dụng)',
    };
  }
}
