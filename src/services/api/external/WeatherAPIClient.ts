/**
 * Weather API Client
 * Integrates with weather APIs for location-specific forecasts
 * Requirements: 19.2, 19.5, 19.6, 19.7, 19.8
 */

import { BaseExternalAPIClient, ValidationResult } from './BaseExternalAPIClient';
import { WeatherForecast } from '../../../types/weather.types';
import { logger } from '../../../utils/logger';

interface WeatherQueryParams {
  latitude: number;
  longitude: number;
  days?: number;
}

export class WeatherAPIClient extends BaseExternalAPIClient {
  constructor() {
    super(
      'WeatherAPI',
      'https://api.weather.gov.in', // Mock URL - replace with actual weather API
      10000, // 10 second timeout
      6 * 60 * 60 * 1000 // 6 hours cache duration
    );
  }

  /**
   * Fetch weather forecast for location
   * Requirement: 19.2 - Integrate with weather APIs
   */
  async fetchForecast(
    latitude: number,
    longitude: number,
    days: number = 7
  ): Promise<WeatherForecast> {
    const cacheKey = this.buildCacheKey(latitude, longitude, days);

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<WeatherForecast>(cacheKey);
      if (cached) {
        logger.info(
          `[WeatherAPI] Returning cached forecast (age: ${this.getCacheAge(cached).toFixed(1)}h)`
        );
        return cached.data;
      }

      // Fetch from API with retry logic
      const params: WeatherQueryParams = { latitude, longitude, days };
      const data = await this.makeRequest<WeatherForecast>(
        () => this.client.get('/forecast', { params }),
        '/weather/forecast',
        params
      );

      // Validate data before caching
      const validation = this.validateData(data);
      if (!validation.isValid) {
        logger.error('[WeatherAPI] Data validation failed', validation.errors);
        throw new Error(`Invalid weather data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'WeatherAPI');

      return data;
    } catch (error) {
      logger.error('[WeatherAPI] Failed to fetch forecast', error);

      // Fallback to stale cached data
      // Requirement: 19.5 - Use cached data when APIs unavailable
      const staleCache = await this.getStaleCachedData<WeatherForecast>(cacheKey);
      if (staleCache) {
        logger.warn(
          `[WeatherAPI] Using stale cached forecast (age: ${this.getCacheAge(staleCache).toFixed(
            1
          )}h)`
        );
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Fetch current weather conditions
   */
  async fetchCurrentWeather(
    latitude: number,
    longitude: number
  ): Promise<WeatherForecast['current']> {
    const cacheKey = this.buildCacheKey(latitude, longitude, 0, 'current');

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<WeatherForecast['current']>(cacheKey);
      if (cached) {
        logger.info('[WeatherAPI] Returning cached current weather');
        return cached.data;
      }

      // Fetch from API with retry logic
      const params = { latitude, longitude };
      const data = await this.makeRequest<WeatherForecast['current']>(
        () => this.client.get('/current', { params }),
        '/weather/current',
        params
      );

      // Validate current weather data
      const validation = this.validateCurrentWeather(data);
      if (!validation.isValid) {
        logger.error('[WeatherAPI] Current weather validation failed', validation.errors);
        throw new Error(`Invalid current weather data: ${validation.errors.join(', ')}`);
      }

      // Cache the validated data (shorter cache duration for current weather)
      await this.cacheData(cacheKey, data, 'WeatherAPI');

      return data;
    } catch (error) {
      logger.error('[WeatherAPI] Failed to fetch current weather', error);

      // Fallback to stale cached data
      const staleCache = await this.getStaleCachedData<WeatherForecast['current']>(cacheKey);
      if (staleCache) {
        logger.warn('[WeatherAPI] Using stale cached current weather');
        return staleCache.data;
      }

      throw error;
    }
  }

  /**
   * Fetch weather alerts
   */
  async fetchAlerts(latitude: number, longitude: number): Promise<WeatherForecast['alerts']> {
    const cacheKey = this.buildCacheKey(latitude, longitude, 0, 'alerts');

    try {
      // Try to get cached data first
      const cached = await this.getCachedData<WeatherForecast['alerts']>(cacheKey);
      if (cached) {
        logger.info('[WeatherAPI] Returning cached weather alerts');
        return cached.data;
      }

      // Fetch from API with retry logic
      const params = { latitude, longitude };
      const data = await this.makeRequest<WeatherForecast['alerts']>(
        () => this.client.get('/alerts', { params }),
        '/weather/alerts',
        params
      );

      // Validate alerts data
      if (!Array.isArray(data)) {
        throw new Error('Weather alerts must be an array');
      }

      // Cache the validated data
      await this.cacheData(cacheKey, data, 'WeatherAPI');

      return data;
    } catch (error) {
      logger.error('[WeatherAPI] Failed to fetch weather alerts', error);

      // Fallback to stale cached data
      const staleCache = await this.getStaleCachedData<WeatherForecast['alerts']>(cacheKey);
      if (staleCache) {
        logger.warn('[WeatherAPI] Using stale cached weather alerts');
        return staleCache.data;
      }

      // Return empty array instead of throwing for alerts
      return [];
    }
  }

  /**
   * Validate weather forecast data
   * Requirement: 19.6 - Validate all external data before storage
   */
  protected validateData(data: any): ValidationResult {
    const errors: string[] = [];

    // Validate location
    if (!data.location || typeof data.location !== 'object') {
      errors.push('Missing or invalid location');
    } else {
      if (typeof data.location.latitude !== 'number') {
        errors.push('Invalid location latitude');
      }
      if (typeof data.location.longitude !== 'number') {
        errors.push('Invalid location longitude');
      }
    }

    // Validate current weather
    const currentValidation = this.validateCurrentWeather(data.current);
    if (!currentValidation.isValid) {
      errors.push(...currentValidation.errors.map((e) => `Current weather: ${e}`));
    }

    // Validate daily forecast
    if (!Array.isArray(data.daily)) {
      errors.push('Daily forecast must be an array');
    } else {
      data.daily.forEach((day: any, index: number) => {
        const dayValidation = this.validateDailyForecast(day);
        if (!dayValidation.isValid) {
          errors.push(`Day ${index}: ${dayValidation.errors.join(', ')}`);
        }
      });
    }

    // Validate alerts
    if (!Array.isArray(data.alerts)) {
      errors.push('Alerts must be an array');
    }

    // Validate metadata
    if (!data.lastUpdated) {
      errors.push('Missing lastUpdated timestamp');
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
   * Validate current weather data
   */
  private validateCurrentWeather(current: any): ValidationResult {
    const errors: string[] = [];

    if (!current || typeof current !== 'object') {
      errors.push('Current weather must be an object');
      return { isValid: false, errors };
    }

    // Validate temperature
    if (!current.temperature || typeof current.temperature !== 'object') {
      errors.push('Missing or invalid temperature');
    } else {
      if (typeof current.temperature.current !== 'number') {
        errors.push('Invalid current temperature');
      }
      if (typeof current.temperature.min !== 'number') {
        errors.push('Invalid min temperature');
      }
      if (typeof current.temperature.max !== 'number') {
        errors.push('Invalid max temperature');
      }
    }

    // Validate humidity
    if (typeof current.humidity !== 'number' || current.humidity < 0 || current.humidity > 100) {
      errors.push('Invalid humidity (must be 0-100)');
    }

    // Validate condition
    if (!current.condition || typeof current.condition !== 'string') {
      errors.push('Missing or invalid condition');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate daily forecast data
   */
  private validateDailyForecast(day: any): ValidationResult {
    const errors: string[] = [];

    if (!day.date) {
      errors.push('Missing date');
    }

    if (!day.temperature || typeof day.temperature !== 'object') {
      errors.push('Missing or invalid temperature');
    }

    if (typeof day.humidity !== 'number') {
      errors.push('Invalid humidity');
    }

    if (!day.condition || typeof day.condition !== 'string') {
      errors.push('Missing or invalid condition');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build cache key from parameters
   */
  private buildCacheKey(
    latitude: number,
    longitude: number,
    days: number,
    type: string = 'forecast'
  ): string {
    // Round coordinates to 2 decimal places to group nearby locations
    const lat = Math.round(latitude * 100) / 100;
    const lon = Math.round(longitude * 100) / 100;
    return `weather_${type}_${lat}_${lon}_${days}`;
  }

  /**
   * Get staleness indicator for cached weather data
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
    const cacheKey = this.buildCacheKey(latitude, longitude, 7);
    const cached = await this.getStaleCachedData<WeatherForecast>(cacheKey);

    if (!cached) {
      return {
        isStale: true,
        ageHours: 0,
        message: 'No cached weather data available',
      };
    }

    const isStale = this.isCacheStale(cached);
    const ageHours = this.getCacheAge(cached);

    return {
      isStale,
      ageHours,
      message: isStale
        ? `Weather data is ${ageHours.toFixed(1)} hours old (stale)`
        : `Weather data is ${ageHours.toFixed(1)} hours old (fresh)`,
    };
  }
}

export const weatherAPIClient = new WeatherAPIClient();
