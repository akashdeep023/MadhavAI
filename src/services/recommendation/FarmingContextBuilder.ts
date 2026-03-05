/**
 * Farming Context Builder
 * Builds comprehensive farming context from aggregated data
 * Requirements: 16.1
 */

import { FarmingContext } from '../../types/recommendation.types';
import { dataAggregator } from './DataAggregator';

/**
 * Enhanced farming context with computed properties
 */
export interface EnhancedFarmingContext extends FarmingContext {
  computed: {
    farmSizeCategory: 'small' | 'medium' | 'large';
    soilHealthRating: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    weatherRisk: 'low' | 'medium' | 'high';
    marketOpportunity: 'favorable' | 'neutral' | 'unfavorable' | 'unknown';
    recommendationReadiness: number; // 0-100
  };
}

/**
 * Farming context builder with data enrichment
 */
export class FarmingContextBuilder {
  /**
   * Build enhanced farming context for a user
   */
  async buildContext(userId: string): Promise<EnhancedFarmingContext> {
    // Aggregate base data
    const baseContext = await dataAggregator.aggregateData(userId);

    // Compute derived properties
    const computed = {
      farmSizeCategory: this.categorizeFarmSize(baseContext),
      soilHealthRating: this.assessSoilHealth(baseContext),
      weatherRisk: this.assessWeatherRisk(baseContext),
      marketOpportunity: this.assessMarketOpportunity(baseContext),
      recommendationReadiness: this.calculateReadiness(baseContext),
    };

    return {
      ...baseContext,
      computed,
    };
  }

  /**
   * Categorize farm size
   */
  private categorizeFarmSize(context: FarmingContext): 'small' | 'medium' | 'large' {
    const farmSize = context.userProfile.farmSize || 0;

    if (farmSize < 2) {
      return 'small'; // < 2 hectares
    } else if (farmSize < 10) {
      return 'medium'; // 2-10 hectares
    } else {
      return 'large'; // > 10 hectares
    }
  }

  /**
   * Assess soil health rating
   */
  private assessSoilHealth(
    context: FarmingContext
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    if (!context.soilData) {
      return 'unknown';
    }

    const { parameters } = context.soilData;
    let score = 0;
    let factors = 0;

    // pH assessment (optimal: 6.0-7.5)
    if (parameters.pH >= 6.0 && parameters.pH <= 7.5) {
      score += 25;
    } else if (parameters.pH >= 5.5 && parameters.pH <= 8.0) {
      score += 15;
    } else {
      score += 5;
    }
    factors++;

    // Nitrogen assessment (optimal: > 280 kg/ha)
    if (parameters.nitrogen > 280) {
      score += 25;
    } else if (parameters.nitrogen > 200) {
      score += 15;
    } else {
      score += 5;
    }
    factors++;

    // Phosphorus assessment (optimal: > 25 kg/ha)
    if (parameters.phosphorus > 25) {
      score += 25;
    } else if (parameters.phosphorus > 15) {
      score += 15;
    } else {
      score += 5;
    }
    factors++;

    // Potassium assessment (optimal: > 280 kg/ha)
    if (parameters.potassium > 280) {
      score += 25;
    } else if (parameters.potassium > 200) {
      score += 15;
    } else {
      score += 5;
    }
    factors++;

    const averageScore = score / factors;

    if (averageScore >= 22) return 'excellent';
    if (averageScore >= 17) return 'good';
    if (averageScore >= 12) return 'fair';
    return 'poor';
  }

  /**
   * Assess weather risk
   */
  private assessWeatherRisk(context: FarmingContext): 'low' | 'medium' | 'high' {
    if (!context.weatherForecast) {
      return 'medium'; // Unknown = medium risk
    }

    const { daily } = context.weatherForecast;
    let riskScore = 0;

    // Check for extreme temperatures
    const hasExtremeTemp = daily.some(
      (day) => day.temperature.max > 40 || day.temperature.min < 5
    );
    if (hasExtremeTemp) riskScore += 2;

    // Check for heavy rainfall
    const hasHeavyRain = daily.some((day) => day.precipitation.amount > 50);
    if (hasHeavyRain) riskScore += 2;

    // Check for high wind
    const hasHighWind = daily.some((day) => day.wind.speed > 40);
    if (hasHighWind) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Assess market opportunity
   */
  private assessMarketOpportunity(
    context: FarmingContext
  ): 'favorable' | 'neutral' | 'unfavorable' | 'unknown' {
    if (!context.marketData || !context.marketData.trends || context.marketData.trends.length === 0) {
      return 'unknown';
    }

    const trend = context.marketData.trends[0];

    // Favorable if prices are rising or stable with high prices
    if (trend.trend === 'rising') {
      return 'favorable';
    }

    // Unfavorable if prices are falling
    if (trend.trend === 'falling') {
      return 'unfavorable';
    }

    // Neutral if stable
    return 'neutral';
  }

  /**
   * Calculate recommendation readiness score (0-100)
   */
  private calculateReadiness(context: FarmingContext): number {
    let score = 0;

    // User profile (20 points)
    if (context.userProfile) score += 20;

    // Location (15 points)
    if (context.userProfile.location) score += 15;

    // Farm data (15 points)
    if (context.userProfile.farmSize && context.userProfile.primaryCrops && context.userProfile.primaryCrops.length > 0) {
      score += 15;
    }

    // Soil data (20 points)
    if (context.soilData) score += 20;

    // Weather data (15 points)
    if (context.weatherForecast) score += 15;

    // Market data (15 points)
    if (context.marketData) score += 15;

    return score;
  }

  /**
   * Get missing data recommendations
   */
  getMissingDataRecommendations(context: EnhancedFarmingContext): string[] {
    const recommendations: string[] = [];

    if (!context.soilData) {
      recommendations.push('Upload your soil health card for better crop recommendations');
    }

    if (!context.userProfile.location || !context.userProfile.location.state || !context.userProfile.location.district) {
      recommendations.push('Add your farm location for weather and market insights');
    }

    if (!context.userProfile.farmSize || !context.userProfile.primaryCrops || context.userProfile.primaryCrops.length === 0) {
      recommendations.push('Complete your farm profile with size and current crops');
    }

    if (context.computed.recommendationReadiness < 70) {
      recommendations.push(
        'Complete your profile to get personalized recommendations'
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const farmingContextBuilder = new FarmingContextBuilder();
