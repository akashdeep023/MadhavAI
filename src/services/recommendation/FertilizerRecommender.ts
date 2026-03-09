/**
 * Fertilizer Recommender Service
 * Generates fertilizer recommendations based on soil, crop, and growth stage
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import {
  FertilizerRecommendation,
  FertilizerAlternative,
} from '../../types/recommendation.types';
import { EnhancedFarmingContext } from './FarmingContextBuilder';

/**
 * Growth stage for crop
 */
export type GrowthStage =
  | 'pre_sowing'
  | 'sowing'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'maturity';

/**
 * Fertilizer database
 */
interface FertilizerData {
  nutrient: string;
  type: 'organic' | 'chemical';
  name: string;
  npkRatio?: string;
  dosagePerHectare: {
    amount: number;
    unit: string;
  };
  costPerUnit: {
    min: number;
    max: number;
  };
  applicationMethod: string;
  effectiveness: number; // 1-10
}

/**
 * Fertilizer recommender with soil-based logic
 */
export class FertilizerRecommender {
  private fertilizerDatabase: FertilizerData[] = [
    // Nitrogen fertilizers
    {
      nutrient: 'nitrogen',
      type: 'chemical',
      name: 'Urea',
      npkRatio: '46-0-0',
      dosagePerHectare: { amount: 100, unit: 'kg' },
      costPerUnit: { min: 6, max: 8 },
      applicationMethod: 'Broadcasting or top dressing',
      effectiveness: 9,
    },
    {
      nutrient: 'nitrogen',
      type: 'organic',
      name: 'Farmyard Manure (FYM)',
      dosagePerHectare: { amount: 5000, unit: 'kg' },
      costPerUnit: { min: 1, max: 2 },
      applicationMethod: 'Spread and incorporate into soil',
      effectiveness: 7,
    },
    {
      nutrient: 'nitrogen',
      type: 'organic',
      name: 'Vermicompost',
      dosagePerHectare: { amount: 2500, unit: 'kg' },
      costPerUnit: { min: 3, max: 5 },
      applicationMethod: 'Mix with soil before sowing',
      effectiveness: 8,
    },
    // Phosphorus fertilizers
    {
      nutrient: 'phosphorus',
      type: 'chemical',
      name: 'DAP (Diammonium Phosphate)',
      npkRatio: '18-46-0',
      dosagePerHectare: { amount: 75, unit: 'kg' },
      costPerUnit: { min: 27, max: 30 },
      applicationMethod: 'Basal application before sowing',
      effectiveness: 9,
    },
    {
      nutrient: 'phosphorus',
      type: 'chemical',
      name: 'Single Super Phosphate (SSP)',
      npkRatio: '0-16-0',
      dosagePerHectare: { amount: 150, unit: 'kg' },
      costPerUnit: { min: 8, max: 10 },
      applicationMethod: 'Basal application',
      effectiveness: 7,
    },
    {
      nutrient: 'phosphorus',
      type: 'organic',
      name: 'Rock Phosphate',
      dosagePerHectare: { amount: 200, unit: 'kg' },
      costPerUnit: { min: 5, max: 7 },
      applicationMethod: 'Mix with compost and apply',
      effectiveness: 6,
    },
    // Potassium fertilizers
    {
      nutrient: 'potassium',
      type: 'chemical',
      name: 'Muriate of Potash (MOP)',
      npkRatio: '0-0-60',
      dosagePerHectare: { amount: 50, unit: 'kg' },
      costPerUnit: { min: 18, max: 22 },
      applicationMethod: 'Split application with irrigation',
      effectiveness: 9,
    },
    {
      nutrient: 'potassium',
      type: 'chemical',
      name: 'Sulphate of Potash (SOP)',
      npkRatio: '0-0-50',
      dosagePerHectare: { amount: 60, unit: 'kg' },
      costPerUnit: { min: 25, max: 30 },
      applicationMethod: 'Split application',
      effectiveness: 8,
    },
    {
      nutrient: 'potassium',
      type: 'organic',
      name: 'Wood Ash',
      dosagePerHectare: { amount: 500, unit: 'kg' },
      costPerUnit: { min: 1, max: 2 },
      applicationMethod: 'Spread and mix with soil',
      effectiveness: 5,
    },
    // NPK complex fertilizers
    {
      nutrient: 'npk',
      type: 'chemical',
      name: 'NPK 19-19-19',
      npkRatio: '19-19-19',
      dosagePerHectare: { amount: 100, unit: 'kg' },
      costPerUnit: { min: 20, max: 25 },
      applicationMethod: 'Split application at different growth stages',
      effectiveness: 9,
    },
    {
      nutrient: 'npk',
      type: 'chemical',
      name: 'NPK 12-32-16',
      npkRatio: '12-32-16',
      dosagePerHectare: { amount: 125, unit: 'kg' },
      costPerUnit: { min: 18, max: 22 },
      applicationMethod: 'Basal and top dressing',
      effectiveness: 8,
    },
  ];

  /**
   * Generate fertilizer recommendations
   */
  async generateRecommendations(
    context: EnhancedFarmingContext,
    cropName: string,
    growthStage: GrowthStage
  ): Promise<FertilizerRecommendation[]> {
    const recommendations: FertilizerRecommendation[] = [];

    // Analyze soil nutrient deficiencies
    const deficiencies = this.analyzeNutrientDeficiencies(context);

    // Generate recommendations for each deficiency
    for (const deficiency of deficiencies) {
      const recommendation = this.createRecommendation(
        deficiency,
        cropName,
        growthStage,
        context
      );
      recommendations.push(recommendation);
    }

    // Check for overuse
    this.checkOveruse(recommendations, context);

    return recommendations;
  }

  /**
   * Analyze nutrient deficiencies from soil data
   */
  private analyzeNutrientDeficiencies(context: EnhancedFarmingContext): string[] {
    const deficiencies: string[] = [];

    if (!context.soilData) {
      // If no soil data, recommend balanced NPK
      return ['npk'];
    }

    const { parameters } = context.soilData;

    // Nitrogen deficiency (< 280 kg/ha)
    if (parameters.nitrogen < 280) {
      deficiencies.push('nitrogen');
    }

    // Phosphorus deficiency (< 25 kg/ha)
    if (parameters.phosphorus < 25) {
      deficiencies.push('phosphorus');
    }

    // Potassium deficiency (< 280 kg/ha)
    if (parameters.potassium < 280) {
      deficiencies.push('potassium');
    }

    // If no specific deficiency, recommend balanced NPK for maintenance
    if (deficiencies.length === 0) {
      deficiencies.push('npk');
    }

    return deficiencies;
  }

  /**
   * Create recommendation for a nutrient
   */
  private createRecommendation(
    nutrient: string,
    cropName: string,
    growthStage: GrowthStage,
    context: EnhancedFarmingContext
  ): FertilizerRecommendation {
    // Find best fertilizer for this nutrient
    const fertilizers = this.fertilizerDatabase.filter((f) => f.nutrient === nutrient);
    
    // Prefer chemical for faster results, but include organic alternatives
    const primaryFertilizer = fertilizers.find((f) => f.type === 'chemical') || fertilizers[0];
    const alternatives = fertilizers
      .filter((f) => f.name !== primaryFertilizer.name)
      .slice(0, 2)
      .map((f) => this.createAlternative(f));

    // Calculate dosage based on deficiency severity
    const dosage = this.calculateDosage(primaryFertilizer, nutrient, context);

    // Determine application timing
    const timing = this.getApplicationTiming(nutrient, growthStage, cropName);

    // Calculate cost
    const totalAmount = dosage.amount;
    const costPerUnit = primaryFertilizer.costPerUnit;
    const cost = {
      min: Math.round(totalAmount * costPerUnit.min),
      max: Math.round(totalAmount * costPerUnit.max),
    };

    // Generate explanation
    const explanation = this.generateExplanation(
      nutrient,
      primaryFertilizer,
      context,
      growthStage
    );

    // Calculate confidence
    const confidence = context.computed.recommendationReadiness;

    return {
      nutrient: this.getNutrientDisplayName(nutrient),
      type: primaryFertilizer.type,
      name: primaryFertilizer.name,
      dosage: {
        amount: dosage.amount,
        unit: dosage.unit,
        perArea: 'per hectare',
      },
      applicationTiming: timing,
      applicationMethod: primaryFertilizer.applicationMethod,
      cost,
      alternatives,
      explanation,
      confidence,
    };
  }

  /**
   * Create alternative fertilizer option
   */
  private createAlternative(fertilizer: FertilizerData): FertilizerAlternative {
    return {
      name: fertilizer.name,
      type: fertilizer.type,
      dosage: {
        amount: fertilizer.dosagePerHectare.amount,
        unit: fertilizer.dosagePerHectare.unit,
        perArea: 'per hectare',
      },
      cost: {
        min: Math.round(fertilizer.dosagePerHectare.amount * fertilizer.costPerUnit.min),
        max: Math.round(fertilizer.dosagePerHectare.amount * fertilizer.costPerUnit.max),
      },
      effectiveness: fertilizer.effectiveness * 10, // Convert to percentage
    };
  }

  /**
   * Calculate dosage based on deficiency severity
   */
  private calculateDosage(
    fertilizer: FertilizerData,
    nutrient: string,
    context: EnhancedFarmingContext
  ): { amount: number; unit: string } {
    let baseDosage = fertilizer.dosagePerHectare.amount;

    if (context.soilData) {
      const { parameters } = context.soilData;
      
      // Adjust based on deficiency severity
      if (nutrient === 'nitrogen') {
        if (parameters.nitrogen < 200) {
          baseDosage *= 1.2; // Severe deficiency
        } else if (parameters.nitrogen < 250) {
          baseDosage *= 1.1; // Moderate deficiency
        }
      } else if (nutrient === 'phosphorus') {
        if (parameters.phosphorus < 15) {
          baseDosage *= 1.2;
        } else if (parameters.phosphorus < 20) {
          baseDosage *= 1.1;
        }
      } else if (nutrient === 'potassium') {
        if (parameters.potassium < 200) {
          baseDosage *= 1.2;
        } else if (parameters.potassium < 250) {
          baseDosage *= 1.1;
        }
      }
    }

    return {
      amount: Math.round(baseDosage),
      unit: fertilizer.dosagePerHectare.unit,
    };
  }

  /**
   * Get application timing based on growth stage
   */
  private getApplicationTiming(
    nutrient: string,
    growthStage: GrowthStage,
    _cropName: string
  ): string {
    const timings: Record<string, Record<GrowthStage, string>> = {
      nitrogen: {
        pre_sowing: 'Not recommended',
        sowing: '50% at sowing as basal dose',
        vegetative: '25% at 20-25 days after sowing',
        flowering: '25% at flowering stage',
        fruiting: 'Not recommended',
        maturity: 'Not recommended',
      },
      phosphorus: {
        pre_sowing: 'Apply 1 week before sowing',
        sowing: 'Full dose at sowing as basal application',
        vegetative: 'Not recommended',
        flowering: 'Not recommended',
        fruiting: 'Not recommended',
        maturity: 'Not recommended',
      },
      potassium: {
        pre_sowing: 'Not recommended',
        sowing: '50% at sowing',
        vegetative: '25% at 30 days after sowing',
        flowering: '25% at flowering',
        fruiting: 'Not recommended',
        maturity: 'Not recommended',
      },
      npk: {
        pre_sowing: 'Not recommended',
        sowing: '40% at sowing as basal dose',
        vegetative: '30% at 25-30 days after sowing',
        flowering: '30% at flowering stage',
        fruiting: 'Not recommended',
        maturity: 'Not recommended',
      },
    };

    return timings[nutrient]?.[growthStage] || 'Consult agricultural expert';
  }

  /**
   * Generate explanation
   */
  private generateExplanation(
    nutrient: string,
    fertilizer: FertilizerData,
    context: EnhancedFarmingContext,
    growthStage: GrowthStage
  ): string {
    const parts: string[] = [];

    if (context.soilData) {
      const { parameters } = context.soilData;
      
      if (nutrient === 'nitrogen' && parameters.nitrogen < 280) {
        parts.push(
          `Your soil has low nitrogen (${parameters.nitrogen} kg/ha). Nitrogen is essential for leaf growth and overall plant vigor.`
        );
      } else if (nutrient === 'phosphorus' && parameters.phosphorus < 25) {
        parts.push(
          `Your soil has low phosphorus (${parameters.phosphorus} kg/ha). Phosphorus promotes root development and flowering.`
        );
      } else if (nutrient === 'potassium' && parameters.potassium < 280) {
        parts.push(
          `Your soil has low potassium (${parameters.potassium} kg/ha). Potassium improves disease resistance and fruit quality.`
        );
      } else {
        parts.push('Balanced fertilization recommended for optimal crop growth.');
      }
    } else {
      parts.push('Balanced fertilization recommended based on general crop requirements.');
    }

    parts.push(`${fertilizer.name} is recommended for ${growthStage.replace('_', ' ')} stage.`);
    
    if (fertilizer.type === 'organic') {
      parts.push('Organic option provides slow-release nutrients and improves soil health.');
    } else {
      parts.push('Chemical fertilizer provides quick nutrient availability.');
    }

    return parts.join(' ');
  }

  /**
   * Get nutrient display name
   */
  private getNutrientDisplayName(nutrient: string): string {
    const names: Record<string, string> = {
      nitrogen: 'Nitrogen (N)',
      phosphorus: 'Phosphorus (P)',
      potassium: 'Potassium (K)',
      npk: 'NPK Complex',
    };
    return names[nutrient] || nutrient;
  }

  /**
   * Check for overuse and add warnings
   */
  private checkOveruse(
    recommendations: FertilizerRecommendation[],
    context: EnhancedFarmingContext
  ): void {
    if (!context.soilData) return;

    const { parameters } = context.soilData;

    // Check if soil already has high nutrient levels
    recommendations.forEach((rec) => {
      if (rec.nutrient.includes('Nitrogen') && parameters.nitrogen > 400) {
        rec.explanation += ' WARNING: Soil already has high nitrogen. Excessive use may cause lodging and reduce grain quality.';
      }
      if (rec.nutrient.includes('Phosphorus') && parameters.phosphorus > 50) {
        rec.explanation += ' WARNING: Soil already has high phosphorus. Excessive use may reduce micronutrient availability.';
      }
      if (rec.nutrient.includes('Potassium') && parameters.potassium > 400) {
        rec.explanation += ' WARNING: Soil already has high potassium. Excessive use may affect calcium and magnesium uptake.';
      }
    });
  }
}

// Export singleton instance
export const fertilizerRecommender = new FertilizerRecommender();
