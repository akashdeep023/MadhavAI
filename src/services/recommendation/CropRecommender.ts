/**
 * Crop Recommender Service
 * Generates crop recommendations based on farming context
 * Requirements: 7.1, 7.2, 7.3, 7.4, 16.2
 */

import {
  CropRecommendation,
  CultivationPlan,
  CropActivity,
  CostEstimate,
  YieldEstimate,
} from '../../types/recommendation.types';
import { EnhancedFarmingContext } from './FarmingContextBuilder';

/**
 * Crop database with cultivation details
 */
interface CropData {
  name: string;
  seasons: string[];
  soilTypes: string[];
  phRange: { min: number; max: number };
  duration: number; // days
  waterRequirement: 'low' | 'medium' | 'high';
  profitability: number; // 1-10
  riskLevel: number; // 1-10 (lower is better)
  activities: Omit<CropActivity, 'id'>[];
  costEstimate: CostEstimate;
  yieldEstimate: YieldEstimate;
}

/**
 * Crop recommender with rule-based logic
 * Note: Can be enhanced with AWS Bedrock AI in production
 */
export class CropRecommender {
  private cropDatabase: CropData[] = [
    {
      name: 'Rice',
      seasons: ['kharif'],
      soilTypes: ['clayey', 'loamy'],
      phRange: { min: 5.5, max: 7.0 },
      duration: 120,
      waterRequirement: 'high',
      profitability: 7,
      riskLevel: 4,
      activities: [
        {
          name: 'Land Preparation',
          description: 'Plow and level the field',
          timing: 'Before sowing',
          daysFromSowing: -15,
          priority: 'high',
          resources: ['Tractor', 'Labor'],
        },
        {
          name: 'Sowing',
          description: 'Transplant rice seedlings',
          timing: 'June-July',
          daysFromSowing: 0,
          priority: 'high',
          resources: ['Seeds', 'Labor'],
        },
        {
          name: 'First Fertilizer Application',
          description: 'Apply basal fertilizer',
          timing: '15 days after sowing',
          daysFromSowing: 15,
          priority: 'high',
          resources: ['Urea', 'DAP'],
        },
        {
          name: 'Weeding',
          description: 'Remove weeds manually or chemically',
          timing: '20-25 days after sowing',
          daysFromSowing: 22,
          priority: 'medium',
          resources: ['Labor', 'Herbicide'],
        },
        {
          name: 'Second Fertilizer Application',
          description: 'Apply top dressing',
          timing: '40 days after sowing',
          daysFromSowing: 40,
          priority: 'high',
          resources: ['Urea'],
        },
        {
          name: 'Pest Control',
          description: 'Monitor and control pests',
          timing: '50-60 days after sowing',
          daysFromSowing: 55,
          priority: 'medium',
          resources: ['Pesticide'],
        },
        {
          name: 'Harvesting',
          description: 'Harvest when grains are mature',
          timing: '110-120 days after sowing',
          daysFromSowing: 115,
          priority: 'high',
          resources: ['Harvester', 'Labor'],
        },
      ],
      costEstimate: {
        min: 25000,
        max: 35000,
        breakdown: {
          seeds: 3000,
          fertilizers: 8000,
          pesticides: 4000,
          labor: 12000,
          irrigation: 5000,
          other: 3000,
        },
      },
      yieldEstimate: {
        min: 40,
        max: 60,
        unit: 'quintals/hectare',
        expectedRevenue: {
          min: 80000,
          max: 120000,
        },
      },
    },
    {
      name: 'Wheat',
      seasons: ['rabi'],
      soilTypes: ['loamy', 'clayey'],
      phRange: { min: 6.0, max: 7.5 },
      duration: 120,
      waterRequirement: 'medium',
      profitability: 6,
      riskLevel: 3,
      activities: [
        {
          name: 'Land Preparation',
          description: 'Plow and prepare seedbed',
          timing: 'Before sowing',
          daysFromSowing: -10,
          priority: 'high',
          resources: ['Tractor', 'Labor'],
        },
        {
          name: 'Sowing',
          description: 'Sow wheat seeds',
          timing: 'November',
          daysFromSowing: 0,
          priority: 'high',
          resources: ['Seeds', 'Seed drill'],
        },
        {
          name: 'First Irrigation',
          description: 'Crown root irrigation',
          timing: '20-25 days after sowing',
          daysFromSowing: 22,
          priority: 'high',
          resources: ['Water'],
        },
        {
          name: 'First Fertilizer Application',
          description: 'Apply nitrogen fertilizer',
          timing: '30 days after sowing',
          daysFromSowing: 30,
          priority: 'high',
          resources: ['Urea'],
        },
        {
          name: 'Weed Control',
          description: 'Apply herbicide or manual weeding',
          timing: '30-35 days after sowing',
          daysFromSowing: 32,
          priority: 'medium',
          resources: ['Herbicide', 'Labor'],
        },
        {
          name: 'Second Irrigation',
          description: 'Tillering stage irrigation',
          timing: '40-45 days after sowing',
          daysFromSowing: 42,
          priority: 'high',
          resources: ['Water'],
        },
        {
          name: 'Harvesting',
          description: 'Harvest when grains are golden',
          timing: '110-120 days after sowing',
          daysFromSowing: 115,
          priority: 'high',
          resources: ['Harvester', 'Labor'],
        },
      ],
      costEstimate: {
        min: 20000,
        max: 28000,
        breakdown: {
          seeds: 2500,
          fertilizers: 6000,
          pesticides: 3000,
          labor: 10000,
          irrigation: 4000,
          other: 2500,
        },
      },
      yieldEstimate: {
        min: 35,
        max: 50,
        unit: 'quintals/hectare',
        expectedRevenue: {
          min: 70000,
          max: 100000,
        },
      },
    },
    {
      name: 'Cotton',
      seasons: ['kharif'],
      soilTypes: ['black', 'loamy'],
      phRange: { min: 6.0, max: 8.0 },
      duration: 180,
      waterRequirement: 'medium',
      profitability: 8,
      riskLevel: 6,
      activities: [
        {
          name: 'Land Preparation',
          description: 'Deep plowing and leveling',
          timing: 'Before sowing',
          daysFromSowing: -15,
          priority: 'high',
          resources: ['Tractor', 'Labor'],
        },
        {
          name: 'Sowing',
          description: 'Sow cotton seeds',
          timing: 'May-June',
          daysFromSowing: 0,
          priority: 'high',
          resources: ['Seeds', 'Seed drill'],
        },
        {
          name: 'Thinning',
          description: 'Remove excess plants',
          timing: '20-25 days after sowing',
          daysFromSowing: 22,
          priority: 'medium',
          resources: ['Labor'],
        },
        {
          name: 'First Fertilizer Application',
          description: 'Apply NPK fertilizer',
          timing: '30 days after sowing',
          daysFromSowing: 30,
          priority: 'high',
          resources: ['NPK', 'Urea'],
        },
        {
          name: 'Pest Management',
          description: 'Monitor and control bollworms',
          timing: '60-120 days after sowing',
          daysFromSowing: 90,
          priority: 'high',
          resources: ['Pesticide', 'Pheromone traps'],
        },
        {
          name: 'Picking',
          description: 'Hand pick cotton bolls',
          timing: '150-180 days after sowing',
          daysFromSowing: 165,
          priority: 'high',
          resources: ['Labor'],
        },
      ],
      costEstimate: {
        min: 35000,
        max: 50000,
        breakdown: {
          seeds: 5000,
          fertilizers: 10000,
          pesticides: 12000,
          labor: 15000,
          irrigation: 5000,
          other: 3000,
        },
      },
      yieldEstimate: {
        min: 15,
        max: 25,
        unit: 'quintals/hectare',
        expectedRevenue: {
          min: 90000,
          max: 150000,
        },
      },
    },
    {
      name: 'Maize',
      seasons: ['kharif', 'rabi'],
      soilTypes: ['loamy', 'sandy'],
      phRange: { min: 5.5, max: 7.5 },
      duration: 90,
      waterRequirement: 'medium',
      profitability: 7,
      riskLevel: 4,
      activities: [
        {
          name: 'Land Preparation',
          description: 'Plow and prepare field',
          timing: 'Before sowing',
          daysFromSowing: -10,
          priority: 'high',
          resources: ['Tractor', 'Labor'],
        },
        {
          name: 'Sowing',
          description: 'Sow maize seeds',
          timing: 'June-July or February',
          daysFromSowing: 0,
          priority: 'high',
          resources: ['Seeds', 'Seed drill'],
        },
        {
          name: 'First Fertilizer Application',
          description: 'Apply basal fertilizer',
          timing: '15 days after sowing',
          daysFromSowing: 15,
          priority: 'high',
          resources: ['DAP', 'Urea'],
        },
        {
          name: 'Weeding',
          description: 'Remove weeds',
          timing: '20-25 days after sowing',
          daysFromSowing: 22,
          priority: 'medium',
          resources: ['Labor', 'Herbicide'],
        },
        {
          name: 'Second Fertilizer Application',
          description: 'Apply nitrogen top dressing',
          timing: '35 days after sowing',
          daysFromSowing: 35,
          priority: 'high',
          resources: ['Urea'],
        },
        {
          name: 'Harvesting',
          description: 'Harvest when cobs are mature',
          timing: '85-95 days after sowing',
          daysFromSowing: 90,
          priority: 'high',
          resources: ['Labor'],
        },
      ],
      costEstimate: {
        min: 18000,
        max: 25000,
        breakdown: {
          seeds: 3000,
          fertilizers: 6000,
          pesticides: 3000,
          labor: 8000,
          irrigation: 3000,
          other: 2000,
        },
      },
      yieldEstimate: {
        min: 30,
        max: 45,
        unit: 'quintals/hectare',
        expectedRevenue: {
          min: 60000,
          max: 90000,
        },
      },
    },
    {
      name: 'Sugarcane',
      seasons: ['kharif', 'rabi'],
      soilTypes: ['loamy', 'clayey'],
      phRange: { min: 6.0, max: 7.5 },
      duration: 365,
      waterRequirement: 'high',
      profitability: 9,
      riskLevel: 5,
      activities: [
        {
          name: 'Land Preparation',
          description: 'Deep plowing and trenching',
          timing: 'Before planting',
          daysFromSowing: -20,
          priority: 'high',
          resources: ['Tractor', 'Labor'],
        },
        {
          name: 'Planting',
          description: 'Plant sugarcane setts',
          timing: 'February-March or October',
          daysFromSowing: 0,
          priority: 'high',
          resources: ['Setts', 'Labor'],
        },
        {
          name: 'First Fertilizer Application',
          description: 'Apply basal fertilizer',
          timing: '30 days after planting',
          daysFromSowing: 30,
          priority: 'high',
          resources: ['NPK', 'FYM'],
        },
        {
          name: 'Earthing Up',
          description: 'Cover roots with soil',
          timing: '90 days after planting',
          daysFromSowing: 90,
          priority: 'medium',
          resources: ['Labor'],
        },
        {
          name: 'Pest Control',
          description: 'Control borers and pests',
          timing: '120-240 days after planting',
          daysFromSowing: 180,
          priority: 'high',
          resources: ['Pesticide'],
        },
        {
          name: 'Harvesting',
          description: 'Harvest mature canes',
          timing: '10-12 months after planting',
          daysFromSowing: 330,
          priority: 'high',
          resources: ['Labor', 'Harvester'],
        },
      ],
      costEstimate: {
        min: 60000,
        max: 80000,
        breakdown: {
          seeds: 15000,
          fertilizers: 20000,
          pesticides: 10000,
          labor: 25000,
          irrigation: 8000,
          other: 2000,
        },
      },
      yieldEstimate: {
        min: 600,
        max: 900,
        unit: 'quintals/hectare',
        expectedRevenue: {
          min: 180000,
          max: 270000,
        },
      },
    },
  ];

  /**
   * Generate crop recommendations based on farming context
   */
  async generateRecommendations(
    context: EnhancedFarmingContext,
    limit: number = 5
  ): Promise<CropRecommendation[]> {
    const startTime = Date.now();

    // Score all crops
    const scoredCrops = this.cropDatabase.map((crop) => {
      const suitabilityScore = this.calculateSuitability(crop, context);
      const profitabilityScore = this.calculateProfitability(crop, context);
      const riskScore = this.calculateRisk(crop, context);
      
      // Overall score: weighted average
      const overallScore =
        suitabilityScore * 0.4 + profitabilityScore * 0.35 + (100 - riskScore) * 0.25;

      return {
        crop,
        suitabilityScore,
        profitabilityScore,
        riskScore,
        overallScore,
      };
    });

    // Sort by overall score
    scoredCrops.sort((a, b) => b.overallScore - a.overallScore);

    // Take top N crops
    const topCrops = scoredCrops.slice(0, limit);

    // Generate recommendations
    const recommendations = topCrops.map((scored) =>
      this.createRecommendation(scored, context)
    );

    const elapsedTime = Date.now() - startTime;
    
    // Ensure completion within 5 seconds (requirement 17.2)
    if (elapsedTime > 5000) {
      console.warn(`Crop recommendation took ${elapsedTime}ms, exceeding 5s limit`);
    }

    return recommendations;
  }

  /**
   * Calculate suitability score (0-100)
   */
  private calculateSuitability(crop: CropData, context: EnhancedFarmingContext): number {
    let score = 0;

    // Season match (30 points)
    if (crop.seasons.includes(context.currentSeason)) {
      score += 30;
    }

    // Soil type match (25 points)
    if (context.userProfile.soilType) {
      if (crop.soilTypes.includes(context.userProfile.soilType)) {
        score += 25;
      }
    }

    // pH match (25 points)
    if (context.soilData) {
      const pH = context.soilData.parameters.pH;
      if (pH >= crop.phRange.min && pH <= crop.phRange.max) {
        score += 25;
      } else if (pH >= crop.phRange.min - 0.5 && pH <= crop.phRange.max + 0.5) {
        score += 15;
      }
    }

    // Water availability (20 points)
    // Note: irrigationType is not in UserProfile, using default scoring
    if (crop.waterRequirement === 'low') {
      score += 15;
    } else if (crop.waterRequirement === 'medium') {
      score += 12;
    } else {
      // high water requirement
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate profitability score (0-100)
   */
  private calculateProfitability(crop: CropData, context: EnhancedFarmingContext): number {
    let score = crop.profitability * 10; // Base score from crop data

    // Adjust based on market conditions
    if (context.marketData) {
      if (context.computed.marketOpportunity === 'favorable') {
        score += 15;
      } else if (context.computed.marketOpportunity === 'unfavorable') {
        score -= 15;
      }
    }

    // Adjust based on farm size
    if (context.computed.farmSizeCategory === 'large') {
      score += 10; // Economies of scale
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate risk score (0-100, lower is better)
   */
  private calculateRisk(crop: CropData, context: EnhancedFarmingContext): number {
    let score = crop.riskLevel * 10; // Base risk from crop data

    // Weather risk
    if (context.computed.weatherRisk === 'high') {
      score += 20;
    } else if (context.computed.weatherRisk === 'medium') {
      score += 10;
    }

    // Soil health risk
    if (context.computed.soilHealthRating === 'poor') {
      score += 15;
    } else if (context.computed.soilHealthRating === 'fair') {
      score += 8;
    }

    return Math.min(score, 100);
  }

  /**
   * Create recommendation from scored crop
   */
  private createRecommendation(
    scored: {
      crop: CropData;
      suitabilityScore: number;
      profitabilityScore: number;
      riskScore: number;
      overallScore: number;
    },
    context: EnhancedFarmingContext
  ): CropRecommendation {
    const { crop, suitabilityScore, profitabilityScore, riskScore, overallScore } = scored;

    // Generate cultivation plan
    const cultivationPlan = this.generateCultivationPlan(crop);

    // Generate explanation
    const explanation = this.generateExplanation(
      crop,
      suitabilityScore,
      profitabilityScore,
      riskScore,
      context
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(context);

    return {
      cropName: crop.name,
      suitabilityScore: Math.round(suitabilityScore),
      profitabilityScore: Math.round(profitabilityScore),
      riskScore: Math.round(riskScore),
      overallScore: Math.round(overallScore),
      cultivationPlan,
      explanation,
      confidence,
    };
  }

  /**
   * Generate cultivation plan
   */
  private generateCultivationPlan(crop: CropData): CultivationPlan {
    return {
      cropName: crop.name,
      duration: crop.duration,
      activities: crop.activities.map((activity, index) => ({
        id: `${crop.name.toLowerCase()}-activity-${index + 1}`,
        ...activity,
      })),
      estimatedCost: crop.costEstimate,
      estimatedYield: crop.yieldEstimate,
    };
  }

  /**
   * Generate explanation
   */
  private generateExplanation(
    crop: CropData,
    suitabilityScore: number,
    profitabilityScore: number,
    riskScore: number,
    _context: EnhancedFarmingContext
  ): string {
    const parts: string[] = [];

    parts.push(`${crop.name} is recommended for your farm.`);

    // Suitability
    if (suitabilityScore >= 80) {
      parts.push('It is highly suitable for your soil and climate conditions.');
    } else if (suitabilityScore >= 60) {
      parts.push('It is moderately suitable for your conditions.');
    } else {
      parts.push('It may require additional care due to soil or climate conditions.');
    }

    // Profitability
    if (profitabilityScore >= 80) {
      parts.push('Expected profitability is high.');
    } else if (profitabilityScore >= 60) {
      parts.push('Expected profitability is moderate.');
    }

    // Risk
    if (riskScore <= 30) {
      parts.push('Risk level is low.');
    } else if (riskScore <= 60) {
      parts.push('Risk level is moderate.');
    } else {
      parts.push('Risk level is high - careful management required.');
    }

    // Season
    parts.push(`Best grown in ${crop.seasons.join(' or ')} season.`);

    // Duration
    parts.push(`Crop duration is approximately ${crop.duration} days.`);

    return parts.join(' ');
  }

  /**
   * Calculate confidence based on data completeness
   */
  private calculateConfidence(context: EnhancedFarmingContext): number {
    return context.computed.recommendationReadiness;
  }
}

// Export singleton instance
export const cropRecommender = new CropRecommender();
