/**
 * Crop Matcher Tests
 * Requirements: 10.3, 10.4, 10.5
 */

import { cropMatcher } from '../CropMatcher';
import { SoilHealthData } from '../../../types/soil.types';

describe('CropMatcher', () => {
  const createSoilData = (overrides?: Partial<SoilHealthData>): SoilHealthData => ({
    id: 'soil-001',
    userId: 'user-001',
    testDate: new Date('2024-01-15'),
    labName: 'Test Lab',
    sampleId: 'SAMPLE-001',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    parameters: {
      nitrogen: 300,
      phosphorus: 30,
      potassium: 250,
      pH: 6.5,
      electricalConductivity: 0.5,
      organicCarbon: 0.6,
    },
    soilType: 'loamy',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('matchCrops', () => {
    it('should return matches for all crops in database', () => {
      const soilData = createSoilData();
      const matches = cropMatcher.matchCrops(soilData);

      expect(matches).toHaveLength(10);
      expect(matches.every(m => m.crop)).toBe(true);
      expect(matches.every(m => m.suitabilityScore >= 0 && m.suitabilityScore <= 100)).toBe(true);
    });

    it('should sort matches by suitability score descending', () => {
      const soilData = createSoilData();
      const matches = cropMatcher.matchCrops(soilData);

      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].suitabilityScore).toBeGreaterThanOrEqual(matches[i + 1].suitabilityScore);
      }
    });

    it('should give high scores for ideal conditions', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
        soilType: 'loamy',
      });

      const matches = cropMatcher.matchCrops(soilData);
      const topMatch = matches[0];

      expect(topMatch.suitabilityScore).toBeGreaterThan(70);
    });

    it('should give lower scores for poor pH match', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 4.5, // Too acidic
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
        soilType: 'loamy',
      });

      const matches = cropMatcher.matchCrops(soilData);
      const topMatch = matches[0];

      expect(topMatch.suitabilityScore).toBeLessThanOrEqual(80);
      expect(topMatch.matchDetails.pHMatch).toBe(false);
    });

    it('should give lower scores for nutrient deficiencies', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 100, // Low
          phosphorus: 10, // Low
          potassium: 100, // Low
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
        soilType: 'loamy',
      });

      const matches = cropMatcher.matchCrops(soilData);
      const topMatch = matches[0];

      expect(topMatch.suitabilityScore).toBeLessThanOrEqual(76);
      expect(topMatch.matchDetails.nutrientMatch).toBe(false);
    });

    it('should provide recommendations for deficiencies', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 100,
          phosphorus: 10,
          potassium: 100,
          pH: 4.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.3,
        },
        soilType: 'sandy',
      });

      const matches = cropMatcher.matchCrops(soilData);
      const match = matches[0];

      expect(match.recommendations.length).toBeGreaterThan(0);
      expect(match.recommendations.some(r => r.includes('pH') || r.includes('lime') || r.includes('sulfur'))).toBe(true);
    });

    it('should include explanation for each match', () => {
      const soilData = createSoilData();
      const matches = cropMatcher.matchCrops(soilData);

      matches.forEach(match => {
        expect(match.explanation).toBeTruthy();
        expect(match.explanation).toContain(match.crop);
        expect(typeof match.explanation).toBe('string');
        expect(match.explanation.length).toBeGreaterThan(20);
      });
    });

    it('should match soil type preferences', () => {
      const loamySoil = createSoilData({ soilType: 'loamy' });
      const sandySoil = createSoilData({ soilType: 'sandy' });

      const loamyMatches = cropMatcher.matchCrops(loamySoil);
      const sandyMatches = cropMatcher.matchCrops(sandySoil);

      // Rice prefers loamy soil
      const riceLoamy = loamyMatches.find(m => m.crop === 'Rice');
      const riceSandy = sandyMatches.find(m => m.crop === 'Rice');

      expect(riceLoamy!.matchDetails.soilTypeMatch).toBe(true);
      expect(riceSandy!.matchDetails.soilTypeMatch).toBe(false);
    });
  });

  describe('getTopMatches', () => {
    it('should return top 5 matches by default', () => {
      const soilData = createSoilData();
      const topMatches = cropMatcher.getTopMatches(soilData);

      expect(topMatches).toHaveLength(5);
    });

    it('should return specified number of matches', () => {
      const soilData = createSoilData();
      const topMatches = cropMatcher.getTopMatches(soilData, 3);

      expect(topMatches).toHaveLength(3);
    });

    it('should return matches sorted by score', () => {
      const soilData = createSoilData();
      const topMatches = cropMatcher.getTopMatches(soilData, 5);

      for (let i = 0; i < topMatches.length - 1; i++) {
        expect(topMatches[i].suitabilityScore).toBeGreaterThanOrEqual(topMatches[i + 1].suitabilityScore);
      }
    });
  });

  describe('crop-specific matching', () => {
    it('should match Rice with appropriate conditions', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 6.2,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
        soilType: 'clay',
      });

      const matches = cropMatcher.matchCrops(soilData);
      const rice = matches.find(m => m.crop === 'Rice');

      expect(rice).toBeDefined();
      expect(rice!.suitabilityScore).toBeGreaterThan(70);
    });

    it('should match Wheat with appropriate conditions', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 6.8,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
        soilType: 'loamy',
      });

      const matches = cropMatcher.matchCrops(soilData);
      const wheat = matches.find(m => m.crop === 'Wheat');

      expect(wheat).toBeDefined();
      expect(wheat!.suitabilityScore).toBeGreaterThan(70);
    });

    it('should match Cotton with appropriate conditions', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 250,
          phosphorus: 25,
          potassium: 200,
          pH: 7.0,
          electricalConductivity: 0.5,
          organicCarbon: 0.5,
        },
        soilType: 'sandy',
      });

      const matches = cropMatcher.matchCrops(soilData);
      const cotton = matches.find(m => m.crop === 'Cotton');

      expect(cotton).toBeDefined();
      expect(cotton!.suitabilityScore).toBeGreaterThan(60);
    });
  });

  describe('edge cases', () => {
    it('should handle extremely acidic soil', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 3.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const matches = cropMatcher.matchCrops(soilData);

      expect(matches).toHaveLength(10);
      expect(matches.every(m => m.recommendations.length > 0)).toBe(true);
    });

    it('should handle extremely alkaline soil', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 9.0,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const matches = cropMatcher.matchCrops(soilData);

      expect(matches).toHaveLength(10);
      expect(matches.every(m => m.recommendations.length > 0)).toBe(true);
    });

    it('should handle very low nutrients', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 50,
          phosphorus: 5,
          potassium: 50,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.2,
        },
      });

      const matches = cropMatcher.matchCrops(soilData);

      expect(matches).toHaveLength(10);
      matches.forEach(match => {
        expect(match.recommendations.length).toBeGreaterThan(2);
      });
    });

    it('should handle excessive nutrients', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 600,
          phosphorus: 80,
          potassium: 600,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 1.0,
        },
      });

      const matches = cropMatcher.matchCrops(soilData);

      expect(matches).toHaveLength(10);
      // Should still provide matches even with excessive nutrients
      expect(matches[0].suitabilityScore).toBeGreaterThan(0);
    });
  });
});
