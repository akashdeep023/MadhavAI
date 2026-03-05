/**
 * Market Service
 * Fetches and caches market price data from APIs
 * Requirements: 8.1, 8.6, 8.7
 */

import { encryptedStorage } from '../storage/EncryptedStorage';
import { logger } from '../../utils/logger';
import { MarketPrice, MarketData, Mandi } from '../../types/market.types';

interface CachedMarketData {
  data: MarketData;
  timestamp: Date;
}

const CACHE_KEY_PREFIX = 'market_data_';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

class MarketService {
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Get market prices for crops near user location
   */
  async getPrices(
    latitude: number,
    longitude: number,
    crops?: string[],
    radiusKm: number = 50
  ): Promise<MarketPrice[]> {
    logger.info(`Fetching market prices for location ${latitude}, ${longitude}`);

    try {
      // Try to get cached data first
      const cached = await this.getCachedData(latitude, longitude);
      if (cached && this.isCacheValid(cached.timestamp)) {
        logger.info('Returning cached market prices');
        return this.filterPricesByLocation(cached.data.prices, latitude, longitude, radiusKm, crops);
      }

      // Fetch fresh data from API
      logger.debug('Fetching market prices from API');
      const data = await this.fetchMarketDataFromAPI(latitude, longitude);

      // Cache the data
      await this.cacheMarketData(latitude, longitude, data);
      logger.info('Market prices cached successfully');

      return this.filterPricesByLocation(data.prices, latitude, longitude, radiusKm, crops);
    } catch (error) {
      logger.error('Error fetching market prices', error);

      // Try to return stale cached data as fallback
      const cached = await this.getCachedData(latitude, longitude);
      if (cached) {
        logger.info('Returning stale cached market prices as fallback');
        return this.filterPricesByLocation(cached.data.prices, latitude, longitude, radiusKm, crops);
      }

      throw error;
    }
  }

  /**
   * Get nearby mandis within radius
   */
  async getNearbyMandis(
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<Mandi[]> {
    logger.info(`Fetching nearby mandis for location ${latitude}, ${longitude}`);

    try {
      const cached = await this.getCachedData(latitude, longitude);
      let mandis: Mandi[];

      if (cached && this.isCacheValid(cached.timestamp)) {
        logger.info('Using cached mandi data');
        mandis = cached.data.mandis;
      } else {
        logger.debug('Fetching mandi data from API');
        const data = await this.fetchMarketDataFromAPI(latitude, longitude);
        await this.cacheMarketData(latitude, longitude, data);
        mandis = data.mandis;
      }

      // Filter by distance and sort
      const nearbyMandis = mandis
        .map((mandi) => ({
          ...mandi,
          distance: this.calculateDistance(
            latitude,
            longitude,
            mandi.location.latitude,
            mandi.location.longitude
          ),
        }))
        .filter((mandi) => mandi.distance! <= radiusKm)
        .sort((a, b) => a.distance! - b.distance!);

      logger.info(`Found ${nearbyMandis.length} mandis within ${radiusKm} km`);
      return nearbyMandis;
    } catch (error) {
      logger.error('Error fetching nearby mandis', error);
      throw error;
    }
  }

  /**
   * Start automatic daily price updates
   */
  startAutoUpdate(latitude: number, longitude: number): void {
    if (this.updateTimer) {
      logger.debug('Auto-update already running');
      return;
    }

    logger.info('Starting market price auto-update (24-hour interval)');

    this.updateTimer = setInterval(async () => {
      try {
        logger.debug('Running scheduled market price update');
        const data = await this.fetchMarketDataFromAPI(latitude, longitude);
        await this.cacheMarketData(latitude, longitude, data);
        logger.info('Scheduled market price update completed');
      } catch (error) {
        logger.error('Error in scheduled market price update', error);
      }
    }, UPDATE_INTERVAL_MS);
  }

  /**
   * Stop automatic updates
   */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      logger.info('Market price auto-update stopped');
    }
  }

  /**
   * Clear cached market data
   */
  async clearCache(): Promise<void> {
    // In a real implementation, we'd clear all market cache keys
    // For now, this is a placeholder
    logger.info('Market price cache cleared');
  }

  /**
   * Fetch market data from external API (mock implementation)
   */
  private async fetchMarketDataFromAPI(
    latitude: number,
    longitude: number
  ): Promise<MarketData> {
    // Mock implementation - in production, this would call actual government/market APIs
    // like AGMARKNET, eNAM, etc.
    
    await new Promise<void>((resolve) => setTimeout(resolve, 100)); // Simulate API call

    const mockData: MarketData = {
      prices: this.generateMockPrices(latitude, longitude),
      trends: [],
      mandis: this.generateMockMandis(latitude, longitude),
      lastUpdated: new Date(),
      source: 'AGMARKNET',
    };

    return mockData;
  }

  /**
   * Generate mock price data for testing
   */
  private generateMockPrices(latitude: number, longitude: number): MarketPrice[] {
    const crops = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize'];
    const prices: MarketPrice[] = [];

    crops.forEach((crop, index) => {
      const basePrice = 2000 + index * 500;
      prices.push({
        id: `price_${crop.toLowerCase()}_${Date.now()}`,
        crop,
        mandiName: 'Central Mandi',
        mandiLocation: {
          state: 'Karnataka',
          district: 'Bangalore',
          market: 'Central Mandi',
          latitude: latitude + 0.1,
          longitude: longitude + 0.1,
        },
        price: {
          min: basePrice - 200,
          max: basePrice + 200,
          modal: basePrice,
          currency: 'INR',
        },
        unit: 'quintal',
        date: new Date(),
        source: 'AGMARKNET',
      });
    });

    return prices;
  }

  /**
   * Generate mock mandi data for testing
   */
  private generateMockMandis(latitude: number, longitude: number): Mandi[] {
    return [
      {
        id: 'mandi_1',
        name: 'Central Mandi',
        location: {
          state: 'Karnataka',
          district: 'Bangalore',
          market: 'Central Mandi',
          latitude: latitude + 0.1,
          longitude: longitude + 0.1,
        },
        contact: {
          phone: '+91-80-12345678',
        },
        facilities: ['Storage', 'Weighing', 'Quality Testing'],
        operatingHours: '6:00 AM - 6:00 PM',
      },
      {
        id: 'mandi_2',
        name: 'District Mandi',
        location: {
          state: 'Karnataka',
          district: 'Bangalore',
          market: 'District Mandi',
          latitude: latitude + 0.2,
          longitude: longitude + 0.2,
        },
        contact: {
          phone: '+91-80-87654321',
        },
        facilities: ['Storage', 'Weighing'],
        operatingHours: '7:00 AM - 5:00 PM',
      },
    ];
  }

  /**
   * Get cached market data
   */
  private async getCachedData(
    latitude: number,
    longitude: number
  ): Promise<CachedMarketData | null> {
    try {
      const cacheKey = this.getCacheKey(latitude, longitude);
      const cached = await encryptedStorage.getItem<CachedMarketData>(cacheKey);

      if (!cached) {
        logger.debug('No cached market data found');
        return null;
      }

      // Convert date strings back to Date objects
      cached.timestamp = new Date(cached.timestamp);
      cached.data.lastUpdated = new Date(cached.data.lastUpdated);
      cached.data.prices = cached.data.prices.map((p) => ({
        ...p,
        date: new Date(p.date),
      }));

      return cached;
    } catch (error) {
      logger.error('Error reading cached market data', error);
      return null;
    }
  }

  /**
   * Cache market data
   */
  private async cacheMarketData(
    latitude: number,
    longitude: number,
    data: MarketData
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(latitude, longitude);
      const cached: CachedMarketData = {
        data,
        timestamp: new Date(),
      };

      await encryptedStorage.setItem(cacheKey, cached);
    } catch (error) {
      logger.error('Error caching market data', error);
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: Date): boolean {
    const age = Date.now() - timestamp.getTime();
    const isValid = age < CACHE_DURATION_MS;

    if (!isValid) {
      logger.debug('Cached market data expired');
    } else {
      logger.debug('Valid cached market data found');
    }

    return isValid;
  }

  /**
   * Generate cache key for location
   */
  private getCacheKey(latitude: number, longitude: number): string {
    // Round to 2 decimal places to group nearby locations
    const lat = Math.round(latitude * 100) / 100;
    const lon = Math.round(longitude * 100) / 100;
    return `${CACHE_KEY_PREFIX}${lat}_${lon}`;
  }

  /**
   * Filter prices by location and crops
   */
  private filterPricesByLocation(
    prices: MarketPrice[],
    latitude: number,
    longitude: number,
    radiusKm: number,
    crops?: string[]
  ): MarketPrice[] {
    let filtered = prices.filter((price) => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        price.mandiLocation.latitude,
        price.mandiLocation.longitude
      );
      return distance <= radiusKm;
    });

    if (crops && crops.length > 0) {
      filtered = filtered.filter((price) =>
        crops.some((crop) => price.crop.toLowerCase() === crop.toLowerCase())
      );
    }

    return filtered;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const marketService = new MarketService();
