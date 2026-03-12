/**
 * Mandi Price API Client
 * Integrates with mandi price databases (AGMARKNET, eNAM)
 * Requirements: 19.3, 19.5, 19.6, 19.7, 19.8
 */

import { BaseExternalAPIClient, ValidationResult } from './BaseExternalAPIClient';
import { MarketPrice, Mandi, PriceTrend } from '../../../types/market.types';
import { logger } from '../../../utils/logger';

interface PriceQueryParams {
  latitude: number;
  longitude: number;
  crops?: string[];
  radiusKm?: number;
}

interface TrendQueryParams {
  crop: string;
  state?: string;
  district?: string;
  days?: number;
}

export class MandiPriceAPIClient extends BaseExternalAPIClient {
  constructor() {
    super(
      'MandiPriceAPI',
      'https://api.data.gov.in/agmarknet', // Mock URL - replace with actual AGMARKNET/eNAM API
      12000, // 12 second timeout
      24 * 60 * 60 * 1000 // 24 hours cache duration
    );
  }

  /**
   * Fetch mandi prices for location
   * Requirement: 19.3 - Integrate with mandi price databases
   */
  async fetchPrices(
    latitude: number,
    longitude: number,
    crops?: string[],
    radiusKm: number = 50
  ): Promise<MarketPrice[]> {
    const cacheKey = this.buildCacheKey('prices', { latitude, longitude, crops, radiusKm });

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<MarketPrice[]>(cacheKey);
      if (cached) {
        logger.info(
          `[MandiPriceAPI] Returning cached prices (age: ${this.getCacheAge(cached).toFixed(1)}h)`
        );
        return cached.data;
      }

      // Fetch from API with retry logic
      const params: PriceQueryParams = { latitude, longitude, crops, radiusKm };
      const data = await this.makeRequest<MarketPrice[]>(
        () => this.client.get('/prices', { params }),
        '/mandi/prices',
        params
      );

      // Validate data before caching
      const validation = this.validateData(data);
      if (!validation.isValid) {
        logger.error('[MandiPriceAPI] Data validation failed', validation.errors);
        throw new Error(`Invalid price data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'MandiPriceAPI');

      return data;
    } catch (error) {
      logger.error('[MandiPriceAPI] Failed to fetch prices', error);

      // Fallback to stale cached data
      // Requirement: 19.5 - Use cached data when APIs unavailable
      const staleCache = await this.getStaleCachedData<MarketPrice[]>(cacheKey);
      if (staleCache) {
        logger.warn(
          `[MandiPriceAPI] Using stale cached prices (age: ${this.getCacheAge(staleCache).toFixed(
            1
          )}h)`
        );
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Fetch nearby mandis
   */
  async fetchNearbyMandis(
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<Mandi[]> {
    const cacheKey = this.buildCacheKey('mandis', { latitude, longitude, radiusKm });

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<Mandi[]>(cacheKey);
      if (cached) {
        logger.info('[MandiPriceAPI] Returning cached mandis');
        return cached.data;
      }

      // Fetch from API with retry logic
      const params = { latitude, longitude, radiusKm };
      const data = await this.makeRequest<Mandi[]>(
        () => this.client.get('/mandis', { params }),
        '/mandi/mandis',
        params
      );

      // Validate mandis data
      const validation = this.validateMandis(data);
      if (!validation.isValid) {
        logger.error('[MandiPriceAPI] Mandi validation failed', validation.errors);
        throw new Error(`Invalid mandi data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'MandiPriceAPI');

      return data;
    } catch (error) {
      logger.error('[MandiPriceAPI] Failed to fetch mandis', error);

      // Fallback to stale cached data
      const staleCache = await this.getStaleCachedData<Mandi[]>(cacheKey);
      if (staleCache) {
        logger.warn('[MandiPriceAPI] Using stale cached mandis');
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Fetch price trend for a crop
   */
  async fetchPriceTrend(
    crop: string,
    state?: string,
    district?: string,
    days: number = 30
  ): Promise<PriceTrend> {
    const cacheKey = this.buildCacheKey('trend', { crop, state, district, days });

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<PriceTrend>(cacheKey);
      if (cached) {
        logger.info(`[MandiPriceAPI] Returning cached trend for ${crop}`);
        return cached.data;
      }

      // Fetch from API with retry logic
      const params: TrendQueryParams = { crop, state, district, days };
      const data = await this.makeRequest<PriceTrend>(
        () => this.client.get('/trend', { params }),
        '/mandi/trend',
        params
      );

      // Validate trend data
      const validation = this.validateTrend(data);
      if (!validation.isValid) {
        logger.error('[MandiPriceAPI] Trend validation failed', validation.errors);
        throw new Error(`Invalid trend data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'MandiPriceAPI');

      return data;
    } catch (error) {
      logger.error(`[MandiPriceAPI] Failed to fetch trend for ${crop}`, error);

      // Fallback to stale cached data
      const staleCache = await this.getStaleCachedData<PriceTrend>(cacheKey);
      if (staleCache) {
        logger.warn(`[MandiPriceAPI] Using stale cached trend for ${crop}`);
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Validate market price data
   * Requirement: 19.6 - Validate all external data before storage
   */
  protected validateData(data: any): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array of market prices');
      return { isValid: false, errors };
    }

    // Validate each price entry
    for (let i = 0; i < data.length; i++) {
      const priceValidation = this.validatePrice(data[i]);
      if (!priceValidation.isValid) {
        errors.push(`Price at index ${i}: ${priceValidation.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate individual price entry
   */
  private validatePrice(price: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!price.id || typeof price.id !== 'string') {
      errors.push('Missing or invalid id');
    }
    if (!price.crop || typeof price.crop !== 'string') {
      errors.push('Missing or invalid crop');
    }
    if (!price.mandiName || typeof price.mandiName !== 'string') {
      errors.push('Missing or invalid mandiName');
    }

    // Validate location
    if (!price.mandiLocation || typeof price.mandiLocation !== 'object') {
      errors.push('Missing or invalid mandiLocation');
    } else {
      if (typeof price.mandiLocation.latitude !== 'number') {
        errors.push('Invalid mandiLocation latitude');
      }
      if (typeof price.mandiLocation.longitude !== 'number') {
        errors.push('Invalid mandiLocation longitude');
      }
    }

    // Validate price object
    if (!price.price || typeof price.price !== 'object') {
      errors.push('Missing or invalid price object');
    } else {
      if (typeof price.price.modal !== 'number' || price.price.modal < 0) {
        errors.push('Invalid modal price (must be positive number)');
      }
      if (price.price.min !== undefined && typeof price.price.min !== 'number') {
        errors.push('Invalid min price');
      }
      if (price.price.max !== undefined && typeof price.price.max !== 'number') {
        errors.push('Invalid max price');
      }
    }

    // Validate unit
    if (!price.unit || typeof price.unit !== 'string') {
      errors.push('Missing or invalid unit');
    }

    // Validate date
    if (!price.date) {
      errors.push('Missing date');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate mandis data
   */
  private validateMandis(data: any): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Data must be an array of mandis');
      return { isValid: false, errors };
    }

    // Validate each mandi
    for (let i = 0; i < data.length; i++) {
      const mandi = data[i];

      if (!mandi.id || typeof mandi.id !== 'string') {
        errors.push(`Mandi ${i}: Missing or invalid id`);
      }
      if (!mandi.name || typeof mandi.name !== 'string') {
        errors.push(`Mandi ${i}: Missing or invalid name`);
      }
      if (!mandi.location || typeof mandi.location !== 'object') {
        errors.push(`Mandi ${i}: Missing or invalid location`);
      } else {
        if (typeof mandi.location.latitude !== 'number') {
          errors.push(`Mandi ${i}: Invalid location latitude`);
        }
        if (typeof mandi.location.longitude !== 'number') {
          errors.push(`Mandi ${i}: Invalid location longitude`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate price trend data
   */
  private validateTrend(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Trend data must be an object');
      return { isValid: false, errors };
    }

    if (!data.crop || typeof data.crop !== 'string') {
      errors.push('Missing or invalid crop');
    }

    if (!Array.isArray(data.prices)) {
      errors.push('Prices must be an array');
    } else {
      data.prices.forEach((point: any, index: number) => {
        if (!point.date) {
          errors.push(`Price point ${index}: Missing date`);
        }
        if (typeof point.price !== 'number' || point.price < 0) {
          errors.push(`Price point ${index}: Invalid price`);
        }
      });
    }

    if (!data.trend || typeof data.trend !== 'string') {
      errors.push('Missing or invalid trend');
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
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}=${value.sort().join(',')}`;
        }
        if (typeof value === 'number') {
          return `${key}=${Math.round(value * 100) / 100}`;
        }
        return `${key}=${value}`;
      })
      .join('_');
    return `mandi_${prefix}_${paramStr}`;
  }

  /**
   * Get staleness indicator for cached price data
   * Requirement: 19.5 - Add staleness indicators for cached data
   */
  async getDataStaleness(
    latitude: number,
    longitude: number
  ): Promise<{
    isStale: boolean;
    ageHours: number;
    message: string;
  }> {
    const cacheKey = this.buildCacheKey('prices', { latitude, longitude, radiusKm: 50 });
    const cached = await this.getStaleCachedData<MarketPrice[]>(cacheKey);

    if (!cached) {
      return {
        isStale: true,
        ageHours: 0,
        message: 'No cached price data available',
      };
    }

    const isStale = this.isCacheStale(cached);
    const ageHours = this.getCacheAge(cached);

    return {
      isStale,
      ageHours,
      message: isStale
        ? `Price data is ${ageHours.toFixed(1)} hours old (stale)`
        : `Price data is ${ageHours.toFixed(1)} hours old (fresh)`,
    };
  }
}

export const mandiPriceAPIClient = new MandiPriceAPIClient();
