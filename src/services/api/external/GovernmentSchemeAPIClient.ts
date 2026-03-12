/**
 * Government Scheme API Client
 * Integrates with government scheme databases
 * Requirements: 19.1, 19.5, 19.6, 19.7, 19.8
 */

import { BaseExternalAPIClient, ValidationResult } from './BaseExternalAPIClient';
import { Scheme } from '../../../types/scheme.types';
import { logger } from '../../../utils/logger';

interface SchemeAPIResponse {
  schemes: Scheme[];
  totalCount: number;
  lastUpdated: string;
}

interface SchemeQueryParams {
  state?: string;
  district?: string;
  category?: string;
  active?: boolean;
}

export class GovernmentSchemeAPIClient extends BaseExternalAPIClient {
  constructor() {
    super(
      'GovernmentSchemeAPI',
      'https://api.gov.in/schemes', // Mock URL - replace with actual government API
      15000, // 15 second timeout
      7 * 24 * 60 * 60 * 1000 // 7 days cache duration
    );
  }

  /**
   * Fetch all government schemes
   * Requirement: 19.1 - Integrate with government scheme databases
   */
  async fetchSchemes(params?: SchemeQueryParams): Promise<Scheme[]> {
    const cacheKey = this.buildCacheKey('schemes', params);

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<Scheme[]>(cacheKey);
      if (cached) {
        logger.info(
          `[GovernmentSchemeAPI] Returning cached schemes (age: ${this.getCacheAge(cached).toFixed(
            1
          )}h)`
        );
        return cached.data;
      }

      // Fetch from API with retry logic
      const data = await this.makeRequest<SchemeAPIResponse>(
        () => this.client.get('/list', { params }),
        '/schemes/list',
        params
      );

      // Validate data before caching
      const validation = this.validateData(data.schemes);
      if (!validation.isValid) {
        logger.error('[GovernmentSchemeAPI] Data validation failed', validation.errors);
        throw new Error(`Invalid scheme data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data.schemes, 'GovernmentSchemeAPI');

      return data.schemes;
    } catch (error) {
      logger.error('[GovernmentSchemeAPI] Failed to fetch schemes', error);

      // Fallback to stale cached data
      // Requirement: 19.5 - Use cached data when APIs unavailable
      const staleCache = await this.getStaleCachedData<Scheme[]>(cacheKey);
      if (staleCache) {
        logger.warn(
          `[GovernmentSchemeAPI] Using stale cached schemes (age: ${this.getCacheAge(
            staleCache
          ).toFixed(1)}h)`
        );
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Fetch scheme by ID
   */
  async fetchSchemeById(schemeId: string): Promise<Scheme | null> {
    const cacheKey = this.buildCacheKey('scheme', { id: schemeId });

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<Scheme>(cacheKey);
      if (cached) {
        logger.info(`[GovernmentSchemeAPI] Returning cached scheme ${schemeId}`);
        return cached.data;
      }

      // Fetch from API with retry logic
      const data = await this.makeRequest<Scheme>(
        () => this.client.get(`/${schemeId}`),
        `/schemes/${schemeId}`,
        { id: schemeId }
      );

      // Validate data before caching
      const validation = this.validateScheme(data);
      if (!validation.isValid) {
        logger.error('[GovernmentSchemeAPI] Scheme validation failed', validation.errors);
        throw new Error(`Invalid scheme data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'GovernmentSchemeAPI');

      return data;
    } catch (error) {
      logger.error(`[GovernmentSchemeAPI] Failed to fetch scheme ${schemeId}`, error);

      // Fallback to stale cached data
      const staleCache = await this.getStaleCachedData<Scheme>(cacheKey);
      if (staleCache) {
        logger.warn(`[GovernmentSchemeAPI] Using stale cached scheme ${schemeId}`);
        return staleCache.data;
      }

      return null;
    }
  }

  /**
   * Fetch schemes by state
   */
  async fetchSchemesByState(state: string): Promise<Scheme[]> {
    return this.fetchSchemes({ state, active: true });
  }

  /**
   * Fetch schemes by category
   */
  async fetchSchemesByCategory(category: string): Promise<Scheme[]> {
    return this.fetchSchemes({ category, active: true });
  }

  /**
   * Validate scheme data
   * Requirement: 19.6 - Validate all external data before storage
   */
  protected validateData(data: any): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array of schemes');
      return { isValid: false, errors };
    }

    // Validate each scheme
    for (let i = 0; i < data.length; i++) {
      const schemeValidation = this.validateScheme(data[i]);
      if (!schemeValidation.isValid) {
        errors.push(`Scheme at index ${i}: ${schemeValidation.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate individual scheme
   */
  private validateScheme(scheme: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!scheme.id || typeof scheme.id !== 'string') {
      errors.push('Missing or invalid id');
    }
    if (!scheme.name || typeof scheme.name !== 'string') {
      errors.push('Missing or invalid name');
    }
    if (!scheme.description || typeof scheme.description !== 'string') {
      errors.push('Missing or invalid description');
    }
    if (!scheme.category || typeof scheme.category !== 'string') {
      errors.push('Missing or invalid category');
    }

    // Validate benefits array
    if (!Array.isArray(scheme.benefits)) {
      errors.push('Benefits must be an array');
    }

    // Validate eligibility criteria
    if (!scheme.eligibilityCriteria || typeof scheme.eligibilityCriteria !== 'object') {
      errors.push('Missing or invalid eligibilityCriteria');
    }

    // Validate required documents array
    if (scheme.requiredDocuments && !Array.isArray(scheme.requiredDocuments)) {
      errors.push('requiredDocuments must be an array');
    }

    // Validate application steps array
    if (scheme.applicationSteps && !Array.isArray(scheme.applicationSteps)) {
      errors.push('applicationSteps must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build cache key from parameters
   */
  private buildCacheKey(prefix: string, params?: any): string {
    if (!params) {
      return `gov_scheme_${prefix}`;
    }
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('_');
    return `gov_scheme_${prefix}_${paramStr}`;
  }

  /**
   * Check if cached data is stale and return staleness indicator
   */
  async getDataStaleness(cacheKey: string): Promise<{
    isStale: boolean;
    ageHours: number;
    message: string;
  }> {
    const cached = await this.getStaleCachedData<any>(cacheKey);
    if (!cached) {
      return {
        isStale: true,
        ageHours: 0,
        message: 'No cached data available',
      };
    }

    const isStale = this.isCacheStale(cached);
    const ageHours = this.getCacheAge(cached);

    return {
      isStale,
      ageHours,
      message: isStale
        ? `Data is ${ageHours.toFixed(1)} hours old (stale)`
        : `Data is ${ageHours.toFixed(1)} hours old (fresh)`,
    };
  }
}

export const governmentSchemeAPIClient = new GovernmentSchemeAPIClient();
