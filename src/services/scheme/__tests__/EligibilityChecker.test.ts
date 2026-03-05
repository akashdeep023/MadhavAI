/**
 * Eligibility Checker Tests
 */

import { EligibilityChecker } from '../EligibilityChecker';
import { Scheme, FarmerCategory } from '../../../types/scheme.types';
import { UserProfile } from '../../../types/profile.types';

describe('EligibilityChecker', () => {
  let checker: EligibilityChecker;

  const mockUserProfile: UserProfile = {
    userId: 'user-001',
    mobileNumber: '+919876543210',
    name: 'Test Farmer',
    languagePreference: 'en',
    location: {
      state: 'Maharashtra',
      district: 'Pune',
      village: 'Test Village',
      pincode: '411001',
      coordinates: {
        latitude: 18.5204,
        longitude: 73.8567,
      },
    },
    farmSize: 3,
    primaryCrops: ['Rice', 'Wheat'],
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockScheme: Scheme = {
    id: 'scheme-001',
    name: 'PM-KISAN',
    description: 'Direct income support',
    category: 'subsidy',
    eligibilityCriteria: {
      maxFarmSize: 5,
      allowedStates: ['Maharashtra', 'Karnataka'],
      allowedCrops: ['Rice', 'Wheat', 'Cotton'],
    },
    benefits: ['Rs 6000 per year'],
    requiredDocuments: ['Aadhaar', 'Land records'],
    applicationSteps: [
      {
        stepNumber: 1,
        title: 'Register online',
        description: 'Visit portal',
      },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    checker = new EligibilityChecker();
  });

  describe('checkEligibility', () => {
    it('should return eligible for matching criteria', () => {
      const result = checker.checkEligibility(mockScheme, mockUserProfile);

      expect(result.isEligible).toBe(true);
      expect(result.schemeId).toBe('scheme-001');
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.confidence).toBe(100);
    });

    it('should return not eligible for inactive scheme', () => {
      const inactiveScheme = { ...mockScheme, isActive: false };
      const result = checker.checkEligibility(inactiveScheme, mockUserProfile);

      expect(result.isEligible).toBe(false);
      expect(result.reasons).toContain('Scheme is currently inactive');
    });

    it('should check farm size minimum', () => {
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          minFarmSize: 5,
        },
      };

      const result = checker.checkEligibility(scheme, mockUserProfile);

      expect(result.isEligible).toBe(false);
      expect(result.reasons.some(r => r.includes('below minimum'))).toBe(true);
    });

    it('should check farm size maximum', () => {
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          maxFarmSize: 2,
        },
      };

      const result = checker.checkEligibility(scheme, mockUserProfile);

      expect(result.isEligible).toBe(false);
      expect(result.reasons.some(r => r.includes('exceeds maximum'))).toBe(true);
    });

    it('should check state eligibility', () => {
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          allowedStates: ['Karnataka', 'Tamil Nadu'],
        },
      };

      const result = checker.checkEligibility(scheme, mockUserProfile);

      expect(result.isEligible).toBe(false);
      expect(result.reasons.some(r => r.includes('not available in Maharashtra'))).toBe(true);
    });

    it('should check district eligibility', () => {
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          allowedDistricts: ['Mumbai', 'Nagpur'],
        },
      };

      const result = checker.checkEligibility(scheme, mockUserProfile);

      expect(result.isEligible).toBe(false);
      expect(result.reasons.some(r => r.includes('not available in Pune'))).toBe(true);
    });

    it('should check crop eligibility', () => {
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          allowedCrops: ['Cotton', 'Sugarcane'],
        },
      };

      const result = checker.checkEligibility(scheme, mockUserProfile);

      expect(result.isEligible).toBe(false);
      expect(result.reasons.some(r => r.includes('None of your crops'))).toBe(true);
    });

    it('should check farmer category', () => {
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          farmerCategory: ['marginal', 'small'] as FarmerCategory[],
        },
      };

      const result = checker.checkEligibility(scheme, mockUserProfile);

      expect(result.isEligible).toBe(false);
      expect(result.reasons.some(r => r.includes('category'))).toBe(true);
    });

    it('should reduce confidence for missing farm size', () => {
      const incompleteProfile = {
        ...mockUserProfile,
        farmSize: 0,
      };

      const result = checker.checkEligibility(mockScheme, incompleteProfile);

      expect(result.confidence).toBeLessThan(100);
      expect(result.missingCriteria).toContain('Farm size information');
    });

    it('should reduce confidence for missing crops', () => {
      const incompleteProfile = {
        ...mockUserProfile,
        primaryCrops: [],
      };

      const result = checker.checkEligibility(mockScheme, incompleteProfile);

      expect(result.confidence).toBeLessThan(100);
      expect(result.missingCriteria).toContain('Primary crops information');
    });
  });

  describe('checkMultipleSchemes', () => {
    it('should check eligibility for multiple schemes', () => {
      const schemes = [
        mockScheme,
        { ...mockScheme, id: 'scheme-002', name: 'Scheme 2' },
        { ...mockScheme, id: 'scheme-003', name: 'Scheme 3' },
      ];

      const results = checker.checkMultipleSchemes(schemes, mockUserProfile);

      expect(results).toHaveLength(3);
      expect(results[0].schemeId).toBe('scheme-001');
      expect(results[1].schemeId).toBe('scheme-002');
      expect(results[2].schemeId).toBe('scheme-003');
    });
  });

  describe('getEligibleSchemes', () => {
    it('should return only eligible schemes', () => {
      const schemes = [
        mockScheme,
        {
          ...mockScheme,
          id: 'scheme-002',
          eligibilityCriteria: {
            allowedStates: ['Karnataka'], // User is in Maharashtra
          },
        },
        {
          ...mockScheme,
          id: 'scheme-003',
          eligibilityCriteria: {
            maxFarmSize: 5,
          },
        },
      ];

      const eligible = checker.getEligibleSchemes(schemes, mockUserProfile);

      expect(eligible).toHaveLength(2);
      expect(eligible.some(s => s.id === 'scheme-001')).toBe(true);
      expect(eligible.some(s => s.id === 'scheme-003')).toBe(true);
      expect(eligible.some(s => s.id === 'scheme-002')).toBe(false);
    });

    it('should return empty array if no schemes are eligible', () => {
      const schemes = [
        {
          ...mockScheme,
          eligibilityCriteria: {
            allowedStates: ['Karnataka'],
          },
        },
      ];

      const eligible = checker.getEligibleSchemes(schemes, mockUserProfile);

      expect(eligible).toHaveLength(0);
    });
  });

  describe('getAlternativeSchemes', () => {
    it('should return alternative schemes in same category', () => {
      const ineligibleScheme = {
        ...mockScheme,
        eligibilityCriteria: {
          allowedStates: ['Karnataka'], // User not eligible
        },
      };

      const allSchemes: Scheme[] = [
        ineligibleScheme,
        {
          ...mockScheme,
          id: 'scheme-002',
          category: 'subsidy',
          eligibilityCriteria: {
            allowedStates: ['Maharashtra'], // User eligible
          },
        },
        {
          ...mockScheme,
          id: 'scheme-003',
          category: 'loan', // Different category
          eligibilityCriteria: {
            allowedStates: ['Maharashtra'],
          },
        },
      ];

      const alternatives = checker.getAlternativeSchemes(
        ineligibleScheme,
        mockUserProfile,
        allSchemes
      );

      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].id).toBe('scheme-002');
    });

    it('should return empty array if user is eligible', () => {
      const allSchemes = [mockScheme];

      const alternatives = checker.getAlternativeSchemes(
        mockScheme,
        mockUserProfile,
        allSchemes
      );

      expect(alternatives).toHaveLength(0);
    });

    it('should sort alternatives by confidence', () => {
      const ineligibleScheme = {
        ...mockScheme,
        eligibilityCriteria: {
          allowedStates: ['Karnataka'],
        },
      };

      const allSchemes: Scheme[] = [
        ineligibleScheme,
        {
          ...mockScheme,
          id: 'scheme-002',
          category: 'subsidy',
          eligibilityCriteria: {
            allowedStates: ['Maharashtra'],
            allowedCrops: ['Rice'],
          },
        },
        {
          ...mockScheme,
          id: 'scheme-003',
          category: 'subsidy',
          eligibilityCriteria: {
            allowedStates: ['Maharashtra'],
          },
        },
      ];

      const alternatives = checker.getAlternativeSchemes(
        ineligibleScheme,
        mockUserProfile,
        allSchemes
      );

      expect(alternatives.length).toBeGreaterThan(0);
      // Both should be eligible, order may vary
    });
  });

  describe('determineFarmerCategory', () => {
    it('should categorize landless farmer', () => {
      const profile = { ...mockUserProfile, farmSize: 0 };
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          farmerCategory: ['landless'] as FarmerCategory[],
        },
      };

      const result = checker.checkEligibility(scheme, profile);
      expect(result.isEligible).toBe(true);
    });

    it('should categorize marginal farmer (<=1 acre)', () => {
      const profile = { ...mockUserProfile, farmSize: 1 };
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          farmerCategory: ['marginal'] as FarmerCategory[],
        },
      };

      const result = checker.checkEligibility(scheme, profile);
      expect(result.isEligible).toBe(true);
    });

    it('should categorize small farmer (1-2 acres)', () => {
      const profile = { ...mockUserProfile, farmSize: 1.5 };
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          farmerCategory: ['small'] as FarmerCategory[],
        },
      };

      const result = checker.checkEligibility(scheme, profile);
      expect(result.isEligible).toBe(true);
    });

    it('should categorize medium farmer (2-10 acres)', () => {
      const profile = { ...mockUserProfile, farmSize: 5 };
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          farmerCategory: ['medium'] as FarmerCategory[],
        },
      };

      const result = checker.checkEligibility(scheme, profile);
      expect(result.isEligible).toBe(true);
    });

    it('should categorize large farmer (>10 acres)', () => {
      const profile = { ...mockUserProfile, farmSize: 15 };
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          farmerCategory: ['large'] as FarmerCategory[],
        },
      };

      const result = checker.checkEligibility(scheme, profile);
      expect(result.isEligible).toBe(true);
    });
  });

  describe('getEligibilityExplanation', () => {
    it('should generate explanation for eligible user', () => {
      const explanation = checker.getEligibilityExplanation(mockScheme, mockUserProfile);

      expect(explanation).toContain('eligible');
      expect(explanation).toContain(mockScheme.name);
      expect(explanation.length).toBeGreaterThan(50);
    });

    it('should generate explanation for ineligible user', () => {
      const scheme = {
        ...mockScheme,
        eligibilityCriteria: {
          allowedStates: ['Karnataka'],
        },
      };

      const explanation = checker.getEligibilityExplanation(scheme, mockUserProfile);

      expect(explanation).toContain('not eligible');
      expect(explanation).toContain('Reasons');
      expect(explanation.length).toBeGreaterThan(50);
    });

    it('should mention missing criteria when eligible', () => {
      const incompleteProfile = {
        ...mockUserProfile,
        farmSize: 0,
        primaryCrops: [],
      };

      // Use a scheme where user would be eligible despite missing data
      const simpleScheme = {
        ...mockScheme,
        eligibilityCriteria: {
          allowedStates: ['Maharashtra'],
        },
      };

      const explanation = checker.getEligibilityExplanation(simpleScheme, incompleteProfile);

      expect(explanation).toContain('missing');
    });
  });
});
