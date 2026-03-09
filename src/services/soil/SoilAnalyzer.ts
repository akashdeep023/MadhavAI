/**
 * Soil Analyzer
 * Analyzes soil parameters and provides interpretations
 * Requirements: 10.1, 10.2, 10.8
 */

import { logger } from '../../utils/logger';
import { SoilHealthData, SoilAnalysis, NutrientRange } from '../../types/soil.types';

class SoilAnalyzer {
  private nutrientRanges: NutrientRange[] = [
    {
      nutrient: 'nitrogen',
      unit: 'kg/ha',
      ranges: {
        deficient: { max: 150 },
        low: { min: 150, max: 250 },
        adequate: { min: 250, max: 400 },
        high: { min: 400, max: 600 },
        excessive: { min: 600 },
      },
    },
    {
      nutrient: 'phosphorus',
      unit: 'kg/ha',
      ranges: {
        deficient: { max: 10 },
        low: { min: 10, max: 20 },
        adequate: { min: 20, max: 40 },
        high: { min: 40, max: 60 },
        excessive: { min: 60 },
      },
    },
    {
      nutrient: 'potassium',
      unit: 'kg/ha',
      ranges: {
        deficient: { max: 100 },
        low: { min: 100, max: 200 },
        adequate: { min: 200, max: 350 },
        high: { min: 350, max: 500 },
        excessive: { min: 500 },
      },
    },
  ];

  /**
   * Analyze soil health data
   */
  analyzeSoilHealth(soilData: SoilHealthData): SoilAnalysis {
    logger.info(`Analyzing soil health for sample ${soilData.sampleId}`);

    const nutrientStatus = this.analyzeNutrients(soilData);
    const deficiencies = nutrientStatus
      .filter((n) => n.status === 'deficient' || n.status === 'low')
      .map((n) => n.nutrient);
    const excesses = nutrientStatus
      .filter((n) => n.status === 'excessive')
      .map((n) => n.nutrient);

    const score = this.calculateOverallScore(soilData, nutrientStatus);
    const rating = this.getRating(score);
    const testAge = this.calculateTestAge(soilData.testDate);

    const analysis: SoilAnalysis = {
      soilHealthId: soilData.id,
      overallRating: rating,
      score,
      interpretation: this.generateInterpretation(soilData, nutrientStatus, rating),
      nutrientStatus,
      deficiencies,
      excesses,
      recommendations: this.generateRecommendations(soilData, deficiencies, excesses),
      testAge,
      suitableCrops: this.getSuitableCrops(soilData),
    };

    logger.info(`Soil analysis complete: ${rating} (score: ${score})`);
    return analysis;
  }

  /**
   * Analyze individual nutrients
   */
  private analyzeNutrients(soilData: SoilHealthData): SoilAnalysis['nutrientStatus'] {
    const status: SoilAnalysis['nutrientStatus'] = [];

    // Analyze macronutrients
    status.push(
      this.analyzeNutrient('Nitrogen', soilData.parameters.nitrogen, 'nitrogen', 'kg/ha')
    );
    status.push(
      this.analyzeNutrient('Phosphorus', soilData.parameters.phosphorus, 'phosphorus', 'kg/ha')
    );
    status.push(
      this.analyzeNutrient('Potassium', soilData.parameters.potassium, 'potassium', 'kg/ha')
    );

    // Analyze pH
    status.push({
      nutrient: 'pH',
      value: soilData.parameters.pH,
      unit: '',
      status: this.getpHStatus(soilData.parameters.pH),
      interpretation: this.getpHInterpretation(soilData.parameters.pH),
    });

    // Analyze organic carbon
    status.push({
      nutrient: 'Organic Carbon',
      value: soilData.parameters.organicCarbon,
      unit: '%',
      status: this.getOrganicCarbonStatus(soilData.parameters.organicCarbon),
      interpretation: this.getOrganicCarbonInterpretation(soilData.parameters.organicCarbon),
    });

    return status;
  }

  /**
   * Analyze individual nutrient
   */
  private analyzeNutrient(
    name: string,
    value: number,
    nutrientKey: string,
    unit: string
  ): SoilAnalysis['nutrientStatus'][0] {
    const range = this.nutrientRanges.find((r) => r.nutrient === nutrientKey);

    if (!range) {
      return {
        nutrient: name,
        value,
        unit,
        status: 'adequate',
        interpretation: 'No reference range available',
      };
    }

    let status: 'deficient' | 'low' | 'adequate' | 'high' | 'excessive';
    let interpretation: string;

    if (value <= range.ranges.deficient.max) {
      status = 'deficient';
      interpretation = `${name} is severely deficient. Immediate action required.`;
    } else if (value <= range.ranges.low.max) {
      status = 'low';
      interpretation = `${name} is low. Consider supplementation.`;
    } else if (value <= range.ranges.adequate.max) {
      status = 'adequate';
      interpretation = `${name} is at adequate levels.`;
    } else if (value <= range.ranges.high.max) {
      status = 'high';
      interpretation = `${name} is high. Monitor to avoid excess.`;
    } else {
      status = 'excessive';
      interpretation = `${name} is excessive. Reduce application.`;
    }

    return { nutrient: name, value, unit, status, interpretation };
  }

  /**
   * Get pH status
   */
  private getpHStatus(pH: number): 'deficient' | 'low' | 'adequate' | 'high' | 'excessive' {
    if (pH < 5.5) return 'deficient';
    if (pH < 6.0) return 'low';
    if (pH <= 7.5) return 'adequate';
    if (pH <= 8.5) return 'high';
    return 'excessive';
  }

  /**
   * Get pH interpretation
   */
  private getpHInterpretation(pH: number): string {
    if (pH < 5.5) return 'Soil is strongly acidic. Lime application recommended.';
    if (pH < 6.0) return 'Soil is moderately acidic. Consider lime application.';
    if (pH <= 7.5) return 'Soil pH is optimal for most crops.';
    if (pH <= 8.5) return 'Soil is alkaline. May affect nutrient availability.';
    return 'Soil is strongly alkaline. Sulfur application may be needed.';
  }

  /**
   * Get organic carbon status
   */
  private getOrganicCarbonStatus(
    oc: number
  ): 'deficient' | 'low' | 'adequate' | 'high' | 'excessive' {
    if (oc < 0.4) return 'deficient';
    if (oc < 0.6) return 'low';
    if (oc <= 1.0) return 'adequate';
    if (oc <= 2.0) return 'high';
    return 'excessive';
  }

  /**
   * Get organic carbon interpretation
   */
  private getOrganicCarbonInterpretation(oc: number): string {
    if (oc < 0.4) return 'Organic matter is very low. Add compost or organic manure.';
    if (oc < 0.6) return 'Organic matter is low. Increase organic inputs.';
    if (oc <= 1.0) return 'Organic matter is adequate.';
    return 'Organic matter is high. Good soil health.';
  }

  /**
   * Calculate overall soil health score
   */
  private calculateOverallScore(
    _soilData: SoilHealthData,
    nutrientStatus: SoilAnalysis['nutrientStatus']
  ): number {
    let score = 0;
    let count = 0;

    nutrientStatus.forEach((nutrient) => {
      let nutrientScore = 0;
      switch (nutrient.status) {
        case 'adequate':
          nutrientScore = 100;
          break;
        case 'high':
          nutrientScore = 80;
          break;
        case 'low':
          nutrientScore = 50;
          break;
        case 'deficient':
          nutrientScore = 20;
          break;
        case 'excessive':
          nutrientScore = 40;
          break;
      }
      score += nutrientScore;
      count++;
    });

    return count > 0 ? Math.round(score / count) : 0;
  }

  /**
   * Get overall rating from score
   */
  private getRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  /**
   * Generate interpretation
   */
  private generateInterpretation(
    soilData: SoilHealthData,
    nutrientStatus: SoilAnalysis['nutrientStatus'],
    rating: string
  ): { summary: string; details: string[] } {
    const summary = `Your soil health is ${rating}. ${
      rating === 'excellent' || rating === 'good'
        ? 'The soil is in good condition for most crops.'
        : 'Some improvements are needed for optimal crop growth.'
    }`;

    const details: string[] = [];

    details.push(`Soil Type: ${soilData.soilType}`);
    details.push(`Test Date: ${soilData.testDate.toLocaleDateString()}`);

    nutrientStatus.forEach((nutrient) => {
      if (nutrient.status !== 'adequate') {
        details.push(`${nutrient.nutrient}: ${nutrient.interpretation}`);
      }
    });

    return { summary, details };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    soilData: SoilHealthData,
    deficiencies: string[],
    excesses: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (deficiencies.length > 0) {
      recommendations.push(
        `Address nutrient deficiencies: ${deficiencies.join(', ')}. Apply appropriate fertilizers.`
      );
    }

    if (excesses.length > 0) {
      recommendations.push(
        `Reduce application of: ${excesses.join(', ')}. Avoid over-fertilization.`
      );
    }

    if (soilData.parameters.pH < 6.0) {
      recommendations.push('Apply lime to increase soil pH and reduce acidity.');
    } else if (soilData.parameters.pH > 8.0) {
      recommendations.push('Apply sulfur or gypsum to reduce soil alkalinity.');
    }

    if (soilData.parameters.organicCarbon < 0.6) {
      recommendations.push(
        'Increase organic matter by adding compost, farmyard manure, or green manure.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current soil management practices.');
    }

    return recommendations;
  }

  /**
   * Calculate test age and check if retesting is needed
   */
  private calculateTestAge(testDate: Date): SoilAnalysis['testAge'] {
    const now = new Date();
    const ageMs = now.getTime() - testDate.getTime();
    const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const years = days / 365;

    const needsRetesting = years >= 2;
    const message = needsRetesting
      ? 'Soil test is more than 2 years old. Retesting recommended for accurate recommendations.'
      : undefined;

    return { days, needsRetesting, message };
  }

  /**
   * Get suitable crops based on soil parameters
   */
  private getSuitableCrops(soilData: SoilHealthData): SoilAnalysis['suitableCrops'] {
    const crops = [
      { name: 'Rice', pHRange: [5.5, 7.0], soilTypes: ['clay', 'loamy'] },
      { name: 'Wheat', pHRange: [6.0, 7.5], soilTypes: ['loamy', 'clay'] },
      { name: 'Cotton', pHRange: [6.0, 8.0], soilTypes: ['loamy', 'sandy'] },
      { name: 'Sugarcane', pHRange: [6.0, 7.5], soilTypes: ['loamy', 'clay'] },
      { name: 'Maize', pHRange: [5.5, 7.5], soilTypes: ['loamy', 'sandy'] },
      { name: 'Soybean', pHRange: [6.0, 7.0], soilTypes: ['loamy', 'clay'] },
    ];

    const suitableCrops: SoilAnalysis['suitableCrops'] = [];

    crops.forEach((crop) => {
      let score = 0;
      const reasons: string[] = [];

      // Check pH suitability
      const pH = soilData.parameters.pH;
      if (pH >= crop.pHRange[0] && pH <= crop.pHRange[1]) {
        score += 40;
        reasons.push('pH is suitable');
      } else {
        score += 10;
        reasons.push('pH needs adjustment');
      }

      // Check soil type
      if (crop.soilTypes.includes(soilData.soilType)) {
        score += 30;
        reasons.push('soil type is suitable');
      } else {
        score += 10;
      }

      // Check nutrient levels
      if (
        soilData.parameters.nitrogen >= 250 &&
        soilData.parameters.phosphorus >= 20 &&
        soilData.parameters.potassium >= 200
      ) {
        score += 30;
        reasons.push('nutrient levels are adequate');
      } else {
        score += 15;
        reasons.push('nutrient supplementation needed');
      }

      suitableCrops.push({
        crop: crop.name,
        suitabilityScore: score,
        reason: reasons.join(', '),
      });
    });

    // Sort by suitability score
    suitableCrops.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    return suitableCrops.slice(0, 5); // Return top 5
  }
}

export const soilAnalyzer = new SoilAnalyzer();
