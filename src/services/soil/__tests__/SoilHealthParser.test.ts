/**
 * Soil Health Parser Tests
 * Requirements: 10.1, 10.7
 */

import { soilHealthParser } from '../SoilHealthParser';

describe('SoilHealthParser', () => {
  const userId = 'user123';

  describe('parseFromText', () => {
    it('should parse soil health card from text with all parameters', () => {
      const text = `
        Soil Health Card
        Lab: Government Soil Testing Lab
        Sample ID: SHC-2024-001
        Date: 15/01/2024
        
        Nitrogen (N): 280 kg/ha
        Phosphorus (P): 25 kg/ha
        Potassium (K): 320 kg/ha
        pH: 6.5
        EC: 0.8 dS/m
        Organic Carbon: 0.75%
        Zinc: 1.2 ppm
        Iron: 8.5 ppm
        
        Soil Type: Loamy
      `;

      const result = soilHealthParser.parseFromText(text, userId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.labName).toBe('Government Soil Testing Lab');
      expect(result?.sampleId).toBe('SHC-2024-001');
      expect(result?.parameters.nitrogen).toBe(280);
      expect(result?.parameters.phosphorus).toBe(25);
      expect(result?.parameters.potassium).toBe(320);
      expect(result?.parameters.pH).toBe(6.5);
      expect(result?.parameters.electricalConductivity).toBe(0.8);
      expect(result?.parameters.organicCarbon).toBe(0.75);
      expect(result?.parameters.zinc).toBe(1.2);
      expect(result?.parameters.iron).toBe(8.5);
      expect(result?.soilType).toBe('loamy');
    });

    it('should parse with minimal required data (NPK)', () => {
      const text = `
        N: 200
        P: 15
        K: 250
      `;

      const result = soilHealthParser.parseFromText(text, userId);

      expect(result).not.toBeNull();
      expect(result?.parameters.nitrogen).toBe(200);
      expect(result?.parameters.phosphorus).toBe(15);
      expect(result?.parameters.potassium).toBe(250);
    });

    it('should return null when insufficient data', () => {
      const text = 'Some random text without soil data';

      const result = soilHealthParser.parseFromText(text, userId);

      expect(result).toBeNull();
    });

    it('should extract date correctly', () => {
      const text = `
        Date: 25/12/2023
        Nitrogen: 300
        Phosphorus: 30
        Potassium: 350
      `;

      const result = soilHealthParser.parseFromText(text, userId);

      expect(result).not.toBeNull();
      expect(result?.testDate.getDate()).toBe(25);
      expect(result?.testDate.getMonth()).toBe(11); // December is month 11
      expect(result?.testDate.getFullYear()).toBe(2023);
    });

    it('should detect different soil types', () => {
      const soilTypes = [
        { text: 'Soil: Clay', expected: 'clay' },
        { text: 'Soil: Sandy', expected: 'sandy' },
        { text: 'Soil: Loam', expected: 'loamy' },
        { text: 'Soil: Silt', expected: 'silt' },
      ];

      soilTypes.forEach(({ text, expected }) => {
        const fullText = `${text}\nN: 200\nP: 20\nK: 250`;
        const result = soilHealthParser.parseFromText(fullText, userId);
        expect(result?.soilType).toBe(expected);
      });
    });
  });

  describe('parseFromJSON', () => {
    it('should parse complete JSON data', () => {
      const jsonData = {
        testDate: '2024-01-15',
        labName: 'Soil Testing Lab',
        sampleId: 'SHC-2024-001',
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          fieldName: 'North Field',
        },
        nitrogen: 280,
        phosphorus: 25,
        potassium: 320,
        pH: 6.5,
        electricalConductivity: 0.8,
        organicCarbon: 0.75,
        zinc: 1.2,
        iron: 8.5,
        soilType: 'loamy',
        texture: 'medium',
        color: 'brown',
      };

      const result = soilHealthParser.parseFromJSON(jsonData, userId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.labName).toBe('Soil Testing Lab');
      expect(result?.sampleId).toBe('SHC-2024-001');
      expect(result?.location?.latitude).toBe(28.6139);
      expect(result?.location?.longitude).toBe(77.209);
      expect(result?.location?.fieldName).toBe('North Field');
      expect(result?.parameters.nitrogen).toBe(280);
      expect(result?.parameters.phosphorus).toBe(25);
      expect(result?.parameters.potassium).toBe(320);
      expect(result?.parameters.pH).toBe(6.5);
      expect(result?.soilType).toBe('loamy');
      expect(result?.texture).toBe('medium');
      expect(result?.color).toBe('brown');
    });

    it('should handle missing optional fields', () => {
      const jsonData = {
        nitrogen: 200,
        phosphorus: 20,
        potassium: 250,
        pH: 7.0,
        electricalConductivity: 0.5,
        organicCarbon: 0.6,
      };

      const result = soilHealthParser.parseFromJSON(jsonData, userId);

      expect(result).not.toBeNull();
      expect(result?.labName).toBe('Unknown Lab');
      expect(result?.parameters.nitrogen).toBe(200);
      expect(result?.soilType).toBe('loamy');
    });

    it('should parse string numbers correctly', () => {
      const jsonData = {
        nitrogen: '280',
        phosphorus: '25',
        potassium: '320',
        pH: '6.5',
        electricalConductivity: '0.8',
        organicCarbon: '0.75',
      };

      const result = soilHealthParser.parseFromJSON(jsonData, userId);

      expect(result).not.toBeNull();
      expect(result?.parameters.nitrogen).toBe(280);
      expect(result?.parameters.phosphorus).toBe(25);
      expect(result?.parameters.pH).toBe(6.5);
    });

    it('should handle null and undefined values', () => {
      const jsonData = {
        nitrogen: 200,
        phosphorus: null,
        potassium: 250,
        pH: undefined,
        electricalConductivity: 0.5,
        organicCarbon: 0.6,
        zinc: null,
      };

      const result = soilHealthParser.parseFromJSON(jsonData, userId);

      expect(result).not.toBeNull();
      expect(result?.parameters.nitrogen).toBe(200);
      expect(result?.parameters.phosphorus).toBe(0);
      expect(result?.parameters.potassium).toBe(250);
      expect(result?.parameters.pH).toBe(7.0);
      expect(result?.parameters.zinc).toBeUndefined();
    });
  });
});
