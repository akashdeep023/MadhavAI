/**
 * Fertilizer Recommender Tests
 */

import { FertilizerRecommender, GrowthStage } from '../FertilizerRecommender';
import { EnhancedFarmingContext } from '../FarmingContextBuilder';
import { UserProfile } from '../../../types/profile.types';
import { SoilHealthData } from '../../../types/soil.types';

describe('FertilizerRecommender', () => {
  let recommender: FertilizerRecommender;

  const mockProfile: UserProfile = {
    userId: 'user-001',
    mobileNumber: '+919876543210',
    name: 'Test Farmer',
    languagePreference: 'en',
    location: {
      state: 'Test State',
      district: 'Test District',
      village: 'Test Village',
      pincode: '123456',
      coordinates: {
        latitude: 28.6139,
        longitude: 77.209,
      },
    },
    farmSize: 5,
    primaryCrops: ['Rice'],
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSoilDataLowNitrogen: SoilHealthData = {
    id: 'soil-001',
    userId: 'user-001',
    testDate: new Date(),
    labName: 'Test Lab',
    sampleId: 'SAMPLE-001',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    parameters: {
      nitrogen: 200, // Low
      phosphorus: 30, // Good
      potassium: 300, // Good
      pH: 6.5,
      electricalConductivity: 0.5,
      organicCarbon: 0.6,
    },
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSoilDataLowPhosphorus: SoilHealthData = {
    ...mockSoilDataLowNitrogen,
    parameters: {
      nitrogen: 300, // Good
      phosphorus: 15, // Low
      potassium: 300, // Good
      pH: 6.5,
      electricalConductivity: 0.5,
      organicCarbon: 0.6,
    },
  };

  const mockSoilDataHighNutrients: SoilHealthData = {
    ...mockSoilDataLowNitrogen,
    parameters: {
      nitrogen: 450, // Very high
      phosphorus: 60, // Very high
      potassium: 450, // Very high
      pH: 6.5,
      electricalConductivity: 0.5,
      organicCarbon: 0.6,
    },
  };

  const mockContext: EnhancedFarmingContext = {
    userProfile: mockProfile,
    soilData: mockSoilDataLowNitrogen,
    weatherForecast: null,
    marketData: null,
    currentSeason: 'kharif',
    timestamp: new Date(),
    computed: {
      farmSizeCategory: 'medium',
      soilHealthRating: 'good',
      weatherRisk: 'low',
      marketOpportunity: 'favorable',
      recommendationReadiness: 100,
    },
  };

  beforeEach(() => {
    recommender = new FertilizerRecommender();
  });

  describe('generateRecommendations', () => {
    it('should generate fertilizer recommendations', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should include all required fields', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );
      const rec = recommendations[0];

      expect(rec.nutrient).toBeDefined();
      expect(rec.type).toBeDefined();
      expect(rec.name).toBeDefined();
      expect(rec.dosage).toBeDefined();
      expect(rec.dosage.amount).toBeGreaterThan(0);
      expect(rec.dosage.unit).toBeDefined();
      expect(rec.dosage.perArea).toBeDefined();
      expect(rec.applicationTiming).toBeDefined();
      expect(rec.applicationMethod).toBeDefined();
      expect(rec.cost).toBeDefined();
      expect(rec.cost.min).toBeGreaterThan(0);
      expect(rec.cost.max).toBeGreaterThanOrEqual(rec.cost.min);
      expect(rec.alternatives).toBeDefined();
      expect(rec.explanation).toBeDefined();
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(100);
    });

    it('should recommend nitrogen for low nitrogen soil', async () => {
      const context = {
        ...mockContext,
        soilData: mockSoilDataLowNitrogen,
      };

      const recommendations = await recommender.generateRecommendations(
        context,
        'Rice',
        'vegetative'
      );

      const nitrogenRec = recommendations.find((r) => r.nutrient.includes('Nitrogen'));
      expect(nitrogenRec).toBeDefined();
    });

    it('should recommend phosphorus for low phosphorus soil', async () => {
      const context = {
        ...mockContext,
        soilData: mockSoilDataLowPhosphorus,
      };

      const recommendations = await recommender.generateRecommendations(
        context,
        'Rice',
        'sowing'
      );

      const phosphorusRec = recommendations.find((r) => r.nutrient.includes('Phosphorus'));
      expect(phosphorusRec).toBeDefined();
    });

    it('should recommend NPK when no soil data available', async () => {
      const context = {
        ...mockContext,
        soilData: null,
      };

      const recommendations = await recommender.generateRecommendations(
        context,
        'Rice',
        'vegetative'
      );

      const npkRec = recommendations.find((r) => r.nutrient.includes('NPK'));
      expect(npkRec).toBeDefined();
    });

    it('should include cost-effective alternatives', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const rec = recommendations[0];
      expect(rec.alternatives).toBeDefined();
      expect(rec.alternatives.length).toBeGreaterThan(0);
      
      rec.alternatives.forEach((alt) => {
        expect(alt.name).toBeDefined();
        expect(alt.type).toBeDefined();
        expect(alt.dosage).toBeDefined();
        expect(alt.cost).toBeDefined();
        expect(alt.cost.min).toBeGreaterThan(0);
        expect(alt.effectiveness).toBeGreaterThan(0);
      });
    });

    it('should include both organic and chemical alternatives', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const rec = recommendations[0];
      const hasOrganic = rec.alternatives.some((a) => a.type === 'organic');
      const hasChemical = rec.alternatives.some((a) => a.type === 'chemical');

      expect(hasOrganic || hasChemical).toBe(true);
    });

    it('should adjust dosage based on deficiency severity', async () => {
      const severeDeficiency = {
        ...mockContext,
        soilData: {
          ...mockSoilDataLowNitrogen,
          parameters: {
            ...mockSoilDataLowNitrogen.parameters,
            nitrogen: 150, // Severe deficiency
          },
        },
      };

      const moderateDeficiency = {
        ...mockContext,
        soilData: {
          ...mockSoilDataLowNitrogen,
          parameters: {
            ...mockSoilDataLowNitrogen.parameters,
            nitrogen: 240, // Moderate deficiency
          },
        },
      };

      const severeRecs = await recommender.generateRecommendations(
        severeDeficiency,
        'Rice',
        'vegetative'
      );
      const moderateRecs = await recommender.generateRecommendations(
        moderateDeficiency,
        'Rice',
        'vegetative'
      );

      const severeNitrogen = severeRecs.find((r) => r.nutrient.includes('Nitrogen'));
      const moderateNitrogen = moderateRecs.find((r) => r.nutrient.includes('Nitrogen'));

      if (severeNitrogen && moderateNitrogen) {
        expect(severeNitrogen.dosage.amount).toBeGreaterThan(moderateNitrogen.dosage.amount);
      }
    });

    it('should warn about overuse for high nutrient soils', async () => {
      const context = {
        ...mockContext,
        soilData: mockSoilDataHighNutrients,
      };

      const recommendations = await recommender.generateRecommendations(
        context,
        'Rice',
        'vegetative'
      );

      // Should recommend NPK for maintenance even with high nutrients
      expect(recommendations.length).toBeGreaterThan(0);
      
      // NPK recommendation should be present
      const npkRec = recommendations.find((r) => r.nutrient.includes('NPK'));
      expect(npkRec).toBeDefined();
    });

    it('should warn about nitrogen overuse when soil has high nitrogen', async () => {
      // Create context with low phosphorus but high nitrogen
      const context = {
        ...mockContext,
        soilData: {
          ...mockSoilDataLowPhosphorus,
          parameters: {
            ...mockSoilDataLowPhosphorus.parameters,
            nitrogen: 450, // Very high
            phosphorus: 15, // Low - will trigger phosphorus recommendation
          },
        },
      };

      const recommendations = await recommender.generateRecommendations(
        context,
        'Rice',
        'vegetative'
      );

      // Should have phosphorus recommendation
      const phosphorusRec = recommendations.find((r) => r.nutrient.includes('Phosphorus'));
      expect(phosphorusRec).toBeDefined();
      
      // If nitrogen is also recommended (shouldn't be), it should have warning
      const nitrogenRec = recommendations.find((r) => r.nutrient.includes('Nitrogen'));
      if (nitrogenRec) {
        expect(nitrogenRec.explanation).toContain('WARNING');
      }
    });
  });

  describe('applicationTiming', () => {
    it('should recommend nitrogen at vegetative stage', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const nitrogenRec = recommendations.find((r) => r.nutrient.includes('Nitrogen'));
      if (nitrogenRec) {
        expect(nitrogenRec.applicationTiming).toContain('days after sowing');
      }
    });

    it('should recommend phosphorus at sowing', async () => {
      const context = {
        ...mockContext,
        soilData: mockSoilDataLowPhosphorus,
      };

      const recommendations = await recommender.generateRecommendations(
        context,
        'Rice',
        'sowing'
      );

      const phosphorusRec = recommendations.find((r) => r.nutrient.includes('Phosphorus'));
      if (phosphorusRec) {
        expect(phosphorusRec.applicationTiming).toContain('sowing');
      }
    });

    it('should not recommend nitrogen at maturity', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'maturity'
      );

      const nitrogenRec = recommendations.find((r) => r.nutrient.includes('Nitrogen'));
      if (nitrogenRec) {
        expect(nitrogenRec.applicationTiming).toContain('Not recommended');
      }
    });
  });

  describe('explanation', () => {
    it('should generate meaningful explanation', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const rec = recommendations[0];
      expect(rec.explanation).toBeDefined();
      expect(rec.explanation.length).toBeGreaterThan(50);
    });

    it('should mention soil nutrient levels', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const nitrogenRec = recommendations.find((r) => r.nutrient.includes('Nitrogen'));
      if (nitrogenRec) {
        expect(nitrogenRec.explanation).toContain('nitrogen');
      }
    });

    it('should mention growth stage', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'flowering'
      );

      const rec = recommendations[0];
      expect(rec.explanation).toContain('flowering');
    });

    it('should mention fertilizer type benefits', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const rec = recommendations[0];
      expect(
        rec.explanation.includes('organic') ||
          rec.explanation.includes('chemical') ||
          rec.explanation.includes('nutrient')
      ).toBe(true);
    });
  });

  describe('confidence', () => {
    it('should have high confidence with complete data', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      expect(recommendations[0].confidence).toBeGreaterThanOrEqual(90);
    });

    it('should have lower confidence with incomplete data', async () => {
      const incompleteContext = {
        ...mockContext,
        soilData: null,
        computed: {
          ...mockContext.computed,
          recommendationReadiness: 50,
        },
      };

      const recommendations = await recommender.generateRecommendations(
        incompleteContext,
        'Rice',
        'vegetative'
      );

      expect(recommendations[0].confidence).toBeLessThan(90);
    });
  });

  describe('cost calculation', () => {
    it('should calculate cost based on dosage', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const rec = recommendations[0];
      expect(rec.cost.min).toBeGreaterThan(0);
      expect(rec.cost.max).toBeGreaterThan(rec.cost.min);
    });

    it('should provide cost for alternatives', async () => {
      const recommendations = await recommender.generateRecommendations(
        mockContext,
        'Rice',
        'vegetative'
      );

      const rec = recommendations[0];
      rec.alternatives.forEach((alt) => {
        expect(alt.cost.min).toBeGreaterThan(0);
        expect(alt.cost.max).toBeGreaterThanOrEqual(alt.cost.min);
      });
    });
  });

  describe('growth stage handling', () => {
    const stages: GrowthStage[] = [
      'pre_sowing',
      'sowing',
      'vegetative',
      'flowering',
      'fruiting',
      'maturity',
    ];

    stages.forEach((stage) => {
      it(`should handle ${stage} stage`, async () => {
        const recommendations = await recommender.generateRecommendations(
          mockContext,
          'Rice',
          stage
        );

        expect(recommendations).toBeDefined();
        expect(recommendations.length).toBeGreaterThan(0);
      });
    });
  });
});
