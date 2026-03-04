/**
 * Improvement Advisor Tests
 * Requirements: 10.4, 10.5
 */

import { improvementAdvisor } from '../ImprovementAdvisor';
import { SoilHealthData } from '../../../types/soil.types';

describe('ImprovementAdvisor', () => {
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

  describe('generateRecommendations', () => {
    it('should return empty array for ideal soil', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      expect(recommendations).toHaveLength(0);
    });

    it('should identify nitrogen deficiency', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 150,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      expect(recommendations.length).toBeGreaterThan(0);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');
      expect(nitrogenRec).toBeDefined();
      expect(nitrogenRec!.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify phosphorus deficiency', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 10,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      const phosphorusRec = recommendations.find(r => r.deficiency === 'Phosphorus');
      expect(phosphorusRec).toBeDefined();
      expect(phosphorusRec!.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify potassium deficiency', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 150,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      const potassiumRec = recommendations.find(r => r.deficiency === 'Potassium');
      expect(potassiumRec).toBeDefined();
      expect(potassiumRec!.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify acidic pH issue', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 5.0,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      const pHRec = recommendations.find(r => r.deficiency === 'pH (Too Acidic)');
      expect(pHRec).toBeDefined();
      expect(pHRec!.recommendations.some(r => r.title.includes('Lime'))).toBe(true);
    });

    it('should identify alkaline pH issue', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 8.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      const pHRec = recommendations.find(r => r.deficiency === 'pH (Too Alkaline)');
      expect(pHRec).toBeDefined();
      expect(pHRec!.recommendations.some(r => r.title.includes('Sulfur'))).toBe(true);
    });

    it('should identify organic matter deficiency', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.3,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      const organicRec = recommendations.find(r => r.deficiency === 'Organic Matter');
      expect(organicRec).toBeDefined();
      expect(organicRec!.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify multiple deficiencies', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 150,
          phosphorus: 10,
          potassium: 150,
          pH: 5.0,
          electricalConductivity: 0.5,
          organicCarbon: 0.3,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      expect(recommendations.length).toBeGreaterThanOrEqual(4);
      expect(recommendations.some(r => r.deficiency === 'Nitrogen')).toBe(true);
      expect(recommendations.some(r => r.deficiency === 'Phosphorus')).toBe(true);
      expect(recommendations.some(r => r.deficiency === 'Potassium')).toBe(true);
      expect(recommendations.some(r => r.deficiency.includes('pH'))).toBe(true);
    });

    it('should sort recommendations by priority', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 100, // High severity
          phosphorus: 15, // Medium severity
          potassium: 180, // Low severity
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      const priorities = recommendations.map(r => r.priority);
      const priorityOrder = ['high', 'medium', 'low'];

      for (let i = 0; i < priorities.length - 1; i++) {
        const currentIndex = priorityOrder.indexOf(priorities[i]);
        const nextIndex = priorityOrder.indexOf(priorities[i + 1]);
        expect(currentIndex).toBeLessThanOrEqual(nextIndex);
      }
    });
  });

  describe('recommendation structure', () => {
    it('should include all required fields', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 150,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const rec = recommendations[0];

      expect(rec.soilHealthId).toBe(soilData.id);
      expect(rec.deficiency).toBeTruthy();
      expect(rec.severity).toMatch(/^(low|medium|high)$/);
      expect(rec.recommendations).toBeInstanceOf(Array);
      expect(rec.timeline).toBeTruthy();
      expect(rec.priority).toMatch(/^(low|medium|high)$/);
    });

    it('should provide multiple recommendation options', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 150,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');

      expect(nitrogenRec!.recommendations.length).toBeGreaterThanOrEqual(2);
    });

    it('should include organic, chemical, and practice options', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 150,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');

      const types = nitrogenRec!.recommendations.map(r => r.type);
      expect(types).toContain('organic');
      expect(types).toContain('chemical');
      expect(types).toContain('practice');
    });

    it('should include application details', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 150,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');
      const option = nitrogenRec!.recommendations[0];

      expect(option.title).toBeTruthy();
      expect(option.description).toBeTruthy();
      expect(option.application).toBeDefined();
      expect(option.application.rate).toBeTruthy();
      expect(option.application.timing).toBeTruthy();
      expect(option.application.method).toBeTruthy();
      expect(option.expectedImprovement).toBeTruthy();
    });

    it('should include cost estimates', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 150,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');
      const option = nitrogenRec!.recommendations[0];

      expect(option.cost).toBeDefined();
      expect(option.cost!.min).toBeGreaterThan(0);
      expect(option.cost!.max).toBeGreaterThanOrEqual(option.cost!.min);
      expect(option.cost!.currency).toBe('INR');
    });
  });

  describe('severity assessment', () => {
    it('should mark severe nitrogen deficiency as high severity', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 50, // Very low
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');

      expect(nitrogenRec!.severity).toBe('high');
      expect(nitrogenRec!.priority).toBe('high');
    });

    it('should mark moderate deficiency as medium severity', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 180, // Moderately low
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');

      expect(nitrogenRec!.severity).toBe('medium');
    });

    it('should mark minor deficiency as low severity', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 230, // Slightly low
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');

      expect(nitrogenRec!.severity).toBe('low');
    });
  });

  describe('timeline estimates', () => {
    it('should provide shorter timeline for high severity issues', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 50,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const nitrogenRec = recommendations.find(r => r.deficiency === 'Nitrogen');

      expect(nitrogenRec!.timeline).toMatch(/week/i);
    });

    it('should provide longer timeline for organic matter improvement', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.3,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);
      const organicRec = recommendations.find(r => r.deficiency === 'Organic Matter');

      expect(organicRec!.timeline).toMatch(/month/i);
    });
  });

  describe('edge cases', () => {
    it('should handle extremely low nutrients', () => {
      const soilData = createSoilData({
        parameters: {
          nitrogen: 10,
          phosphorus: 2,
          potassium: 20,
          pH: 6.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.1,
        },
      });

      const recommendations = improvementAdvisor.generateRecommendations(soilData);

      expect(recommendations.length).toBeGreaterThanOrEqual(4);
      expect(recommendations.every(r => r.severity === 'high')).toBe(true);
    });

    it('should handle extreme pH values', () => {
      const acidicSoil = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 3.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const alkalineSoil = createSoilData({
        parameters: {
          nitrogen: 300,
          phosphorus: 30,
          potassium: 250,
          pH: 9.5,
          electricalConductivity: 0.5,
          organicCarbon: 0.6,
        },
      });

      const acidicRecs = improvementAdvisor.generateRecommendations(acidicSoil);
      const alkalineRecs = improvementAdvisor.generateRecommendations(alkalineSoil);

      expect(acidicRecs.some(r => r.deficiency === 'pH (Too Acidic)')).toBe(true);
      expect(alkalineRecs.some(r => r.deficiency === 'pH (Too Alkaline)')).toBe(true);
    });
  });
});
