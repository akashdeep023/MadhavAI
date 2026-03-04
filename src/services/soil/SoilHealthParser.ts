/**
 * Soil Health Parser
 * Parses soil health card data from various formats
 * Requirements: 10.1, 10.7
 */

import { logger } from '../../utils/logger';
import { SoilHealthData } from '../../types/soil.types';

interface ParsedSoilData {
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  pH?: number;
  electricalConductivity?: number;
  organicCarbon?: number;
  [key: string]: number | undefined;
}

class SoilHealthParser {
  /**
   * Parse soil health card data from text/OCR output
   */
  parseFromText(text: string, userId: string): Partial<SoilHealthData> | null {
    logger.info('Parsing soil health card from text');

    try {
      const data = this.extractParameters(text);

      if (!this.hasMinimumRequiredData(data)) {
        logger.debug('Insufficient data in soil health card');
        return null;
      }

      const soilHealth: Partial<SoilHealthData> = {
        userId,
        testDate: this.extractDate(text) || new Date(),
        labName: this.extractLabName(text) || 'Unknown Lab',
        sampleId: this.extractSampleId(text) || `SAMPLE_${Date.now()}`,
        parameters: {
          nitrogen: data.nitrogen || 0,
          phosphorus: data.phosphorus || 0,
          potassium: data.potassium || 0,
          pH: data.pH || 7.0,
          electricalConductivity: data.electricalConductivity || 0,
          organicCarbon: data.organicCarbon || 0,
          sulfur: data.sulfur,
          calcium: data.calcium,
          magnesium: data.magnesium,
          iron: data.iron,
          zinc: data.zinc,
          copper: data.copper,
          manganese: data.manganese,
          boron: data.boron,
        },
        soilType: this.extractSoilType(text),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Soil health card parsed successfully');
      return soilHealth;
    } catch (error) {
      logger.error('Error parsing soil health card', error);
      return null;
    }
  }

  /**
   * Parse soil health card from structured JSON data
   */
  parseFromJSON(data: any, userId: string): Partial<SoilHealthData> | null {
    logger.info('Parsing soil health card from JSON');

    try {
      const soilHealth: Partial<SoilHealthData> = {
        userId,
        testDate: data.testDate ? new Date(data.testDate) : new Date(),
        labName: data.labName || 'Unknown Lab',
        sampleId: data.sampleId || `SAMPLE_${Date.now()}`,
        location: data.location || {
          latitude: 0,
          longitude: 0,
        },
        parameters: {
          nitrogen: this.parseNumber(data.nitrogen) || 0,
          phosphorus: this.parseNumber(data.phosphorus) || 0,
          potassium: this.parseNumber(data.potassium) || 0,
          pH: this.parseNumber(data.pH) || 7.0,
          electricalConductivity: this.parseNumber(data.electricalConductivity) || 0,
          organicCarbon: this.parseNumber(data.organicCarbon) || 0,
          sulfur: this.parseNumber(data.sulfur),
          calcium: this.parseNumber(data.calcium),
          magnesium: this.parseNumber(data.magnesium),
          iron: this.parseNumber(data.iron),
          zinc: this.parseNumber(data.zinc),
          copper: this.parseNumber(data.copper),
          manganese: this.parseNumber(data.manganese),
          boron: this.parseNumber(data.boron),
        },
        soilType: data.soilType || 'loamy',
        texture: data.texture,
        color: data.color,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Soil health card parsed from JSON successfully');
      return soilHealth;
    } catch (error) {
      logger.error('Error parsing soil health card from JSON', error);
      return null;
    }
  }

  /**
   * Extract nutrient parameters from text
   */
  private extractParameters(text: string): ParsedSoilData {
    const data: ParsedSoilData = {};

    // Extract nitrogen (N)
    const nMatch = text.match(/(?:nitrogen|N)\s*(?:\(N\))?\s*[:=]?\s*(\d+\.?\d*)/i);
    if (nMatch) data.nitrogen = parseFloat(nMatch[1]);

    // Extract phosphorus (P)
    const pMatch = text.match(/(?:phosphorus|P)\s*(?:\(P\))?\s*[:=]?\s*(\d+\.?\d*)/i);
    if (pMatch) data.phosphorus = parseFloat(pMatch[1]);

    // Extract potassium (K)
    const kMatch = text.match(/(?:potassium|K)\s*(?:\(K\))?\s*[:=]?\s*(\d+\.?\d*)/i);
    if (kMatch) data.potassium = parseFloat(kMatch[1]);

    // Extract pH
    const phMatch = text.match(/pH\s*[:=]?\s*(\d+\.?\d*)/i);
    if (phMatch) data.pH = parseFloat(phMatch[1]);

    // Extract EC
    const ecMatch = text.match(/(?:EC|electrical\s*conductivity)\s*[:=]?\s*(\d+\.?\d*)/i);
    if (ecMatch) data.electricalConductivity = parseFloat(ecMatch[1]);

    // Extract organic carbon
    const ocMatch = text.match(/(?:organic\s*carbon|OC)\s*[:=]?\s*(\d+\.?\d*)/i);
    if (ocMatch) data.organicCarbon = parseFloat(ocMatch[1]);

    // Extract micronutrients
    const znMatch = text.match(/(?:zinc|Zn)\s*[:=]?\s*(\d+\.?\d*)/i);
    if (znMatch) data.zinc = parseFloat(znMatch[1]);

    const feMatch = text.match(/(?:iron|Fe)\s*[:=]?\s*(\d+\.?\d*)/i);
    if (feMatch) data.iron = parseFloat(feMatch[1]);

    return data;
  }

  /**
   * Extract test date from text
   */
  private extractDate(text: string): Date | null {
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1;
      const year = parseInt(dateMatch[3]);
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month, day);
    }
    return null;
  }

  /**
   * Extract lab name from text
   */
  private extractLabName(text: string): string | null {
    const labMatch = text.match(/lab(?:oratory)?\s*[:=]?\s*([^\n]+)/i);
    return labMatch ? labMatch[1].trim() : null;
  }

  /**
   * Extract sample ID from text
   */
  private extractSampleId(text: string): string | null {
    const idMatch = text.match(/sample\s*(?:id|no|number)?\s*[:=]?\s*([A-Z0-9\-]+)/i);
    return idMatch ? idMatch[1].trim() : null;
  }

  /**
   * Extract soil type from text
   */
  private extractSoilType(text: string): SoilHealthData['soilType'] {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('clay')) return 'clay';
    if (lowerText.includes('sandy')) return 'sandy';
    if (lowerText.includes('loam')) return 'loamy';
    if (lowerText.includes('silt')) return 'silt';
    if (lowerText.includes('peat')) return 'peaty';
    if (lowerText.includes('chalk')) return 'chalky';

    return 'loamy'; // Default
  }

  /**
   * Check if minimum required data is present
   */
  private hasMinimumRequiredData(data: ParsedSoilData): boolean {
    return !!(
      (data.nitrogen !== undefined || data.nitrogen === 0) &&
      (data.phosphorus !== undefined || data.phosphorus === 0) &&
      (data.potassium !== undefined || data.potassium === 0)
    );
  }

  /**
   * Parse number safely
   */
  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? undefined : num;
  }
}

export const soilHealthParser = new SoilHealthParser();
