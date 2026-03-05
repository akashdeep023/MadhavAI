/**
 * Scheme Service
 * Requirements: 2.1, 2.7
 * 
 * Manages government scheme data including fetching, caching, and local storage
 */

import { Scheme } from '../../types/scheme.types';
import { logger } from '../../utils/logger';
import { encryptedStorage } from '../storage/EncryptedStorage';

interface SchemeCache {
  schemes: Scheme[];
  lastUpdated: Date;
}

export class SchemeService {
  private readonly CACHE_KEY = 'schemes_cache';
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Get all available schemes
   */
  async getAllSchemes(): Promise<Scheme[]> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedSchemes();
      if (cached) {
        logger.info('Retrieved schemes from cache');
        return cached;
      }

      // If not in cache, fetch from API
      logger.info('Fetching schemes from API');
      const schemes = await this.fetchSchemesFromAPI();
      
      // Cache the results
      await this.cacheSchemes(schemes);
      
      return schemes;
    } catch (error) {
      logger.error('Failed to get schemes', error);
      
      // Try to return cached data even if expired
      const cached = await this.getCachedSchemes(true);
      if (cached) {
        logger.warn('Returning expired cached schemes due to API failure');
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Get schemes filtered by user location
   */
  async getSchemesByLocation(state: string, district?: string): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();
    
    return allSchemes.filter(scheme => {
      // Include schemes with no location restriction
      if (!scheme.state) {
        return true;
      }
      
      // Check state match
      if (scheme.state !== state) {
        return false;
      }
      
      // If district is specified, check district match
      if (district && scheme.district && scheme.district !== district) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get schemes by category
   */
  async getSchemesByCategory(category: string): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();
    return allSchemes.filter(scheme => scheme.category === category);
  }

  /**
   * Get scheme by ID
   */
  async getSchemeById(schemeId: string): Promise<Scheme | null> {
    const allSchemes = await this.getAllSchemes();
    return allSchemes.find(scheme => scheme.id === schemeId) || null;
  }

  /**
   * Get schemes with upcoming deadlines (within 30 days)
   */
  async getSchemesWithUpcomingDeadlines(daysAhead: number = 30): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    return allSchemes.filter(scheme => {
      if (!scheme.applicationDeadline) {
        return false;
      }
      
      const deadline = new Date(scheme.applicationDeadline);
      return deadline >= now && deadline <= futureDate;
    });
  }

  /**
   * Search schemes by keyword
   */
  async searchSchemes(keyword: string): Promise<Scheme[]> {
    const allSchemes = await this.getAllSchemes();
    const lowerKeyword = keyword.toLowerCase();
    
    return allSchemes.filter(scheme => {
      return (
        scheme.name.toLowerCase().includes(lowerKeyword) ||
        scheme.description.toLowerCase().includes(lowerKeyword) ||
        scheme.benefits.some(benefit => benefit.toLowerCase().includes(lowerKeyword))
      );
    });
  }

  /**
   * Fetch schemes from API
   */
  private async fetchSchemesFromAPI(): Promise<Scheme[]> {
    // TODO: Implement actual API call to government schemes API
    // For now, return empty array
    logger.warn('Scheme API integration not yet implemented');
    return [];
  }

  /**
   * Get cached schemes
   */
  private async getCachedSchemes(ignoreExpiry: boolean = false): Promise<Scheme[] | null> {
    try {
      const cached = await encryptedStorage.getItem<SchemeCache>(this.CACHE_KEY);
      
      if (!cached) {
        return null;
      }
      
      // Check if cache is expired
      if (!ignoreExpiry) {
        const now = new Date();
        const cacheAge = now.getTime() - new Date(cached.lastUpdated).getTime();
        
        if (cacheAge > this.CACHE_DURATION_MS) {
          logger.info('Scheme cache expired');
          return null;
        }
      }
      
      return cached.schemes;
    } catch (error) {
      logger.error('Failed to get cached schemes', error);
      return null;
    }
  }

  /**
   * Cache schemes
   */
  private async cacheSchemes(schemes: Scheme[]): Promise<void> {
    try {
      const cache: SchemeCache = {
        schemes,
        lastUpdated: new Date(),
      };
      
      await encryptedStorage.setItem(this.CACHE_KEY, cache);
      logger.info(`Cached ${schemes.length} schemes`);
    } catch (error) {
      logger.error('Failed to cache schemes', error);
    }
  }

  /**
   * Clear scheme cache
   */
  async clearCache(): Promise<void> {
    try {
      await encryptedStorage.removeItem(this.CACHE_KEY);
      logger.info('Scheme cache cleared');
    } catch (error) {
      logger.error('Failed to clear scheme cache', error);
    }
  }

  /**
   * Force refresh schemes from API
   */
  async refreshSchemes(): Promise<Scheme[]> {
    logger.info('Force refreshing schemes');
    await this.clearCache();
    return this.getAllSchemes();
  }
}

export const schemeService = new SchemeService();
