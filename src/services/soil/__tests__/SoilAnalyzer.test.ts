/**
 * Soil Analyzer Tests
 * Requirements: 10.1, 10.2, 10.8
 */

import { soilAnalyzer } from '../SoilAnalyzer';
import { SoilHealthData } from '../../../types/soil.types';

describe('SoilAnalyzer', () => {
  const createMockSoilData = (overrides?: Partial<SoilHealthData>): SoilHealthData => ({
    id: 'soil123',
    userId: 'user123',
    testDate: new Date('2024-01-15'),
    labName: 'Test Lab',
    sampleId: 'SHC-001',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    parameters: {
      nitrogen: 300,
      phosphorus: 30,
      potassium: 300,
      pH: 6.5,
      electricalConductivity: 0.8,
      organicCarbon: 0.8,
    },
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('analyzeSoilHealth', () => {
    it('should analyze soil with excellent rating', () => {
      const soilData = createMockSoilData();
      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.soilHealthId).toBe('soil123');
      expect(analysis.overallRating).toBe('excellent');
      expect(analysis.score).toBeGreaterThanOrEqual(80);
      expect(analysis.nutrientStatus).toHaveLength(5); // N, P, K, pH, OC
      expect(analysis.interpretation.summary).toContain('excellent');
    });

    it('should detect nitrogen deficiency', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 100, // Deficient
          phosphorus: 30,
          potassium: 300,
          pH: 6.5,
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.deficiencies).toContain('Nitrogen');
      expect(analysis.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('nutrient deficiencies'),
        ])
      );

      const nitrogenStatus = analysis.nutrientStatus.find((n) => n.nutrient === 'Nitrogen');
      expect(nitrogenStatus?.status).toBe('deficient');
    });

    it('should detect phosphorus deficiency', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 8, // Deficient
          potassium: 300,
          pH: 6.5,
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.deficiencies).toContain('Phosphorus');
      const phosphorusStatus = analysis.nutrientStatus.find((n) => n.nutrient === 'Phosphorus');
      expect(phosphorusStatus?.status).toBe('deficient');
    });

    it('should detect potassium deficiency', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 80, // Deficient
          pH: 6.5,
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.deficiencies).toContain('Potassium');
      const potassiumStatus = analysis.nutrientStatus.find((n) => n.nutrient === 'Potassium');
      expect(potassiumStatus?.status).toBe('deficient');
    });

    it('should detect excessive nutrients', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 700, // Excessive
          phosphorus: 30,
          potassium: 300,
          pH: 6.5,
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.excesses).toContain('Nitrogen');
      expect(analysis.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Reduce application'),
        ])
      );
    });

    it('should detect acidic soil and recommend lime', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 300,
          pH: 5.5, // Acidic
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('lime'),
        ])
      );

      const pHStatus = analysis.nutrientStatus.find((n) => n.nutrient === 'pH');
      expect(pHStatus?.status).toBe('low');
    });

    it('should detect alkaline soil and recommend sulfur', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 300,
          pH: 8.5, // Alkaline
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('sulfur'),
        ])
      );

      const pHStatus = analysis.nutrientStatus.find((n) => n.nutrient === 'pH');
      expect(pHStatus?.status).toBe('high');
    });

    it('should detect low organic carbon and recommend organic matter', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 300,
          pH: 6.5,
          electricalConductivity: 0.8,
          organicCarbon: 0.3, // Low
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('organic matter'),
        ])
      );

      const ocStatus = analysis.nutrientStatus.find((n) => n.nutrient === 'Organic Carbon');
      expect(ocStatus?.status).toBe('deficient');
    });

    it('should calculate test age and recommend retesting if > 2 years', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3); // 3 years ago

      const soilData = createMockSoilData({
        testDate: oldDate,
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.testAge.needsRetesting).toBe(true);
      expect(analysis.testAge.message).toContain('2 years old');
    });

    it('should not recommend retesting if test is recent', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 6); // 6 months ago

      const soilData = createMockSoilData({
        testDate: recentDate,
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.testAge.needsRetesting).toBe(false);
      expect(analysis.testAge.message).toBeUndefined();
    });

    it('should recommend suitable crops based on soil parameters', () => {
      const soilData = createMockSoilData();
      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.suitableCrops).toHaveLength(5);
      expect(analysis.suitableCrops[0].suitabilityScore).toBeGreaterThan(0);
      expect(analysis.suitableCrops[0].crop).toBeDefined();
      expect(analysis.suitableCrops[0].reason).toBeDefined();

      // Verify crops are sorted by suitability score
      for (let i = 0; i < analysis.suitableCrops.length - 1; i++) {
        expect(analysis.suitableCrops[i].suitabilityScore).toBeGreaterThanOrEqual(
          analysis.suitableCrops[i + 1].suitabilityScore
        );
      }
    });

    it('should provide lower suitability scores for unsuitable pH', () => {
      const acidicSoil = createMockSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 300,
          pH: 4.5, // Very acidic
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(acidicSoil);

      // All crops should have lower scores due to unsuitable pH
      analysis.suitableCrops.forEach((crop) => {
        expect(crop.suitabilityScore).toBeLessThanOrEqual(70);
      });
    });

    it('should calculate poor rating for multiple deficiencies', () => {
      const poorSoil = createMockSoilData({
        parameters: {
          nitrogen: 100, // Deficient
          phosphorus: 8, // Deficient
          potassium: 80, // Deficient
          pH: 5.0, // Deficient
          electricalConductivity: 0.8,
          organicCarbon: 0.3, // Deficient
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(poorSoil);

      expect(analysis.overallRating).toBe('poor');
      expect(analysis.score).toBeLessThan(40);
      expect(analysis.deficiencies.length).toBeGreaterThan(2);
    });

    it('should provide interpretation details for all issues', () => {
      const soilData = createMockSoilData({
        parameters: {
          nitrogen: 100, // Deficient
          phosphorus: 30,
          potassium: 300,
          pH: 5.5, // Low
          electricalConductivity: 0.8,
          organicCarbon: 0.8,
        },
      });

      const analysis = soilAnalyzer.analyzeSoilHealth(soilData);

      expect(analysis.interpretation.details.length).toBeGreaterThan(0);
      expect(analysis.interpretation.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Soil Type'),
        ])
      );
    });
  });
});
