/**
 * Eligibility Checker Service
 * Requirements: 2.2, 2.4
 * 
 * Analyzes user profile against scheme eligibility criteria
 */

import { Scheme, EligibilityResult, FarmerCategory } from '../../types/scheme.types';
import { UserProfile } from '../../types/profile.types';
import { logger } from '../../utils/logger';

export class EligibilityChecker {
  /**
   * Check if user is eligible for a scheme
   */
  checkEligibility(scheme: Scheme, userProfile: UserProfile): EligibilityResult {
    logger.info(`Checking eligibility for scheme ${scheme.id} and user ${userProfile.userId}`);

    const reasons: string[] = [];
    const missingCriteria: string[] = [];
    let isEligible = true;
    let confidence = 100;

    // Check if scheme is active
    if (!scheme.isActive) {
      isEligible = false;
      reasons.push('Scheme is currently inactive');
      return {
        schemeId: scheme.id,
        isEligible: false,
        reasons,
        confidence: 100,
      };
    }

    const criteria = scheme.eligibilityCriteria;

    // Check farm size
    if (criteria.minFarmSize !== undefined || criteria.maxFarmSize !== undefined) {
      const farmSize = userProfile.farmSize;
      
      if (criteria.minFarmSize !== undefined && farmSize < criteria.minFarmSize) {
        isEligible = false;
        reasons.push(`Farm size (${farmSize} acres) is below minimum requirement (${criteria.minFarmSize} acres)`);
      }
      
      if (criteria.maxFarmSize !== undefined && farmSize > criteria.maxFarmSize) {
        isEligible = false;
        reasons.push(`Farm size (${farmSize} acres) exceeds maximum limit (${criteria.maxFarmSize} acres)`);
      }
      
      if (isEligible && criteria.minFarmSize !== undefined && criteria.maxFarmSize !== undefined) {
        reasons.push(`Farm size (${farmSize} acres) meets requirements (${criteria.minFarmSize}-${criteria.maxFarmSize} acres)`);
      }
    }

    // Check location (state)
    if (criteria.allowedStates && criteria.allowedStates.length > 0) {
      const userState = userProfile.location.state;
      
      if (!criteria.allowedStates.includes(userState)) {
        isEligible = false;
        reasons.push(`Scheme not available in ${userState}. Available in: ${criteria.allowedStates.join(', ')}`);
      } else {
        reasons.push(`Location (${userState}) is eligible`);
      }
    }

    // Check location (district)
    if (criteria.allowedDistricts && criteria.allowedDistricts.length > 0) {
      const userDistrict = userProfile.location.district;
      
      if (!criteria.allowedDistricts.includes(userDistrict)) {
        isEligible = false;
        reasons.push(`Scheme not available in ${userDistrict} district. Available in: ${criteria.allowedDistricts.join(', ')}`);
      } else {
        reasons.push(`District (${userDistrict}) is eligible`);
      }
    }

    // Check crops
    if (criteria.allowedCrops && criteria.allowedCrops.length > 0) {
      const userCrops = userProfile.primaryCrops;
      const matchingCrops = userCrops.filter(crop => criteria.allowedCrops!.includes(crop));
      
      if (matchingCrops.length === 0) {
        isEligible = false;
        reasons.push(`None of your crops (${userCrops.join(', ')}) are eligible. Eligible crops: ${criteria.allowedCrops.join(', ')}`);
      } else {
        reasons.push(`Your crops (${matchingCrops.join(', ')}) are eligible`);
      }
    }

    // Check farmer category (based on farm size)
    if (criteria.farmerCategory && criteria.farmerCategory.length > 0) {
      const category = this.determineFarmerCategory(userProfile.farmSize);
      
      if (!criteria.farmerCategory.includes(category)) {
        isEligible = false;
        reasons.push(`Farmer category (${category}) not eligible. Eligible categories: ${criteria.farmerCategory.join(', ')}`);
      } else {
        reasons.push(`Farmer category (${category}) is eligible`);
      }
    }

    // Check for missing information that affects confidence
    if (!userProfile.farmSize) {
      missingCriteria.push('Farm size information');
      confidence -= 20;
    }

    if (!userProfile.primaryCrops || userProfile.primaryCrops.length === 0) {
      missingCriteria.push('Primary crops information');
      confidence -= 15;
    }

    if (!userProfile.location.state) {
      missingCriteria.push('State information');
      confidence -= 25;
    }

    // Add general eligibility message
    if (isEligible) {
      if (reasons.length === 0) {
        reasons.push('You meet all eligibility criteria for this scheme');
      }
    }

    logger.info(`Eligibility check complete: ${isEligible ? 'Eligible' : 'Not eligible'}`);

    return {
      schemeId: scheme.id,
      isEligible,
      reasons,
      missingCriteria: missingCriteria.length > 0 ? missingCriteria : undefined,
      confidence: Math.max(confidence, 0),
    };
  }

  /**
   * Check eligibility for multiple schemes
   */
  checkMultipleSchemes(schemes: Scheme[], userProfile: UserProfile): EligibilityResult[] {
    return schemes.map(scheme => this.checkEligibility(scheme, userProfile));
  }

  /**
   * Get eligible schemes for a user
   */
  getEligibleSchemes(schemes: Scheme[], userProfile: UserProfile): Scheme[] {
    const results = this.checkMultipleSchemes(schemes, userProfile);
    const eligibleSchemeIds = results
      .filter(result => result.isEligible)
      .map(result => result.schemeId);
    
    return schemes.filter(scheme => eligibleSchemeIds.includes(scheme.id));
  }

  /**
   * Get alternative schemes for ineligible users
   */
  getAlternativeSchemes(
    scheme: Scheme,
    userProfile: UserProfile,
    allSchemes: Scheme[]
  ): Scheme[] {
    // Check if user is eligible for the original scheme
    const eligibilityResult = this.checkEligibility(scheme, userProfile);
    
    if (eligibilityResult.isEligible) {
      return []; // No alternatives needed
    }

    // Find schemes in the same category
    const alternatives = allSchemes.filter(s => {
      // Skip the original scheme
      if (s.id === scheme.id) {
        return false;
      }

      // Same category
      if (s.category !== scheme.category) {
        return false;
      }

      // Check if user is eligible
      const altEligibility = this.checkEligibility(s, userProfile);
      return altEligibility.isEligible;
    });

    // Sort by confidence
    const alternativesWithEligibility = alternatives.map(alt => ({
      scheme: alt,
      eligibility: this.checkEligibility(alt, userProfile),
    }));

    alternativesWithEligibility.sort((a, b) => b.eligibility.confidence - a.eligibility.confidence);

    return alternativesWithEligibility.map(a => a.scheme);
  }

  /**
   * Determine farmer category based on farm size
   */
  private determineFarmerCategory(farmSize: number): FarmerCategory {
    if (farmSize === 0) {
      return 'landless';
    } else if (farmSize <= 1) {
      return 'marginal';
    } else if (farmSize <= 2) {
      return 'small';
    } else if (farmSize <= 10) {
      return 'medium';
    } else {
      return 'large';
    }
  }

  /**
   * Get detailed eligibility explanation
   */
  getEligibilityExplanation(scheme: Scheme, userProfile: UserProfile): string {
    const result = this.checkEligibility(scheme, userProfile);
    
    const parts: string[] = [];
    
    if (result.isEligible) {
      parts.push(`You are eligible for ${scheme.name}.`);
      parts.push('');
      parts.push('Eligibility details:');
      result.reasons.forEach(reason => {
        parts.push(`• ${reason}`);
      });
      
      if (result.missingCriteria && result.missingCriteria.length > 0) {
        parts.push('');
        parts.push('Note: Some information is missing, which may affect final eligibility:');
        result.missingCriteria.forEach(criteria => {
          parts.push(`• ${criteria}`);
        });
      }
    } else {
      parts.push(`You are not eligible for ${scheme.name}.`);
      parts.push('');
      parts.push('Reasons:');
      result.reasons.forEach(reason => {
        parts.push(`• ${reason}`);
      });
      
      if (result.alternativeSchemes && result.alternativeSchemes.length > 0) {
        parts.push('');
        parts.push('You may be eligible for these alternative schemes:');
        result.alternativeSchemes.forEach(altId => {
          parts.push(`• Scheme ID: ${altId}`);
        });
      }
    }
    
    return parts.join('\n');
  }
}

export const eligibilityChecker = new EligibilityChecker();
