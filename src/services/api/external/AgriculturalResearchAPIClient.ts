/**
 * Agricultural Research API Client
 * Integrates with agricultural research databases for best practices
 * Requirements: 19.4, 19.5, 19.6, 19.7, 19.8
 */

import { BaseExternalAPIClient, ValidationResult } from './BaseExternalAPIClient';
import { logger } from '../../../utils/logger';

export interface CropBestPractice {
  id: string;
  crop: string;
  variety?: string;
  stage: string; // 'land_preparation' | 'sowing' | 'growth' | 'harvest'
  practice: string;
  description: string;
  benefits: string[];
  resources: string[];
  source: string;
  region?: string;
  season?: string;
  lastUpdated: Date;
}

export interface PestManagementData {
  id: string;
  pest: string;
  crops: string[];
  symptoms: string[];
  preventiveMeasures: string[];
  treatmentMethods: string[];
  organicSolutions: string[];
  chemicalSolutions?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  lastUpdated: Date;
}

export interface SoilManagementData {
  id: string;
  soilType: string;
  suitableCrops: string[];
  improvementTechniques: string[];
  fertilizationGuidelines: string;
  irrigationRecommendations: string;
  cropRotationSuggestions: string[];
  source: string;
  lastUpdated: Date;
}

interface ResearchQueryParams {
  crop?: string;
  region?: string;
  season?: string;
  topic?: string;
}

export class AgriculturalResearchAPIClient extends BaseExternalAPIClient {
  constructor() {
    super(
      'AgriculturalResearchAPI',
      'https://api.icar.gov.in/research', // Mock URL - replace with actual ICAR/research API
      15000, // 15 second timeout
      30 * 24 * 60 * 60 * 1000 // 30 days cache duration (research data changes slowly)
    );
  }

  /**
   * Fetch best practices for a crop
   * Requirement: 19.4 - Integrate with agricultural research databases
   */
  async fetchBestPractices(
    crop: string,
    region?: string,
    season?: string
  ): Promise<CropBestPractice[]> {
    const cacheKey = this.buildCacheKey('practices', { crop, region, season });

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<CropBestPractice[]>(cacheKey);
      if (cached) {
        logger.info(
          `[AgriculturalResearchAPI] Returning cached best practices for ${crop} (age: ${this.getCacheAge(
            cached
          ).toFixed(1)}h)`
        );
        return cached.data;
      }

      // Fetch from API with retry logic
      const params: ResearchQueryParams = { crop, region, season };
      const data = await this.makeRequest<CropBestPractice[]>(
        () => this.client.get('/best-practices', { params }),
        '/research/best-practices',
        params
      );

      // Validate data before caching
      const validation = this.validateBestPractices(data);
      if (!validation.isValid) {
        logger.error(
          '[AgriculturalResearchAPI] Best practices validation failed',
          validation.errors
        );
        throw new Error(`Invalid best practices data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'AgriculturalResearchAPI');

      return data;
    } catch (error) {
      logger.error(`[AgriculturalResearchAPI] Failed to fetch best practices for ${crop}`, error);

      // Fallback to stale cached data
      // Requirement: 19.5 - Use cached data when APIs unavailable
      const staleCache = await this.getStaleCachedData<CropBestPractice[]>(cacheKey);
      if (staleCache) {
        logger.warn(
          `[AgriculturalResearchAPI] Using stale cached best practices for ${crop} (age: ${this.getCacheAge(
            staleCache
          ).toFixed(1)}h)`
        );
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Fetch pest management data
   */
  async fetchPestManagement(crop: string, pest?: string): Promise<PestManagementData[]> {
    const cacheKey = this.buildCacheKey('pest', { crop, pest });

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<PestManagementData[]>(cacheKey);
      if (cached) {
        logger.info(`[AgriculturalResearchAPI] Returning cached pest management data for ${crop}`);
        return cached.data;
      }

      // Fetch from API with retry logic
      const params = { crop, pest };
      const data = await this.makeRequest<PestManagementData[]>(
        () => this.client.get('/pest-management', { params }),
        '/research/pest-management',
        params
      );

      // Validate data before caching
      const validation = this.validatePestManagement(data);
      if (!validation.isValid) {
        logger.error(
          '[AgriculturalResearchAPI] Pest management validation failed',
          validation.errors
        );
        throw new Error(`Invalid pest management data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'AgriculturalResearchAPI');

      return data;
    } catch (error) {
      logger.error(`[AgriculturalResearchAPI] Failed to fetch pest management for ${crop}`, error);

      // Fallback to stale cached data
      const staleCache = await this.getStaleCachedData<PestManagementData[]>(cacheKey);
      if (staleCache) {
        logger.warn(`[AgriculturalResearchAPI] Using stale cached pest management for ${crop}`);
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Fetch soil management data
   */
  async fetchSoilManagement(soilType: string): Promise<SoilManagementData | null> {
    const cacheKey = this.buildCacheKey('soil', { soilType });

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<SoilManagementData>(cacheKey);
      if (cached) {
        logger.info(`[AgriculturalResearchAPI] Returning cached soil management for ${soilType}`);
        return cached.data;
      }

      // Fetch from API with retry logic
      const params = { soilType };
      const data = await this.makeRequest<SoilManagementData>(
        () => this.client.get('/soil-management', { params }),
        '/research/soil-management',
        params
      );

      // Validate data before caching
      const validation = this.validateSoilManagement(data);
      if (!validation.isValid) {
        logger.error(
          '[AgriculturalResearchAPI] Soil management validation failed',
          validation.errors
        );
        throw new Error(`Invalid soil management data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'AgriculturalResearchAPI');

      return data;
    } catch (error) {
      logger.error(
        `[AgriculturalResearchAPI] Failed to fetch soil management for ${soilType}`,
        error
      );

      // Fallback to stale cached data
      const staleCache = await this.getStaleCachedData<SoilManagementData>(cacheKey);
      if (staleCache) {
        logger.warn(`[AgriculturalResearchAPI] Using stale cached soil management for ${soilType}`);
        return staleCache.data;
      }

      return null;
    }
  }

  /**
   * Validate data (generic validation)
   * Requirement: 19.6 - Validate all external data before storage
   */
  protected validateData(data: any): ValidationResult {
    // This is a generic validation - specific validations are in separate methods
    if (!data) {
      return { isValid: false, errors: ['Data is null or undefined'] };
    }
    return { isValid: true, errors: [] };
  }

  /**
   * Validate best practices data
   */
  private validateBestPractices(data: any): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array of best practices');
      return { isValid: false, errors };
    }

    // Validate each practice
    for (let i = 0; i < data.length; i++) {
      const practice = data[i];

      if (!practice.id || typeof practice.id !== 'string') {
        errors.push(`Practice ${i}: Missing or invalid id`);
      }
      if (!practice.crop || typeof practice.crop !== 'string') {
        errors.push(`Practice ${i}: Missing or invalid crop`);
      }
      if (!practice.stage || typeof practice.stage !== 'string') {
        errors.push(`Practice ${i}: Missing or invalid stage`);
      }
      if (!practice.practice || typeof practice.practice !== 'string') {
        errors.push(`Practice ${i}: Missing or invalid practice`);
      }
      if (!practice.description || typeof practice.description !== 'string') {
        errors.push(`Practice ${i}: Missing or invalid description`);
      }
      if (!Array.isArray(practice.benefits)) {
        errors.push(`Practice ${i}: Benefits must be an array`);
      }
      if (!practice.source || typeof practice.source !== 'string') {
        errors.push(`Practice ${i}: Missing or invalid source`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate pest management data
   */
  private validatePestManagement(data: any): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array of pest management entries');
      return { isValid: false, errors };
    }

    // Validate each entry
    for (let i = 0; i < data.length; i++) {
      const entry = data[i];

      if (!entry.id || typeof entry.id !== 'string') {
        errors.push(`Entry ${i}: Missing or invalid id`);
      }
      if (!entry.pest || typeof entry.pest !== 'string') {
        errors.push(`Entry ${i}: Missing or invalid pest`);
      }
      if (!Array.isArray(entry.crops)) {
        errors.push(`Entry ${i}: Crops must be an array`);
      }
      if (!Array.isArray(entry.symptoms)) {
        errors.push(`Entry ${i}: Symptoms must be an array`);
      }
      if (!Array.isArray(entry.preventiveMeasures)) {
        errors.push(`Entry ${i}: Preventive measures must be an array`);
      }
      if (!Array.isArray(entry.treatmentMethods)) {
        errors.push(`Entry ${i}: Treatment methods must be an array`);
      }
      if (!entry.severity || !['low', 'medium', 'high', 'critical'].includes(entry.severity)) {
        errors.push(`Entry ${i}: Invalid severity level`);
      }
      if (!entry.source || typeof entry.source !== 'string') {
        errors.push(`Entry ${i}: Missing or invalid source`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate soil management data
   */
  private validateSoilManagement(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object');
      return { isValid: false, errors };
    }

    if (!data.id || typeof data.id !== 'string') {
      errors.push('Missing or invalid id');
    }
    if (!data.soilType || typeof data.soilType !== 'string') {
      errors.push('Missing or invalid soilType');
    }
    if (!Array.isArray(data.suitableCrops)) {
      errors.push('Suitable crops must be an array');
    }
    if (!Array.isArray(data.improvementTechniques)) {
      errors.push('Improvement techniques must be an array');
    }
    if (!data.fertilizationGuidelines || typeof data.fertilizationGuidelines !== 'string') {
      errors.push('Missing or invalid fertilization guidelines');
    }
    if (!data.source || typeof data.source !== 'string') {
      errors.push('Missing or invalid source');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build cache key from parameters
   */
  private buildCacheKey(prefix: string, params: any): string {
    const paramStr = Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('_');
    return `research_${prefix}_${paramStr}`;
  }

  /**
   * Get staleness indicator for cached research data
   * Requirement: 19.5 - Add staleness indicators for cached data
   */
  async getDataStaleness(crop: string): Promise<{
    isStale: boolean;
    ageDays: number;
    message: string;
  }> {
    const cacheKey = this.buildCacheKey('practices', { crop });
    const cached = await this.getStaleCachedData<CropBestPractice[]>(cacheKey);

    if (!cached) {
      return {
        isStale: true,
        ageDays: 0,
        message: 'No cached research data available',
      };
    }

    const isStale = this.isCacheStale(cached);
    const ageHours = this.getCacheAge(cached);
    const ageDays = ageHours / 24;

    return {
      isStale,
      ageDays,
      message: isStale
        ? `Research data is ${ageDays.toFixed(1)} days old (stale)`
        : `Research data is ${ageDays.toFixed(1)} days old (fresh)`,
    };
  }
}

export const agriculturalResearchAPIClient = new AgriculturalResearchAPIClient();
