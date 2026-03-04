/**
 * Crop Matcher
 * Matches soil conditions with suitable crops
 * Requirements: 10.3, 10.4, 10.5
 */

import { logger } from '../../utils/logger';
import { SoilHealthData, CropSuitability } from '../../types/soil.types';

interface CropMatch {
  crop: string;
  suitabilityScore: number;
  matchDetails: {
    pHMatch: boolean;
    nutrientMatch: boolean;
    soilTypeMatch: boolean;
  };
  recommendations: string[];
  explanation: string;
}

class CropMatcher {
  private cropDatabase: CropSuitability[] = [
    {
      crop: 'Rice',
      requirements: {
        pH: { min: 5.5, max: 7.0 },
        nitrogen: { min: 250, max: 400 },
        phosphorus: { min: 20, max: 40 },
        potassium: { min: 200, max: 350 },
        organicCarbon: { min: 0.5 },
      },
      preferredSoilTypes: ['clay', 'loamy'],
    },
    {
      crop: 'Wheat',
      requirements: {
        pH: { min: 6.0, max: 7.5 },
        nitrogen: { min: 250, max: 400 },
        phosphorus: { min: 20, max: 40 },
        potassium: { min: 200, max: 350 },
        organicCarbon: { min: 0.5 },
      },
      preferredSoilTypes: ['loamy', 'clay'],
    },
    {
      crop: 'Cotton',
      requirements: {
        pH: { min: 6.0, max: 8.0 },
        nitrogen: { min: 200, max: 350 },
        phosphorus: { min: 15, max: 35 },
        potassium: { min: 150, max: 300 },
        organicCarbon: { min: 0.4 },
      },
      preferredSoilTypes: ['loamy', 'sandy'],
    },
    {
      crop: 'Sugarcane',
      requirements: {
        pH: { min: 6.0, max: 7.5 },
        nitrogen: { min: 300, max: 450 },
        phosphorus: { min: 25, max: 45 },
        potassium: { min: 250, max: 400 },
        organicCarbon: { min: 0.6 },
      },
      preferredSoilTypes: ['loamy', 'clay'],
    },
    {
      crop: 'Maize',
      requirements: {
        pH: { min: 5.5, max: 7.5 },
        nitrogen: { min: 250, max: 400 },
        phosphorus: { min: 20, max: 40 },
        potassium: { min: 200, max: 350 },
        organicCarbon: { min: 0.5 },
      },
      preferredSoilTypes: ['loamy', 'sandy'],
    },
    {
      crop: 'Soybean',
      requirements: {
        pH: { min: 6.0, max: 7.0 },
        nitrogen: { min: 150, max: 300 },
        phosphorus: { min: 20, max: 40 },
        potassium: { min: 200, max: 350 },
        organicCarbon: { min: 0.5 },
      },
      preferredSoilTypes: ['loamy', 'clay'],
    },
    {
      crop: 'Groundnut',
      requirements: {
        pH: { min: 6.0, max: 7.0 },
        nitrogen: { min: 150, max: 300 },
        phosphorus: { min: 20, max: 40 },
        potassium: { min: 150, max: 300 },
        organicCarbon: { min: 0.5 },
      },
      preferredSoilTypes: ['sandy', 'loamy'],
    },
    {
      crop: 'Tomato',
      requirements: {
        pH: { min: 6.0, max: 7.0 },
        nitrogen: { min: 200, max: 350 },
        phosphorus: { min: 25, max: 45 },
        potassium: { min: 250, max: 400 },
        organicCarbon: { min: 0.6 },
      },
      preferredSoilTypes: ['loamy', 'sandy'],
    },
    {
      crop: 'Potato',
      requirements: {
        pH: { min: 5.5, max: 6.5 },
        nitrogen: { min: 250, max: 400 },
        phosphorus: { min: 25, max: 45 },
        potassium: { min: 250, max: 400 },
        organicCarbon: { min: 0.6 },
      },
      preferredSoilTypes: ['loamy', 'sandy'],
    },
    {
      crop: 'Onion',
      requirements: {
        pH: { min: 6.0, max: 7.0 },
        nitrogen: { min: 200, max: 350 },
        phosphorus: { min: 20, max: 40 },
        potassium: { min: 200, max: 350 },
        organicCarbon: { min: 0.5 },
      },
      preferredSoilTypes: ['loamy', 'sandy'],
    },
  ];

  /**
   * Match soil conditions with suitable crops
   */
  matchCrops(soilData: SoilHealthData): CropMatch[] {
    logger.info(`Matching crops for soil sample ${soilData.sampleId}`);

    const matches: CropMatch[] = [];

    for (const cropInfo of this.cropDatabase) {
      const match = this.evaluateCropMatch(soilData, cropInfo);
      matches.push(match);
    }

    // Sort by suitability score (highest first)
    matches.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    logger.info(`Found ${matches.length} crop matches, top match: ${matches[0].crop} (${matches[0].suitabilityScore}%)`);

    return matches;
  }

  /**
   * Get top N suitable crops
   */
  getTopMatches(soilData: SoilHealthData, count: number = 5): CropMatch[] {
    const allMatches = this.matchCrops(soilData);
    return allMatches.slice(0, count);
  }

  /**
   * Evaluate crop match for specific crop
   */
  private evaluateCropMatch(soilData: SoilHealthData, cropInfo: CropSuitability): CropMatch {
    let score = 0;
    const recommendations: string[] = [];
    const explanationParts: string[] = [];

    // Check pH (30 points)
    const pHMatch = this.checkpH(soilData.parameters.pH, cropInfo.requirements.pH);
    if (pHMatch.suitable) {
      score += 30;
      explanationParts.push(`pH is suitable (${soilData.parameters.pH.toFixed(1)})`);
    } else {
      score += pHMatch.partialScore;
      recommendations.push(pHMatch.recommendation);
      explanationParts.push(`pH needs adjustment (${soilData.parameters.pH.toFixed(1)})`);
    }

    // Check soil type (25 points)
    const soilTypeMatch = cropInfo.preferredSoilTypes.includes(soilData.soilType);
    if (soilTypeMatch) {
      score += 25;
      explanationParts.push(`soil type is ideal (${soilData.soilType})`);
    } else {
      score += 10;
      explanationParts.push(`soil type is acceptable but not ideal (${soilData.soilType})`);
    }

    // Check nitrogen (15 points)
    const nitrogenMatch = this.checkNutrient(
      soilData.parameters.nitrogen,
      cropInfo.requirements.nitrogen,
      'Nitrogen'
    );
    score += nitrogenMatch.score;
    if (nitrogenMatch.recommendation) {
      recommendations.push(nitrogenMatch.recommendation);
    }

    // Check phosphorus (15 points)
    const phosphorusMatch = this.checkNutrient(
      soilData.parameters.phosphorus,
      cropInfo.requirements.phosphorus,
      'Phosphorus'
    );
    score += phosphorusMatch.score;
    if (phosphorusMatch.recommendation) {
      recommendations.push(phosphorusMatch.recommendation);
    }

    // Check potassium (15 points)
    const potassiumMatch = this.checkNutrient(
      soilData.parameters.potassium,
      cropInfo.requirements.potassium,
      'Potassium'
    );
    score += potassiumMatch.score;
    if (potassiumMatch.recommendation) {
      recommendations.push(potassiumMatch.recommendation);
    }

    // Check organic carbon (bonus points, not required)
    if (soilData.parameters.organicCarbon >= cropInfo.requirements.organicCarbon.min) {
      explanationParts.push('organic matter is adequate');
    } else {
      recommendations.push('Increase organic matter with compost or manure');
    }

    const explanation = `${cropInfo.crop} is ${this.getSuitabilityLabel(score)} because ${explanationParts.join(', ')}`;

    return {
      crop: cropInfo.crop,
      suitabilityScore: Math.round(score),
      matchDetails: {
        pHMatch: pHMatch.suitable,
        nutrientMatch: nitrogenMatch.score + phosphorusMatch.score + potassiumMatch.score >= 30,
        soilTypeMatch,
      },
      recommendations,
      explanation,
    };
  }

  /**
   * Check pH suitability
   */
  private checkpH(
    actualPH: number,
    requirement: { min: number; max: number }
  ): { suitable: boolean; partialScore: number; recommendation: string } {
    if (actualPH >= requirement.min && actualPH <= requirement.max) {
      return { suitable: true, partialScore: 30, recommendation: '' };
    }

    const deviation = Math.min(
      Math.abs(actualPH - requirement.min),
      Math.abs(actualPH - requirement.max)
    );

    let partialScore = 0;
    let recommendation = '';

    if (deviation <= 0.5) {
      partialScore = 20;
      recommendation = 'Minor pH adjustment recommended';
    } else if (deviation <= 1.0) {
      partialScore = 10;
      if (actualPH < requirement.min) {
        recommendation = 'Apply lime to increase pH';
      } else {
        recommendation = 'Apply sulfur to decrease pH';
      }
    } else {
      partialScore = 5;
      if (actualPH < requirement.min) {
        recommendation = 'Significant pH increase needed - apply lime';
      } else {
        recommendation = 'Significant pH decrease needed - apply sulfur';
      }
    }

    return { suitable: false, partialScore, recommendation };
  }

  /**
   * Check nutrient suitability
   */
  private checkNutrient(
    actualValue: number,
    requirement: { min: number; max: number },
    nutrientName: string
  ): { score: number; recommendation: string } {
    if (actualValue >= requirement.min && actualValue <= requirement.max) {
      return { score: 15, recommendation: '' };
    }

    if (actualValue < requirement.min) {
      const deficit = ((requirement.min - actualValue) / requirement.min) * 100;
      if (deficit > 50) {
        return {
          score: 3,
          recommendation: `${nutrientName} is severely deficient - apply appropriate fertilizer`,
        };
      } else if (deficit > 25) {
        return {
          score: 7,
          recommendation: `${nutrientName} is low - supplementation needed`,
        };
      } else {
        return {
          score: 10,
          recommendation: `${nutrientName} is slightly low - minor supplementation recommended`,
        };
      }
    } else {
      // Excess nutrients
      const excess = ((actualValue - requirement.max) / requirement.max) * 100;
      if (excess > 50) {
        return { score: 5, recommendation: `${nutrientName} is excessive - reduce application` };
      } else {
        return { score: 10, recommendation: `${nutrientName} is high - monitor levels` };
      }
    }
  }

  /**
   * Get suitability label based on score
   */
  private getSuitabilityLabel(score: number): string {
    if (score >= 80) return 'highly suitable';
    if (score >= 60) return 'suitable';
    if (score >= 40) return 'moderately suitable';
    return 'less suitable';
  }
}

export const cropMatcher = new CropMatcher();
